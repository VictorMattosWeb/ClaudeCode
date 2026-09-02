import { describe, it, expect } from "vitest";
import {
  DEFAULT_FILTERS,
  filterLots,
  activeFilterChips,
  resolvePeriodoCadastro,
  type LotFiltersValue,
} from "./lotFilters";
import type { Lot } from "@/types/lot";

const isoDiasAtras = (dias: number) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

function lot(over: Partial<Lot> = {}): Lot {
  return {
    id: "1",
    identificadorInterno: "NOV-0001",
    tipoLote: "novo",
    code: "NF-100",
    name: "Painel elétrico",
    location: "Galpão A",
    rua: "3",
    prateleira: "B2",
    responsible: "Ana",
    status: "ativo",
    observations: "",
    preservations: [],
    createdAt: `${isoDiasAtras(0)}T10:00:00.000Z`,
    ...over,
  };
}

describe("filterLots", () => {
  it("sem filtros, devolve tudo", () => {
    const lots = [lot(), lot({ id: "2" })];
    expect(filterLots(lots, DEFAULT_FILTERS)).toHaveLength(2);
  });

  it("busca livre encontra pelo identificador interno", () => {
    const lots = [lot({ identificadorInterno: "RTC-0042" }), lot({ id: "2", identificadorInterno: "NOV-0001" })];
    const r = filterLots(lots, { ...DEFAULT_FILTERS, query: "rtc-0042" });
    expect(r).toHaveLength(1);
    expect(r[0].identificadorInterno).toBe("RTC-0042");
  });

  it("busca livre é case-insensitive e cobre nome e responsável", () => {
    const lots = [lot({ name: "Transformador" }), lot({ id: "2", responsible: "Bruno" })];
    expect(filterLots(lots, { ...DEFAULT_FILTERS, query: "TRANSFORM" })).toHaveLength(1);
    expect(filterLots(lots, { ...DEFAULT_FILTERS, query: "bruno" })).toHaveLength(1);
  });

  it("combina critérios em AND", () => {
    const lots = [
      lot({ id: "1", status: "ativo", tipoLote: "novo" }),
      lot({ id: "2", status: "ativo", tipoLote: "retirado_campo" }),
      lot({ id: "3", status: "inativo", tipoLote: "novo" }),
    ];
    const r = filterLots(lots, { ...DEFAULT_FILTERS, status: "ativo", tipoLote: "novo" });
    expect(r.map((l) => l.id)).toEqual(["1"]);
  });

  it("filtra por rua e prateleira como busca parcial", () => {
    const lots = [lot({ rua: "12" }), lot({ id: "2", rua: "3" })];
    expect(filterLots(lots, { ...DEFAULT_FILTERS, rua: "1" })).toHaveLength(1);
  });

  describe("período de cadastro", () => {
    it("'hoje' mantém só o cadastrado hoje", () => {
      const lots = [
        lot({ id: "hoje", createdAt: `${isoDiasAtras(0)}T08:00:00Z` }),
        lot({ id: "ontem", createdAt: `${isoDiasAtras(1)}T08:00:00Z` }),
      ];
      const r = filterLots(lots, { ...DEFAULT_FILTERS, periodoCadastro: "hoje" });
      expect(r.map((l) => l.id)).toEqual(["hoje"]);
    });

    it("'7d' é inclusivo: pega hoje e os 6 dias anteriores, mas não o 7º", () => {
      const lots = [
        lot({ id: "d0", createdAt: `${isoDiasAtras(0)}T08:00:00Z` }),
        lot({ id: "d6", createdAt: `${isoDiasAtras(6)}T08:00:00Z` }),
        lot({ id: "d7", createdAt: `${isoDiasAtras(7)}T08:00:00Z` }),
      ];
      const r = filterLots(lots, { ...DEFAULT_FILTERS, periodoCadastro: "7d" });
      expect(r.map((l) => l.id).sort()).toEqual(["d0", "d6"]);
    });

    it("'30d' inclui o 29º dia e exclui o 30º", () => {
      const lots = [
        lot({ id: "d29", createdAt: `${isoDiasAtras(29)}T08:00:00Z` }),
        lot({ id: "d30", createdAt: `${isoDiasAtras(30)}T08:00:00Z` }),
      ];
      const r = filterLots(lots, { ...DEFAULT_FILTERS, periodoCadastro: "30d" });
      expect(r.map((l) => l.id)).toEqual(["d29"]);
    });

    it("período personalizado respeita os dois extremos, inclusive", () => {
      const lots = [
        lot({ id: "a", createdAt: "2026-03-01T08:00:00Z" }),
        lot({ id: "b", createdAt: "2026-03-15T08:00:00Z" }),
        lot({ id: "c", createdAt: "2026-04-01T08:00:00Z" }),
      ];
      const r = filterLots(lots, {
        ...DEFAULT_FILTERS,
        periodoCadastro: "custom",
        cadastroDe: "2026-03-01",
        cadastroAte: "2026-03-15",
      });
      expect(r.map((l) => l.id)).toEqual(["a", "b"]);
    });

    it("personalizado sem data final vale até o futuro", () => {
      const lots = [lot({ id: "a", createdAt: "2030-01-01T08:00:00Z" })];
      const r = filterLots(lots, {
        ...DEFAULT_FILTERS,
        periodoCadastro: "custom",
        cadastroDe: "2026-01-01",
        cadastroAte: "",
      });
      expect(r).toHaveLength(1);
    });

    it("lote sem data de cadastro sai de qualquer janela", () => {
      const lots = [lot({ id: "sem", createdAt: "" })];
      expect(filterLots(lots, { ...DEFAULT_FILTERS, periodoCadastro: "30d" })).toHaveLength(0);
      // ...mas continua visível quando não há filtro de período.
      expect(filterLots(lots, DEFAULT_FILTERS)).toHaveLength(1);
    });

    it("resolvePeriodoCadastro devolve null quando não há restrição", () => {
      expect(resolvePeriodoCadastro(DEFAULT_FILTERS)).toBeNull();
    });
  });
});

describe("activeFilterChips", () => {
  it("não gera chip quando nada está filtrado", () => {
    expect(activeFilterChips(DEFAULT_FILTERS)).toHaveLength(0);
  });

  it("ignora busca composta só de espaços", () => {
    expect(activeFilterChips({ ...DEFAULT_FILTERS, query: "   " })).toHaveLength(0);
  });

  it("gera um chip por critério ativo", () => {
    const v: LotFiltersValue = {
      ...DEFAULT_FILTERS,
      query: "painel",
      status: "ativo",
      preservation: "overdue",
      rua: "3",
    };
    expect(activeFilterChips(v).map((c) => c.key).sort()).toEqual([
      "preservation",
      "query",
      "rua",
      "status",
    ]);
  });

  it("clear remove apenas o próprio critério", () => {
    const v: LotFiltersValue = { ...DEFAULT_FILTERS, query: "painel", status: "ativo" };
    const chip = activeFilterChips(v).find((c) => c.key === "status")!;
    const next = chip.clear(v);
    expect(next.status).toBe("all");
    expect(next.query).toBe("painel");
  });

  it("limpar o chip de período zera também as datas personalizadas", () => {
    const v: LotFiltersValue = {
      ...DEFAULT_FILTERS,
      periodoCadastro: "custom",
      cadastroDe: "2026-01-01",
      cadastroAte: "2026-02-01",
    };
    const next = activeFilterChips(v).find((c) => c.key === "periodoCadastro")!.clear(v);
    expect(next).toMatchObject({ periodoCadastro: "all", cadastroDe: "", cadastroAte: "" });
  });
});

describe("busca por código repetido (reprodução do bug relatado)", () => {
  it("devolve TODOS os lotes que compartilham o mesmo código", () => {
    const lots = [
      lot({ id: "1", identificadorInterno: "NOV-0001", code: "NF-882" }),
      lot({ id: "2", identificadorInterno: "NOV-0002", code: "NF-882" }),
      lot({ id: "3", identificadorInterno: "NOV-0003", code: "NF-882" }),
      lot({ id: "4", identificadorInterno: "NOV-0004", code: "NF-999" }),
    ];
    const r = filterLots(lots, { ...DEFAULT_FILTERS, query: "NF-882" });
    expect(r.map((l) => l.id)).toEqual(["1", "2", "3"]);
  });

  it("busca parcial do código também traz todos", () => {
    const lots = [
      lot({ id: "1", code: "NF-882" }),
      lot({ id: "2", code: "NF-8820" }),
      lot({ id: "3", code: "NF-100" }),
    ];
    expect(filterLots(lots, { ...DEFAULT_FILTERS, query: "882" })).toHaveLength(2);
  });

  it("espaços em volta da busca não eliminam resultados", () => {
    const lots = [lot({ id: "1", code: "NF-882" }), lot({ id: "2", code: "NF-882" })];
    expect(filterLots(lots, { ...DEFAULT_FILTERS, query: "  NF-882  " })).toHaveLength(2);
  });
});
