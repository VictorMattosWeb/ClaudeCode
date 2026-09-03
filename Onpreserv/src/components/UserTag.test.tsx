import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserTag } from "./UserTag";

const DIRETORIO = [
  { id: "u1", nome: "Victor Mattos", avatarPath: "u1/avatar-1.jpg", status: "ativo" },
  { id: "u2", nome: "Ana Paula", avatarPath: null, status: "ativo" },
];

vi.mock("@/context/UsersDirectoryContext", () => ({
  useUsersDirectory: () => ({
    usuarios: DIRETORIO,
    pronto: true,
    semFotos: false,
    porId: (id?: string | null) => DIRETORIO.find((u) => u.id === id),
    porNome: (nome?: string | null) =>
      DIRETORIO.find(
        (u) => u.nome.toLowerCase() === (nome ?? "").toLowerCase().replace(/\s+/g, " ").trim(),
      ),
  }),
}));

// O UserAvatar assina URLs no Supabase; aqui só interessa o que ele recebe.
vi.mock("@/components/UserAvatar", () => ({
  UserAvatar: ({ path, nome }: { path?: string | null; nome?: string | null }) => (
    <span data-testid="avatar" data-path={path ?? ""} data-nome={nome ?? ""} />
  ),
}));

describe("UserTag", () => {
  it("pelo id, traz o nome e a foto do diretório", () => {
    render(<UserTag userId="u1" />);
    expect(screen.getByText("Victor Mattos")).toBeInTheDocument();
    expect(screen.getByTestId("avatar").dataset.path).toBe("u1/avatar-1.jpg");
  });

  it("pelo nome, encontra a foto mesmo com espaços e caixa diferentes", () => {
    render(<UserTag nome="  victor   mattos " />);
    expect(screen.getByTestId("avatar").dataset.path).toBe("u1/avatar-1.jpg");
  });

  it("quem está no diretório sem foto aparece pelas iniciais", () => {
    render(<UserTag userId="u2" />);
    expect(screen.getByText("Ana Paula")).toBeInTheDocument();
    expect(screen.getByTestId("avatar").dataset.path).toBe("");
  });

  it("nome fora do diretório ainda é exibido", () => {
    // Responsável de preservação antigo, ou fornecedor externo.
    render(<UserTag nome="Fornecedor Externo" />);
    expect(screen.getByText("Fornecedor Externo")).toBeInTheDocument();
  });

  it("o nome de reserva aparece enquanto o diretório não conhece o id", () => {
    // É o que impede o nome de sumir da tela durante o carregamento.
    render(<UserTag userId="desconhecido" nome="Nome da Tela" />);
    expect(screen.getByText("Nome da Tela")).toBeInTheDocument();
  });

  it("o diretório tem prioridade sobre o nome de reserva", () => {
    // Renomear alguém precisa refletir em todas as telas.
    render(<UserTag userId="u1" nome="Nome Antigo" />);
    expect(screen.getByText("Victor Mattos")).toBeInTheDocument();
    expect(screen.queryByText("Nome Antigo")).not.toBeInTheDocument();
  });

  it("sem id e sem nome, mostra o texto de vazio", () => {
    render(<UserTag vazio="Sistema" />);
    expect(screen.getByText("Sistema")).toBeInTheDocument();
    expect(screen.queryByTestId("avatar")).not.toBeInTheDocument();
  });

  it("somenteFoto omite o nome mas mantém a identificação acessível", () => {
    const { container } = render(<UserTag userId="u1" somenteFoto />);
    expect(screen.queryByText("Victor Mattos")).not.toBeInTheDocument();
    expect(container.querySelector("[title='Victor Mattos']")).toBeTruthy();
  });
});
