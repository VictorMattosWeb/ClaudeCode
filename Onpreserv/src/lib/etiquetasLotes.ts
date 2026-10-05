import type { Lot } from "@/types/lot";
import { getLotNextDueDate } from "@/types/lot";

/**
 * Etiquetas de preservação, em PDF pronto para impressão.
 *
 * -----------------------------------------------------------------------------
 * O formulário é PR-5290.00-22000-970-ST5-502 (FORM-PADRAO.Rev00) e NÃO pode
 * ser alterado: layout, textos fixos, cores e proporções são reproduzidos como
 * estão no modelo `referencias/etiqueta_example.xlsx`. Só dois campos são
 * preenchidos.
 * -----------------------------------------------------------------------------
 *
 *   Descrição        ← `lot.name`  (rótulo e valor na mesma linha, no topo)
 *   Lote             ← `lot.code`  (o número da nota fiscal)
 *   1ª linha da tabela ← a preservação VIGENTE: a data em que foi feita e a
 *                        semana em que a próxima vence.
 *
 * Todo o resto — cabeçalho, logo, "RNEST-TREM2-CISC", "Local: ALMOXARIFADO" e
 * as outras quatro linhas de Verificação/Executor com as datas em branco — é
 * texto do formulário, para ser preenchido à mão no campo.
 *
 * As medidas e as cores abaixo saíram da própria planilha; é o que garante que
 * a etiqueta impressa seja igual à original.
 */

// -----------------------------------------------------------------------------
// Conversão das medidas da planilha
// -----------------------------------------------------------------------------

/**
 * Fator aplicado a TUDO: medidas, fontes, logo e traços.
 *
 * Em escala 1 a etiqueta sai com 167 x 80 mm, que é o tamanho da etiqueta real
 * medida — e três delas cabem numa folha A4 com folga para o corte. Um fator
 * único é o que garante que reduzir ou ampliar não distorça o formulário, cujas
 * proporções não podem mudar.
 */
const ESCALA = 1;

/** Largura de coluna do Excel (em caracteres) para milímetros. */
const colParaMm = (caracteres: number) => (((caracteres * 7 + 5) * 25.4) / 96) * ESCALA;

/** Altura de faixa, em mm na escala 1, já reduzida pela escala. */
const faixa = (mmNaEscala1: number) => mmNaEscala1 * ESCALA;

/** Colunas B..F do modelo, na ordem. */
const COLUNAS_MM = [27.85, 19, 8.28, 15.57, 16].map(colParaMm);
const LARGURA_MM = COLUNAS_MM.reduce((a, b) => a + b, 0);

/** Borda esquerda de cada coluna, em mm a partir da origem da etiqueta. */
const X: number[] = COLUNAS_MM.reduce<number[]>((acc, w) => [...acc, acc[acc.length - 1] + w], [0]);

/**
 * Alturas das faixas, medidas na etiqueta impressa de referência.
 *
 * NÃO são as alturas de linha gravadas no `.xlsx`. O Excel reajusta linhas de
 * altura automática na hora de renderizar, e a etiqueta que sai da impressora
 * tem proporções diferentes das declaradas no arquivo: a faixa da logo sai
 * menor, e as linhas da tabela saem bem maiores. Estes números vieram da medição
 * da etiqueta real — é o que faz o resultado bater com o que se usa no campo.
 *
 * Ordem: cabeçalho, (emenda), logo, Descrição/Lote, faixa vazia, cabeçalho da
 * tabela e as cinco linhas de registro.
 */
const LINHAS_MM = [5.2, 0.2, 7.2, 18.1, 3.3, 7.8, 7.7, 7.7, 7.7, 7.7, 7.7].map(faixa);
const ALTURA_MM = LINHAS_MM.reduce((a, b) => a + b, 0);

/** Topo de cada linha, em mm a partir da origem da etiqueta. */
const Y: number[] = LINHAS_MM.reduce<number[]>((acc, h) => [...acc, acc[acc.length - 1] + h], [0]);

// -----------------------------------------------------------------------------
// Cores e traços do modelo
// -----------------------------------------------------------------------------

/** Cinza do cabeçalho e da zebra: tema 0 (branco) com tint -5%. */
const CINZA: RGB = [242, 242, 242];
const BRANCO: RGB = [255, 255, 255];
const PRETO: RGB = [0, 0, 0];

type RGB = [number, number, number];

/** Espessura da borda "medium" do Excel, e a fina das divisórias internas. */
const BORDA_GROSSA = 0.5 * ESCALA;
const BORDA_FINA = 0.1 * ESCALA;

/**
 * Corpo do texto, medido na etiqueta de referência.
 *
 * O `.xlsx` declara 10pt em todas as células, mas a etiqueta impressa não sai
 * assim: medindo os textos sem acento — `RNEST-TREM2-CISC`, `Local:` e
 * `DATA PRESERV` — a altura das maiúsculas é de 1,65 mm numa etiqueta de
 * 167,2 mm de largura, o que dá cerca de 6,5pt. Usar os 10pt do arquivo deixava
 * a etiqueta com a letra uma vez e meia maior que a real.
 *
 * A fonte é Helvetica porque o jsPDF só embute as fontes padrão do PDF e Aptos
 * não é uma delas; o que importa preservar é o corpo, que define o encaixe.
 */
const CORPO = 6.6 * ESCALA;
/** O título é o único texto maior que o corpo, como na etiqueta de referência. */
const CORPO_TITULO = 10.5 * ESCALA;
const FONTE = "helvetica";

/** Folga interna do texto dentro da célula. */
const PAD = 1.4 * ESCALA;

// -----------------------------------------------------------------------------
// Página
// -----------------------------------------------------------------------------

const PAGINA = { largura: 210, altura: 297 }; // A4 retrato
const MARGEM_X = (PAGINA.largura - LARGURA_MM) / 2;
const MARGEM_TOPO = 12;
/** Espaço entre etiquetas — dá onde passar a tesoura. */
const ESPACO = 8;

const POR_PAGINA = Math.max(
  1,
  Math.floor((PAGINA.altura - 2 * MARGEM_TOPO + ESPACO) / (ALTURA_MM + ESPACO)),
);

export interface ResultadoEtiquetas {
  etiquetas: number;
  paginas: number;
  arquivo: string;
}

/**
 * Gera o PDF com uma etiqueta por lote e dispara o download.
 *
 * O jsPDF entra por import dinâmico: são ~300 kB que só fazem sentido no
 * momento da impressão e não precisam pesar no carregamento do sistema.
 */
export async function gerarEtiquetasPdf(
  lots: Lot[],
  baseName = "etiquetas",
): Promise<ResultadoEtiquetas> {
  const [{ default: jsPDF }, logo] = await Promise.all([
    import("jspdf"),
    import("@/assets/schneider-logo-etiqueta.png").then((m) => m.default),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  lots.forEach((lot, i) => {
    const posicao = i % POR_PAGINA;
    if (i > 0 && posicao === 0) doc.addPage();
    desenharEtiqueta(doc, lot, MARGEM_X, MARGEM_TOPO + posicao * (ALTURA_MM + ESPACO), logo);
  });

  const arquivo = `${baseName}_${carimbo()}.pdf`;
  doc.save(arquivo);

  return {
    etiquetas: lots.length,
    paginas: Math.max(1, Math.ceil(lots.length / POR_PAGINA)),
    arquivo,
  };
}

// -----------------------------------------------------------------------------
// Desenho de uma etiqueta
// -----------------------------------------------------------------------------

type Doc = import("jspdf").jsPDF;

/** Campo de data vazio, como no formulário impresso. */
const DATA_EM_BRANCO = "_____/____ /_____";

/**
 * A preservação vigente do lote, formatada para a primeira linha da tabela.
 *
 * "Vigente" é a última preservação registrada — não a data de hoje. A etiqueta
 * documenta o ciclo em que o material está, e imprimi-la uma semana depois da
 * baixa não pode mudar o que está escrito nela.
 *
 * Devolve `null` quando o lote nunca foi preservado: aí a linha sai em branco,
 * como as outras quatro.
 */
export function linhaVigente(lot: Lot): { feita: string; proxima: string } | null {
  const ultima = lot.preservations
    .filter((p) => p.date)
    .reduce<string | null>((maior, p) => (!maior || p.date > maior ? p.date : maior), null);

  if (!ultima) return null;

  const proxima = getLotNextDueDate(lot);
  return { feita: formatarData(ultima), proxima: proxima ? formatarData(proxima) : DATA_EM_BRANCO };
}

/** "2026-09-14" para "14/09/2026". */
function formatarData(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

function desenharEtiqueta(doc: Doc, lot: Lot, x0: number, y0: number, logo: string) {
  const x = (i: number) => x0 + X[i];
  const y = (i: number) => y0 + Y[i];

  // ---- Fundos, antes de qualquer traço -----------------------------------
  // Faixa do cabeçalho e identificação da unidade: cinza.
  fundo(doc, x(0), y(0), x(5), y(3), CINZA);
  // Descrição e Lote: fundo branco. O modelo traz a Descrição em amarelo, mas
  // em etiqueta impressa o realce não ajuda e suja a leitura — o rótulo em
  // negrito já diz onde escrever.
  fundo(doc, x(0), y(3), x(5), y(4), BRANCO);
  fundo(doc, x(0), y(4), x(5), y(5), BRANCO);
  // Cabeçalho da tabela: cinza.
  fundo(doc, x(0), y(5), x(5), y(6), CINZA);
  // Corpo da tabela: zebra, exatamente como no modelo. A primeira linha é
  // mista — branca à esquerda, cinza nas duas colunas de data.
  fundo(doc, x(0), y(6), x(3), y(7), BRANCO);
  fundo(doc, x(3), y(6), x(5), y(7), CINZA);
  fundo(doc, x(0), y(7), x(5), y(8), CINZA);
  fundo(doc, x(0), y(8), x(5), y(9), BRANCO);
  fundo(doc, x(0), y(9), x(5), y(10), CINZA);
  fundo(doc, x(0), y(10), x(5), y(11), BRANCO);

  doc.setTextColor(...PRETO);
  doc.setDrawColor(...PRETO);

  // ---- Faixa do cabeçalho (linhas 2-3) -----------------------------------
  traco(doc, x(0), y(0), x(5), y(0));
  traco(doc, x(0), y(2), x(5), y(2));
  [0, 1, 2, 5].forEach((c) => traco(doc, x(c), y(0), x(c), y(2)));

  doc.setFont(FONTE, "bold");
  doc.setFontSize(CORPO);
  ajustado(doc, "PR-5290.00-22000-970-ST5-502", x(0), x(1), y(0), y(2));
  ajustado(doc, "FORM-PADRAO.Rev00", x(1), x(2), y(0), y(2));
  doc.setFontSize(CORPO_TITULO);
  doc.text("PRESERVAÇÃO", (x(2) + x(5)) / 2, (y(0) + y(2)) / 2, {
    align: "center",
    baseline: "middle",
  });
  doc.setFontSize(CORPO);

  // ---- Logo e unidade (linha 4) ------------------------------------------
  traco(doc, x(0), y(3), x(5), y(3));
  [0, 2, 5].forEach((c) => traco(doc, x(c), y(2), x(c), y(3)));

  desenharLogo(doc, logo, x(0), y(2), y(3) - y(2));
  doc.setFont(FONTE, "bold");
  doc.setFontSize(CORPO);
  ajustado(doc, "RNEST-TREM2-CISC", x(2), x(5), y(2), y(3));

  // ---- Descrição e Lote (linha 5) — os dois campos preenchidos -----------
  traco(doc, x(0), y(4), x(5), y(4));
  [0, 2, 5].forEach((c) => traco(doc, x(c), y(3), x(c), y(4)));

  // Os dois campos são iguais: rótulo e valor na MESMA linha, encostados no
  // topo da célula (`vertical=top` no modelo). O espaço que sobra embaixo é
  // proposital — é onde se escreve à mão quando a descrição não cabe.
  campo(doc, "Descrição:", lot.name ?? "", x(0), x(2), y(3));
  campo(doc, "Lote:", lot.code ?? "", x(2), x(5), y(3));

  // ---- Faixa livre (linha 6) ---------------------------------------------
  [0, 5].forEach((c) => traco(doc, x(c), y(4), x(c), y(5)));

  // ---- Cabeçalho da tabela (linha 7) -------------------------------------
  [0, 5].forEach((c) => traco(doc, x(c), y(5), x(c), y(6)));

  doc.setFont(FONTE, "bold");
  doc.setFontSize(CORPO);
  aEsquerda(doc, "Local: ALMOXARIFADO", x(0), y(5), y(6), x(3) - x(0));
  aEsquerda(doc, "DATA PRESERV", x(3), y(5), y(6), x(4) - x(3));
  ajustado(doc, "PROX PRESERV", x(4), x(5), y(5), y(6));

  // ---- Cinco linhas de registro manual (linhas 8-12) ----------------------
  for (let i = 0; i < 5; i++) {
    const topo = y(6 + i);
    const base = y(7 + i);

    traco(doc, x(0), topo, x(0), base);
    traco(doc, x(5), topo, x(5), base);
    traco(doc, x(3), topo, x(3), base, BORDA_FINA);
    traco(doc, x(4), topo, x(4), base, BORDA_FINA);

    doc.setFont(FONTE, "bold");
    doc.setFontSize(CORPO);
    aEsquerda(doc, "Verificação: 72941730", x(0), topo, base, x(1) - x(0));
    aEsquerda(doc, "Executor: 72932222", x(1), topo, base, x(3) - x(1));

    // A primeira linha já sai preenchida com a preservação vigente: a data em
    // que ela foi feita e a semana em que a próxima vence. A etiqueta chega ao
    // campo dizendo em que ponto do ciclo o material está, e as quatro linhas
    // seguintes ficam em branco para os próximos registros, à mão.
    doc.setFont(FONTE, "normal");
    const vigente = i === 0 ? linhaVigente(lot) : null;
    aEsquerda(doc, vigente?.feita ?? DATA_EM_BRANCO, x(3), topo, base, x(4) - x(3));
    aEsquerda(doc, vigente?.proxima ?? DATA_EM_BRANCO, x(4), topo, base, x(5) - x(4));
  }

  traco(doc, x(0), y(11), x(5), y(11));
}

// -----------------------------------------------------------------------------
// Primitivas
// -----------------------------------------------------------------------------

function fundo(doc: Doc, x1: number, y1: number, x2: number, y2: number, cor: RGB) {
  doc.setFillColor(...cor);
  doc.rect(x1, y1, x2 - x1, y2 - y1, "F");
}

function traco(doc: Doc, x1: number, y1: number, x2: number, y2: number, esp = BORDA_GROSSA) {
  doc.setLineWidth(esp);
  doc.line(x1, y1, x2, y2);
}

/** Centrado nos dois eixos, encolhendo só se não couber na largura. */
function ajustado(doc: Doc, texto: string, x1: number, x2: number, y1: number, y2: number) {
  const disponivel = x2 - x1 - 2 * PAD;
  let corpo = CORPO;
  while (corpo > 3.5 * ESCALA && larguraDe(doc, texto, corpo) > disponivel) {
    corpo -= 0.25;
    doc.setFontSize(corpo);
  }
  doc.text(texto, (x1 + x2) / 2, (y1 + y2) / 2, { align: "center", baseline: "middle" });
  doc.setFontSize(CORPO);
}

/**
 * À esquerda, centrado na vertical, encolhendo para caber na célula.
 *
 * O limite existe porque os campos de data — `_____/____ /_____` — são mais
 * largos que a coluna no corpo do formulário e vazavam para fora da etiqueta,
 * passando por cima da borda.
 */
function aEsquerda(doc: Doc, texto: string, x: number, y1: number, y2: number, limite?: number) {
  if (limite !== undefined) {
    let corpo = CORPO;
    while (corpo > 3.5 * ESCALA && larguraDe(doc, texto, corpo) > limite - 2 * PAD) corpo -= 0.25;
    doc.setFontSize(corpo);
  }
  doc.text(texto, x + PAD, (y1 + y2) / 2, { baseline: "middle" });
  doc.setFontSize(CORPO);
}

/** Largura do texto em mm, no corpo informado. */
function larguraDe(doc: Doc, texto: string, corpo: number): number {
  return (doc.getStringUnitWidth(texto) * corpo) / doc.internal.scaleFactor;
}

/**
 * Rótulo e valor na mesma linha, encostados no topo da célula.
 *
 * É assim na etiqueta usada no campo: `Descrição: RH926CM MAT-TAF` e
 * `Lote: 27625`, colados no alto, com o resto da célula livre. O espaço vazio
 * embaixo não é sobra de layout — é onde se completa à mão.
 *
 * O valor sai no mesmo corpo do formulário e só encolhe quando não cabe; uma
 * descrição comprida quebra em linhas em vez de ser cortada, porque a etiqueta
 * vai para o almoxarifado e precisa identificar o material.
 */
function campo(doc: Doc, rotulo: string, valor: string, x1: number, x2: number, yTopo: number) {
  doc.setFont(FONTE, "bold");
  doc.setFontSize(CORPO);

  const primeiraLinha = yTopo + PAD + mm(CORPO) * 0.75;
  doc.text(rotulo, x1 + PAD, primeiraLinha, { baseline: "middle" });

  if (!valor) return;

  const larguraRotulo = larguraDe(doc, rotulo, CORPO);
  const inicioValor = x1 + PAD + larguraRotulo + mm(CORPO) * 0.35;
  const aoLado = x2 - inicioValor - PAD;

  // Caso comum: cabe ao lado do rótulo, como "Descrição: RH926CM MAT-TAF".
  if (larguraDe(doc, valor, CORPO) <= aoLado) {
    doc.text(valor, inicioValor, primeiraLinha, { baseline: "middle" });
    return;
  }

  // Não cabendo, o valor desce inteiro para as linhas de baixo, usando a
  // largura cheia da célula. Misturar as duas coisas — começar ao lado e
  // continuar embaixo — faria a primeira linha passar por cima do rótulo.
  const larguraCheia = x2 - x1 - 2 * PAD;
  const { linhas, corpo } = quebrar(doc, valor, larguraCheia, mm(CORPO) * 3.2);
  const alturaLinha = mm(corpo) * 1.25;
  doc.setFontSize(corpo);
  linhas.forEach((t, i) =>
    doc.text(t, x1 + PAD, primeiraLinha + alturaLinha * (i + 1), { baseline: "middle" }),
  );
  doc.setFontSize(CORPO);
}

/**
 * Quebra o valor em linhas, reduzindo o corpo só o necessário.
 *
 * Parte do corpo do formulário e só encolhe quando o texto não cabe — uma
 * descrição longa tem de continuar legível na etiqueta impressa, e cortá-la
 * seria pior que reduzi-la.
 */
function quebrar(doc: Doc, valor: string, largura: number, altura: number) {
  let corpo = CORPO;
  while (corpo > 3.5 * ESCALA) {
    doc.setFontSize(corpo);
    const linhas = doc.splitTextToSize(valor, largura) as string[];
    if (linhas.length * mm(corpo) * 1.2 <= altura) return { linhas, corpo };
    corpo -= 0.5;
  }
  doc.setFontSize(corpo);
  return { linhas: doc.splitTextToSize(valor, largura) as string[], corpo };
}

/** Pontos tipográficos para milímetros. */
const mm = (pontos: number) => (pontos * 25.4) / 72;

/**
 * Logo no tamanho e na posição exatos do modelo.
 *
 * Os números saíram da âncora do desenho na planilha: caixa de 25,4 x 6,9 mm,
 * deslocada 33,9 mm da borda esquerda e 1,6 mm do topo da linha. Ela NÃO é
 * centralizada na célula — fica à direita, e centralizar mudaria o formato.
 *
 * A imagem é encaixada dentro dessa caixa preservando a proporção do arquivo
 * (1485x392). Antes o desenho aplicava essa proporção a uma imagem quadrada de
 * outro arquivo do projeto, e a logo saía esticada.
 */
const LOGO = {
  /** Medidas do logotipo na etiqueta de referência, em mm na escala 1. */
  larguraMm: 20.2 * ESCALA,
  esquerdaMm: 27.6 * ESCALA,
  topoMm: 1.0 * ESCALA,
  /** Proporção do arquivo já recortado (400x118), com o fundo cinza da faixa. */
  proporcao: 400 / 118,
};

function desenharLogo(doc: Doc, logo: string, xColuna: number, yLinha: number, alturaFaixa: number) {
  let w = LOGO.larguraMm;
  let h = w / LOGO.proporcao;

  // Trava de segurança: a logo não pode cruzar a borda da faixa. Sem ela, um
  // ajuste nas alturas faria o logotipo passar por cima do traço de baixo.
  const disponivel = alturaFaixa - LOGO.topoMm - 0.3 * ESCALA;
  if (h > disponivel) {
    h = disponivel;
    w = h * LOGO.proporcao;
  }

  try {
    // O apelido faz o jsPDF guardar a imagem UMA vez e só referenciá-la nas
    // etiquetas seguintes. Sem ele, cada etiqueta carregava sua própria cópia
    // do PNG e um lote de 100 itens gerava dezenas de megabytes.
    doc.addImage(logo, "PNG", xColuna + LOGO.esquerdaMm, yLinha + LOGO.topoMm, w, h, "logo-schneider");
  } catch {
    // Sem a logo a etiqueta continua válida — o que não pode é a emissão
    // inteira falhar por causa da imagem.
  }
}

function carimbo(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

/** Exposto para teste. */
export const ETIQUETAS_POR_PAGINA = POR_PAGINA;
export const DIMENSOES_MM = { largura: LARGURA_MM, altura: ALTURA_MM };

/** Exposto para teste: o conteúdo da primeira linha da tabela. */
export { linhaVigente as linhaVigenteParaTeste };
