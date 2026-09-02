import { describe, it, expect } from "vitest";
import { computeBoardStats, groupTasksByBoard, averageLeadTimeDays } from "./stats";
import { Task } from "@/types/task";

const t = (over: Partial<Task>): Task => ({
  id: Math.random().toString(), titulo: "t", descricao: null, status: "a_fazer",
  prioridade: "media", responsavel_id: null, criado_por: null, modulo_relacionado: "geral",
  item_relacionado_id: null, item_relacionado_descricao: null, prazo: null, concluido_em: null,
  posicao: 0, observacoes: null, board_id: null,
  created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", ...over,
});

describe("computeBoardStats", () => {
  it("retorna zeros para lista vazia", () => {
    const s = computeBoardStats([]);
    expect(s.total).toBe(0);
    expect(s.taxa).toBe(0);
    expect(s.proximoPrazo).toBeNull();
  });

  it("calcula taxa de conclusão arredondada", () => {
    const s = computeBoardStats([
      t({ status: "concluido" }),
      t({ status: "a_fazer" }),
      t({ status: "em_andamento" }),
    ]);
    expect(s.total).toBe(3);
    expect(s.concluidas).toBe(1);
    expect(s.taxa).toBe(33);
  });

  it("conta vencidas e ignora as concluídas", () => {
    const s = computeBoardStats([
      t({ prazo: "2000-01-01" }),
      t({ prazo: "2000-01-01", status: "concluido" }),
      t({ prazo: "2999-01-01" }),
    ]);
    expect(s.vencidas).toBe(1);
  });

  it("encontra o próximo prazo apenas em pendentes", () => {
    const s = computeBoardStats([
      t({ prazo: "2026-12-01" }),
      t({ prazo: "2026-06-01", status: "concluido" }),
      t({ prazo: "2026-09-01" }),
    ]);
    expect(s.proximoPrazo).toBe("2026-09-01");
  });
});

describe("groupTasksByBoard", () => {
  it("agrupa por board_id, com null para tarefas sem quadro", () => {
    const g = groupTasksByBoard([t({ board_id: "A" }), t({ board_id: "A" }), t({ board_id: null })]);
    expect(g.get("A")?.length).toBe(2);
    expect(g.get(null)?.length).toBe(1);
  });
});

describe("averageLeadTimeDays", () => {
  it("retorna null sem concluídas", () => {
    expect(averageLeadTimeDays([t({})])).toBeNull();
  });

  it("calcula a média em dias", () => {
    const v = averageLeadTimeDays([
      t({ status: "concluido", created_at: "2026-01-01T00:00:00Z", concluido_em: "2026-01-03T00:00:00Z" }),
      t({ status: "concluido", created_at: "2026-01-01T00:00:00Z", concluido_em: "2026-01-05T00:00:00Z" }),
    ]);
    expect(v).toBe(3);
  });
});
