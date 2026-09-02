import { describe, expect, it } from "vitest";
import { selecionarParaBaixa } from "./cronogramaBaixa";
import type { ItemCalculado } from "@/types/cronograma";

const make = (over: Partial<ItemCalculado>): ItemCalculado => ({
  id: over.id ?? "x",
  medicaoId: "m",
  semana: "",
  preservacao: "",
  tag: over.tag ?? "TAG",
  unidade: "",
  gabinete: "",
  tipo: "",
  dataPrevista: over.dataPrevista ?? null,
  dataRealizada: over.dataRealizada ?? null,
  status: over.status ?? "PENDENTE",
  observacoes: "",
  motivoDivergencia: "",
  createdAt: "",
  updatedAt: "",
  situacao: over.situacao ?? "pendente",
  desvioDias: over.desvioDias ?? null,
  ...over,
});

describe("selecionarParaBaixa", () => {
  it("inclui itens vencidos (não pode bloquear baixa de vencidos)", () => {
    const venc = make({ id: "v", status: "PENDENTE", situacao: "vencido" });
    expect(selecionarParaBaixa([venc])).toHaveLength(1);
  });

  it("inclui pendentes e vence_em_breve", () => {
    const pend = make({ id: "p", situacao: "pendente" });
    const vb = make({ id: "vb", situacao: "vence_em_breve" });
    expect(selecionarParaBaixa([pend, vb])).toHaveLength(2);
  });

  it("exclui itens já PRESERVADOs", () => {
    const ok = make({ id: "ok", status: "PRESERVADO", dataRealizada: "2026-01-01", situacao: "no_prazo" });
    expect(selecionarParaBaixa([ok])).toEqual([]);
  });

  it("exclui N/A", () => {
    const na = make({ id: "na", status: "N/A", situacao: "nao_aplicavel" });
    expect(selecionarParaBaixa([na])).toEqual([]);
  });

  it("é case-insensitive para status", () => {
    const ok = make({ id: "ok", status: "preservado", dataRealizada: "2026-01-01", situacao: "no_prazo" });
    expect(selecionarParaBaixa([ok])).toEqual([]);
  });

  it("exclui qualquer item com dataRealizada preenchida, mesmo se status estiver inconsistente", () => {
    const ok = make({ id: "ok", status: "PENDENTE", dataRealizada: "2026-01-01" });
    expect(selecionarParaBaixa([ok])).toEqual([]);
  });
});
