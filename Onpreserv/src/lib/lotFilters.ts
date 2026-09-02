import { Lot, LotStatus, LotTipo, LOT_TIPO_LABEL, getLotPreservationStatus } from "@/types/lot";

/**
 * Filtro de lotes — fonte única.
 *
 * Antes esta lógica existia duas vezes: em `lib/filterLots.ts`, usada pela
 * página para calcular os indicadores do topo, e novamente dentro de
 * `LotTable`, que refiltrava por conta própria. Qualquer divergência entre as
 * duas fazia os indicadores contarem um conjunto e a tabela mostrar outro —
 * o tipo de bug que ninguém percebe até alguém conferir número no papel.
 */

/** Janelas de consulta do histórico de cadastro. */
export type PeriodoCadastro = "all" | "hoje" | "7d" | "30d" | "custom";

export const PERIODO_CADASTRO_LABEL: Record<PeriodoCadastro, string> = {
  all: "Qualquer data",
  hoje: "Hoje",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  custom: "Período personalizado",
};

export const PRESERVATION_LABEL: Record<LotStatus, string> = {
  preserved: "Semana cumprida",
  upcoming: "Semana aberta",
  overdue: "Semana vencida",
  none: "Sem preservação",
};

export interface LotFiltersValue {
  /** Busca livre: código, identificador, nome, local, rua, prateleira, responsável. */
  query: string;
  tipoLote: "all" | LotTipo;
  status: "all" | "ativo" | "inativo";
  preservation: "all" | LotStatus;
  rua: string;
  prateleira: string;
  /** Janela de data de cadastro. */
  periodoCadastro: PeriodoCadastro;
  /** Só usados quando `periodoCadastro === "custom"`. Formato YYYY-MM-DD. */
  cadastroDe: string;
  cadastroAte: string;
}

export const DEFAULT_FILTERS: LotFiltersValue = {
  query: "",
  tipoLote: "all",
  status: "all",
  preservation: "all",
  rua: "",
  prateleira: "",
  periodoCadastro: "all",
  cadastroDe: "",
  cadastroAte: "",
};

// =============================================================================
// Normalização da busca
// -----------------------------------------------------------------------------
// O código do lote é digitado por gente diferente, em momentos diferentes, e
// chega ao banco com variações: "NF-882", "NF 882", "nf882", " NF-882 ".
// Comparar as cadeias cruas faz a busca encontrar uma ocorrência e ignorar as
// outras — que é exatamente o sintoma de "sei que tem vários e só aparece um".
//
// A busca passa a ter duas passadas:
//   1. ESTRITA  — sem acentos, minúsculas, espaços colapsados. Cobre o caso
//                 comum e continua respeitando os separadores digitados.
//   2. FROUXA   — só letras e dígitos, aplicada CAMPO A CAMPO. "NF-882",
//                 "NF 882" e "NF882" viram todos "nf882" e se encontram.
//
// A frouxa é aplicada por campo, e não sobre tudo concatenado, porque juntar os
// campos e remover separadores criaria casamentos falsos: rua "3" ao lado de
// prateleira "4" viraria "34". Também exige três caracteres, para uma busca por
// "1" não varrer a base inteira.
// =============================================================================

/** Sem acentos, minúsculas, espaços colapsados e aparados. */
export function normalizarBusca(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Só letras e dígitos: ignora hífen, barra, ponto e espaço. */
export function somenteAlfanumerico(valor: string): string {
  return normalizarBusca(valor).replace(/[^a-z0-9]/g, "");
}

/** Mínimo de caracteres para a passada frouxa entrar em ação. */
const MINIMO_BUSCA_FROUXA = 3;

/** Campos que a busca livre percorre, na ordem de relevância. */
const camposBuscaveis = (lot: Lot): string[] => [
  lot.identificadorInterno,
  lot.code,
  lot.name,
  lot.location,
  lot.rua,
  lot.prateleira,
  lot.responsible,
];

/**
 * O lote atende à busca livre?
 *
 * Exportada para poder ser testada sozinha — é a parte do filtro que mais
 * costuma esconder defeito.
 */
export function lotMatchesQuery(lot: Lot, consulta: string): boolean {
  const q = normalizarBusca(consulta);
  if (!q) return true;

  const campos = camposBuscaveis(lot);

  // 1. Estrita, sobre todos os campos juntos.
  if (normalizarBusca(campos.join(" ")).includes(q)) return true;

  // 2. Frouxa, campo a campo.
  const qFrouxa = somenteAlfanumerico(consulta);
  if (qFrouxa.length >= MINIMO_BUSCA_FROUXA) {
    return campos.some((campo) => somenteAlfanumerico(campo).includes(qFrouxa));
  }

  return false;
}

/** Data local em ISO (YYYY-MM-DD), sem o deslocamento de fuso do toISOString. */
function isoHoje(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function isoDiasAtras(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Resolve a janela de cadastro para um intervalo `[de, ate]` inclusivo.
 * Retorna `null` quando não há restrição de data.
 */
export function resolvePeriodoCadastro(f: LotFiltersValue): { de: string; ate: string } | null {
  switch (f.periodoCadastro) {
    case "hoje":
      return { de: isoHoje(), ate: isoHoje() };
    case "7d":
      // 7 dias inclusivos: hoje + os 6 anteriores.
      return { de: isoDiasAtras(6), ate: isoHoje() };
    case "30d":
      return { de: isoDiasAtras(29), ate: isoHoje() };
    case "custom": {
      const de = f.cadastroDe || "0000-01-01";
      const ate = f.cadastroAte || "9999-12-31";
      return { de, ate };
    }
    default:
      return null;
  }
}

export function filterLots(lots: Lot[], filters: LotFiltersValue): Lot[] {
  const q = normalizarBusca(filters.query);
  const rua = filters.rua.trim();
  const prateleira = filters.prateleira.trim();
  const periodo = resolvePeriodoCadastro(filters);

  return lots.filter((lot) => {
    if (q && !lotMatchesQuery(lot, filters.query)) return false;
    if (filters.status !== "all" && lot.status !== filters.status) return false;
    if (filters.tipoLote !== "all" && lot.tipoLote !== filters.tipoLote) return false;
    if (filters.preservation !== "all" && getLotPreservationStatus(lot) !== filters.preservation) return false;
    // Rua e prateleira também toleram variação de escrita e espaço sobrando.
    if (rua && !somenteAlfanumerico(lot.rua).includes(somenteAlfanumerico(filters.rua))) return false;
    if (prateleira && !somenteAlfanumerico(lot.prateleira).includes(somenteAlfanumerico(filters.prateleira))) return false;
    if (periodo) {
      const cadastro = (lot.createdAt ?? "").slice(0, 10);
      if (!cadastro || cadastro < periodo.de || cadastro > periodo.ate) return false;
    }
    return true;
  });
}

/** Um filtro ativo, já com rótulo pronto e a instrução para removê-lo. */
export interface FilterChip {
  key: string;
  label: string;
  /** Devolve o filtro sem este critério. */
  clear: (v: LotFiltersValue) => LotFiltersValue;
}

/**
 * Filtros ativos como chips.
 *
 * Existe para que a barra de filtros mostre o que está aplicado e permita
 * remover um critério de cada vez — hoje só havia "limpar tudo", e o usuário
 * que quisesse tirar um filtro de sete precisava refazer os outros seis.
 */
export function activeFilterChips(v: LotFiltersValue): FilterChip[] {
  const chips: FilterChip[] = [];

  if (v.query.trim()) {
    chips.push({
      key: "query",
      label: `Busca: "${v.query.trim()}"`,
      clear: (f) => ({ ...f, query: "" }),
    });
  }
  if (v.tipoLote !== "all") {
    chips.push({
      key: "tipoLote",
      label: `Tipo: ${LOT_TIPO_LABEL[v.tipoLote]}`,
      clear: (f) => ({ ...f, tipoLote: "all" }),
    });
  }
  if (v.status !== "all") {
    chips.push({
      key: "status",
      label: `Status: ${v.status === "ativo" ? "Ativo" : "Inativo"}`,
      clear: (f) => ({ ...f, status: "all" }),
    });
  }
  if (v.preservation !== "all") {
    chips.push({
      key: "preservation",
      label: `Preservação: ${PRESERVATION_LABEL[v.preservation]}`,
      clear: (f) => ({ ...f, preservation: "all" }),
    });
  }
  if (v.rua.trim()) {
    chips.push({
      key: "rua",
      label: `Rua: ${v.rua.trim()}`,
      clear: (f) => ({ ...f, rua: "" }),
    });
  }
  if (v.prateleira.trim()) {
    chips.push({
      key: "prateleira",
      label: `Prateleira: ${v.prateleira.trim()}`,
      clear: (f) => ({ ...f, prateleira: "" }),
    });
  }
  if (v.periodoCadastro !== "all") {
    const label =
      v.periodoCadastro === "custom"
        ? `Cadastro: ${v.cadastroDe || "início"} → ${v.cadastroAte || "hoje"}`
        : `Cadastro: ${PERIODO_CADASTRO_LABEL[v.periodoCadastro]}`;
    chips.push({
      key: "periodoCadastro",
      label,
      clear: (f) => ({ ...f, periodoCadastro: "all", cadastroDe: "", cadastroAte: "" }),
    });
  }

  return chips;
}

/** Quantidade de filtros avançados ativos — usada no contador do botão. */
export function countAdvancedFilters(v: LotFiltersValue): number {
  return [v.rua.trim(), v.prateleira.trim()].filter(Boolean).length;
}
