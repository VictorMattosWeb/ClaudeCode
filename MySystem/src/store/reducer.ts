import type { AppState, Board, Column, Hue, Tag, Task } from "@/types/activities";
import { uid } from "@/lib/id";

export type Action =
  | { type: "board/create"; name: string; description: string; id?: string }
  | { type: "board/update"; boardId: string; name: string; description: string }
  | { type: "board/delete"; boardId: string }
  | { type: "board/select"; boardId: string }
  | { type: "board/applyColumns"; sourceBoardId: string }
  | { type: "column/add"; boardId: string; name: string; hue: Hue }
  | { type: "column/update"; boardId: string; columnId: string; patch: Partial<Omit<Column, "id">> }
  | { type: "column/delete"; boardId: string; columnId: string; moveTo: string | null }
  | { type: "column/move"; boardId: string; columnId: string; dir: -1 | 1 }
  | { type: "tag/add"; boardId: string; name: string; hue: Hue; id?: string }
  | { type: "tag/update"; boardId: string; tagId: string; patch: Partial<Omit<Tag, "id">> }
  | { type: "tag/delete"; boardId: string; tagId: string }
  | { type: "task/create"; boardId: string; task: Omit<Task, "id" | "createdAt" | "completedAt"> }
  | { type: "task/update"; boardId: string; taskId: string; patch: Partial<Omit<Task, "id" | "createdAt">> }
  | { type: "task/delete"; boardId: string; taskId: string }
  | { type: "task/move"; boardId: string; taskId: string; toColumnId: string; overTaskId: string | null };

/** Padrão de etapas de documentação (o mesmo da Documentação geral e dos quadros por área). */
export const DEFAULT_COLUMNS: Array<Omit<Column, "id">> = [
  { name: "A emitir", hue: "stone", isDone: false },
  { name: "Em andamento", hue: "amber", isDone: false },
  { name: "SIGEM", hue: "blue", isDone: false },
  { name: "Com comentários", hue: "orange", isDone: false },
  { name: "Recusado", hue: "rose", isDone: false },
  { name: "Concluído", hue: "emerald", isDone: true },
];

export function createBoard(name: string, description: string, now = new Date(), id = uid()): Board {
  return {
    id,
    name,
    description,
    columns: DEFAULT_COLUMNS.map((c) => ({ ...c, id: uid() })),
    tags: [],
    tasks: [],
    createdAt: now.toISOString(),
  };
}

function mapBoard(state: AppState, boardId: string, fn: (b: Board) => Board): AppState {
  return { ...state, boards: state.boards.map((b) => (b.id === boardId ? fn(b) : b)) };
}

function isDoneColumn(board: Board, columnId: string) {
  return board.columns.find((c) => c.id === columnId)?.isDone ?? false;
}

/** Recalcula completedAt quando a atividade troca de etapa. */
function withCompletion(board: Board, prev: Task, next: Task, now: string): Task {
  const wasDone = isDoneColumn(board, prev.columnId);
  const isDone = isDoneColumn(board, next.columnId);
  if (isDone && !wasDone) return { ...next, completedAt: now };
  if (!isDone && wasDone) return { ...next, completedAt: null };
  return next;
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Dá ao quadro `target` as etapas de `source` (nome, cor, ordem e conclusão).
 * Etapas com o mesmo nome mantêm o id e as atividades; atividades em etapas que não existem no modelo
 * vão para a primeira etapa do modelo. Quem entra/sai de uma etapa de conclusão tem completedAt recalculado.
 */
export function withColumnsOf(source: Board, target: Board, now: string): Board {
  if (!source.columns.length) return target;
  const columns: Column[] = source.columns.map((sc) => {
    const match = target.columns.find((tc) => sameName(tc.name, sc.name));
    return { ...sc, id: match?.id ?? uid() };
  });
  const ids = new Set(columns.map((c) => c.id));
  const fallback = columns[0].id;
  const next: Board = { ...target, columns };
  const tasks = target.tasks.map((t) => {
    const moved = ids.has(t.columnId) ? t : { ...t, columnId: fallback };
    const done = columns.find((c) => c.id === moved.columnId)!.isDone;
    if (done && !moved.completedAt) return { ...moved, completedAt: now };
    if (!done && moved.completedAt) return { ...moved, completedAt: null };
    return moved;
  });
  return { ...next, tasks };
}

/** Quantas atividades de cada quadro cairiam na primeira etapa por não haver etapa com o mesmo nome. */
export function columnsImpact(source: Board, boards: Board[]): { boards: number; displaced: number } {
  const names = source.columns.map((c) => c.name);
  let displaced = 0;
  let changed = 0;
  for (const b of boards) {
    if (b.id === source.id) continue;
    const same = b.columns.length === names.length && b.columns.every((c, i) => c.name === names[i] && c.hue === source.columns[i].hue && c.isDone === source.columns[i].isDone);
    if (!same) changed++;
    const kept = new Set(b.columns.filter((c) => names.some((n) => sameName(n, c.name))).map((c) => c.id));
    displaced += b.tasks.filter((t) => !kept.has(t.columnId)).length;
  }
  return { boards: changed, displaced };
}

export function reducer(state: AppState, action: Action, now = new Date().toISOString()): AppState {
  switch (action.type) {
    case "board/create": {
      const board = createBoard(action.name, action.description, new Date(now), action.id);
      return { ...state, boards: [...state.boards, board], activeBoardId: board.id };
    }
    case "board/update":
      return mapBoard(state, action.boardId, (b) => ({ ...b, name: action.name, description: action.description }));
    case "board/delete": {
      const boards = state.boards.filter((b) => b.id !== action.boardId);
      const activeBoardId = state.activeBoardId === action.boardId ? (boards[0]?.id ?? null) : state.activeBoardId;
      return { ...state, boards, activeBoardId };
    }
    case "board/select":
      return { ...state, activeBoardId: action.boardId };
    case "board/applyColumns": {
      const source = state.boards.find((b) => b.id === action.sourceBoardId);
      if (!source) return state;
      return {
        ...state,
        boards: state.boards.map((b) => (b.id === source.id ? b : withColumnsOf(source, b, now))),
      };
    }

    case "column/add":
      return mapBoard(state, action.boardId, (b) => ({
        ...b,
        columns: [...b.columns, { id: uid(), name: action.name, hue: action.hue, isDone: false }],
      }));
    case "column/update":
      return mapBoard(state, action.boardId, (b) => {
        const columns = b.columns.map((c) => (c.id === action.columnId ? { ...c, ...action.patch } : c));
        // Marcar/desmarcar a etapa como "concluída" reflete nas atividades que já estão nela.
        if (action.patch.isDone === undefined) return { ...b, columns };
        const tasks = b.tasks.map((t) => {
          if (t.columnId !== action.columnId) return t;
          if (action.patch.isDone) return t.completedAt ? t : { ...t, completedAt: now };
          return { ...t, completedAt: null };
        });
        return { ...b, columns, tasks };
      });
    case "column/delete":
      return mapBoard(state, action.boardId, (b) => {
        const columns = b.columns.filter((c) => c.id !== action.columnId);
        const target = action.moveTo ? { ...b, columns } : b;
        const tasks = action.moveTo
          ? b.tasks.map((t) =>
              t.columnId === action.columnId
                ? withCompletion(target, t, { ...t, columnId: action.moveTo! }, now)
                : t,
            )
          : b.tasks.filter((t) => t.columnId !== action.columnId);
        return { ...b, columns, tasks };
      });
    case "column/move":
      return mapBoard(state, action.boardId, (b) => {
        const i = b.columns.findIndex((c) => c.id === action.columnId);
        const j = i + action.dir;
        if (i < 0 || j < 0 || j >= b.columns.length) return b;
        const columns = [...b.columns];
        [columns[i], columns[j]] = [columns[j], columns[i]];
        return { ...b, columns };
      });

    case "tag/add":
      return mapBoard(state, action.boardId, (b) => ({
        ...b,
        tags: [...b.tags, { id: action.id ?? uid(), name: action.name, hue: action.hue }],
      }));
    case "tag/update":
      return mapBoard(state, action.boardId, (b) => ({
        ...b,
        tags: b.tags.map((t) => (t.id === action.tagId ? { ...t, ...action.patch } : t)),
      }));
    case "tag/delete":
      return mapBoard(state, action.boardId, (b) => ({
        ...b,
        tags: b.tags.filter((t) => t.id !== action.tagId),
        tasks: b.tasks.map((t) => ({ ...t, tagIds: t.tagIds.filter((id) => id !== action.tagId) })),
      }));

    case "task/create":
      return mapBoard(state, action.boardId, (b) => {
        const task: Task = {
          ...action.task,
          id: uid(),
          createdAt: now,
          updatedAt: now,
          completedAt: isDoneColumn(b, action.task.columnId) ? now : null,
        };
        return { ...b, tasks: [...b.tasks, task] };
      });
    case "task/update":
      return mapBoard(state, action.boardId, (b) => ({
        ...b,
        tasks: b.tasks.map((t) => (t.id === action.taskId ? withCompletion(b, t, { ...t, ...action.patch, updatedAt: now }, now) : t)),
      }));
    case "task/delete":
      return mapBoard(state, action.boardId, (b) => ({ ...b, tasks: b.tasks.filter((t) => t.id !== action.taskId) }));
    case "task/move":
      return mapBoard(state, action.boardId, (b) => {
        const current = b.tasks.find((t) => t.id === action.taskId);
        if (!current) return b;
        // Reordenar dentro da mesma etapa não conta como movimentação.
        const changedColumn = current.columnId !== action.toColumnId;
        const moved = withCompletion(
          b,
          current,
          { ...current, columnId: action.toColumnId, updatedAt: changedColumn ? now : current.updatedAt },
          now,
        );
        const rest = b.tasks.filter((t) => t.id !== action.taskId);
        let index = action.overTaskId ? rest.findIndex((t) => t.id === action.overTaskId) : -1;
        if (index < 0) {
          // Sem alvo: vai para o fim da coluna de destino.
          const lastInColumn = rest.map((t) => t.columnId).lastIndexOf(action.toColumnId);
          index = lastInColumn + 1 || rest.length;
        }
        rest.splice(index, 0, moved);
        return { ...b, tasks: rest };
      });
  }
}
