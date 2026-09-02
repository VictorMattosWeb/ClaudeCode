import { describe, it, expect } from "vitest";
import { getLotNextDueDate, getLotCycle } from "./lot";
import type { Lot, Preservation } from "./lot";

function pres(date: string): Preservation {
  // `nextDate` propositalmente errado: o valor gravado no histórico não deve
  // influenciar a data exibida, que é recalculada pela regra do ciclo.
  return { id: date, date, nextDate: "1999-01-01", observation: "", responsible: "" };
}

function lote(nome: string, datas: string[]): Lot {
  return {
    id: "1",
    identificadorInterno: "NOV-0001",
    tipoLote: "novo",
    code: "NF-1",
    name: nome,
    location: "",
    rua: "",
    prateleira: "",
    responsible: "",
    status: "ativo",
    observations: "",
    preservations: datas.map(pres),
    createdAt: "2026-01-01T00:00:00Z",
  };
}

describe("getLotNextDueDate", () => {
  it("sem preservação, não há próxima data", () => {
    expect(getLotNextDueDate(lote("Painel PN-12", []))).toBeNull();
  });

  it("ciclo semanal: a próxima é a segunda da semana seguinte", () => {
    // 26/08/2026 é quarta; a semana começa em 24/08 e a próxima em 31/08.
    expect(getLotNextDueDate(lote("Painel PN-12", ["2026-08-26"]))).toBe("2026-08-31");
  });

  it("ciclo semanal: preservar no domingo ainda aponta para a segunda seguinte", () => {
    expect(getLotNextDueDate(lote("Painel PN-12", ["2026-08-30"]))).toBe("2026-08-31");
  });

  it("ciclo de 30 dias corridos: a próxima é 30 dias após o último registro", () => {
    for (const nome of ["Painel PN-32", "Painel PN-34", "Painel PN-36"]) {
      expect(getLotCycle(lote(nome, [])).dias).toBe(30);
      // 24/08 + 30 dias = 23/09/2026, uma quarta-feira: sem rolagem.
      expect(getLotNextDueDate(lote(nome, ["2026-08-24"]))).toBe("2026-09-23");
    }
  });

  it("ignora o nextDate gravado no histórico", () => {
    // Era exatamente este o defeito: a tela lia o campo persistido, que sempre
    // apontava para a próxima segunda, e mostrava uma data errada nos lotes de
    // ciclo mensal.
    const lot = lote("Painel PN-34", ["2026-08-24"]);
    expect(lot.preservations[0].nextDate).toBe("1999-01-01");
    expect(getLotNextDueDate(lot)).toBe("2026-09-23");
  });

  it("usa a preservação mais recente, não a primeira", () => {
    const lot = lote("Painel PN-34", ["2026-01-05", "2026-08-24", "2026-03-02"]);
    expect(getLotNextDueDate(lot)).toBe("2026-09-23");
  });

  it("a próxima data de um ciclo por dias nunca cai em fim de semana", () => {
    for (const inicio of ["2026-08-24", "2026-08-28", "2026-09-01", "2026-09-15"]) {
      const iso = getLotNextDueDate(lote("Painel PN-32", [inicio]))!;
      const [y, m, d] = iso.split("-").map(Number);
      expect([0, 6]).not.toContain(new Date(y, m - 1, d).getDay());
    }
  });

  it("a data devolvida está sempre em ISO, sem deslocamento de fuso", () => {
    const iso = getLotNextDueDate(lote("Painel PN-34", ["2026-08-24"]))!;
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
