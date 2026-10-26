import { describe, expect, it } from "vitest";
import type { Board, Task } from "@/types/activities";
import { boardActivity, byPerson, flatten, NO_ASSIGNEE, people, personStats, summary } from "./metrics";

const NOW = new Date("2026-10-26T12:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const SINCE_30 = NOW.getTime() - 30 * 86_400_000;

const task = (id: string, columnId: string, over: Partial<Task> = {}): Task => ({
  id, title: id, docCode: "", description: "", columnId, tagIds: [], priority: "media", assignee: "",
  dueDate: "", checklist: [], comments: [], createdAt: daysAgo(100), completedAt: null, ...over,
});
const board = (id: string, tasks: Task[]): Board => ({
  id, name: id, description: "", tags: [], createdAt: "", tasks,
  columns: [{ id: "a", name: "A emitir", hue: "stone", isDone: false }, { id: "c", name: "Concluído", hue: "emerald", isDone: true }],
});

const boards = [
  board("calmo", [task("t1", "a", { assignee: "Ana" })]),
  board("agitado", [
    task("t2", "c", { assignee: "Victor Mattos", completedAt: daysAgo(3) }),
    task("t3", "a", { assignee: "Victor Mattos", createdAt: daysAgo(2), dueDate: "2026-10-01" }),
    task("t4", "a", { comments: [{ id: "c1", author: "Ana", text: "ok", createdAt: daysAgo(1) }] }),
  ]),
];

describe("painel", () => {
  const items = flatten(boards, NOW);

  it("ranqueia quadros pelas atividades movimentadas no período e omite os parados", () => {
    const ranking = boardActivity(items, SINCE_30);
    expect(ranking.map((r) => r.board.id)).toEqual(["agitado"]);
    expect(ranking[0]).toMatchObject({ moved: 3, created: 1, completed: 1, comments: 1, open: 2 });
  });

  it("reordenar sem trocar de etapa não conta: updatedAt igual à criação é ignorado", () => {
    const quiet = flatten([board("b", [task("x", "a", { createdAt: daysAgo(90), updatedAt: daysAgo(90) })])], NOW);
    expect(boardActivity(quiet, SINCE_30)).toEqual([]);
  });

  it("filtra por responsável e calcula estatísticas por pessoa", () => {
    const victor = byPerson(items, "Victor Mattos");
    expect(summary(victor, SINCE_30, NOW)).toMatchObject({ total: 2, done: 1, open: 1, overdue: 1, doneInPeriod: 1, completion: 50 });
    const stats = personStats(items, SINCE_30);
    expect(stats.map((p) => p.name)).toEqual(["Victor Mattos", "Ana", NO_ASSIGNEE]);
    expect(stats[0]).toMatchObject({ open: 1, overdue: 1, done: 1, boards: 1 });
  });

  it("lista pessoas em ordem alfabética com 'Sem responsável' por último", () => {
    expect(people(items)).toEqual(["Ana", "Victor Mattos", NO_ASSIGNEE]);
  });
});

describe("quadros importados", () => {
  it("a data de criação vinda da planilha não conta como movimento; conclusão e edição no app contam", () => {
    const imported: Board = {
      ...board("import-ld-504-rev-e-u-22", [
        task("snap", "a", { createdAt: daysAgo(25) }),
        task("done", "c", { createdAt: daysAgo(25), completedAt: daysAgo(5) }),
        task("touched", "a", { createdAt: daysAgo(25), updatedAt: daysAgo(2) }),
      ]),
    };
    const [a] = boardActivity(flatten([imported], NOW), SINCE_30);
    expect(a).toMatchObject({ moved: 2, created: 1, completed: 1 });
  });
});
