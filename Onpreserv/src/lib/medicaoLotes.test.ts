import { describe, it, expect } from "vitest";
import {
  computeMedicaoPeriodo,
  lotesNoPeriodo,
  lotesPreservadosNoPeriodo,
  type LotLite,
  type MedicaoLite,
  type Periodo,
} from "./medicaoLotes";

const medicoes: MedicaoLite[] = [
  { id: "m1", dataReferencia: "2026-03-16" },
  { id: "m2", dataReferencia: "2026-04-20" },
  { id: "m3", dataReferencia: "2026-05-18" },
];

function makeLot(id: string, createdAt: string, datasPreserv: string[] = []): LotLite {
  return {
    id,
    createdAt,
    preservations: datasPreserv.map((d) => ({ date: d })),
  };
}

describe("computeMedicaoPeriodo", () => {
  it("primeira medição estende para -infinito", () => {
    const p = computeMedicaoPeriodo("m1", medicoes)!;
    expect(p.inicio).toBe("0000-01-01");
    expect(p.fim).toBe("2026-04-19");
  });

  it("medição intermediária = [dataRef, próxima.dataRef - 1]", () => {
    const p = computeMedicaoPeriodo("m2", medicoes)!;
    expect(p.inicio).toBe("2026-04-20");
    expect(p.fim).toBe("2026-05-17");
  });

  it("última medição estende para +infinito", () => {
    const p = computeMedicaoPeriodo("m3", medicoes)!;
    expect(p.inicio).toBe("2026-05-18");
    expect(p.fim).toBe("9999-12-31");
  });

  it("retorna null para medição inexistente ou sem dataReferencia", () => {
    expect(computeMedicaoPeriodo("nope", medicoes)).toBeNull();
    expect(computeMedicaoPeriodo("x", [{ id: "x", dataReferencia: null }])).toBeNull();
  });
});

describe("invariante: lotesPreservadosNoPeriodo <= lotesNoPeriodo.length", () => {
  const lotes: LotLite[] = [
    // Cadastrado em M1, preservado em M1
    makeLot("a", "2026-04-01", ["2026-04-05"]),
    // Cadastrado em M2, preservado várias vezes em M2 (deve contar 1 só)
    makeLot("b", "2026-05-01", ["2026-05-02", "2026-05-10", "2026-05-15"]),
    // Cadastrado em M2, sem preservação
    makeLot("c", "2026-05-05", []),
    // Cadastrado em M2, mas preservado APÓS o período (em M3) — não conta em M2
    makeLot("d", "2026-05-10", ["2026-05-20"]),
    // Cadastrado em M3, preservado em M3
    makeLot("e", "2026-06-01", ["2026-06-02"]),
    // Cadastrado em M2, preservado ANTES do cadastro (caso degenerado) — não pode contar
    makeLot("f", "2026-05-15", ["2026-04-01"]),
    // Lote sem cadastro coerente
    makeLot("g", "", ["2026-05-10"]),
  ];

  it.each(["m1", "m2", "m3"] as const)(
    "medição %s respeita o invariante",
    (id) => {
      const p = computeMedicaoPeriodo(id, medicoes)!;
      const cadastrados = lotesNoPeriodo(lotes, p).length;
      const preservados = lotesPreservadosNoPeriodo(lotes, p);
      expect(preservados).toBeLessThanOrEqual(cadastrados);
    },
  );

  it("M2 deve contar 1 lote preservado (b), apesar de múltiplas preservações", () => {
    const p = computeMedicaoPeriodo("m2", medicoes)!;
    expect(lotesPreservadosNoPeriodo(lotes, p)).toBe(1);
    // cadastrados em M2: b, c, d, f
    expect(lotesNoPeriodo(lotes, p).map((l) => l.id).sort()).toEqual(["b", "c", "d", "f"]);
  });

  it("preservação fora do período não conta como preservado", () => {
    const p = computeMedicaoPeriodo("m2", medicoes)!;
    // 'd' foi cadastrado em M2 mas preservado em M3 → não conta em M2
    const ids = lotesNoPeriodo(lotes, p).map((l) => l.id);
    expect(ids).toContain("d");
    // Mesmo cadastrado em M2, não está entre os preservados
    expect(lotesPreservadosNoPeriodo(lotes, p)).toBe(1);
  });

  it("propriedade: para qualquer período arbitrário, preservados <= cadastrados", () => {
    // Varredura ampla de janelas de período
    const inicios = ["0000-01-01", "2026-01-01", "2026-04-01", "2026-05-01", "2026-06-01"];
    const fins = ["2026-04-30", "2026-05-15", "2026-05-31", "2026-12-31", "9999-12-31"];
    for (const i of inicios) {
      for (const f of fins) {
        if (i > f) continue;
        const p: Periodo = { inicio: i, fim: f };
        const cad = lotesNoPeriodo(lotes, p).length;
        const pres = lotesPreservadosNoPeriodo(lotes, p);
        expect(pres).toBeLessThanOrEqual(cad);
      }
    }
  });

  it("período sem lotes cadastrados retorna 0 preservados", () => {
    const p: Periodo = { inicio: "2030-01-01", fim: "2030-12-31" };
    expect(lotesNoPeriodo(lotes, p).length).toBe(0);
    expect(lotesPreservadosNoPeriodo(lotes, p)).toBe(0);
  });
});
