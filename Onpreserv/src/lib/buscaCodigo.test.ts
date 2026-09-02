import { describe, it, expect } from "vitest";
import {
  DEFAULT_FILTERS,
  filterLots,
  lotMatchesQuery,
  normalizarBusca,
  somenteAlfanumerico,
} from "./lotFilters";
import type { Lot } from "@/types/lot";

function lot(over: Partial<Lot> = {}): Lot {
  return {
    id: Math.random().toString(36).slice(2),
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
    createdAt: "2026-08-24T10:00:00.000Z",
    ...over,
  };
}

const buscar = (lots: Lot[], query: string) => filterLots(lots, { ...DEFAULT_FILTERS, query });

describe("normalização", () => {
  it("remove acentos e uniformiza caixa e espaços", () => {
    expect(normalizarBusca("  Galpão   ELÉTRICO ")).toBe("galpao eletrico");
  });

  it("a versão frouxa descarta separadores", () => {
    expect(somenteAlfanumerico("NF-882")).toBe("nf882");
    expect(somenteAlfanumerico("NF 882")).toBe("nf882");
    expect(somenteAlfanumerico("nf/882.")).toBe("nf882");
    expect(somenteAlfanumerico(" NF_882 ")).toBe("nf882");
  });
});

describe("busca por código — variações de escrita", () => {
  // O caso relatado: o mesmo código cadastrado de formas diferentes ao longo do
  // tempo. Antes, buscar por uma das grafias encontrava só os lotes escritos
  // exatamente daquele jeito.
  const variacoes = [
    lot({ id: "1", code: "NF-882" }),
    lot({ id: "2", code: "NF 882" }),
    lot({ id: "3", code: "nf882" }),
    lot({ id: "4", code: " NF-882 " }),
    lot({ id: "5", code: "NF/882" }),
    lot({ id: "6", code: "NF-999" }),
  ];

  it("qualquer grafia digitada encontra TODAS as grafias cadastradas", () => {
    for (const consulta of ["NF-882", "NF 882", "nf882", "nf/882", " NF-882 "]) {
      const ids = buscar(variacoes, consulta).map((l) => l.id);
      expect(ids, `busca por "${consulta}"`).toEqual(["1", "2", "3", "4", "5"]);
    }
  });

  it("não traz o código que realmente é outro", () => {
    expect(buscar(variacoes, "NF-882").map((l) => l.id)).not.toContain("6");
  });

  it("busca só pelos dígitos encontra todas", () => {
    expect(buscar(variacoes, "882")).toHaveLength(5);
  });

  it("espaço sobrando no cadastro não esconde o lote", () => {
    // Valor com espaço nas pontas é comum em importação de planilha.
    expect(buscar([lot({ code: "  NF-882  " })], "NF-882")).toHaveLength(1);
  });

  it("acento no nome não impede a busca sem acento", () => {
    expect(buscar([lot({ name: "PAINEL ELÉTRICO" })], "eletrico")).toHaveLength(1);
  });
});

describe("busca por identificador interno", () => {
  it("encontra com e sem o hífen", () => {
    const lots = [lot({ id: "1", identificadorInterno: "RTC-0042" })];
    expect(buscar(lots, "RTC-0042")).toHaveLength(1);
    expect(buscar(lots, "rtc0042")).toHaveLength(1);
    expect(buscar(lots, "0042")).toHaveLength(1);
  });
});

describe("precisão da passada frouxa", () => {
  it("não casa através da fronteira entre campos", () => {
    // Rua "3" e prateleira "4" não podem virar um casamento por "34" — foi por
    // isso que a busca frouxa é aplicada campo a campo, não no texto todo.
    const lots = [lot({ code: "NF-100", rua: "3", prateleira: "4" })];
    expect(buscar(lots, "34")).toHaveLength(0);
  });

  it("consulta curta não aciona a passada frouxa", () => {
    // "f1" não existe literalmente em "NF-100" (tem o hífen no meio), mas
    // existiria na versão frouxa "nf100". Com menos de 3 caracteres a passada
    // frouxa não roda, senão qualquer par de caracteres varreria a base.
    const lots = [lot({ code: "NF-100" })];
    expect(buscar(lots, "f1")).toHaveLength(0);
    // Com 3 caracteres, a frouxa entra e encontra.
    expect(buscar(lots, "f10")).toHaveLength(1);
  });

  it("consulta curta ainda funciona quando aparece literalmente", () => {
    expect(buscar([lot({ code: "NF-100" })], "nf")).toHaveLength(1);
  });

  it("busca vazia ou só espaços devolve tudo", () => {
    const lots = [lot(), lot(), lot()];
    expect(buscar(lots, "")).toHaveLength(3);
    expect(buscar(lots, "   ")).toHaveLength(3);
  });
});

describe("lotMatchesQuery isolado", () => {
  it("percorre todos os campos buscáveis", () => {
    const l = lot({
      identificadorInterno: "NOV-0007",
      code: "NF-555",
      name: "Disjuntor",
      location: "Galpão B",
      rua: "12",
      prateleira: "C4",
      responsible: "Bruno",
    });
    for (const termo of ["NOV-0007", "NF-555", "disjuntor", "galpao b", "bruno"]) {
      expect(lotMatchesQuery(l, termo), termo).toBe(true);
    }
  });

  it("devolve true para consulta vazia", () => {
    expect(lotMatchesQuery(lot(), "")).toBe(true);
  });
});

describe("combinação com os demais filtros", () => {
  it("a busca continua sendo E, não OU, com os outros critérios", () => {
    const lots = [
      lot({ id: "1", code: "NF-882", status: "ativo" }),
      lot({ id: "2", code: "NF 882", status: "inativo" }),
    ];
    const r = filterLots(lots, { ...DEFAULT_FILTERS, query: "nf882", status: "ativo" });
    expect(r.map((l) => l.id)).toEqual(["1"]);
  });

  it("rua e prateleira toleram variação de escrita", () => {
    const lots = [lot({ id: "1", rua: " 12 ", prateleira: "C-4" })];
    expect(filterLots(lots, { ...DEFAULT_FILTERS, rua: "12" })).toHaveLength(1);
    expect(filterLots(lots, { ...DEFAULT_FILTERS, prateleira: "c4" })).toHaveLength(1);
  });
});
