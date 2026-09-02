import { describe, it, expect } from "vitest";
import {
  computeBoardStats,
  rankActiveBoards,
  computeBoardsKpis,
} from "@/lib/stats";
import type { Task, TaskBoard, TaskStatus } from "@/types/task";

const today = new Date();
today.setHours(0, 0, 0, 0);
const ymd = (offsetDays: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const PAST = ymd(-3);
const FUTURE = ymd(7);

let _id = 0;
function makeTask(p: Partial<Task> & { status?: TaskStatus; board_id?: string | null }): Task {
  _id++;
  return {
    id: `t-${_id}`,
    titulo: `Task ${_id}`,
    descricao: null,
    status: p.status ?? "a_fazer",
    prioridade: "media",
    responsavel_id: null,
    criado_por: null,
    modulo_relacionado: "geral" as unknown as Task["modulo_relacionado"],
    item_relacionado_id: null,
    item_relacionado_descricao: null,
    prazo: p.prazo ?? null,
    concluido_em: null,
    posicao: 0,
    observacoes: null,
    board_id: p.board_id ?? null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...p,
  };
}

function makeBoard(p: Partial<TaskBoard> & { id: string; nome: string }): TaskBoard {
  return {
    descricao: null,
    cor: "#000",
    posicao: 0,
    arquivado: false,
    criado_por: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...p,
  };
}

describe("computeBoardStats — KPIs por quadro", () => {
  it("retorna zeros em quadro vazio", () => {
    const s = computeBoardStats([]);
    expect(s.total).toBe(0);
    expect(s.taxa).toBe(0);
    expect(s.vencidas).toBe(0);
    expect(s.proximoPrazo).toBeNull();
  });

  it("calcula % de conclusão arredondado", () => {
    const tasks = [
      makeTask({ status: "concluido" }),
      makeTask({ status: "concluido" }),
      makeTask({ status: "a_fazer" }),
    ];
    const s = computeBoardStats(tasks);
    expect(s.total).toBe(3);
    expect(s.concluidas).toBe(2);
    expect(s.taxa).toBe(67); // 2/3 -> 66.6 -> 67
  });

  it("conta vencidas apenas para tarefas não concluídas com prazo passado", () => {
    const tasks = [
      makeTask({ status: "a_fazer", prazo: PAST }),       // vencida
      makeTask({ status: "em_andamento", prazo: PAST }),    // vencida
      makeTask({ status: "concluido", prazo: PAST }),       // NÃO vencida
      makeTask({ status: "a_fazer", prazo: FUTURE }),      // NÃO vencida
      makeTask({ status: "a_fazer", prazo: null }),        // NÃO vencida
    ];
    const s = computeBoardStats(tasks);
    expect(s.vencidas).toBe(2);
  });

  it("seleciona o próximo prazo apenas entre tarefas não concluídas", () => {
    const tasks = [
      makeTask({ status: "concluido", prazo: ymd(1) }),
      makeTask({ status: "a_fazer", prazo: ymd(5) }),
      makeTask({ status: "a_fazer", prazo: ymd(2) }),
    ];
    const s = computeBoardStats(tasks);
    expect(s.proximoPrazo).toBe(ymd(2));
  });
});

describe("rankActiveBoards — ordenação por urgência", () => {
  const bA = makeBoard({ id: "A", nome: "Alpha" });
  const bB = makeBoard({ id: "B", nome: "Beta" });
  const bC = makeBoard({ id: "C", nome: "Charlie" });
  const bArquivado = makeBoard({ id: "Z", nome: "Zeta", arquivado: true });

  it("prioriza quadros com mais vencidas", () => {
    const tasks = [
      makeTask({ board_id: "A", status: "a_fazer", prazo: PAST }),
      makeTask({ board_id: "B", status: "a_fazer", prazo: PAST }),
      makeTask({ board_id: "B", status: "a_fazer", prazo: PAST }),
      makeTask({ board_id: "C", status: "a_fazer" }),
    ];
    const ranked = rankActiveBoards([bA, bB, bC], tasks);
    expect(ranked.map((r) => r.board.id)).toEqual(["B", "A", "C"]);
  });

  it("desempata por pendentes (total - concluídas) e depois por nome", () => {
    const tasks = [
      // A: 0 vencidas, 3 pendentes
      makeTask({ board_id: "A", status: "a_fazer" }),
      makeTask({ board_id: "A", status: "a_fazer" }),
      makeTask({ board_id: "A", status: "a_fazer" }),
      // B: 0 vencidas, 1 pendente
      makeTask({ board_id: "B", status: "a_fazer" }),
      // C: 0 vencidas, 3 pendentes (desempate por nome com A -> Alpha < Charlie)
      makeTask({ board_id: "C", status: "a_fazer" }),
      makeTask({ board_id: "C", status: "a_fazer" }),
      makeTask({ board_id: "C", status: "a_fazer" }),
    ];
    const ranked = rankActiveBoards([bC, bA, bB], tasks);
    expect(ranked.map((r) => r.board.id)).toEqual(["A", "C", "B"]);
  });

  it("ignora quadros arquivados e quadros sem tarefas", () => {
    const tasks = [
      makeTask({ board_id: "A", status: "a_fazer" }),
      makeTask({ board_id: "Z", status: "a_fazer", prazo: PAST }),
    ];
    const ranked = rankActiveBoards([bA, bB, bArquivado], tasks);
    expect(ranked.map((r) => r.board.id)).toEqual(["A"]);
  });

  it("respeita o limit", () => {
    const tasks = [
      makeTask({ board_id: "A", status: "a_fazer" }),
      makeTask({ board_id: "B", status: "a_fazer" }),
      makeTask({ board_id: "C", status: "a_fazer" }),
    ];
    expect(rankActiveBoards([bA, bB, bC], tasks, 2)).toHaveLength(2);
  });
});

describe("computeBoardsKpis — agregados", () => {
  const bA = makeBoard({ id: "A", nome: "Alpha" });
  const bB = makeBoard({ id: "B", nome: "Beta" });
  const bArquivado = makeBoard({ id: "Z", nome: "Zeta", arquivado: true });

  it("retorna zeros sem quadros nem tarefas", () => {
    expect(computeBoardsKpis([], [])).toEqual({
      ativos: 0,
      comAtividade: 0,
      taxa: 0,
      totalVencidas: 0,
    });
  });

  it("conta apenas quadros ativos como ativos e considera comAtividade só com tarefas", () => {
    const tasks = [makeTask({ board_id: "A", status: "a_fazer" })];
    const kpis = computeBoardsKpis([bA, bB, bArquivado], tasks);
    expect(kpis.ativos).toBe(2); // arquivado ignorado
    expect(kpis.comAtividade).toBe(1); // apenas A tem tarefas
  });

  it("calcula taxa global e vencidas somando todos os quadros ativos", () => {
    const tasks = [
      // A: 1 concluida + 1 vencida pendente
      makeTask({ board_id: "A", status: "concluido" }),
      makeTask({ board_id: "A", status: "a_fazer", prazo: PAST }),
      // B: 1 concluida + 1 pendente futura
      makeTask({ board_id: "B", status: "concluido" }),
      makeTask({ board_id: "B", status: "a_fazer", prazo: FUTURE }),
      // Arquivado deve ser ignorado mesmo com tarefas
      makeTask({ board_id: "Z", status: "concluido" }),
      makeTask({ board_id: "Z", status: "a_fazer", prazo: PAST }),
    ];
    const kpis = computeBoardsKpis([bA, bB, bArquivado], tasks);
    // 4 tarefas em ativos, 2 concluidas -> 50%
    expect(kpis.taxa).toBe(50);
    expect(kpis.totalVencidas).toBe(1);
    expect(kpis.comAtividade).toBe(2);
  });
});
