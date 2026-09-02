import { describe, expect, it } from "vitest";
import { buildTaskReorderUpdates, getTaskRenderSignature, mergeKanbanItems, normalizeKanbanPositions, shouldReuseKanbanItems } from "./taskKanban";
import { Task } from "@/types/task";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    titulo: overrides.titulo ?? "Tarefa",
    descricao: overrides.descricao ?? null,
    status: overrides.status ?? "a_fazer",
    prioridade: overrides.prioridade ?? "media",
    responsavel_id: overrides.responsavel_id ?? null,
    criado_por: overrides.criado_por ?? null,
    modulo_relacionado: overrides.modulo_relacionado ?? "geral",
    item_relacionado_id: overrides.item_relacionado_id ?? null,
    item_relacionado_descricao: overrides.item_relacionado_descricao ?? null,
    prazo: overrides.prazo ?? null,
    concluido_em: overrides.concluido_em ?? null,
    posicao: overrides.posicao ?? 1,
    observacoes: overrides.observacoes ?? null,
    board_id: overrides.board_id ?? null,
    created_at: overrides.created_at ?? "2026-05-01T00:00:00Z",
    updated_at: overrides.updated_at ?? "2026-05-01T00:00:00Z",
    labels: overrides.labels ?? [],
    assignees: overrides.assignees ?? [],
  };
}

describe("taskKanban helpers", () => {
  it("mantém pendência otimista sem perder mudanças visuais vindas do servidor", () => {
    const prev = [makeTask({ id: "1", titulo: "Local", status: "a_fazer", posicao: 1 })];
    const incoming = [makeTask({ id: "1", titulo: "Atualizada", status: "a_fazer", posicao: 1 })];
    const pending = new Map([["1", { status: "em_andamento" as const, posicao: 2 }]]);

    const merged = mergeKanbanItems(prev, incoming, pending);

    expect(merged[0].titulo).toBe("Atualizada");
    expect(merged[0].status).toBe("em_andamento");
    expect(merged[0].posicao).toBe(2);
    expect(pending.has("1")).toBe(true);
  });

  it("remove a pendência quando o backend confirma status e posição", () => {
    const incoming = [makeTask({ id: "1", status: "concluido", posicao: 3 })];
    const pending = new Map([["1", { status: "concluido" as const, posicao: 3 }]]);

    mergeKanbanItems([], incoming, pending);

    expect(pending.size).toBe(0);
  });

  it("renumera posições por coluna de forma independente", () => {
    const normalized = normalizeKanbanPositions([
      makeTask({ id: "1", status: "a_fazer", posicao: 8 }),
      makeTask({ id: "2", status: "em_andamento", posicao: 9 }),
      makeTask({ id: "3", status: "a_fazer", posicao: 10 }),
    ]);

    expect(normalized.map((task) => ({ id: task.id, status: task.status, posicao: task.posicao }))).toEqual([
      { id: "1", status: "a_fazer", posicao: 1 },
      { id: "2", status: "em_andamento", posicao: 1 },
      { id: "3", status: "a_fazer", posicao: 2 },
    ]);
  });

  it("gera updates apenas para tarefas realmente alteradas", () => {
    const original = [
      makeTask({ id: "1", status: "a_fazer", posicao: 1 }),
      makeTask({ id: "2", status: "em_andamento", posicao: 1 }),
    ];
    const next = [
      makeTask({ id: "1", status: "em_andamento", posicao: 2 }),
      makeTask({ id: "2", status: "em_andamento", posicao: 1 }),
    ];

    expect(buildTaskReorderUpdates(next, original)).toEqual([
      { id: "1", status: "em_andamento", posicao: 2 },
    ]);
  });

  it("reusa lista quando a assinatura visual não mudou", () => {
    const prev = [makeTask({ id: "1", titulo: "Mesma" })];
    const next = [makeTask({ id: "1", titulo: "Mesma" })];

    expect(getTaskRenderSignature(prev[0])).toBe(getTaskRenderSignature(next[0]));
    expect(shouldReuseKanbanItems(prev, next)).toBe(true);
  });

  it("detecta mudança visual relevante para forçar re-render", () => {
    const prev = [makeTask({ id: "1", titulo: "Antes" })];
    const next = [makeTask({ id: "1", titulo: "Depois" })];

    expect(shouldReuseKanbanItems(prev, next)).toBe(false);
  });
});