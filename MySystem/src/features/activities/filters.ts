import type { Board, Priority, Task } from "@/types/activities";
import { daysUntil } from "@/lib/dates";

export type DueFilter = "all" | "overdue" | "week" | "none";

export interface Filters {
  search: string;
  tagIds: string[];
  columnIds: string[];
  priorities: Priority[];
  assignees: string[];
  due: DueFilter;
}

export const EMPTY_FILTERS: Filters = {
  search: "",
  tagIds: [],
  columnIds: [],
  priorities: [],
  assignees: [],
  due: "all",
};

export function activeFilterCount(f: Filters): number {
  return (
    (f.search.trim() ? 1 : 0) +
    f.tagIds.length +
    f.columnIds.length +
    f.priorities.length +
    f.assignees.length +
    (f.due !== "all" ? 1 : 0)
  );
}

export function isTaskDone(board: Board, task: Task): boolean {
  return board.columns.find((c) => c.id === task.columnId)?.isDone ?? false;
}

export function isOverdue(board: Board, task: Task, now = new Date()): boolean {
  return !!task.dueDate && !isTaskDone(board, task) && daysUntil(task.dueDate, now) < 0;
}

/** Etiquetas: a atividade precisa ter TODAS as selecionadas. Demais grupos: qualquer um dos selecionados. */
export function filterTasks(board: Board, f: Filters, now = new Date()): Task[] {
  const q = f.search.trim().toLowerCase();
  return board.tasks.filter((t) => {
    if (q) {
      const tagNames = board.tags.filter((tag) => t.tagIds.includes(tag.id)).map((tag) => tag.name);
      const haystack = [t.title, t.docCode, t.description, t.assignee, ...tagNames].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (f.tagIds.length && !f.tagIds.every((id) => t.tagIds.includes(id))) return false;
    if (f.columnIds.length && !f.columnIds.includes(t.columnId)) return false;
    if (f.priorities.length && !f.priorities.includes(t.priority)) return false;
    if (f.assignees.length && !f.assignees.includes(t.assignee || "")) return false;
    switch (f.due) {
      case "overdue":
        return isOverdue(board, t, now);
      case "week":
        return !!t.dueDate && !isTaskDone(board, t) && daysUntil(t.dueDate, now) >= 0 && daysUntil(t.dueDate, now) <= 7;
      case "none":
        return !t.dueDate;
      default:
        return true;
    }
  });
}

export function assigneesOf(board: Board): string[] {
  return [...new Set(board.tasks.map((t) => t.assignee.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/**
 * Data de criação que conta como movimento do time. Atividades vindas de planilha (quadros "import-…")
 * e ainda não tocadas no app carregam a data da planilha, que não é uma criação real: devolvem null.
 */
export function creationDate(board: Board, task: Task): string | null {
  if (board.id.startsWith("import-") && !task.updatedAt) return null;
  return task.createdAt;
}
