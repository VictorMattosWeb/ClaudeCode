import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import {
  TaskHistoryView,
  describeHistory,
  categorizeAction,
} from "./TaskHistoryView";
import type { TaskHistoryEntry } from "@/types/task";

const USERS = new Map<string, string>([
  ["u1", "Alice"],
  ["u2", "Bruno"],
]);
const BOARDS = new Map<string, string>([
  ["b1", "Quadro Alpha"],
  ["b2", "Quadro Beta"],
]);

let _id = 0;
function h(p: Partial<TaskHistoryEntry> & { acao: string }): TaskHistoryEntry {
  _id++;
  return {
    id: `h-${_id}`,
    task_id: "t1",
    user_id: "u1",
    acao: p.acao,
    de: p.de ?? null,
    para: p.para ?? null,
    created_at: p.created_at ?? "2026-05-15T10:00:00Z",
    ...p,
  };
}

describe("categorizeAction", () => {
  it("mapeia ações conhecidas", () => {
    expect(categorizeAction("status")).toBe("status");
    expect(categorizeAction("prazo")).toBe("prazo");
    expect(categorizeAction("quadro")).toBe("quadro");
    expect(categorizeAction("prioridade")).toBe("prioridade");
    expect(categorizeAction("responsavel")).toBe("responsavel");
    expect(categorizeAction("responsavel_add")).toBe("responsavel");
    expect(categorizeAction("comentario")).toBe("comentario");
    expect(categorizeAction("criada")).toBe("criacao");
  });
  it("retorna 'outro' para ações desconhecidas", () => {
    expect(categorizeAction("foo_bar")).toBe("outro");
  });
});

describe("describeHistory — formatação resiliente", () => {
  it("status: traduz enum para label legível", () => {
    const d = describeHistory(h({ acao: "status", de: "a_fazer", para: "em_andamento" }), USERS);
    expect(d.label).toBe("Status");
    expect(d.detail).toBe("A fazer → Em andamento");
  });

  it("status: tolera valores nulos sem quebrar", () => {
    const d = describeHistory(h({ acao: "status", de: null, para: null }), USERS);
    expect(d.detail).toBe("— → —");
  });

  it("status: tolera valores fora do enum sem lançar", () => {
    const d = describeHistory(h({ acao: "status", de: "qualquer", para: "outro" }), USERS);
    expect(d.detail).toBe("qualquer → outro");
  });

  it("prazo: formata datas no padrão dd/MM/yyyy", () => {
    const d = describeHistory(h({ acao: "prazo", de: "2026-05-10", para: "2026-05-20" }), USERS);
    expect(d.detail).toBe("10/05/2026 → 20/05/2026");
  });

  it("prazo: aceita lados nulos", () => {
    const d = describeHistory(h({ acao: "prazo", de: null, para: "2026-05-20" }), USERS);
    expect(d.detail).toBe("— → 20/05/2026");
  });

  it("quadro: usa nome do board quando disponível", () => {
    const d = describeHistory(h({ acao: "quadro", de: "b1", para: "b2" }), USERS, BOARDS);
    expect(d.detail).toBe("Quadro Alpha → Quadro Beta");
  });

  it("quadro: usa traço quando board id é desconhecido", () => {
    const d = describeHistory(h({ acao: "quadro", de: "desconhecido", para: null }), USERS, BOARDS);
    expect(d.detail).toBe("— → —");
  });

  it("prioridade: traduz enum", () => {
    const d = describeHistory(h({ acao: "prioridade", de: "media", para: "critica" }), USERS);
    expect(d.detail).toBe("Média → Crítica");
  });

  it("responsavel: usa nomes dos usuários", () => {
    const d = describeHistory(h({ acao: "responsavel", de: "u1", para: "u2" }), USERS);
    expect(d.detail).toBe("Alice → Bruno");
  });

  it("responsavel_add: mostra apenas quem foi adicionado", () => {
    const d = describeHistory(h({ acao: "responsavel_add", de: null, para: "u2" }), USERS);
    expect(d.label).toBe("Responsável adicionado");
    expect(d.detail).toBe("Bruno");
  });

  it("comentario: envolve o trecho em aspas", () => {
    const d = describeHistory(h({ acao: "comentario", para: "Revisão concluída" }), USERS);
    expect(d.detail).toBe('"Revisão concluída"');
  });

  it("criada: usa título no campo para", () => {
    const d = describeHistory(h({ acao: "criada", para: "Nova tarefa X" }), USERS);
    expect(d.label).toBe("Criada");
    expect(d.detail).toBe("Nova tarefa X");
  });

  it("ação desconhecida não quebra renderização", () => {
    const d = describeHistory(h({ acao: "evento_novo", para: "x" }), USERS);
    expect(d.category).toBe("outro");
    expect(d.label).toBe("evento_novo");
  });
});

describe("TaskHistoryView — filtros e renderização", () => {
  const entries = [
    h({ acao: "criada", para: "Tarefa Z" }),
    h({ acao: "status", de: "a_fazer", para: "em_andamento" }),
    h({ acao: "status", de: "em_andamento", para: "concluido" }),
    h({ acao: "prazo", de: "2026-05-10", para: "2026-05-20" }),
    h({ acao: "prioridade", de: "media", para: "alta" }),
    h({ acao: "quadro", de: "b1", para: "b2" }),
    h({ acao: "responsavel_add", para: "u2" }),
    h({ acao: "comentario", para: "Tudo certo" }),
  ];

  it("renderiza todos os itens por padrão e mostra contagens nos filtros", () => {
    render(<TaskHistoryView entries={entries} users={USERS} boards={BOARDS} />);
    const timeline = screen.getByTestId("history-timeline");
    expect(within(timeline).getAllByRole("listitem")).toHaveLength(8);

    expect(screen.getByTestId("history-filter-todos").textContent).toContain("8");
    expect(screen.getByTestId("history-filter-status").textContent).toContain("2");
    expect(screen.getByTestId("history-filter-prazo").textContent).toContain("1");
    expect(screen.getByTestId("history-filter-quadro").textContent).toContain("1");
    expect(screen.getByTestId("history-filter-prioridade").textContent).toContain("1");
    expect(screen.getByTestId("history-filter-responsavel").textContent).toContain("1");
    expect(screen.getByTestId("history-filter-comentario").textContent).toContain("1");
  });

  it("filtra por status e oculta as demais entradas", () => {
    render(<TaskHistoryView entries={entries} users={USERS} boards={BOARDS} />);
    fireEvent.click(screen.getByTestId("history-filter-status"));
    const items = screen.getAllByTestId(/^history-item-/);
    expect(items).toHaveLength(2);
    items.forEach((el) => expect(el.dataset.testid).toBe("history-item-status"));
  });

  it("alterna entre filtros independentes", () => {
    render(<TaskHistoryView entries={entries} users={USERS} boards={BOARDS} />);
    fireEvent.click(screen.getByTestId("history-filter-prazo"));
    expect(screen.getAllByTestId(/^history-item-/)).toHaveLength(1);
    fireEvent.click(screen.getByTestId("history-filter-quadro"));
    const items = screen.getAllByTestId(/^history-item-/);
    expect(items).toHaveLength(1);
    expect(items[0].dataset.testid).toBe("history-item-quadro");
  });

  it("mostra estado vazio quando filtro não tem itens", () => {
    const onlyComment = [h({ acao: "comentario", para: "oi" })];
    render(<TaskHistoryView entries={onlyComment} users={USERS} />);
    fireEvent.click(screen.getByTestId("history-filter-status"));
    expect(screen.getByText(/sem registros para este filtro/i)).toBeInTheDocument();
  });

  it("não quebra com created_at inválido", () => {
    const bad = [h({ acao: "status", de: "a_fazer", para: "em_andamento", created_at: "data-invalida" })];
    expect(() => render(<TaskHistoryView entries={bad} users={USERS} />)).not.toThrow();
    expect(screen.getByTestId("history-item-status")).toBeInTheDocument();
  });

  it("usa 'Sistema' quando user_id é nulo", () => {
    const sys = [h({ acao: "status", user_id: null, de: "a_fazer", para: "concluido" })];
    render(<TaskHistoryView entries={sys} users={USERS} />);
    expect(screen.getByText("Sistema")).toBeInTheDocument();
  });
});
