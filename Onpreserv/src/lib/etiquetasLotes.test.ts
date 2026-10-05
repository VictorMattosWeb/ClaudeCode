import { describe, it, expect } from "vitest";
import { DIMENSOES_MM, ETIQUETAS_POR_PAGINA } from "./etiquetasLotes";
import type { Lot, Preservation } from "@/types/lot";

function pres(date: string): Preservation {
  return { id: date, date, nextDate: "", observation: "", responsible: "" };
}

function lote(preservacoes: Preservation[], nome = "Painel comum"): Lot {
  return {
    id: "1",
    identificadorInterno: "NOV-0001",
    tipoLote: "novo",
    code: "27568",
    name: nome,
    location: "",
    rua: "",
    prateleira: "",
    responsible: "",
    status: "ativo",
    observations: "",
    preservations: preservacoes,
    createdAt: "2026-06-01T10:00:00.000Z",
  };
}

/**
 * O formulário não pode mudar de forma, então o que se testa aqui é a
 * geometria: se as proporções do modelo sobreviveram à conversão e se a
 * etiqueta continua cabendo na folha.
 */
describe("geometria da etiqueta", () => {
  const A4 = { largura: 210, altura: 297 };

  it("cabe na largura do A4, com margem dos dois lados", () => {
    expect(DIMENSOES_MM.largura).toBeLessThan(A4.largura - 20);
  });

  it("entram três etiquetas por folha", () => {
    expect(ETIQUETAS_POR_PAGINA).toBe(3);
  });

  it("as três cabem na altura da folha, com o espaço de corte", () => {
    const ESPACO = 8;
    const ocupado = ETIQUETAS_POR_PAGINA * DIMENSOES_MM.altura + (ETIQUETAS_POR_PAGINA - 1) * ESPACO;
    expect(ocupado).toBeLessThanOrEqual(A4.altura);
  });

  it("uma quarta etiqueta não caberia — o corte por página está no limite certo", () => {
    const ESPACO = 8;
    const comMaisUma = (ETIQUETAS_POR_PAGINA + 1) * (DIMENSOES_MM.altura + ESPACO);
    expect(comMaisUma).toBeGreaterThan(A4.altura);
  });

  it("sai no tamanho da etiqueta real, sem redução", () => {
    // A referência medida tem 167,2 x 80,3 mm. Imprimir no tamanho original é o
    // que faz o texto ficar legível no almoxarifado.
    expect(DIMENSOES_MM.largura).toBeCloseTo(167.2, 0);
    expect(DIMENSOES_MM.altura).toBeCloseTo(80.3, 0);
  });

  it("mantém a proporção da etiqueta de referência", () => {
    // A etiqueta real usada no campo mede 811 x 391 px na foto de referência,
    // ou seja, proporção 2,074. Não são as alturas declaradas no `.xlsx`: o
    // Excel reajusta linhas de altura automática ao renderizar, e o que sai da
    // impressora é mais baixo e largo que o arquivo sugere.
    //
    // Este teste existe para travar isso: qualquer mexida nas faixas que
    // distorça a etiqueta em relação à real quebra aqui.
    expect(DIMENSOES_MM.largura / DIMENSOES_MM.altura).toBeCloseTo(811 / 391, 1);
  });
});

/**
 * A primeira linha da tabela sai preenchida com a preservação vigente.
 * O desenho em si é PDF e não dá para inspecionar aqui, então o que se testa é
 * a função que decide o conteúdo dessa linha.
 */
describe("primeira linha da tabela", () => {
  it("usa a última preservação, não a data de hoje", async () => {
    const { linhaVigenteParaTeste } = await import("./etiquetasLotes");
    const lot = lote([pres("2026-08-24"), pres("2026-09-14")]);
    // Preservado na semana de 14/09, é cobrado duas semanas depois: 28/09.
    expect(linhaVigenteParaTeste(lot)).toEqual({ feita: "14/09/2026", proxima: "28/09/2026" });
  });

  it("escolhe a mais recente mesmo com o histórico fora de ordem", async () => {
    const { linhaVigenteParaTeste } = await import("./etiquetasLotes");
    const lot = lote([pres("2026-09-14"), pres("2026-03-02"), pres("2026-08-24")]);
    expect(linhaVigenteParaTeste(lot)?.feita).toBe("14/09/2026");
  });

  it("lote nunca preservado deixa a linha em branco", async () => {
    const { linhaVigenteParaTeste } = await import("./etiquetasLotes");
    expect(linhaVigenteParaTeste(lote([]))).toBeNull();
  });

  it("os painéis de 30 dias usam a própria frequência na próxima", async () => {
    const { linhaVigenteParaTeste } = await import("./etiquetasLotes");
    const pn = lote([pres("2026-09-14")], "Painel PN-34");
    // Os PN seguem em 30 dias: de 14/09 a 13/10, encerrando na semana de 12/10.
    expect(linhaVigenteParaTeste(pn)).toEqual({ feita: "14/09/2026", proxima: "12/10/2026" });
  });
});
