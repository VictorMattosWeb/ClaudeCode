import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, LayoutGrid, Plus, Search } from "lucide-react";
import type { Board, Hue } from "@/types/activities";
import { Card, Dot, IconTile, PrimaryButton, ProgressBar } from "@/components/ui/primitives";
import { cx } from "@/lib/cx";
import { HUES } from "@/lib/hues";
import { useAppState } from "@/store/StoreProvider";
import { BoardDialog } from "../dialogs/BoardDialog";
import { isOverdue, isTaskDone } from "../filters";

interface BoardSummary {
  board: Board;
  total: number;
  done: number;
  overdue: number;
  completion: number;
  byColumn: Array<{ id: string; name: string; hue: Hue; isDone: boolean; count: number }>;
}

function summarize(board: Board): BoardSummary {
  const done = board.tasks.filter((t) => isTaskDone(board, t)).length;
  return {
    board,
    total: board.tasks.length,
    done,
    overdue: board.tasks.filter((t) => isOverdue(board, t)).length,
    completion: board.tasks.length ? Math.round((done / board.tasks.length) * 100) : 0,
    byColumn: board.columns.map((c) => ({ ...c, count: board.tasks.filter((t) => t.columnId === c.id).length })),
  };
}

/** Soma as etapas de todos os quadros pelo nome (os quadros seguem o mesmo padrão de etapas). */
function aggregate(summaries: BoardSummary[]) {
  const map = new Map<string, { name: string; hue: Hue; isDone: boolean; count: number }>();
  for (const s of summaries) {
    for (const c of s.byColumn) {
      const key = c.name.trim().toLowerCase();
      const entry = map.get(key) ?? { name: c.name, hue: c.hue, isDone: c.isDone, count: 0 };
      entry.count += c.count;
      map.set(key, entry);
    }
  }
  return [...map.values()];
}

type Sort = "pendencias" | "nome" | "progresso";

/** Barra empilhada com a distribuição das atividades por etapa. */
function StackedBar({ parts, total }: { parts: BoardSummary["byColumn"]; total: number }) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-stone-200">
      {total > 0 &&
        parts
          .filter((p) => p.count)
          .map((p) => (
            <div key={p.id} className={cx("h-full", HUES[p.hue].dot)} style={{ width: `${(p.count / total) * 100}%` }} title={`${p.name}: ${p.count}`} />
          ))}
    </div>
  );
}

function BoardCard({ s, onOpen }: { s: BoardSummary; onOpen: () => void }) {
  return (
    <Card className="group flex cursor-pointer flex-col p-6 transition-shadow hover:shadow-deep" onClick={onOpen}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-tight">{s.board.name}</h2>
          <p className="truncate text-sm text-stone-500">{s.board.description || `${s.board.columns.length} etapas`}</p>
        </div>
        <span className="rounded-xl p-2 text-stone-500 ring-1 ring-transparent group-hover:bg-stone-50 group-hover:ring-stone-200">
          <ArrowRight className="h-5 w-5" />
        </span>
      </div>

      <div className="flex items-end justify-between">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {s.completion}%<span className="ml-1 text-base font-medium text-stone-500">concluído</span>
        </p>
        <p className="text-sm text-stone-500 tabular-nums">
          {s.done}/{s.total}
        </p>
      </div>
      <div className="mt-3">
        <StackedBar parts={s.byColumn} total={s.total} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {s.byColumn.map((c) => (
          <div
            key={c.id}
            className={cx("flex items-center gap-2 rounded-xl px-3 py-2 ring-1", c.count ? HUES[c.hue].surface : "bg-stone-50 ring-stone-200")}
          >
            <Dot hue={c.hue} />
            <span className={cx("min-w-0 flex-1 truncate text-xs font-medium", c.count ? "text-stone-700" : "text-stone-400")}>{c.name}</span>
            <span className={cx("text-sm font-semibold tabular-nums", !c.count && "text-stone-400")}>{c.count}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-stone-200 pt-4">
        {s.overdue > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            {s.overdue} atrasada{s.overdue > 1 ? "s" : ""}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Em dia
          </span>
        )}
        <span className="text-xs text-stone-500">{s.total} atividade{s.total === 1 ? "" : "s"}</span>
      </div>
    </Card>
  );
}

export function BoardsOverview() {
  const { boards } = useAppState();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("pendencias");
  const [creating, setCreating] = useState(false);

  const summaries = useMemo(() => boards.map(summarize), [boards]);
  const totals = useMemo(() => aggregate(summaries), [summaries]);
  const all = summaries.reduce((n, s) => n + s.total, 0);
  const done = summaries.reduce((n, s) => n + s.done, 0);
  const overdue = summaries.reduce((n, s) => n + s.overdue, 0);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = summaries.filter((s) => !q || `${s.board.name} ${s.board.description}`.toLowerCase().includes(q));
    return list.sort((a, b) =>
      sort === "nome"
        ? a.board.name.localeCompare(b.board.name, "pt-BR", { numeric: true })
        : sort === "progresso"
          ? b.completion - a.completion || b.total - a.total
          : b.total - b.done - (a.total - a.done) || a.board.name.localeCompare(b.board.name, "pt-BR"),
    );
  }, [summaries, query, sort]);

  return (
    <div className="ds-scroll h-full overflow-y-auto">
      <div className="px-4 pt-2 pb-10 md:px-8 md:pt-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-stone-500">Atividades</p>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Visão geral dos quadros</h1>
            <p className="text-sm text-stone-500">
              {boards.length} quadro{boards.length === 1 ? "" : "s"} · {all} atividades
            </p>
          </div>
          <PrimaryButton icon={Plus} className="py-2" onClick={() => setCreating(true)}>
            Novo quadro
          </PrimaryButton>
        </header>

        {/* Resumo geral: hero ink + um contador por etapa */}
        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <article className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-stone-900 p-6 shadow-deep lg:col-span-4">
            <div>
              <p className="text-sm text-stone-300">Progresso geral</p>
              <p className="mt-2 text-5xl font-semibold tracking-tight text-white tabular-nums">{all ? Math.round((done / all) * 100) : 0}%</p>
              <p className="mt-1 text-sm text-stone-200">
                {done} de {all} concluídas
              </p>
            </div>
            <div className="mt-6">
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-stone-700">
                {all > 0 &&
                  totals
                    .filter((t) => t.count)
                    .map((t) => <div key={t.name} className={cx("h-full", HUES[t.hue].dot)} style={{ width: `${(t.count / all) * 100}%` }} />)}
              </div>
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-rose-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                {overdue} atividade{overdue === 1 ? "" : "s"} atrasada{overdue === 1 ? "" : "s"}
              </p>
            </div>
          </article>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:col-span-8 xl:grid-cols-5">
            {totals.map((t) => (
              <Card key={t.name} className="p-5">
                {/* Cabeçalho do stat card do DS: rótulo + ícone h-4 tingido */}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug text-stone-500">{t.name}</p>
                  {t.isDone ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Dot hue={t.hue} className="mt-1.5" />
                  )}
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{t.count}</p>
                <ProgressBar value={all ? (t.count / all) * 100 : 0} hue={t.hue} className="mt-3" />
                <p className="mt-2 text-xs text-stone-500">{all ? Math.round((t.count / all) * 100) : 0}% do total</p>
              </Card>
            ))}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Quadros</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar quadro…"
                className="w-56 rounded-xl py-2 pl-9 pr-3 text-sm ring-1 bg-stone-50 ring-stone-200 placeholder:text-stone-400 outline-none focus:bg-white focus:ring-2 focus:ring-stone-900"
              />
            </label>
            <div className="flex items-center gap-2 text-xs font-medium text-stone-600">
              {(
                [
                  ["pendencias", "Mais pendências"],
                  ["progresso", "Progresso"],
                  ["nome", "Nome"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSort(value)}
                  className={cx(
                    "rounded-xl px-3 py-2 transition-colors",
                    sort === value ? "bg-stone-900 text-stone-100" : "ring-1 bg-stone-50 ring-stone-200 hover:text-stone-900",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {visible.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {visible.map((s) => (
              <BoardCard key={s.board.id} s={s} onOpen={() => navigate(`/atividades/${s.board.id}`)} />
            ))}
          </div>
        ) : (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <IconTile icon={LayoutGrid} hue="stone" />
            <p className="font-medium">{boards.length ? "Nenhum quadro encontrado" : "Nenhum quadro ainda"}</p>
            <p className="text-sm text-stone-500">{boards.length ? "Ajuste a busca." : "Crie um quadro para cada contexto de trabalho."}</p>
          </Card>
        )}
      </div>

      <BoardDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => navigate(`/atividades/${id}`)}
      />
    </div>
  );
}
