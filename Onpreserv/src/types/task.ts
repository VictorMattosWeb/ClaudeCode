export type TaskStatus = "a_fazer" | "em_andamento" | "em_revisao" | "concluido" | "bloqueado";
export type TaskPriority = "baixa" | "media" | "alta" | "critica";
export type TaskModulo = "lote" | "cronograma" | "preservacao" | "atividade" | "solicitacao" | "geral";
export type TaskAprovacao = "pendente" | "aprovado" | "reprovado";

export const TASK_STATUS_ORDER: TaskStatus[] = ["a_fazer", "em_andamento", "em_revisao", "concluido", "bloqueado"];

export const TASK_APROVACAO_ORDER: TaskAprovacao[] = ["pendente", "aprovado", "reprovado"];

export const TASK_APROVACAO_LABEL: Record<TaskAprovacao, string> = {
  pendente: "Aguardando aprovação",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

export const TASK_APROVACAO_SHORT: Record<TaskAprovacao, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

export const TASK_APROVACAO_COLOR: Record<TaskAprovacao, string> = {
  pendente: "bg-muted text-muted-foreground border-border",
  aprovado: "bg-success/15 text-success border-success/30",
  reprovado: "bg-destructive/15 text-destructive border-destructive/30",
};


export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  em_revisao: "Em revisão",
  concluido: "Concluído",
  bloqueado: "Bloqueado",
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export const TASK_PRIORITY_COLOR: Record<TaskPriority, string> = {
  baixa: "bg-success/15 text-success border-success/30",
  media: "bg-info/15 text-info border-info/30",
  alta: "bg-warning/15 text-warning border-warning/30",
  critica: "bg-destructive/15 text-destructive border-destructive/30",
};

export const TASK_MODULO_LABEL: Record<TaskModulo, string> = {
  lote: "Lote",
  cronograma: "Cronograma",
  preservacao: "Preservação",
  atividade: "Atividade",
  solicitacao: "Solicitação",
  geral: "Geral",
};

/**
 * Rótulo tolerante a valores legados: tarefas antigas ainda podem apontar para
 * módulos desativados (ex.: "estoque"), e nesse caso a UI mostra "Outro" em vez
 * de renderizar `undefined`.
 */
export const taskModuloLabel = (modulo: TaskModulo | string | null | undefined): string =>
  TASK_MODULO_LABEL[modulo as TaskModulo] ?? "Outro";

export interface TaskLabel {
  id: string;
  nome: string;
  cor: string;
  descricao: string | null;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  mensagem: string;
  created_at: string;
}

export interface TaskHistoryEntry {
  id: string;
  task_id: string;
  user_id: string | null;
  acao: string;
  de: string | null;
  para: string | null;
  created_at: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  nome: string;
  path: string;
  mime: string | null;
  tamanho: number | null;
  criado_por: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  titulo: string;
  descricao: string | null;
  status: TaskStatus;
  prioridade: TaskPriority;
  responsavel_id: string | null;
  criado_por: string | null;
  modulo_relacionado: TaskModulo;
  item_relacionado_id: string | null;
  item_relacionado_descricao: string | null;
  prazo: string | null;
  concluido_em: string | null;
  posicao: number;
  observacoes: string | null;
  board_id: string | null;
  aprovacao?: TaskAprovacao;
  aprovado_por?: string | null;
  aprovado_em?: string | null;
  aprovacao_observacao?: string | null;
  created_at: string;
  updated_at: string;
  labels?: TaskLabel[];
  assignees?: string[];
}

export const BOARD_EQUIPES = [
  "Engenharia",
  "Comissionamento",
  "Operação",
  "Manutenção",
  "Qualidade",
  "Almoxarifado",
  "Planejamento",
  "Administrativo",
] as const;

export interface TaskBoard {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  equipe?: string;
  posicao: number;
  arquivado: boolean;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
}


export function getTaskAssignees(t: Task): string[] {
  const arr = t.assignees ?? [];
  if (arr.length > 0) return arr;
  return t.responsavel_id ? [t.responsavel_id] : [];
}

export interface TaskSubtask {
  id: string;
  task_id: string;
  titulo: string;
  concluido: boolean;
  posicao: number;
  criado_por: string | null;
  concluido_em: string | null;
  created_at: string;
  updated_at: string;
}

/** Interpreta uma string YYYY-MM-DD como data local (evita off-by-one por UTC). */
export function parseDateLocal(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return new Date(s);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function formatPrazo(s: string | null | undefined, pattern = "dd/MM/yyyy"): string {
  const d = parseDateLocal(s);
  if (!d) return "";
  // formatação manual simples para evitar dependência adicional aqui
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return pattern === "dd/MM" ? `${dd}/${mm}` : `${dd}/${mm}/${yyyy}`;
}

export function isTaskOverdue(t: Task): boolean {
  if (!t.prazo || t.status === "concluido") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseDateLocal(t.prazo);
  if (!due) return false;
  due.setHours(0, 0, 0, 0);
  return due < today;
}
