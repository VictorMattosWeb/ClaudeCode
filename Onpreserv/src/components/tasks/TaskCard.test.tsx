import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskCard } from "./TaskCard";
import { Task } from "@/types/task";

vi.mock("./QuickLabelPicker", () => ({
  QuickLabelPicker: () => <div data-testid="quick-label-picker" />,
}));

vi.mock("./PriorityBadge", () => ({
  PriorityBadge: () => <div data-testid="priority-badge" />,
}));

vi.mock("@/context/TaskContext", () => ({
  useTasks: () => ({ recentlyUpdatedIds: new Set<string>() }),
}));

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? "task-1",
    titulo: overrides.titulo ?? "Inspecionar lote",
    descricao: overrides.descricao ?? "Descrição curta",
    status: overrides.status ?? "a_fazer",
    prioridade: overrides.prioridade ?? "media",
    responsavel_id: overrides.responsavel_id ?? "u1",
    criado_por: overrides.criado_por ?? null,
    modulo_relacionado: overrides.modulo_relacionado ?? "lote",
    item_relacionado_id: overrides.item_relacionado_id ?? null,
    item_relacionado_descricao: overrides.item_relacionado_descricao ?? null,
    prazo: overrides.prazo ?? "2026-05-20",
    concluido_em: overrides.concluido_em ?? null,
    posicao: overrides.posicao ?? 1,
    observacoes: overrides.observacoes ?? null,
    board_id: overrides.board_id ?? null,
    created_at: overrides.created_at ?? "2026-05-01T00:00:00Z",
    updated_at: overrides.updated_at ?? "2026-05-01T00:00:00Z",
    labels: overrides.labels ?? [],
    assignees: overrides.assignees ?? ["u1"],
  };
}

describe("TaskCard", () => {
  it("renderiza o card inteiro como área de arraste sem perder conteúdo principal", () => {
    render(
      <TaskCard
        task={makeTask()}
        users={new Map([["u1", "Victor"]])}
        dragHandleProps={{
          listeners: { onPointerDown: vi.fn() },
        }}
      />,
    );

    expect(screen.getByText("Inspecionar lote")).toBeInTheDocument();
    expect(screen.getByText("Victor")).toBeInTheDocument();
    expect(screen.getByTestId("quick-label-picker")).toBeInTheDocument();
    expect(screen.getByTestId("priority-badge")).toBeInTheDocument();
  });
});