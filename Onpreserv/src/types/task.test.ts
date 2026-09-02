import { describe, it, expect } from "vitest";
import { parseDateLocal, formatPrazo, isTaskOverdue, getTaskAssignees, Task } from "./task";

const base: Task = {
  id: "1", titulo: "x", descricao: null, status: "a_fazer", prioridade: "media",
  responsavel_id: null, criado_por: null, modulo_relacionado: "geral",
  item_relacionado_id: null, item_relacionado_descricao: null, prazo: null,
  concluido_em: null, posicao: 0, observacoes: null, board_id: null,
  created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
};

describe("task helpers", () => {
  it("parseDateLocal interpreta YYYY-MM-DD em horário local", () => {
    const d = parseDateLocal("2026-05-14")!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4);
    expect(d.getDate()).toBe(14);
  });

  it("parseDateLocal devolve null para vazio", () => {
    expect(parseDateLocal(null)).toBeNull();
    expect(parseDateLocal("")).toBeNull();
  });

  it("formatPrazo formata em dd/MM e dd/MM/yyyy", () => {
    expect(formatPrazo("2026-05-14")).toBe("14/05/2026");
    expect(formatPrazo("2026-05-14", "dd/MM")).toBe("14/05");
    expect(formatPrazo(null)).toBe("");
  });

  it("isTaskOverdue: tarefa concluída nunca está vencida", () => {
    expect(isTaskOverdue({ ...base, prazo: "2000-01-01", status: "concluido" })).toBe(false);
  });

  it("isTaskOverdue: passado está vencido, futuro não", () => {
    expect(isTaskOverdue({ ...base, prazo: "2000-01-01" })).toBe(true);
    expect(isTaskOverdue({ ...base, prazo: "2999-01-01" })).toBe(false);
  });

  it("getTaskAssignees prioriza assignees, faz fallback para responsavel_id", () => {
    expect(getTaskAssignees({ ...base, assignees: ["a", "b"] })).toEqual(["a", "b"]);
    expect(getTaskAssignees({ ...base, responsavel_id: "z" })).toEqual(["z"]);
    expect(getTaskAssignees(base)).toEqual([]);
  });
});
