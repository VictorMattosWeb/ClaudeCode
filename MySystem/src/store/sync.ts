import type { AppState, Board, Task } from "@/types/activities";

/** Linha da tabela `boards`. */
export interface BoardRow {
  id: string;
  name: string;
  description: string;
  columns: Board["columns"];
  tags: Board["tags"];
  position: number;
  created_at?: string;
  updated_by?: string | null;
}

/** Linha da tabela `tasks`: os campos da atividade vão em `data`. */
export interface TaskRow {
  id: string;
  board_id: string;
  position: number;
  data: Omit<Task, "id">;
  updated_by?: string | null;
}

export interface Changes {
  boardsUpsert: BoardRow[];
  tasksUpsert: TaskRow[];
  tasksDelete: string[];
  boardsDelete: string[];
}

export const isEmpty = (c: Changes) =>
  !c.boardsUpsert.length && !c.tasksUpsert.length && !c.tasksDelete.length && !c.boardsDelete.length;

export function boardRow(b: Board, position: number): BoardRow {
  return { id: b.id, name: b.name, description: b.description, columns: b.columns, tags: b.tags, position, created_at: b.createdAt || undefined };
}

export function taskRow(boardId: string, t: Task, position: number): TaskRow {
  const { id, ...data } = t;
  return { id, board_id: boardId, position, data };
}

export function fromRows(boards: BoardRow[], tasks: TaskRow[]): Board[] {
  const byBoard = new Map<string, TaskRow[]>();
  for (const t of tasks) {
    const list = byBoard.get(t.board_id);
    if (list) list.push(t);
    else byBoard.set(t.board_id, [t]);
  }
  return [...boards]
    .sort((a, b) => a.position - b.position)
    .map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      columns: r.columns ?? [],
      tags: r.tags ?? [],
      createdAt: r.created_at ?? "",
      tasks: (byBoard.get(r.id) ?? []).sort((a, b) => a.position - b.position).map(rowToTask),
    }));
}

function rowToTask(r: TaskRow): Task {
  return { ...r.data, id: r.id, comments: r.data.comments ?? [], docCode: r.data.docCode ?? "" };
}

/**
 * O que precisa ir para o banco para levar `prev` a `next`. Usa a imutabilidade do reducer:
 * só objetos que mudaram de referência (ou de posição) são enviados.
 */
export function diffState(prev: AppState, next: AppState): Changes {
  const changes: Changes = { boardsUpsert: [], tasksUpsert: [], tasksDelete: [], boardsDelete: [] };
  if (prev.boards === next.boards) return changes;
  const before = new Map(prev.boards.map((b, i) => [b.id, { b, i }]));

  next.boards.forEach((b, i) => {
    const p = before.get(b.id);
    const metaChanged =
      !p || p.i !== i || p.b.name !== b.name || p.b.description !== b.description || p.b.columns !== b.columns || p.b.tags !== b.tags;
    if (metaChanged) changes.boardsUpsert.push(boardRow(b, i));
    if (p && p.b.tasks === b.tasks) return;

    const prevTasks = new Map((p?.b.tasks ?? []).map((t, j) => [t.id, { t, j }]));
    b.tasks.forEach((t, j) => {
      const pt = prevTasks.get(t.id);
      if (!pt || pt.t !== t || pt.j !== j) changes.tasksUpsert.push(taskRow(b.id, t, j));
      prevTasks.delete(t.id);
    });
    prevTasks.forEach((_, id) => changes.tasksDelete.push(id));
  });

  const nextIds = new Set(next.boards.map((b) => b.id));
  for (const b of prev.boards) if (!nextIds.has(b.id)) changes.boardsDelete.push(b.id);
  return changes;
}

/** Tudo do estado como inserção (envio inicial dos dados do navegador para o banco). */
export function allAsChanges(state: AppState): Changes {
  return diffState({ boards: [], activeBoardId: null }, state);
}

/* --------------------------------------------- mudanças vindas de outros usuários (realtime) */

export function applyBoardRow(state: AppState, row: BoardRow): AppState {
  const existing = state.boards.find((b) => b.id === row.id);
  const meta = { name: row.name, description: row.description, columns: row.columns ?? [], tags: row.tags ?? [] };
  if (existing) return { ...state, boards: state.boards.map((b) => (b.id === row.id ? { ...b, ...meta } : b)) };
  const board: Board = { id: row.id, ...meta, tasks: [], createdAt: row.created_at ?? "" };
  const boards = [...state.boards];
  boards.splice(Math.min(row.position, boards.length), 0, board);
  return { ...state, boards };
}

export function removeBoard(state: AppState, id: string): AppState {
  if (!state.boards.some((b) => b.id === id)) return state;
  return { ...state, boards: state.boards.filter((b) => b.id !== id) };
}

export function applyTaskRow(state: AppState, row: TaskRow): AppState {
  if (!state.boards.some((b) => b.id === row.board_id)) return state;
  const task = rowToTask(row);
  return {
    ...state,
    boards: state.boards.map((b) => {
      const without = b.tasks.some((t) => t.id === row.id) ? b.tasks.filter((t) => t.id !== row.id) : b.tasks;
      if (b.id !== row.board_id) return without === b.tasks ? b : { ...b, tasks: without };
      const tasks = [...without];
      tasks.splice(Math.min(row.position, tasks.length), 0, task);
      return { ...b, tasks };
    }),
  };
}

export function removeTask(state: AppState, id: string): AppState {
  const board = state.boards.find((b) => b.tasks.some((t) => t.id === id));
  if (!board) return state;
  return { ...state, boards: state.boards.map((b) => (b.id === board.id ? { ...b, tasks: b.tasks.filter((t) => t.id !== id) } : b)) };
}
