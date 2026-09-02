import { describe, it, expect } from "vitest";
import { calcularSituacao, CronogramaItem } from "./cronograma";

const base = (over: Partial<CronogramaItem> = {}): CronogramaItem => ({
  id: "1", medicaoId: "m", semana: "", preservacao: "", tag: "T", unidade: "",
  gabinete: "", tipo: "", dataPrevista: null, dataRealizada: null, status: "PENDENTE",
  observacoes: "", motivoDivergencia: "", createdAt: "", updatedAt: "", ...over,
});

const PASSADO = "2024-01-01";
const HOJE = new Date().toISOString().slice(0, 10);

describe("calcularSituacao — regra de baixa", () => {
  it("status PRESERVADO + dataRealizada hoje > prevista no passado → divergencia (NUNCA vencido)", () => {
    const r = calcularSituacao(base({ status: "PRESERVADO", dataPrevista: PASSADO, dataRealizada: HOJE }));
    expect(r.situacao).toBe("divergencia");
  });

  it("status PRESERVADO sem dataRealizada mas com prevista vencida → no_prazo (NUNCA vencido)", () => {
    // Regressão: a baixa marcou o status mas a dataRealizada não chegou — não pode voltar a "vencido".
    const r = calcularSituacao(base({ status: "PRESERVADO", dataPrevista: PASSADO, dataRealizada: null }));
    expect(r.situacao).toBe("no_prazo");
  });

  it("status PRESERVADO sem datas → no_prazo", () => {
    const r = calcularSituacao(base({ status: "PRESERVADO" }));
    expect(r.situacao).toBe("no_prazo");
  });

  it("status PENDENTE com prevista no passado → vencido", () => {
    const r = calcularSituacao(base({ status: "PENDENTE", dataPrevista: PASSADO }));
    expect(r.situacao).toBe("vencido");
  });

  it("status N/A → nao_aplicavel", () => {
    const r = calcularSituacao(base({ status: "N/A", dataPrevista: PASSADO }));
    expect(r.situacao).toBe("nao_aplicavel");
  });
});
