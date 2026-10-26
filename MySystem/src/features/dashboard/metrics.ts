import type { Board, Task } from "@/types/activities";
import { creationDate, isOverdue, isTaskDone } from "@/features/activities/filters";
import { daysUntil } from "@/lib/dates";

const DAY = 86_400_000;
export const NO_ASSIGNEE = "Sem responsável";

/** Uma atividade com o quadro a que pertence e a situação já calculada. */
export interface Item {
  board: Board;
  task: Task;
  done: boolean;
  overdue: boolean;
  person: string;
}

export function flatten(boards: Board[], now = new Date()): Item[] {
  return boards.flatMap((board) =>
    board.tasks.map((task) => ({
      board,
      task,
      done: isTaskDone(board, task),
      overdue: isOverdue(board, task, now),
      person: task.assignee.trim() || NO_ASSIGNEE,
    })),
  );
}

/** `null` = todas as pessoas. */
export function byPerson(items: Item[], person: string | null): Item[] {
  return person === null ? items : items.filter((i) => i.person === person);
}

export function people(items: Item[]): string[] {
  const names = [...new Set(items.map((i) => i.person))].filter((n) => n !== NO_ASSIGNEE);
  names.sort((a, b) => a.localeCompare(b, "pt-BR"));
  return items.some((i) => i.person === NO_ASSIGNEE) ? [...names, NO_ASSIGNEE] : names;
}

const within = (iso: string | null | undefined, since: number) => !!iso && new Date(iso).getTime() >= since;

/** O que aconteceu com a atividade no período. */
export function eventsSince(board: Board, task: Task, done: boolean, since: number) {
  const created = within(creationDate(board, task), since);
  const completed = done && within(task.completedAt, since);
  const comments = task.comments.filter((c) => within(c.createdAt, since)).length;
  // updatedAt também é gravado na criação; só conta como movimentação a mais quando é outro momento.
  const updated = within(task.updatedAt, since) && task.updatedAt !== task.createdAt;
  return { created, completed, comments, moved: created || completed || comments > 0 || updated };
}

export interface BoardActivity {
  board: Board;
  moved: number;
  created: number;
  completed: number;
  comments: number;
  open: number;
}

/** Quadros ordenados pela quantidade de atividades movimentadas no período (só os que tiveram movimento). */
export function boardActivity(items: Item[], since: number): BoardActivity[] {
  const map = new Map<string, BoardActivity>();
  for (const i of items) {
    const a = map.get(i.board.id) ?? { board: i.board, moved: 0, created: 0, completed: 0, comments: 0, open: 0 };
    const e = eventsSince(i.board, i.task, i.done, since);
    if (e.moved) a.moved++;
    if (e.created) a.created++;
    if (e.completed) a.completed++;
    a.comments += e.comments;
    if (!i.done) a.open++;
    map.set(i.board.id, a);
  }
  return [...map.values()].filter((a) => a.moved > 0).sort((a, b) => b.moved - a.moved || b.completed - a.completed);
}

export interface PersonStats {
  name: string;
  total: number;
  open: number;
  overdue: number;
  done: number;
  doneInPeriod: number;
  movedInPeriod: number;
  completion: number;
  boards: number;
  avgLeadDays: number | null;
}

export function personStats(items: Item[], since: number): PersonStats[] {
  const groups = new Map<string, Item[]>();
  for (const i of items) {
    const list = groups.get(i.person);
    if (list) list.push(i);
    else groups.set(i.person, [i]);
  }
  return [...groups.entries()]
    .map(([name, list]) => {
      const done = list.filter((i) => i.done);
      const leads = done
        .filter((i) => i.task.completedAt)
        .map((i) => (new Date(i.task.completedAt!).getTime() - new Date(i.task.createdAt).getTime()) / DAY)
        .filter((d) => d >= 0);
      return {
        name,
        total: list.length,
        open: list.length - done.length,
        overdue: list.filter((i) => i.overdue).length,
        done: done.length,
        doneInPeriod: done.filter((i) => within(i.task.completedAt, since)).length,
        movedInPeriod: list.filter((i) => eventsSince(i.board, i.task, i.done, since).moved).length,
        completion: list.length ? Math.round((done.length / list.length) * 100) : 0,
        boards: new Set(list.map((i) => i.board.id)).size,
        avgLeadDays: leads.length ? leads.reduce((a, b) => a + b, 0) / leads.length : null,
      };
    })
    .sort((a, b) => (a.name === NO_ASSIGNEE ? 1 : b.name === NO_ASSIGNEE ? -1 : b.open - a.open || b.done - a.done));
}

export function summary(items: Item[], since: number, now = new Date()) {
  const done = items.filter((i) => i.done);
  const open = items.filter((i) => !i.done);
  return {
    total: items.length,
    open: open.length,
    done: done.length,
    overdue: items.filter((i) => i.overdue).length,
    dueSoon: open.filter((i) => i.task.dueDate && daysUntil(i.task.dueDate, now) >= 0 && daysUntil(i.task.dueDate, now) <= 7).length,
    doneInPeriod: done.filter((i) => within(i.task.completedAt, since)).length,
    movedInPeriod: items.filter((i) => eventsSince(i.board, i.task, i.done, since).moved).length,
    completion: items.length ? Math.round((done.length / items.length) * 100) : 0,
  };
}

function startOfWeek(d: Date): number {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return x.getTime() - ((x.getDay() + 6) % 7) * DAY;
}

/** Criadas x concluídas por semana (segunda a domingo), nas últimas `weeks` semanas. */
export function weekly(items: Item[], weeks: number, now = new Date()) {
  const first = startOfWeek(now) - (weeks - 1) * 7 * DAY;
  const bucket = (iso: string) => {
    const i = Math.floor((startOfWeek(new Date(iso)) - first) / (7 * DAY));
    return i >= 0 && i < weeks ? i : -1;
  };
  const created = Array<number>(weeks).fill(0);
  const completed = Array<number>(weeks).fill(0);
  for (const i of items) {
    const createdAt = creationDate(i.board, i.task);
    const c = createdAt ? bucket(createdAt) : -1;
    if (c >= 0) created[c]++;
    if (i.done && i.task.completedAt) {
      const k = bucket(i.task.completedAt);
      if (k >= 0) completed[k]++;
    }
  }
  const labels = Array.from({ length: weeks }, (_, i) =>
    new Date(first + i * 7 * DAY).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
  );
  return { labels, created, completed };
}

/** Distribuição por etapa somando os quadros pelo nome da etapa. */
export function byStage(items: Item[]) {
  const map = new Map<string, { name: string; hue: Board["columns"][number]["hue"]; count: number; order: number }>();
  for (const i of items) {
    const idx = i.board.columns.findIndex((c) => c.id === i.task.columnId);
    const col = i.board.columns[idx];
    if (!col) continue;
    const key = col.name.trim().toLowerCase();
    const e = map.get(key) ?? { name: col.name, hue: col.hue, count: 0, order: idx };
    e.count++;
    map.set(key, e);
  }
  return [...map.values()].sort((a, b) => a.order - b.order);
}

export function upcoming(items: Item[], limit = 6): Item[] {
  return items
    .filter((i) => !i.done && i.task.dueDate)
    .sort((a, b) => a.task.dueDate.localeCompare(b.task.dueDate))
    .slice(0, limit);
}
