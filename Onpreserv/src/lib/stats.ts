import { Task, TaskStatus, TaskPriority, TaskBoard, TASK_STATUS_ORDER, isTaskOverdue } from "@/types/task";
import type { Lot } from "@/types/lot";
import { getLotPreservationStatus, isLotPreserved, isLotUpcoming } from "@/types/lot";

/** Peso de prioridade para ordenação (maior = mais urgente). */
export const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  critica: 4,
  alta: 3,
  media: 2,
  baixa: 1,
};

/**
 * Comparador: prioridade desc, depois prazo asc (sem prazo vai por último).
 */
export function sortByPriorityThenPrazo(a: Task, b: Task): number {
  const pa = PRIORITY_WEIGHT[a.prioridade] ?? 0;
  const pb = PRIORITY_WEIGHT[b.prioridade] ?? 0;
  if (pa !== pb) return pb - pa;
  const da = a.prazo ?? "9999-12-31";
  const db = b.prazo ?? "9999-12-31";
  return da.localeCompare(db);
}

export interface BoardStats {
  total: number;
  byStatus: Record<TaskStatus, number>;
  concluidas: number;
  vencidas: number;
  emAndamento: number;
  taxa: number; // % conclusão (0..100, inteiro)
  proximoPrazo: string | null;
}

export function computeBoardStats(tasks: Task[]): BoardStats {
  const byStatus = TASK_STATUS_ORDER.reduce(
    (acc, s) => ({ ...acc, [s]: 0 }),
    {} as Record<TaskStatus, number>,
  );
  let proximoPrazo: string | null = null;
  for (const t of tasks) {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    if (t.status !== "concluido" && t.prazo) {
      if (!proximoPrazo || t.prazo < proximoPrazo) proximoPrazo = t.prazo;
    }
  }
  const total = tasks.length;
  const concluidas = byStatus.concluido;
  const emAndamento = byStatus.em_andamento + byStatus.em_revisao;
  const vencidas = tasks.filter(isTaskOverdue).length;
  const taxa = total === 0 ? 0 : Math.round((concluidas / total) * 100);
  return { total, byStatus, concluidas, vencidas, emAndamento, taxa, proximoPrazo };
}

export function groupTasksByBoard(tasks: Task[]): Map<string | null, Task[]> {
  const map = new Map<string | null, Task[]>();
  for (const t of tasks) {
    const key = t.board_id ?? null;
    const arr = map.get(key) ?? [];
    arr.push(t);
    map.set(key, arr);
  }
  return map;
}

export interface ActiveBoardRow {
  board: TaskBoard;
  tasks: Task[];
  stats: BoardStats;
}

/**
 * Ordena os quadros ativos por urgência:
 * 1. mais vencidas primeiro
 * 2. depois maior número de tarefas pendentes (total - concluídas)
 * 3. depois nome (alfabético)
 * Apenas quadros não arquivados e que possuem ao menos 1 tarefa entram no resultado.
 */
export function rankActiveBoards(
  boards: TaskBoard[],
  tasks: Task[],
  limit?: number,
): ActiveBoardRow[] {
  const grouped = groupTasksByBoard(tasks);
  const rows: ActiveBoardRow[] = boards
    .filter((b) => !b.arquivado)
    .map((b) => {
      const ts = grouped.get(b.id) ?? [];
      return { board: b, tasks: ts, stats: computeBoardStats(ts) };
    })
    .filter((r) => r.stats.total > 0);

  rows.sort((a, b) => {
    if (b.stats.vencidas !== a.stats.vencidas) return b.stats.vencidas - a.stats.vencidas;
    const aPend = a.stats.total - a.stats.concluidas;
    const bPend = b.stats.total - b.stats.concluidas;
    if (bPend !== aPend) return bPend - aPend;
    return a.board.nome.localeCompare(b.board.nome);
  });

  return typeof limit === "number" ? rows.slice(0, limit) : rows;
}

export interface BoardsKpis {
  ativos: number;
  comAtividade: number;
  taxa: number; // % conclusão geral entre quadros ativos
  totalVencidas: number;
}

/** KPIs agregados dos quadros ativos (não arquivados). */
export function computeBoardsKpis(boards: TaskBoard[], tasks: Task[]): BoardsKpis {
  const ativos = boards.filter((b) => !b.arquivado);
  const grouped = groupTasksByBoard(tasks);
  let totalTarefas = 0;
  let totalConcluidas = 0;
  let totalVencidas = 0;
  let comAtividade = 0;
  for (const b of ativos) {
    const ts = grouped.get(b.id) ?? [];
    if (ts.length === 0) continue;
    comAtividade++;
    const s = computeBoardStats(ts);
    totalTarefas += s.total;
    totalConcluidas += s.concluidas;
    totalVencidas += s.vencidas;
  }
  const taxa = totalTarefas > 0 ? Math.round((totalConcluidas / totalTarefas) * 100) : 0;
  return { ativos: ativos.length, comAtividade, taxa, totalVencidas };
}

/** Lead time médio (em dias) entre created_at e concluido_em — só conta concluídas com data. */
export function averageLeadTimeDays(tasks: Task[]): number | null {
  const done = tasks.filter((t) => t.status === "concluido" && t.concluido_em);
  if (done.length === 0) return null;
  const total = done.reduce((sum, t) => {
    const a = new Date(t.created_at).getTime();
    const b = new Date(t.concluido_em as string).getTime();
    return sum + Math.max(0, (b - a) / 86400000);
  }, 0);
  return Math.round((total / done.length) * 10) / 10;
}

// =============================================================================
// Lotes (preservação)
// =============================================================================

export interface LotStats {
  total: number;
  preservados: number; // inclui upcoming
  upcoming: number;
  vencidos: number;
  semPreservacao: number;
  taxaPreservacao: number; // % preservados / total (0..100, inteiro)
}

/**
 * Contagem por ciclo semanal (ver `types/lot.ts`):
 *   preservados    — semana corrente já cumprida
 *   upcoming       — semana aberta, ainda sem registro
 *   vencidos       — ao menos uma semana fechou vazia
 * As três são mutuamente exclusivas.
 */
export function computeLotStats(lots: Lot[]): LotStats {
  let preservados = 0;
  let upcoming = 0;
  let vencidos = 0;
  let semPreservacao = 0;
  for (const lot of lots) {
    const status = getLotPreservationStatus(lot);
    if (status === "overdue") vencidos++;
    if (status === "none") semPreservacao++;
    if (isLotPreserved(lot)) preservados++;
    if (isLotUpcoming(lot)) upcoming++;
  }
  const total = lots.length;
  const taxaPreservacao = total === 0 ? 0 : Math.round((preservados / total) * 100);
  return { total, preservados, upcoming, vencidos, semPreservacao, taxaPreservacao };
}

// =============================================================================
// Cronograma — re-export (a fonte continua em types/cronograma.ts)
// =============================================================================
export { calcularStats as computeCronogramaStats } from "@/types/cronograma";
export type { CronogramaStats } from "@/types/cronograma";
