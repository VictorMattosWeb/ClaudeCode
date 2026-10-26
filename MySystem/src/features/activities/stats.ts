import type { Board, Column, Tag, Task } from "@/types/activities";
import { daysUntil } from "@/lib/dates";
import { creationDate, isOverdue, isTaskDone } from "./filters";

const DAY = 86_400_000;

export interface BoardStats {
  total: number;
  done: number;
  open: number;
  overdue: number;
  dueThisWeek: number;
  completedLast7: number;
  createdLast7: number;
  completion: number;
  avgLeadDays: number | null;
  byColumn: Array<{ column: Column; count: number }>;
  byTag: Array<{ tag: Tag; total: number; done: number }>;
  byAssignee: Array<{ name: string; open: number; done: number }>;
  weekly: { labels: string[]; created: number[]; completed: number[] };
  upcoming: Task[];
}

function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // segunda = 0
  return new Date(x.getTime() - dow * DAY);
}

export function computeStats(board: Board, tasks: Task[], now = new Date(), weeks = 8): BoardStats {
  const done = tasks.filter((t) => isTaskDone(board, t));
  const open = tasks.filter((t) => !isTaskDone(board, t));
  const weekAgo = now.getTime() - 7 * DAY;

  const leadTimes = done
    .filter((t) => t.completedAt)
    .map((t) => (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) / DAY);

  const thisWeek = startOfWeek(now).getTime();
  const firstWeek = thisWeek - (weeks - 1) * 7 * DAY;
  const bucket = (iso: string) => {
    const i = Math.floor((startOfWeek(new Date(iso)).getTime() - firstWeek) / (7 * DAY));
    return i >= 0 && i < weeks ? i : -1;
  };
  const created = Array(weeks).fill(0) as number[];
  const completed = Array(weeks).fill(0) as number[];
  for (const t of tasks) {
    const createdAt = creationDate(board, t);
    const c = createdAt ? bucket(createdAt) : -1;
    if (c >= 0) created[c]++;
    if (t.completedAt && isTaskDone(board, t)) {
      const k = bucket(t.completedAt);
      if (k >= 0) completed[k]++;
    }
  }
  const labels = Array.from({ length: weeks }, (_, i) =>
    new Date(firstWeek + i * 7 * DAY).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
  );

  const assignees = new Map<string, { open: number; done: number }>();
  for (const t of tasks) {
    const name = t.assignee.trim() || "Sem responsável";
    const entry = assignees.get(name) ?? { open: 0, done: 0 };
    if (isTaskDone(board, t)) entry.done++;
    else entry.open++;
    assignees.set(name, entry);
  }

  return {
    total: tasks.length,
    done: done.length,
    open: open.length,
    overdue: open.filter((t) => isOverdue(board, t, now)).length,
    dueThisWeek: open.filter((t) => t.dueDate && daysUntil(t.dueDate, now) >= 0 && daysUntil(t.dueDate, now) <= 7).length,
    completedLast7: done.filter((t) => t.completedAt && new Date(t.completedAt).getTime() >= weekAgo).length,
    createdLast7: tasks.filter((t) => {
      const c = creationDate(board, t);
      return !!c && new Date(c).getTime() >= weekAgo;
    }).length,
    completion: tasks.length ? Math.round((done.length / tasks.length) * 100) : 0,
    avgLeadDays: leadTimes.length ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : null,
    byColumn: board.columns.map((column) => ({ column, count: tasks.filter((t) => t.columnId === column.id).length })),
    byTag: board.tags
      .map((tag) => {
        const tagged = tasks.filter((t) => t.tagIds.includes(tag.id));
        return { tag, total: tagged.length, done: tagged.filter((t) => isTaskDone(board, t)).length };
      })
      .sort((a, b) => b.total - a.total),
    byAssignee: [...assignees.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.open - a.open || b.done - a.done),
    weekly: { labels, created, completed },
    upcoming: open
      .filter((t) => t.dueDate)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5),
  };
}
