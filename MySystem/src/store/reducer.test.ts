import { describe, expect, it } from "vitest";
import { reducer } from "./reducer";
import { seedState } from "./seed";
import { EMPTY_FILTERS, filterTasks } from "@/features/activities/filters";
import type { AppState } from "@/types/activities";

const NOW = "2026-10-26T12:00:00.000Z";
const run = (s: AppState, ...actions: Parameters<typeof reducer>[1][]) => actions.reduce((acc, a) => reducer(acc, a, NOW), s);

describe("reducer", () => {
  it("cria quadro com etapas padrão e o seleciona", () => {
    const s = run({ boards: [], activeBoardId: null }, { type: "board/create", name: "UTE", description: "" });
    expect(s.boards).toHaveLength(1);
    expect(s.activeBoardId).toBe(s.boards[0].id);
    expect(s.boards[0].columns.map((c) => c.name)).toEqual(["A emitir", "Em andamento", "SIGEM", "Com comentários", "Recusado", "Concluído"]);
  });

  it("marca completedAt ao entrar na etapa de conclusão e limpa ao sair", () => {
    let s = run({ boards: [], activeBoardId: null }, { type: "board/create", name: "B", description: "" });
    const b = s.boards[0];
    s = run(s, { type: "task/create", boardId: b.id, task: { title: "T", description: "", columnId: b.columns[0].id, tagIds: [], priority: "media", assignee: "", dueDate: "", checklist: [], docCode: "", comments: [] } });
    const id = s.boards[0].tasks[0].id;
    s = run(s, { type: "task/move", boardId: b.id, taskId: id, toColumnId: b.columns[5].id, overTaskId: null });
    expect(s.boards[0].tasks[0].completedAt).toBe(NOW);
    s = run(s, { type: "task/move", boardId: b.id, taskId: id, toColumnId: b.columns[0].id, overTaskId: null });
    expect(s.boards[0].tasks[0].completedAt).toBeNull();
  });

  it("insere antes da atividade alvo ao reordenar", () => {
    let s = run({ boards: [], activeBoardId: null }, { type: "board/create", name: "B", description: "" });
    const b = s.boards[0];
    for (const title of ["A", "B", "C"]) {
      s = run(s, { type: "task/create", boardId: b.id, task: { title, description: "", columnId: b.columns[0].id, tagIds: [], priority: "media", assignee: "", dueDate: "", checklist: [], docCode: "", comments: [] } });
    }
    const [a, , c] = s.boards[0].tasks;
    s = run(s, { type: "task/move", boardId: b.id, taskId: c.id, toColumnId: b.columns[0].id, overTaskId: a.id });
    expect(s.boards[0].tasks.map((t) => t.title)).toEqual(["C", "A", "B"]);
  });

  it("excluir etapa move as atividades para o destino escolhido", () => {
    let s = seedState(new Date(NOW));
    const b = s.boards[0];
    const [backlog, planejado] = b.columns;
    const inBacklog = b.tasks.filter((t) => t.columnId === backlog.id).length;
    s = run(s, { type: "column/delete", boardId: b.id, columnId: backlog.id, moveTo: planejado.id });
    const nb = s.boards[0];
    expect(nb.columns.find((c) => c.id === backlog.id)).toBeUndefined();
    expect(nb.tasks).toHaveLength(b.tasks.length);
    expect(nb.tasks.filter((t) => t.columnId === planejado.id).length).toBe(inBacklog + b.tasks.filter((t) => t.columnId === planejado.id).length);
  });

  it("excluir etiqueta a remove das atividades", () => {
    let s = seedState(new Date(NOW));
    const b = s.boards[0];
    const tag = b.tags[0];
    s = run(s, { type: "tag/delete", boardId: b.id, tagId: tag.id });
    expect(s.boards[0].tasks.some((t) => t.tagIds.includes(tag.id))).toBe(false);
  });
});

describe("filterTasks", () => {
  it("combina etiquetas (todas) com etapas (qualquer)", () => {
    const b = seedState(new Date(NOW)).boards[0];
    const [eletrico, , sat] = b.tags;
    const res = filterTasks(b, { ...EMPTY_FILTERS, tagIds: [eletrico.id, sat.id] });
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((t) => t.tagIds.includes(eletrico.id) && t.tagIds.includes(sat.id))).toBe(true);
  });

  it("busca por texto inclui nome da etiqueta", () => {
    const b = seedState(new Date(NOW)).boards[0];
    const res = filterTasks(b, { ...EMPTY_FILTERS, search: "punch" });
    expect(res.length).toBeGreaterThanOrEqual(3);
  });
});
