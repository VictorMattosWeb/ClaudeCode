import { describe, it, expect } from "vitest";
import {
  getLotCycleReference,
  getLotDueDate,
  getLotDeadline,
  getLotNextDueDate,
  getDaysLeftInCycle,
  getLotPreservationStatus,
} from "./lot";
import { computeLotStats } from "@/lib/stats";
import type { Lot, Preservation } from "./lot";

const dia = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

function pres(date: string, nextDate = ""): Preservation {
  return { id: date, date, nextDate, observation: "", responsible: "" };
}

function lote(over: Partial<Lot> = {}): Lot {
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
    preservations: [],
    createdAt: "2026-06-01T10:00:00.000Z",
    ...over,
  };
}

/** Preservação bem atrasada: em 02/09, um lote ativo assim estaria vencido. */
const ATRASADO = [pres("2026-06-01", "2026-06-16")];
const HOJE = dia("2026-09-02");

describe("lote inativo não exige preservação", () => {
  it("um lote ativo nas mesmas condições está vencido", () => {
    // Prova que o cenário do teste realmente cobraria preservação.
    expect(getLotPreservationStatus(lote({ preservations: ATRASADO }), HOJE)).toBe("overdue");
  });

  it("inativo nunca fica vencido", () => {
    const inativo = lote({ status: "inativo", preservations: ATRASADO });
    expect(getLotPreservationStatus(inativo, HOJE)).toBe("none");
  });

  it("inativo não tem ciclo, prazo nem data prevista", () => {
    const inativo = lote({ status: "inativo", preservations: ATRASADO });
    expect(getLotCycleReference(inativo)).toBeNull();
    expect(getLotDueDate(inativo, HOJE)).toBeNull();
    expect(getLotDeadline(inativo, HOJE)).toBeNull();
    expect(getLotNextDueDate(inativo, HOJE)).toBeNull();
    expect(getDaysLeftInCycle(inativo, HOJE)).toBeNull();
  });

  it("vale também para o material novo, que teria o prazo de 7 dias", () => {
    const novo = lote({ status: "inativo", createdAt: "2026-09-01T10:00:00.000Z" });
    expect(getLotPreservationStatus(novo, HOJE)).toBe("none");
    expect(getLotNextDueDate(novo, HOJE)).toBeNull();
  });

  it("reativar devolve a cobrança", () => {
    const reativado = lote({ status: "ativo", preservations: ATRASADO });
    expect(getLotPreservationStatus(reativado, HOJE)).toBe("overdue");
  });
});

describe("lote inativo fora do cálculo dos indicadores", () => {
  it("não conta como vencido nem como sem preservação", () => {
    const s = computeLotStats([
      lote({ id: "a", status: "inativo", preservations: ATRASADO }),
      lote({ id: "b", status: "inativo" }),
    ]);
    expect(s.vencidos).toBe(0);
    expect(s.semPreservacao).toBe(0);
    expect(s.preservados).toBe(0);
    expect(s.upcoming).toBe(0);
  });

  it("não afunda a taxa de preservação", () => {
    const emDia = lote({ id: "ok", preservations: [pres("2026-08-31", "2026-09-15")] });
    const inativo = lote({ id: "off", status: "inativo", preservations: ATRASADO });
    // Sozinho, o lote em dia dá 100%. O inativo não pode derrubar para 50%.
    expect(computeLotStats([emDia]).taxaPreservacao).toBe(100);
    expect(computeLotStats([emDia, inativo]).taxaPreservacao).toBe(100);
  });

  it("o total segue contando tudo que está na lista", () => {
    const s = computeLotStats([lote({ id: "a" }), lote({ id: "b", status: "inativo" })]);
    expect(s.total).toBe(2);
  });

  it("ativos e inativos são contados à parte, para o controle de custódia", () => {
    const s = computeLotStats([
      lote({ id: "a" }),
      lote({ id: "b" }),
      lote({ id: "c", status: "inativo" }),
    ]);
    expect(s.ativos).toBe(2);
    expect(s.inativos).toBe(1);
    expect(s.ativos + s.inativos).toBe(s.total);
  });

  it("sem nenhum ativo, a taxa é 0 e não divide por zero", () => {
    const s = computeLotStats([lote({ id: "a", status: "inativo", preservations: ATRASADO })]);
    expect(s.ativos).toBe(0);
    expect(s.inativos).toBe(1);
    expect(s.taxaPreservacao).toBe(0);
  });
});
