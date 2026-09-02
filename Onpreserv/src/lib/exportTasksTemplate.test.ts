import { describe, it, expect } from "vitest";
import { validateTaskRow, TASK_TEMPLATE_HEADERS } from "./exportTasksTemplate";

describe("validateTaskRow", () => {
  it("requer título", () => {
    const r = validateTaskRow({ titulo: "" }, 0);
    expect(r.valid).toBe(false);
    expect(r.errors).toContain("Título é obrigatório");
  });

  it("aceita linha mínima válida", () => {
    const r = validateTaskRow({ titulo: "Inspecionar G-12" }, 0);
    expect(r.valid).toBe(true);
    expect(r.status).toBe("a_fazer");
    expect(r.prioridade).toBe("media");
    expect(r.modulo_relacionado).toBe("geral");
  });

  it("status/prioridade/módulo desconhecidos viram avisos e usam padrão", () => {
    const r = validateTaskRow(
      { titulo: "x", status: "xpto", prioridade: "urgente", modulo_relacionado: "inexistente" },
      0,
    );
    expect(r.valid).toBe(true);
    expect(r.status).toBe("a_fazer");
    expect(r.prioridade).toBe("media");
    expect(r.modulo_relacionado).toBe("geral");
    expect(r.warnings.length).toBe(3);
  });

  it("aceita prazo dd/mm/aaaa e converte para ISO", () => {
    const r = validateTaskRow({ titulo: "x", prazo: "01/05/2026" }, 0);
    expect(r.valid).toBe(true);
    expect(r.prazo).toBe("2026-05-01");
  });

  it("aceita prazo ISO existente", () => {
    const r = validateTaskRow({ titulo: "x", prazo: "2026-05-01" }, 0);
    expect(r.valid).toBe(true);
    expect(r.prazo).toBe("2026-05-01");
  });

  it("aceita Date e número serial do Excel como prazo", () => {
    const r1 = validateTaskRow({ titulo: "x", prazo: new Date(Date.UTC(2026, 4, 1)) }, 0);
    expect(r1.prazo).toBe("2026-05-01");
    const r2 = validateTaskRow({ titulo: "x", prazo: 46143 }, 0); // 01/05/2026
    expect(r2.prazo).toBe("2026-05-01");
  });

  it("rejeita prazo realmente inválido", () => {
    const r = validateTaskRow({ titulo: "x", prazo: "abc" }, 0);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/dd\/mm\/aaaa/);
  });

  it("normaliza email para minúsculas e numera linha a partir de 2", () => {
    const r = validateTaskRow({ titulo: "x", responsavel_email: "Foo@Bar.COM" }, 5);
    expect(r.responsavel_email).toBe("foo@bar.com");
    expect(r.rowNum).toBe(7);
  });

  it("normaliza status/prioridade/modulo case-insensitive e com espaços", () => {
    const r = validateTaskRow(
      {
        titulo: "  Tarefa  ",
        status: "  EM_ANDAMENTO ",
        prioridade: " ALTA ",
        modulo_relacionado: " Cronograma ",
      },
      0,
    );
    expect(r.valid).toBe(true);
    expect(r.status).toBe("em_andamento");
    expect(r.prioridade).toBe("alta");
    expect(r.modulo_relacionado).toBe("cronograma");
  });

  it("aceita prazo vazio sem erro", () => {
    const r = validateTaskRow({ titulo: "x", prazo: "" }, 0);
    expect(r.valid).toBe(true);
    expect(r.prazo).toBe("");
  });

  it.each(["a_fazer", "em_andamento", "em_revisao", "concluido", "bloqueado"])(
    "aceita status válido %s",
    (status) => {
      const r = validateTaskRow({ titulo: "x", status }, 0);
      expect(r.valid).toBe(true);
      expect(r.status).toBe(status);
    },
  );

  it.each(["baixa", "media", "alta", "critica"])(
    "aceita prioridade válida %s",
    (prioridade) => {
      const r = validateTaskRow({ titulo: "x", prioridade }, 0);
      expect(r.valid).toBe(true);
      expect(r.prioridade).toBe(prioridade);
    },
  );

  it.each([
    "lote",
    "cronograma",
    "preservacao",
    "atividade",
    "solicitacao",
    "geral",
  ])("aceita módulo válido %s", (modulo_relacionado) => {
    const r = validateTaskRow({ titulo: "x", modulo_relacionado }, 0);
    expect(r.valid).toBe(true);
    expect(r.modulo_relacionado).toBe(modulo_relacionado);
  });

  it("não aceita mais o módulo desativado 'estoque' (cai no padrão com aviso)", () => {
    const r = validateTaskRow({ titulo: "x", modulo_relacionado: "estoque" }, 0);
    expect(r.modulo_relacionado).toBe("geral");
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("mantém quadro com casing original (não normaliza)", () => {
    const r = validateTaskRow({ titulo: "x", quadro: "Preservação Junho" }, 0);
    expect(r.quadro).toBe("Preservação Junho");
  });

  it("expõe headers do template estáveis", () => {
    expect(TASK_TEMPLATE_HEADERS).toEqual([
      "titulo",
      "descricao",
      "status",
      "prioridade",
      "modulo_relacionado",
      "prazo",
      "responsavel_email",
      "quadro",
      "doc_de_referencia",
      "observacoes",
    ]);
  });
});
