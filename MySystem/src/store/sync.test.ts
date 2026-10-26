import { describe, expect, it } from "vitest";
import { reducer } from "./reducer";
import { allAsChanges, applyTaskRow, diffState, fromRows, removeTask, taskRow } from "./sync";
import type { AppState } from "@/types/activities";

const NOW = "2026-10-26T12:00:00.000Z";
const newTask = (title: string, columnId: string) => ({
  title, docCode: "", description: "", columnId, tagIds: [], priority: "media" as const, assignee: "", dueDate: "", checklist: [], comments: [],
});

function setup(): AppState {
  let s: AppState = { boards: [], activeBoardId: null };
  s = reducer(s, { type: "board/create", name: "A", description: "", id: "a" }, NOW);
  s = reducer(s, { type: "board/create", name: "B", description: "", id: "b" }, NOW);
  for (const t of ["t1", "t2", "t3"]) s = reducer(s, { type: "task/create", boardId: "a", task: newTask(t, s.boards[0].columns[0].id) }, NOW);
  return s;
}

describe("diffState", () => {
  it("editar uma atividade envia só ela", () => {
    const s = setup();
    const id = s.boards[0].tasks[1].id;
    const next = reducer(s, { type: "task/update", boardId: "a", taskId: id, patch: { title: "novo" } }, NOW);
    const c = diffState(s, next);
    expect(c.boardsUpsert).toEqual([]);
    expect(c.tasksUpsert.map((r) => r.id)).toEqual([id]);
    expect(c.tasksUpsert[0].data.title).toBe("novo");
  });

  it("reordenar envia as atividades que mudaram de posição", () => {
    const s = setup();
    const [t1, , t3] = s.boards[0].tasks;
    const next = reducer(s, { type: "task/move", boardId: "a", taskId: t3.id, toColumnId: t3.columnId, overTaskId: t1.id }, NOW);
    const c = diffState(s, next);
    expect(c.tasksUpsert.map((r) => [r.id, r.position])).toEqual(
      next.boards[0].tasks.map((t, i) => [t.id, i]),
    );
  });

  it("excluir quadro envia a exclusão e reposiciona os seguintes; atividades saem em cascata no banco", () => {
    const s = setup();
    const next = reducer(s, { type: "board/delete", boardId: "a" }, NOW);
    const c = diffState(s, next);
    expect(c.boardsDelete).toEqual(["a"]);
    expect(c.tasksDelete).toEqual([]);
    expect(c.boardsUpsert.map((r) => [r.id, r.position])).toEqual([["b", 0]]);
  });

  it("selecionar quadro (preferência local) não gera escrita", () => {
    const s = setup();
    expect(diffState(s, reducer(s, { type: "board/select", boardId: "b" }, NOW))).toEqual({ boardsUpsert: [], tasksUpsert: [], tasksDelete: [], boardsDelete: [] });
  });
});

describe("ida e volta pelo banco", () => {
  it("allAsChanges + fromRows reconstrói os quadros na mesma ordem", () => {
    const s = setup();
    const c = allAsChanges(s);
    const boards = fromRows(c.boardsUpsert, [...c.tasksUpsert].reverse());
    expect(boards.map((b) => b.id)).toEqual(["a", "b"]);
    expect(boards[0].tasks.map((t) => t.title)).toEqual(["t1", "t2", "t3"]);
    expect(boards[0].columns).toEqual(s.boards[0].columns);
  });

  it("mudança remota de atividade entra na posição certa e exclusão remota remove", () => {
    const s = setup();
    const t3 = s.boards[0].tasks[2];
    const moved = applyTaskRow(s, taskRow("a", { ...t3, title: "remoto" }, 0));
    expect(moved.boards[0].tasks.map((t) => t.title)).toEqual(["remoto", "t1", "t2"]);
    expect(removeTask(moved, t3.id).boards[0].tasks).toHaveLength(2);
  });
});
