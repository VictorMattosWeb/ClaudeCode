import type { AppModule, AppRole } from "@/context/AuthContext";

export type AppAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "import"
  | "export"
  | "approve"
  | "request_delete";

export const ALL_ACTIONS: AppAction[] = [
  "view",
  "create",
  "edit",
  "delete",
  "import",
  "export",
  "approve",
  "request_delete",
];

export const ACTION_LABELS: Record<AppAction, string> = {
  view: "Visualizar",
  create: "Criar",
  edit: "Editar",
  delete: "Excluir",
  import: "Importar",
  export: "Exportar",
  approve: "Aprovar",
  request_delete: "Solicitar exclusão",
};

export const MODULE_LABELS: Record<AppModule, string> = {
  dashboard: "Dashboard",
  lotes: "Lotes",
  preservacoes: "Preservações",
  atividades: "Atividades",
  cronograma: "Cronograma",
  tarefas: "Tarefas",
  solicitacoes: "Solicitações",
};

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  user: "Usuário padrão",
  viewer: "Visualizador",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: "Acesso total ao sistema. Gerencia usuários, permissões e dados.",
  user: "Acesso operacional. Pode criar e editar registros conforme as permissões definidas.",
  viewer: "Acesso somente leitura. Apenas consulta os dados.",
};

export const ROLE_COLORS: Record<AppRole, { ring: string; bg: string; text: string }> = {
  admin: { ring: "ring-primary/30", bg: "bg-primary/10", text: "text-primary" },
  user: { ring: "ring-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  viewer: { ring: "ring-muted-foreground/30", bg: "bg-muted", text: "text-muted-foreground" },
};

export const ALL_ROLES: AppRole[] = ["admin", "user", "viewer"];

export type RolePermissionMap = Record<AppRole, Record<AppModule, Record<AppAction, boolean>>>;

export function emptyRolePermissionMap(): RolePermissionMap {
  const map = {} as RolePermissionMap;
  (["admin", "user", "viewer"] as AppRole[]).forEach((r) => {
    map[r] = {} as Record<AppModule, Record<AppAction, boolean>>;
  });
  return map;
}
