import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { BoardCard } from "./BoardCard";
import { Task, TaskBoard } from "@/types/task";

const board: TaskBoard = {
  id: "b1",
  nome: "Preservação Junho",
  descricao: "Quadro de teste",
  cor: "#ff00aa",
  posicao: 0,
  arquivado: false,
  criado_por: null,
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
};

function makeTask(over: Partial<Task>): Task {
  return {
    id: Math.random().toString(36).slice(2),
    titulo: "t",
    descricao: null,
    status: "a_fazer",
    prioridade: "media",
    responsavel_id: null,
    criado_por: null,
    modulo_relacionado: "geral",
    item_relacionado_id: null,
    item_relacionado_descricao: null,
    prazo: null,
    concluido_em: null,
    posicao: 0,
    observacoes: null,
    board_id: "b1",
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
    ...over,
  };
}

describe("BoardCard", () => {
  it("renderiza nome, descrição e total de tarefas", () => {
    const tasks = [
      makeTask({ status: "a_fazer" }),
      makeTask({ status: "concluido" }),
    ];
    render(<BoardCard board={board} tasks={tasks} />);
    expect(screen.getByText("Preservação Junho")).toBeInTheDocument();
    expect(screen.getByText("Quadro de teste")).toBeInTheDocument();
    expect(screen.getByText("2 tarefas")).toBeInTheDocument();
  });

  it("calcula porcentagem de conclusão consistente com computeBoardStats", () => {
    // 1 de 4 concluída => 25%
    const tasks = [
      makeTask({ status: "a_fazer" }),
      makeTask({ status: "em_andamento" }),
      makeTask({ status: "em_revisao" }),
      makeTask({ status: "concluido" }),
    ];
    render(<BoardCard board={board} tasks={tasks} />);
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("exibe a contagem por coluna do Kanban na ordem correta", () => {
    const tasks = [
      makeTask({ status: "a_fazer" }),
      makeTask({ status: "a_fazer" }),
      makeTask({ status: "em_andamento" }),
      makeTask({ status: "em_revisao" }),
      makeTask({ status: "concluido" }),
      makeTask({ status: "bloqueado" }),
      makeTask({ status: "bloqueado" }),
    ];
    render(<BoardCard board={board} tasks={tasks} />);
    expect(screen.getByTitle("A fazer")).toHaveTextContent("2");
    expect(screen.getByTitle("Em andamento")).toHaveTextContent("1");
    expect(screen.getByTitle("Em revisão")).toHaveTextContent("1");
    expect(screen.getByTitle("Concluído")).toHaveTextContent("1");
    expect(screen.getByTitle("Bloqueado")).toHaveTextContent("2");
  });

  it("mostra alerta de tarefas vencidas quando houver", () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const iso = ontem.toISOString().slice(0, 10);
    const tasks = [
      makeTask({ status: "a_fazer", prazo: iso }),
      makeTask({ status: "em_andamento", prazo: iso }),
    ];
    render(<BoardCard board={board} tasks={tasks} />);
    expect(screen.getByText(/2 vencida\(s\)/)).toBeInTheDocument();
  });

  it("mostra 'Sem prazos' quando nenhuma tarefa tem prazo", () => {
    const tasks = [makeTask({})];
    render(<BoardCard board={board} tasks={tasks} />);
    expect(screen.getByText("Sem prazos")).toBeInTheDocument();
  });

  it("usa fallback 'Sem quadro' quando board é null", () => {
    render(<BoardCard board={null} tasks={[]} />);
    expect(screen.getByText("Sem quadro")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("0 tarefas")).toBeInTheDocument();
  });

  it("snapshot estável da estrutura de indicadores", () => {
    const tasks = [
      makeTask({ status: "a_fazer" }),
      makeTask({ status: "em_andamento" }),
      makeTask({ status: "concluido" }),
      makeTask({ status: "concluido" }),
    ];
    const { container } = render(<BoardCard board={board} tasks={tasks} />);
    const card = within(container).getByTestId("board-card");
    // Snapshot apenas da grid de status para garantir estabilidade dos indicadores
    const grid = card.querySelector(".grid.grid-cols-5");
    expect(grid).toMatchSnapshot();
  });
});
