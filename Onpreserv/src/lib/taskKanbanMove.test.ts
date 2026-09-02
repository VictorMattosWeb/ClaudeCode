import { describe, expect, it } from "vitest";
import {
  sortKanbanItems,
  groupByStatus,
  moveTask,
  normalizeKanbanPositions,
  buildTaskReorderUpdates,
} from "./taskKanban";
import type { Task, TaskStatus } from "@/types/task";

/** Tarefa mínima: só os campos que a ordenação do quadro usa. */
function t(id: string, status: TaskStatus, posicao: number): Task {
  return {
    id,
    titulo: id,
    descricao: null,
    status,
    prioridade: "media",
    posicao,
    responsavel_id: null,
    modulo_relacionado: "geral",
    item_relacionado_id: null,
    item_relacionado_descricao: null,
    prazo: null,
    observacoes: null,
    board_id: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    assignees: [],
    labels: [],
  } as unknown as Task;
}

/** Ordem visível de uma coluna — o que o teste realmente quer afirmar. */
const coluna = (items: Task[], status: TaskStatus) =>
  (groupByStatus(items).get(status) ?? []).map((x) => x.id);

describe("sortKanbanItems", () => {
  it("agrupa na ordem das colunas do quadro", () => {
    const items = sortKanbanItems([
      t("c", "concluido", 1),
      t("a", "a_fazer", 1),
      t("b", "em_andamento", 1),
    ]);
    expect(items.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("ordena por posicao dentro da coluna", () => {
    const items = sortKanbanItems([t("a3", "a_fazer", 3), t("a1", "a_fazer", 1), t("a2", "a_fazer", 2)]);
    expect(items.map((x) => x.id)).toEqual(["a1", "a2", "a3"]);
  });

  it("desempata por id quando duas tarefas têm a mesma posicao", () => {
    // Acontece de verdade depois de mover entre colunas: sem desempate, as duas
    // trocariam de lugar sozinhas a cada render.
    const primeira = sortKanbanItems([t("z", "a_fazer", 2), t("a", "a_fazer", 2)]);
    const segunda = sortKanbanItems([t("a", "a_fazer", 2), t("z", "a_fazer", 2)]);
    expect(primeira.map((x) => x.id)).toEqual(["a", "z"]);
    expect(segunda.map((x) => x.id)).toEqual(primeira.map((x) => x.id));
  });
});

describe("groupByStatus", () => {
  it("preserva a ordem do array, sem reordenar por posicao", () => {
    // É este o comportamento que faz a pré-visualização do arrasto ser fiel:
    // durante o movimento a `posicao` ainda é a antiga.
    const items = [t("a", "a_fazer", 5), t("b", "a_fazer", 1), t("c", "a_fazer", 3)];
    expect(coluna(items, "a_fazer")).toEqual(["a", "b", "c"]);
  });

  it("devolve uma entrada para toda coluna, inclusive as vazias", () => {
    const map = groupByStatus([t("a", "a_fazer", 1)]);
    expect(map.get("bloqueado")).toEqual([]);
    expect(map.size).toBe(5);
  });
});

describe("moveTask — dentro da mesma coluna", () => {
  const base = [t("a1", "a_fazer", 1), t("a2", "a_fazer", 2), t("a3", "a_fazer", 3)];

  it("move para cima, ocupando a posição do alvo", () => {
    expect(coluna(moveTask(base, "a3", "a1"), "a_fazer")).toEqual(["a3", "a1", "a2"]);
  });

  it("move para baixo, ocupando a posição do alvo", () => {
    expect(coluna(moveTask(base, "a1", "a3"), "a_fazer")).toEqual(["a2", "a3", "a1"]);
  });

  it("mover para o meio para exatamente no meio", () => {
    expect(coluna(moveTask(base, "a1", "a2"), "a_fazer")).toEqual(["a2", "a1", "a3"]);
  });

  it("soltar na área vazia da própria coluna manda para o fim", () => {
    expect(coluna(moveTask(base, "a1", "col-a_fazer"), "a_fazer")).toEqual(["a2", "a3", "a1"]);
  });
});

describe("moveTask — entre colunas", () => {
  const base = [
    t("a1", "a_fazer", 1),
    t("a2", "a_fazer", 2),
    t("b1", "em_andamento", 1),
    t("b2", "em_andamento", 2),
  ];

  it("solta sobre um card e entra exatamente naquela posição, não no fim", () => {
    // Era o bug: qualquer movimento entre colunas jogava a tarefa para o fim.
    const next = moveTask(base, "a1", "b1");
    expect(coluna(next, "em_andamento")).toEqual(["a1", "b1", "b2"]);
    expect(coluna(next, "a_fazer")).toEqual(["a2"]);
  });

  it("solta sobre o último card da outra coluna e fica antes dele", () => {
    expect(coluna(moveTask(base, "a1", "b2"), "em_andamento")).toEqual(["b1", "a1", "b2"]);
  });

  it("solta na área vazia da coluna e vai para o fim dela", () => {
    expect(coluna(moveTask(base, "a1", "col-em_andamento"), "em_andamento")).toEqual(["b1", "b2", "a1"]);
  });

  it("muda o status da tarefa movida", () => {
    const next = moveTask(base, "a1", "col-concluido");
    expect(next.find((x) => x.id === "a1")!.status).toBe("concluido");
  });

  it("mover para uma coluna vazia mantém o invariante de ordem", () => {
    const next = moveTask(base, "a1", "col-bloqueado");
    expect(coluna(next, "bloqueado")).toEqual(["a1"]);
    // A lista continua canônica: bloqueado é a última coluna, logo a1 vai ao fim.
    expect(next.map((x) => x.id)).toEqual(["a2", "b1", "b2", "a1"]);
  });

  it("ignora movimento com id inexistente em vez de corromper a lista", () => {
    expect(moveTask(base, "fantasma", "b1")).toEqual(base);
    expect(moveTask(base, "a1", "fantasma")).toEqual(base);
  });
});

describe("moveTask + normalizeKanbanPositions", () => {
  it("a ordem visual sobrevive à renumeração — é o que garante que a tarefa fica onde foi solta", () => {
    const base = [
      t("a1", "a_fazer", 1),
      t("a2", "a_fazer", 2),
      t("a3", "a_fazer", 3),
      t("b1", "em_andamento", 1),
    ];

    const movido = moveTask(base, "a3", "a1");
    const normalizado = normalizeKanbanPositions(movido);

    // A ordem visual não mudou com a renumeração...
    expect(coluna(normalizado, "a_fazer")).toEqual(["a3", "a1", "a2"]);
    // ...e as posições ficaram sequenciais a partir de 1, por coluna.
    expect(normalizado.filter((x) => x.status === "a_fazer").map((x) => x.posicao)).toEqual([1, 2, 3]);
    expect(normalizado.filter((x) => x.status === "em_andamento").map((x) => x.posicao)).toEqual([1]);

    // E reordenar a partir do resultado normalizado devolve a mesma ordem —
    // sem isso, a coluna "resetaria" no próximo dado vindo do servidor.
    expect(sortKanbanItems(normalizado).map((x) => x.id)).toEqual(normalizado.map((x) => x.id));
  });

  it("gera update para toda tarefa cuja posição mudou na coluna de origem", () => {
    const base = [t("a1", "a_fazer", 1), t("a2", "a_fazer", 2), t("a3", "a_fazer", 3)];
    const updates = buildTaskReorderUpdates(normalizeKanbanPositions(moveTask(base, "a3", "a1")), base);
    // a3 vai para 1, a1 para 2, a2 para 3: as três mudaram.
    expect(updates.map((u) => u.id).sort()).toEqual(["a1", "a2", "a3"]);
  });

  it("não gera update quando nada mudou de lugar", () => {
    const base = [t("a1", "a_fazer", 1), t("a2", "a_fazer", 2)];
    expect(buildTaskReorderUpdates(normalizeKanbanPositions(base), base)).toEqual([]);
  });
});
