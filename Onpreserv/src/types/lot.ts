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
// Ciclo de preservação
// -----------------------------------------------------------------------------
// Regra alinhada com a fiscalização:
//
//   1. Material novo tem até 7 DIAS a partir da chegada para a PRIMEIRA
//      preservação. Antes disso não há histórico, então a referência é a data
//      de cadastro do lote.
//
//   2. Registrada a primeira, ela passa a ser a referência: cada preservação
//      define o prazo da seguinte.
//
//   3. A frequência recorrente é de 21 DIAS por padrão — três semanas. Os
//      painéis retirados de campo (PN-32, PN-34, PN-36) e os lotes com
//      frequência configurada na ficha seguem em 30 dias.
//
//   4. O ciclo conta a partir da SEMANA da preservação, não do dia. Preservou
//      em qualquer dia da semana de 14/09? A próxima é a semana de 28/09 —
//      três semanas, contando a da própria preservação. A data exibida é a
//      segunda-feira dessa semana, e preservar em qualquer dia dela cumpre o
//      ciclo. Ver `semanaDeCobranca`.
//
// Os quatro status continuam os mesmos — `preserved`, `upcoming`, `overdue` e
// `none`. O que mudou foi apenas como são calculados.
//
// Vale só para lotes. O cronograma tem regra própria, por data prevista, e não
// é afetado por nada aqui.
// =============================================================================

const MS_POR_DIA = 86_400_000;

/** Prazo para a primeira preservação, contado da chegada do material. */
export const PRAZO_PRIMEIRA_PRESERVACAO_DIAS = 7;

/**
 * Data em que a regra da primeira preservação passou a valer.
 *
 * Ela só se aplica ao material que chega A PARTIR daqui. Um lote cadastrado
 * meses atrás e nunca preservado não pode aparecer como "vencido há 200 dias"
 * de um dia para o outro — a cobrança não existia quando ele entrou, e o
 * quadro amanheceria vermelho sem que nada tivesse acontecido no campo.
 *
 * Para os lotes anteriores, mudou apenas a frequência recorrente.
 * Enquanto não tiverem a primeira preservação, seguem em "sem preservação",
 * como antes.
 */
export const REGRA_PRIMEIRA_PRESERVACAO_DESDE = "2026-09-02";

/**
 * Frequência recorrente padrão, em dias corridos.
 *
 * Vinte e um dias são exatamente três semanas. Como a cobrança é por semana e
 * não por dia, um múltiplo de sete mantém o vencimento sempre no mesmo dia da
 * semana da preservação anterior, e a data prevista cai limpa na segunda-feira
 * da terceira semana seguinte — sem os deslocamentos que um ciclo de 15 dias
 * produzia a cada rodada.
 */
export const FREQUENCIA_PADRAO_DIAS = 21;

/**
 * Frequência dos painéis retirados de campo (PN-32, PN-34, PN-36).
 *
 * Não acompanhou a mudança para 21 dias: esses painéis já vinham em 30 e a
 * fiscalização os mantém assim.
 */
export const FREQUENCIA_LONGA_DIAS = 30;

/** Teto da antecedência do aviso de vencimento. */
export const CICLO_AVISO_MAXIMO_DIAS = 5;

/**
 * Interpreta "YYYY-MM-DD" no fuso local.
 *
 * `new Date("2026-08-24")` seria lido como meia-noite UTC — que no horário de
 * Brasília é 21h do dia 23. Uma preservação feita na segunda cairia no domingo
 * anterior e o prazo inteiro sairia errado.
 */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Zera a hora, para comparar dias e não instantes. */
const soData = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Sábado ou domingo. */
export function isWeekend(d: Date): boolean {
  const dia = d.getDay();
  return dia === 0 || dia === 6;
}

/** Rola a data para o próximo dia útil, se cair no fim de semana. */
export function nextBusinessDay(d: Date): Date {
  const r = soData(d);
  while (isWeekend(r)) r.setDate(r.getDate() + 1);
  return r;
}

/** Soma dias de calendário. */
export function addCalendarDays(d: Date, dias: number): Date {
  const r = soData(d);
  r.setDate(r.getDate() + dias);
  return r;
}

/** Diferença em dias de calendário, ignorando a hora. */
export function calendarDaysBetween(inicio: Date, fim: Date): number {
  return Math.round((soData(fim).getTime() - soData(inicio).getTime()) / MS_POR_DIA);
}

/**
 * Antecedência do aviso, proporcional ao ciclo.
 *
 * Cinco dias fixos avisariam cedo demais num prazo de 7 dias — o lote nasceria
 * quase em alerta. Um terço do ciclo, limitado a cinco dias, dá 3 para o prazo
 * inicial e 5 tanto para o ciclo de 21 quanto para o de 30.
 */
export function avisoDoCiclo(dias: number): number {
  return Math.min(CICLO_AVISO_MAXIMO_DIAS, Math.ceil(dias / 3));
}

/** Registro de preservação mais recente do lote, ou null. */
function ultimaPreservacaoRegistro(lot: Lot): Preservation | null {
  let maior: Preservation | null = null;
  for (const p of lot.preservations) {
    if (!p.date) continue;
    if (!maior || parseLocalDate(p.date) > parseLocalDate(maior.date)) maior = p;
  }
  return maior;
}

/** Data da preservação mais recente do lote, ou null. */
function ultimaPreservacao(lot: Lot): Date | null {
  let maior: Date | null = null;
  for (const p of lot.preservations) {
    if (!p.date) continue;
    const d = parseLocalDate(p.date);
    if (!maior || d > maior) maior = d;
  }
  return maior;
}

// -----------------------------------------------------------------------------
// Frequência do lote
// -----------------------------------------------------------------------------

export interface CicloPreservacao {
  /** Dias corridos entre preservações. */
  dias: number;
  label: string;
}

/**
 * Lotes de ciclo longo identificados por nome/código.
 *
 * Rede de segurança para lotes cadastrados antes do campo `frequenciaDias`
 * existir. A migration preenche o campo; a partir daí esta lista deixa de ser
 * consultada. `\b` nas pontas evita que "PN-345" case com "PN-34".
 */
const PADROES_CICLO_LONGO: RegExp[] = [
  /\bpn[-\s_]?32\b/,
  /\bpn[-\s_]?34\b/,
  /\bpn[-\s_]?36\b/,
];

function chaveDoLote(lot: Lot): string {
  return `${lot.name} ${lot.code} ${lot.identificadorInterno}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Dias entre preservações deste lote. */
export function getLotFrequencyDays(lot: Lot): number {
  const configurado = lot.frequenciaDias;
  if (typeof configurado === "number" && configurado > 0) return configurado;

  // `null` explícito é escolha de administrador: vale o padrão, sem consultar
  // a lista legada. Só `undefined` (lote nunca configurado) cai no fallback.
  if (configurado === null) return FREQUENCIA_PADRAO_DIAS;

  const chave = chaveDoLote(lot);
  return PADROES_CICLO_LONGO.some((re) => re.test(chave))
    ? FREQUENCIA_LONGA_DIAS
    : FREQUENCIA_PADRAO_DIAS;
}

export function getLotCycle(lot: Lot): CicloPreservacao {
  const dias = getLotFrequencyDays(lot);
  return { dias, label: dias === 1 ? "Diário" : `${dias} dias` };
}

/** Opções oferecidas no formulário do lote. */
export const FREQUENCIA_OPCOES: { valor: number | null; label: string }[] = [
  { valor: null, label: `${FREQUENCIA_PADRAO_DIAS} dias (padrão)` },
  { valor: 7, label: "7 dias" },
  { valor: 15, label: "15 dias" },
  { valor: 30, label: "30 dias" },
  { valor: 60, label: "60 dias" },
  { valor: 90, label: "90 dias" },
];

// -----------------------------------------------------------------------------
// Prazo e status
// -----------------------------------------------------------------------------

/** Referência a partir da qual o próximo prazo é contado. */
export interface ReferenciaCiclo {
  data: Date;
  /** Verdadeiro quando ainda não há preservação e a referência é a chegada. */
  primeira: boolean;
  /** Dias de prazo a partir da referência. */
  prazoDias: number;
}

export function getLotCycleReference(lot: Lot): ReferenciaCiclo | null {
  // Lote inativo não tem ciclo: não vence, não é cobrado e não entra em
  // nenhuma conta. Sem esta saída, um lote desativado seguia acumulando
  // atraso por uma preservação que ninguém vai fazer.
  //
  // Como todo o resto — vencimento, prazo, dias restantes, status — parte
  // daqui, basta cortar neste ponto para que nada mais o considere.
  if (lot.status !== "ativo") return null;

  const ultima = ultimaPreservacao(lot);
  if (ultima) {
    return { data: ultima, primeira: false, prazoDias: getLotFrequencyDays(lot) };
  }

  // Nunca preservado: a chegada do material é a referência, com o prazo curto
  // da primeira preservação — mas só para o material que chegou depois de a
  // regra passar a valer.
  if (!lot.createdAt) return null;
  const chegada = lot.createdAt.slice(0, 10);
  if (chegada < REGRA_PRIMEIRA_PRESERVACAO_DESDE) return null;

  return {
    data: parseLocalDate(lot.createdAt),
    primeira: true,
    prazoDias: PRAZO_PRIMEIRA_PRESERVACAO_DIAS,
  };
}

/**
 * Próxima data prevista a partir de uma preservação.
 *
 * -----------------------------------------------------------------------------
 * A previsão é uma SEMANA, e a segunda-feira é o nome dela.
 * -----------------------------------------------------------------------------
 *
 * A frequência é respeitada como sempre — 15 ou 30 dias corridos a partir do
 * registro. O que muda é o passo seguinte: em vez de exibir a data teórica, o
 * sistema identifica a semana em que ela cai e usa a segunda-feira dessa semana
 * como referência.
 *
 *   última preservação: segunda 14/09
 *   o ciclo de 21 dias vai de 14/09 a domingo 04/10 — o ÚLTIMO dia dele
 *   semana desse último dia: segunda 28/09 a domingo 04/10
 *   próxima preservação: 28/09
 *
 * Preservar em qualquer dia de 07/09 a 13/09 cumpre o ciclo. Assim a
 * preservação deixa de ser cobrada por um dia exato e passa a ser cobrada por
 * uma janela semanal, o que agrupa todos os lotes por semana.
 *
 * A segunda-feira é sempre dia útil, então o desvio de fim de semana que a
 * regra anterior aplicava deixou de ter efeito aqui.
 */
export function proximaDataPrevista(dataIso: string, frequenciaDias: number): string {
  return toIso(semanaDeCobranca(parseLocalDate(dataIso), frequenciaDias));
}

/**
 * Semana em que a próxima preservação é cobrada.
 *
 * -----------------------------------------------------------------------------
 * O ciclo conta a partir da SEMANA da preservação, nunca do dia dela.
 * -----------------------------------------------------------------------------
 *
 * Preservar na segunda ou na sexta da mesma semana dá o mesmo resultado: as
 * duas pertencem à mesma semana, e é a semana que manda. Sem ancorar, o dia
 * escolhido dentro da semana deslocava a cobrança, e dois lotes preservados na
 * mesma passagem da equipe podiam vencer em semanas diferentes.
 *
 * Com 21 dias — três semanas — o ciclo iniciado em qualquer dia da semana de
 * 14/09 vai de 14/09 a domingo 04/10 e encerra na semana que abre em 28/09:
 *
 *   semana 1: 14/09 a 20/09   ← a preservação aconteceu em algum dia daqui
 *   semana 2: 21/09 a 27/09
 *   semana 3: 28/09 a 04/10   ← a cobrança é aqui
 *
 * O `- 1` existe porque o primeiro dia da semana da preservação já conta como
 * dia 1 do ciclo. Sem ele o resultado seria 05/10, o primeiro dia DEPOIS do
 * intervalo, e a cobrança cairia numa quarta semana que o ciclo nem alcança.
 */
function semanaDeCobranca(referencia: Date, dias: number): Date {
  const inicio = startOfWeek(referencia);
  return startOfWeek(addCalendarDays(inicio, Math.max(0, dias - 1)));
}

/**
 * Data em que a próxima preservação vence.
 *
 * Quando existe preservação registrada, vale a data AGENDADA nela — não o
 * recálculo a partir da frequência atual.
 *
 * A distinção importa na transição de regra: um lote preservado em 24/08 tinha
 * 31/08 agendado pela regra semanal. Recalcular daria 08/09, jogando para
 * frente um compromisso que já estava firmado. O que estava agendado vale; a
 * frequência nova rege dali em diante, quando aquela preservação for feita.
 *
 * A exceção é o ciclo longo (os PN, de 30 dias). Ver `agendadaEhConfiavel`.
 */
export function getLotDueDate(lot: Lot, hoje: Date = new Date()): Date | null {
  const ref = getLotCycleReference(lot);
  if (!ref) return null;

  // A primeira preservação conta da CHEGADA do material: ali não existe semana
  // de preservação para ancorar, e ancorar na semana da chegada encurtaria o
  // prazo de quem recebe numa sexta para dois dias.
  const pelaFrequencia = ref.primeira
    ? startOfWeek(addCalendarDays(ref.data, Math.max(0, ref.prazoDias - 1)))
    : semanaDeCobranca(ref.data, ref.prazoDias);
  if (ref.primeira) return pelaFrequencia;

  const agendada = ultimaPreservacaoRegistro(lot)?.nextDate;
  if (!agendada || !agendadaEhConfiavel(ref, agendada)) return pelaFrequencia;

  // A agendada também vale pela semana dela: um registro antigo pode trazer
  // qualquer dia, e a referência exibida é sempre a segunda.
  const dataAgendada = startOfWeek(parseLocalDate(agendada));
  return endOfWeek(dataAgendada) >= soData(hoje) ? dataAgendada : pelaFrequencia;
}

/**
 * A data agendada no registro merece confiança?
 *
 * Só quando ela é compatível com o ciclo do lote. A regra antiga agendava
 * sempre a segunda-feira seguinte, o que para um lote de 15 dias é uma
 * antecipação plausível — e foi um compromisso de fato assumido em campo.
 *
 * Para o ciclo de 30 dias não é: um PN preservado em 03/08 ficou com 31/08
 * gravado, quatro semanas antes do que a frequência dele manda. Nenhuma agenda
 * da regra semanal representa um ciclo de 30 dias, então para esses lotes o
 * campo é resíduo, e o vencimento sai sempre do cálculo: 03/08 + 30 = 02/09.
 */
function agendadaEhConfiavel(ref: ReferenciaCiclo, _agendada: string): boolean {
  return ref.prazoDias < FREQUENCIA_LONGA_DIAS;
}

/** A mesma data, em ISO, para exibição e comparação. */
export function getLotNextDueDate(lot: Lot, hoje: Date = new Date()): string | null {
  const d = getLotDueDate(lot, hoje);
  return d ? toIso(d) : null;
}

/** Segunda-feira da semana que contém a data. Domingo fecha a semana anterior. */
export function startOfWeek(date: Date): Date {
  const d = soData(date);
  const dia = d.getDay(); // 0=dom, 1=seg ... 6=sáb
  d.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1));
  return d;
}

/** Domingo que fecha a semana da data. */
export function endOfWeek(date: Date): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  return d;
}

/**
 * Prazo real de cobrança: o fim da SEMANA do vencimento.
 *
 * -----------------------------------------------------------------------------
 * A data prevista aponta o dia; a semana é o que define se foi cumprido.
 * -----------------------------------------------------------------------------
 *
 * Preservar é trabalho de campo, e prender a cobrança ao dia exato transforma
 * qualquer remanejamento de equipe em atraso. Se o vencimento cai numa
 * terça-feira, a preservação feita na quinta da mesma semana cumpriu o ciclo. Só
 * quando a semana fecha sem registro é que o lote passa a vencido.
 */
export function getLotDeadline(lot: Lot, hoje: Date = new Date()): Date | null {
  const venc = getLotDueDate(lot, hoje);
  return venc ? endOfWeek(venc) : null;
}

/**
 * Dias restantes até o fim da semana do vencimento.
 * Negativo quando a semana já fechou sem preservação.
 */
export function getDaysLeftInCycle(lot: Lot, hoje: Date = new Date()): number | null {
  const prazo = getLotDeadline(lot, hoje);
  return prazo ? calendarDaysBetween(hoje, prazo) : null;
}

/**
 * Status do lote.
 *
 *   overdue   — passou do vencimento
 *   upcoming  — dentro da antecedência do aviso
 *   none      — nunca preservado e ainda dentro do prazo inicial
 *   preserved — preservado e dentro do prazo
 *
 * `none` continua significando "sem preservação registrada", mas agora escala
 * para `upcoming` e `overdue` conforme o prazo de 7 dias se aproxima e vence —
 * antes um lote recém-chegado ficava indefinidamente em `none`, sem cobrança.
 */
export function getLotPreservationStatus(lot: Lot, hoje: Date = new Date()): LotStatus {
  const ref = getLotCycleReference(lot);
  if (!ref) return "none";

  const venc = getLotDueDate(lot, hoje);
  const prazo = getLotDeadline(lot, hoje);
  if (!venc || !prazo) return "none";

  const dia = soData(hoje);

  // A semana do vencimento fechou sem preservação.
  if (dia > prazo) return "overdue";

  // Estamos DENTRO da semana do vencimento: é para fazer agora, e ainda há
  // tempo até domingo.
  if (dia >= startOfWeek(venc)) return "upcoming";

  // Ainda antes da semana do vencimento. Avisa quando ela está próxima.
  const diasAteASemana = calendarDaysBetween(dia, startOfWeek(venc));
  if (diasAteASemana <= avisoDoCiclo(ref.prazoDias)) return "upcoming";

  return ref.primeira ? "none" : "preserved";
}

/** Cumpriu o ciclo e está dentro do prazo. */
export function isLotPreserved(lot: Lot, hoje: Date = new Date()): boolean {
  return getLotPreservationStatus(lot, hoje) === "preserved";
}

/** Vencimento próximo — exige programação. */
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

/**
 * Soma dias a uma data ISO e devolve a segunda-feira da semana resultante.
 *
 * Atalho para `proximaDataPrevista`, mantido pelos diálogos de preservação.
 * Cuidado ao ler o nome: o retorno NÃO é `dateStr + days`, e sim a segunda da
 * semana em que essa soma cai — que é a referência que o sistema registra.
 */
export function addDays(dateStr: string, days = FREQUENCIA_PADRAO_DIAS): string {
  return proximaDataPrevista(dateStr, days);
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

