/** Matizes do design system usados em etiquetas e etapas (paleta padrão do Tailwind). */
export type Hue =
  | "stone"
  | "amber"
  | "orange"
  | "rose"
  | "red"
  | "yellow"
  | "emerald"
  | "blue"
  | "indigo"
  | "purple";

export type Priority = "alta" | "media" | "baixa";

export interface Tag {
  id: string;
  name: string;
  hue: Hue;
}

/** Uma coluna do Kanban = uma etapa do fluxo. */
export interface Column {
  id: string;
  name: string;
  hue: Hue;
  /** Atividades nesta etapa contam como concluídas nas estatísticas. */
  isDone: boolean;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  /** Código do documento de referência (ex.: PRC-ELE-0012 rev. B). */
  docCode: string;
  description: string;
  columnId: string;
  tagIds: string[];
  priority: Priority;
  assignee: string;
  /** Data limite no formato ISO yyyy-mm-dd, ou vazio. */
  dueDate: string;
  checklist: ChecklistItem[];
  comments: Comment[];
  createdAt: string;
  /** Última movimentação (criação, edição ou troca de etapa). Ausente em dados antigos/importados. */
  updatedAt?: string;
  /** Preenchido quando a atividade entra numa etapa de conclusão. */
  completedAt: string | null;
}

/** Um quadro por contexto de trabalho (obra, cliente, sistema...). */
export interface Board {
  id: string;
  name: string;
  description: string;
  columns: Column[];
  tags: Tag[];
  /** Ordem das atividades: a posição no array define a ordem dentro de cada coluna. */
  tasks: Task[];
  createdAt: string;
}

export interface AppState {
  boards: Board[];
  activeBoardId: string | null;
  /** Ajustes de dados de execução única já aplicados neste navegador. */
  migrations?: string[];
}
