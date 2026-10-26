import { describe, it, expect } from "vitest";
import { getLotOverdueWeeks } from "./lot";
import type { Lot, Preservation } from "./lot";
import { computeLotStats } from "@/lib/stats";

const dia = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

function pres(date: string): Preservation {
  return { id: date, date, nextDate: "", observation: "", responsible: "" };
}

function lote(preservacoes: Preservation[], over: Partial<Lot> = {}): Lot {
  return {
    id: "1",
    identificadorInterno: "NOV-0001",
    tipoLote: "novo",
    code: "27568",
    name: "Painel",
    location: "",
    rua: "",
    prateleira: "",
    responsible: "",
    status: "ativo",
    observations: "",
    preservations: preservacoes,
    createdAt: "2026-06-01T10:00:00.000Z",
    ...over,
  };
}

// Preservado em 14/09 com ciclo de 21 dias: cobrança na semana de 28/09.
const preservado1409 = lote([pres("2026-09-14")]);

describe("semanas vencidas de um lote", () => {
  it("é zero enquanto a semana do vencimento está aberta", () => {
    expect(getLotOverdueWeeks(preservado1409, dia("2026-10-02"))).toBe(0);
  });

  it("conta a semana do vencimento assim que ela fecha", () => {
    expect(getLotOverdueWeeks(preservado1409, dia("2026-10-05"))).toBe(1);
  });

  it("soma uma por semana fechada, sem contar a corrente", () => {
    // Semanas de 28/09, 05/10 e 12/10 fecharam; a de 19/10 está aberta.
    expect(getLotOverdueWeeks(preservado1409, dia("2026-10-20"))).toBe(3);
  });

  it("lote inativo não acumula", () => {
    const inativo = lote([pres("2026-09-14")], { status: "inativo" });
    expect(getLotOverdueWeeks(inativo, dia("2026-10-20"))).toBe(0);
  });
});

describe("vencidos acumulados no conjunto", () => {
  it("soma as semanas de todos os lotes vencidos", () => {
    const lotes = [
      preservado1409, // 3 semanas
      lote([pres("2026-09-21")], { id: "2" }), // cobrança em 05/10: 2 semanas
      lote([pres("2026-10-16")], { id: "3" }), // em dia
    ];
    const stats = computeLotStats(lotes, dia("2026-10-20"));
    expect(stats.vencidos).toBe(2);
    expect(stats.vencidosAcumulados).toBe(5);
  });
});
