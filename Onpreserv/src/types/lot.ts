export interface Preservation {
  id: string;
  date: string;
  nextDate: string;
  observation: string;
  responsible: string;
}

export type LotTipo = "novo" | "retirado_campo";

export const LOT_TIPO_LABEL: Record<LotTipo, string> = {
  novo: "Novo",
  retirado_campo: "Retirado de Campo",
};

export const LOT_TIPO_PREFIX: Record<LotTipo, string> = {
  novo: "NOV",
  retirado_campo: "RTC",
};

export interface Lot {
  id: string;
  identificadorInterno: string;
  tipoLote: LotTipo;
  code: string;
  name: string;
  location: string;
  rua: string;
  prateleira: string;
  responsible: string;
  status: "ativo" | "inativo";
  observations: string;
  preservations: Preservation[];
  createdAt: string;
  /**
   * Ciclo de preservação em dias corridos.
   * `null`/ausente = ciclo semanal (padrão). Só administrador altera.
   */
  frequenciaDias?: number | null;
}

export type LotStatus = "preserved" | "upcoming" | "overdue" | "none";

// =============================================================================
// Status de preservação por SEMANA DE REFERÊNCIA (segunda a domingo)
// -----------------------------------------------------------------------------
// A regra não olha mais para um dia específico. O ciclo é a semana:
//
//   * Qualquer preservação registrada DENTRO da semana corrente cumpre a semana,
//     tenha sido feita na segunda ou no domingo.
//   * Enquanto a semana corrente não terminar, o lote não está atrasado — ainda
//     há tempo de executar.
//   * Uma semana que termina sem nenhum registro é que passa a contar como
//     vencida.
//   * A virada da segunda-feira abre um ciclo novo automaticamente.
//
// O histórico continua guardando e exibindo a data exata de cada preservação;
// o que mudou é apenas como o STATUS é derivado dela.
//
// Vale só para lotes. O cronograma tem regra própria, por data prevista, e não
// é afetado por nada aqui.
// =============================================================================

const MS_POR_DIA = 86_400_000;

/**
 * Interpreta "YYYY-MM-DD" no fuso local.
 *
 * `new Date("2026-08-24")` seria lido como meia-noite UTC — que no horário de
 * Brasília é 21h do dia 23. Uma preservação feita na segunda cairia no domingo
 * anterior e a semana inteira sairia errada.
 */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Segunda-feira da semana que contém a data. Domingo pertence à semana que termina nele. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dia = d.getDay(); // 0=dom, 1=seg ... 6=sáb
  const recuo = dia === 0 ? 6 : dia - 1;
  d.setDate(d.getDate() - recuo);
  return d;
}

/** Domingo que fecha a semana da data informada. */
export function endOfWeek(date: Date): Date {
  const ini = startOfWeek(date);
  ini.setDate(ini.getDate() + 6);
  return ini;
}

/** Semana de referência de hoje, em ISO. Útil para exibir o período do ciclo. */
export function currentWeekRange(hoje: Date = new Date()): { inicio: string; fim: string } {
  return { inicio: toIso(startOfWeek(hoje)), fim: toIso(endOfWeek(hoje)) };
}

/** Data da preservação mais recente do lote, ou null. */
function ultimaPreservacao(lot: Lot): Date | null {
  if (lot.preservations.length === 0) return null;
  // O array vem em ordem cronológica, mas não custa não depender disso: uma
  // edição de registro pode reordenar sem que a lista seja reordenada.
  let maior: Date | null = null;
  for (const p of lot.preservations) {
    if (!p.date) continue;
    const d = parseLocalDate(p.date);
    if (!maior || d > maior) maior = d;
  }
  return maior;
}

/**
 * Quantas semanas inteiras se passaram desde a semana da última preservação.
 *
 *   0 → a última preservação é desta semana (ciclo cumprido)
 *   1 → foi na semana passada; a semana atual ainda está aberta
 *  ≥2 → ao menos uma semana fechou sem registro
 */
export function weeksSinceLastPreservation(lot: Lot, hoje: Date = new Date()): number | null {
  const ultima = ultimaPreservacao(lot);
  if (!ultima) return null;
  const semanaUltima = startOfWeek(ultima);
  const semanaAtual = startOfWeek(hoje);
  return Math.round((semanaAtual.getTime() - semanaUltima.getTime()) / (7 * MS_POR_DIA));
}

// =============================================================================
// Ciclo de preservação por lote
// -----------------------------------------------------------------------------
// A semana é o ciclo padrão. Alguns lotes fogem à regra e são preservados a
// cada 30 DIAS CORRIDOS — hoje, os painéis PN-32, PN-34 e PN-36.
//
// A contagem é em dias de calendário, sábados e domingos incluídos. O único
// tratamento de fim de semana é no vencimento: se a data calculada cair num
// sábado ou domingo, ela rola para a segunda-feira seguinte, porque não há
// equipe em campo para executar.
//
// A identificação é por nome/código, o mesmo mecanismo que `isCableLot` já usa
// para decidir sobre a sílica gel. Não é o ideal: o correto seria uma coluna no
// banco descrevendo o ciclo de cada lote, e aí renomear um lote não mudaria a
// regra de preservação dele sem querer. Fica registrado como dívida.
// =============================================================================

export type CicloTipo = "semanal" | "dias_corridos";

export interface CicloPreservacao {
  tipo: CicloTipo;
  /** Quantidade de dias corridos do ciclo. Só para `dias_corridos`. */
  dias?: number;
  label: string;
}

export const CICLO_SEMANAL: CicloPreservacao = { tipo: "semanal", label: "Semanal" };

/** Ciclo de 30 dias corridos, com vencimento rolado para dia útil. */
export const CICLO_30_DIAS: CicloPreservacao = {
  tipo: "dias_corridos",
  dias: 30,
  label: "30 dias",
};

/**
 * Lotes com ciclo de 30 dias corridos.
 *
 * `\b` nas duas pontas evita que "PN-345" case com "PN-34". O separador é
 * opcional para tolerar "PN 34", "PN-34" e "PN34".
 */
const PADROES_CICLO_30_DIAS: RegExp[] = [
  /\bpn[-\s_]?32\b/,
  /\bpn[-\s_]?34\b/,
  /\bpn[-\s_]?36\b/,
];

/** Texto normalizado do lote, sem acentos, para casar os padrões. */
function chaveDoLote(lot: Lot): string {
  return `${lot.name} ${lot.code} ${lot.identificadorInterno}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Ciclo de preservação do lote.
 *
 * A fonte da verdade é o campo `frequenciaDias`, definido por administrador na
 * ficha do lote. A lista de identificadores acima ficou apenas como rede de
 * segurança para lotes cadastrados antes do campo existir e ainda não migrados
 * — a migration preenche o campo, e a partir daí ela deixa de ser consultada.
 */
export function getLotCycle(lot: Lot): CicloPreservacao {
  const dias = lot.frequenciaDias;
  if (typeof dias === "number" && dias > 0) {
    return {
      tipo: "dias_corridos",
      dias,
      label: dias === 1 ? "Diário" : `${dias} dias`,
    };
  }
  // `null` explícito significa "semanal, decidido por alguém" — não cai no
  // fallback. Só `undefined` (lote nunca configurado) consulta a lista antiga.
  if (dias === null) return CICLO_SEMANAL;

  const chave = chaveDoLote(lot);
  return PADROES_CICLO_30_DIAS.some((re) => re.test(chave)) ? CICLO_30_DIAS : CICLO_SEMANAL;
}

/** Opções oferecidas no formulário do lote. */
export const FREQUENCIA_OPCOES: { valor: number | null; label: string }[] = [
  { valor: null, label: "Semanal (padrão)" },
  { valor: 15, label: "15 dias" },
  { valor: 30, label: "30 dias" },
  { valor: 60, label: "60 dias" },
  { valor: 90, label: "90 dias" },
];

/** Sábado ou domingo. */
export function isWeekend(d: Date): boolean {
  const dia = d.getDay();
  return dia === 0 || dia === 6;
}

/**
 * Rola a data para o próximo dia útil, se cair no fim de semana.
 *
 * Sábado vira segunda (+2), domingo vira segunda (+1). Uma data já útil é
 * devolvida sem alteração.
 */
export function nextBusinessDay(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  while (isWeekend(r)) r.setDate(r.getDate() + 1);
  return r;
}

/** Soma dias de calendário. */
export function addCalendarDays(d: Date, dias: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + dias);
  return r;
}

/** Diferença em dias de calendário entre duas datas, ignorando a hora. */
export function calendarDaysBetween(inicio: Date, fim: Date): number {
  const a = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()).getTime();
  const b = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate()).getTime();
  return Math.round((b - a) / MS_POR_DIA);
}

/**
 * Vencimento do ciclo: última preservação + N dias corridos, rolado para o
 * próximo dia útil se cair no fim de semana.
 */
export function getNextCycleDueDate(lot: Lot): Date | null {
  const ciclo = getLotCycle(lot);
  if (ciclo.tipo !== "dias_corridos" || !ciclo.dias) return null;
  const ultima = ultimaPreservacao(lot);
  if (!ultima) return null;
  return nextBusinessDay(addCalendarDays(ultima, ciclo.dias));
}

/**
 * Dias corridos restantes até o vencimento do ciclo.
 * Negativo quando já passou. `null` para ciclo semanal ou lote sem registro.
 */
export function getDaysLeftInCycle(lot: Lot, hoje: Date = new Date()): number | null {
  const vencimento = getNextCycleDueDate(lot);
  if (!vencimento) return null;
  return calendarDaysBetween(hoje, vencimento);
}

/**
 * Antecedência, em dias, com que um ciclo longo passa a pedir ação.
 * Cinco dias dão tempo de programar a equipe sem alarme prematuro.
 */
export const CICLO_AVISO_DIAS = 5;

/**
 * Data prevista para a próxima preservação, conforme o ciclo do lote.
 *
 * Substitui a leitura de `preservation.nextDate` na interface. Aquele campo é
 * gravado no momento do registro e sempre apontou para a próxima segunda —
 * correto no ciclo semanal, errado nos lotes de 30 dias, que mostravam uma data
 * a semanas de distância da real.
 *
 * O valor gravado continua no histórico, como registro do que foi combinado na
 * época; o que a tela exibe agora é o vencimento calculado pela regra vigente.
 */
export function getLotNextDueDate(lot: Lot): string | null {
  const ciclo = getLotCycle(lot);

  if (ciclo.tipo === "dias_corridos") {
    const vencimento = getNextCycleDueDate(lot);
    return vencimento ? toIso(vencimento) : null;
  }

  const ultima = ultimaPreservacao(lot);
  if (!ultima) return null;

  // Semanal: o ciclo seguinte abre na segunda da semana posterior à da última
  // preservação — que já é dia útil, sem necessidade de rolagem.
  const proximaSegunda = startOfWeek(ultima);
  proximaSegunda.setDate(proximaSegunda.getDate() + 7);
  return toIso(proximaSegunda);
}

/**
 * Status do lote pela semana de referência.
 *
 *   none      — nunca teve preservação
 *   preserved — já foi preservado nesta semana
 *   upcoming  — a semana está aberta e ainda não houve registro
 *   overdue   — alguma semana fechou sem registro
 *
 * Uma preservação registrada com data futura conta como cumprida na semana
 * dela; se for de uma semana adiante, a semana atual segue aberta.
 */
export function getLotPreservationStatus(lot: Lot, hoje: Date = new Date()): LotStatus {
  if (lot.preservations.length === 0) return "none";

  const ciclo = getLotCycle(lot);

  // Ciclo longo (ex.: 30 dias corridos): o status vem do prazo até o vencimento.
  if (ciclo.tipo === "dias_corridos") {
    const restantes = getDaysLeftInCycle(lot, hoje);
    if (restantes === null) return "none";
    if (restantes < 0) return "overdue";
    if (restantes <= CICLO_AVISO_DIAS) return "upcoming";
    return "preserved";
  }

  // Ciclo semanal (padrão).
  const semanas = weeksSinceLastPreservation(lot, hoje);
  if (semanas === null) return "none";
  if (semanas <= 0) return "preserved";
  if (semanas === 1) return "upcoming";
  return "overdue";
}

/** Semanas fechadas sem registro. 0 quando o lote não está atrasado. */
export function getLotOverdueWeeks(lot: Lot, hoje: Date = new Date()): number {
  // Só faz sentido no ciclo semanal; num ciclo de 30 dias úteis o atraso é
  // medido em dias, não em semanas perdidas.
  if (getLotCycle(lot).tipo !== "semanal") return 0;
  const semanas = weeksSinceLastPreservation(lot, hoje);
  if (semanas === null || semanas < 2) return 0;
  return semanas - 1;
}

/**
 * Dias restantes até o fim da semana de referência, contando hoje.
 *
 * Segunda devolve 7, domingo devolve 1. Substitui a contagem antiga até uma
 * data-alvo fixa: o que importa agora é quanto tempo resta no ciclo.
 */
export function getDaysLeftInWeek(hoje: Date = new Date()): number {
  const fim = endOfWeek(hoje);
  const inicioDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((fim.getTime() - inicioDoDia.getTime()) / MS_POR_DIA) + 1;
}

/** Cumpriu o ciclo da semana corrente. */
export function isLotPreserved(lot: Lot, hoje: Date = new Date()): boolean {
  return getLotPreservationStatus(lot, hoje) === "preserved";
}

/** Semana aberta, ainda sem registro — há tempo, mas exige programação. */
export function isLotUpcoming(lot: Lot, hoje: Date = new Date()): boolean {
  return getLotPreservationStatus(lot, hoje) === "upcoming";
}

// ========== Validade da Sílica Gel ==========
// A sílica gel colocada no lote no 1º registro de preservação tem validade de 1 ano.
// Lotes de cabos não utilizam sílica gel, portanto o contador é desconsiderado para eles.
export const SILICA_VALIDITY_DAYS = 365;
// Limiar (em dias) para alerta de "próxima do vencimento".
export const SILICA_WARNING_DAYS = 30;

export type SilicaStatus = "ok" | "warning" | "expired" | "none";

// Identifica lotes de cabos pelo nome ou código (ex.: "CABO P9O97MR").
// A sílica gel não é aplicada a cabos, então esses lotes ficam fora do contador.
export function isCableLot(lot: Lot): boolean {
  const hay = `${lot.name} ${lot.code}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\bcabo(s)?\b/.test(hay);
}

// Data de validade da sílica = 1º registro de preservação + 1 ano.
export function getSilicaExpiryDate(lot: Lot): Date | null {
  if (isCableLot(lot) || lot.preservations.length === 0) return null;
  const first = lot.preservations[0]; // preservations já vêm ordenadas por data
  const expiry = parseLocalDate(first.date);
  expiry.setFullYear(expiry.getFullYear() + 1);
  return expiry;
}

// Dias restantes até o vencimento da sílica (negativo = vencida).
export function getSilicaDaysRemaining(lot: Lot): number | null {
  const expiry = getSilicaExpiryDate(lot);
  if (!expiry) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getSilicaStatus(lot: Lot): SilicaStatus {
  if (isCableLot(lot)) return "none";
  const d = getSilicaDaysRemaining(lot);
  if (d === null) return "none";
  if (d < 0) return "expired";
  if (d <= SILICA_WARNING_DAYS) return "warning";
  return "ok";
}

export function addDays(_dateStr: string, _days?: number): string {
  // Compatibilidade: agora retorna sempre a próxima segunda-feira após a data informada.
  return nextMonday(_dateStr);
}

export function addBusinessDays(dateStr: string, _days: number): string {
  // Compatibilidade: redirecionado para próxima segunda-feira.
  return nextMonday(dateStr);
}

export function nextMonday(dateStr: string): string {
  // Retorna a segunda-feira da SEMANA SEGUINTE à data informada.
  // Trata a data como local (evita shift de fuso ao parsear "YYYY-MM-DD").
  const datePart = dateStr.slice(0, 10);
  const [y, m, d] = datePart.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  const day = date.getDay(); // 0=dom, 1=seg ... 6=sáb
  const diff = day === 1 ? 7 : ((1 - day + 7) % 7) || 7;
  date.setDate(date.getDate() + diff);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

