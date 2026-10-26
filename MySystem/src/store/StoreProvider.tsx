import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode } from "react";
import type { AppState, Board } from "@/types/activities";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { reducer, type Action } from "./reducer";
import { loadRemote, pushChanges, subscribe } from "./remote";
import { applyBoardRow, applyTaskRow, diffState, isEmpty, removeBoard, removeTask, type Changes } from "./sync";

/** Preferência de cada pessoa (quadro aberto por último). Os dados em si ficam só no banco. */
const ACTIVE_BOARD_KEY = "mysystem.activeBoard";

export type SyncStatus = { state: "saved" | "saving" | "error"; error: string | null };

const StateContext = createContext<AppState | null>(null);
const DispatchContext = createContext<Dispatch<Action> | null>(null);
const SyncContext = createContext<SyncStatus>({ state: "saved", error: null });

/** Estado em ref + useState: o dispatch calcula o próximo estado na hora e sabe exatamente o que mudou. */
function useStoreCore(initial: AppState, onChange: (prev: AppState, next: AppState) => void) {
  const [state, setState] = useState(initial);
  const ref = useRef(state);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const dispatch = useCallback((action: Action) => {
    const prev = ref.current;
    const next = reducer(prev, action);
    if (next === prev) return;
    ref.current = next;
    setState(next);
    onChangeRef.current(prev, next);
  }, []);

  /** Mudança que veio do banco: entra no estado sem ser gravada de novo. */
  const applyRemote = useCallback((fn: (s: AppState) => AppState) => {
    const next = fn(ref.current);
    if (next === ref.current) return;
    ref.current = next;
    setState(next);
  }, []);

  return { state, dispatch, applyRemote };
}

function readActiveBoard(boards: Board[]): string | null {
  try {
    const id = localStorage.getItem(ACTIVE_BOARD_KEY);
    if (id && boards.some((b) => b.id === id)) return id;
  } catch {
    /* sem armazenamento */
  }
  return boards[0]?.id ?? null;
}

type Phase = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; initial: AppState };

function RemoteStore({ userId, children }: { userId: string; children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  const load = useCallback(async () => {
    setPhase({ kind: "loading" });
    try {
      const boards = await loadRemote(supabase!);
      setPhase({ kind: "ready", initial: { boards, activeBoardId: readActiveBoard(boards) } });
    } catch (e) {
      setPhase({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (phase.kind === "loading") return <FullScreenMessage title="Carregando dados…" />;
  if (phase.kind === "error")
    return <FullScreenMessage title="Não foi possível carregar os dados" detail={phase.message} action={{ label: "Tentar de novo", onClick: load }} />;
  return (
    <RemoteReady userId={userId} initial={phase.initial}>
      {children}
    </RemoteReady>
  );
}

function RemoteReady({ userId, initial, children }: { userId: string; initial: AppState; children: ReactNode }) {
  const [sync, setSync] = useState<SyncStatus>({ state: "saved", error: null });
  const queue = useRef(Promise.resolve());
  const pending = useRef(0);

  // Gravações em fila: chegam ao banco na mesma ordem em que aconteceram.
  const enqueue = useCallback((changes: Changes) => {
    pending.current++;
    setSync((s) => ({ ...s, state: "saving" }));
    queue.current = queue.current.then(async () => {
      try {
        await pushChanges(supabase!, changes);
        pending.current--;
        if (!pending.current) setSync({ state: "saved", error: null });
      } catch (e) {
        pending.current--;
        setSync({ state: "error", error: e instanceof Error ? e.message : String(e) });
      }
    });
  }, []);

  const { state, dispatch, applyRemote } = useStoreCore(initial, (prev, next) => {
    const changes = diffState(prev, next);
    if (!isEmpty(changes)) enqueue(changes);
  });

  useEffect(
    () =>
      subscribe(supabase!, userId, {
        board: (row) => applyRemote((s) => applyBoardRow(s, row)),
        boardDeleted: (id) => applyRemote((s) => removeBoard(s, id)),
        task: (row) => applyRemote((s) => applyTaskRow(s, row)),
        taskDeleted: (id) => applyRemote((s) => removeTask(s, id)),
      }),
    [userId, applyRemote],
  );

  useEffect(() => {
    try {
      if (state.activeBoardId) localStorage.setItem(ACTIVE_BOARD_KEY, state.activeBoardId);
    } catch {
      /* sem armazenamento */
    }
  }, [state.activeBoardId]);

  // Avisa antes de fechar a aba com gravações pendentes.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pending.current > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return (
    <SyncContext.Provider value={sync}>
      <StateContext.Provider value={state}>
        <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
      </StateContext.Provider>
    </SyncContext.Provider>
  );
}

function FullScreenMessage({ title, detail, action }: { title: string; detail?: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex h-full items-center justify-center bg-stone-200 p-6">
      <div className="max-w-md text-center">
        <p className="text-lg font-semibold tracking-tight">{title}</p>
        {detail && <p className="mt-1 break-words text-sm text-stone-500">{detail}</p>}
        {action && (
          <button type="button" onClick={action.onClick} className="mt-4 rounded-xl bg-stone-900 px-3 py-2 text-xs font-medium text-stone-100 hover:bg-stone-800">
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

/** Dados sempre do banco: só existe store com usuário logado (o AuthGate garante a sessão). */
export function StoreProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!session) return null;
  // key: trocar de usuário recarrega tudo do zero.
  return (
    <RemoteStore key={session.user.id} userId={session.user.id}>
      {children}
    </RemoteStore>
  );
}

export function useAppState(): AppState {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error("useAppState fora do StoreProvider");
  return ctx;
}

export function useDispatch(): Dispatch<Action> {
  const ctx = useContext(DispatchContext);
  if (!ctx) throw new Error("useDispatch fora do StoreProvider");
  return ctx;
}

export function useSyncStatus(): SyncStatus {
  return useContext(SyncContext);
}
