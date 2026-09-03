import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Activity,
  CalendarClock,
  Flag,
  LayoutGrid,
  MessageSquare,
  Plus,
  UserPlus,
  Users as UsersIcon,
} from "lucide-react";
import type { TaskHistoryEntry, TaskPriority, TaskStatus } from "@/types/task";
import {
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  formatPrazo,
} from "@/types/task";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserTag } from "@/components/UserTag";

export type HistoryCategory =
  | "status"
  | "prazo"
  | "quadro"
  | "prioridade"
  | "responsavel"
  | "comentario"
  | "criacao"
  | "outro";

export interface DescribedHistoryEntry {
  entry: TaskHistoryEntry;
  category: HistoryCategory;
  label: string;
  detail: string | null;
}

/** Mapeia uma ação bruta de `task_history.acao` para uma categoria visível ao usuário. */
export function categorizeAction(acao: string): HistoryCategory {
  switch (acao) {
    case "status":
      return "status";
    case "prazo":
      return "prazo";
    case "quadro":
      return "quadro";
    case "prioridade":
      return "prioridade";
    case "responsavel":
    case "responsavel_add":
      return "responsavel";
    case "comentario":
      return "comentario";
    case "criada":
      return "criacao";
    default:
      return "outro";
  }
}

function safeStatus(v: string | null): string {
  if (!v) return "—";
  return TASK_STATUS_LABEL[v as TaskStatus] ?? v;
}
function safePriority(v: string | null): string {
  if (!v) return "—";
  return TASK_PRIORITY_LABEL[v as TaskPriority] ?? v;
}
function safeName(v: string | null, users: Map<string, string>): string {
  if (!v) return "—";
  return users.get(v) ?? "—";
}

/**
 * Produz uma descrição amigável para uma entrada do histórico.
 * Função pura — facilmente testável.
 */
export function describeHistory(
  h: TaskHistoryEntry,
  users: Map<string, string>,
  boards: Map<string, string> = new Map(),
): DescribedHistoryEntry {
  const category = categorizeAction(h.acao);
  switch (category) {
    case "status":
      return {
        entry: h,
        category,
        label: "Status",
        detail: `${safeStatus(h.de)} → ${safeStatus(h.para)}`,
      };
    case "prazo":
      return {
        entry: h,
        category,
        label: "Prazo",
        detail: `${h.de ? formatPrazo(h.de) : "—"} → ${h.para ? formatPrazo(h.para) : "—"}`,
      };
    case "quadro":
      return {
        entry: h,
        category,
        label: "Quadro",
        detail: `${(h.de && boards.get(h.de)) || "—"} → ${(h.para && boards.get(h.para)) || "—"}`,
      };
    case "prioridade":
      return {
        entry: h,
        category,
        label: "Prioridade",
        detail: `${safePriority(h.de)} → ${safePriority(h.para)}`,
      };
    case "responsavel":
      return {
        entry: h,
        category,
        label: h.acao === "responsavel_add" ? "Responsável adicionado" : "Responsável",
        detail:
          h.acao === "responsavel_add"
            ? safeName(h.para, users)
            : `${safeName(h.de, users)} → ${safeName(h.para, users)}`,
      };
    case "comentario":
      return {
        entry: h,
        category,
        label: "Comentário",
        detail: h.para ? `"${h.para}"` : null,
      };
    case "criacao":
      return {
        entry: h,
        category,
        label: "Criada",
        detail: h.para ?? null,
      };
    default:
      return { entry: h, category, label: h.acao, detail: h.para ?? h.de ?? null };
  }
}

const CATEGORY_META: Record<HistoryCategory, { label: string; Icon: typeof Activity; color: string }> = {
  status: { label: "Status", Icon: Activity, color: "text-info border-info/40" },
  prazo: { label: "Prazo", Icon: CalendarClock, color: "text-warning border-warning/40" },
  quadro: { label: "Quadro", Icon: LayoutGrid, color: "text-primary border-primary/40" },
  prioridade: { label: "Prioridade", Icon: Flag, color: "text-destructive border-destructive/40" },
  responsavel: { label: "Responsável", Icon: UserPlus, color: "text-success border-success/40" },
  comentario: { label: "Comentário", Icon: MessageSquare, color: "text-muted-foreground border-border" },
  criacao: { label: "Criação", Icon: Plus, color: "text-success border-success/40" },
  outro: { label: "Outro", Icon: UsersIcon, color: "text-muted-foreground border-border" },
};

const FILTERS: { value: HistoryCategory | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "status", label: "Status" },
  { value: "prazo", label: "Prazo" },
  { value: "quadro", label: "Quadro" },
  { value: "prioridade", label: "Prioridade" },
  { value: "responsavel", label: "Responsável" },
  { value: "comentario", label: "Comentário" },
];

interface Props {
  entries: TaskHistoryEntry[];
  users: Map<string, string>;
  boards?: Map<string, string>;
}

export function TaskHistoryView({ entries, users, boards }: Props) {
  const [filter, setFilter] = useState<HistoryCategory | "todos">("todos");

  const described = useMemo(
    () => entries.map((e) => describeHistory(e, users, boards ?? new Map())),
    [entries, users, boards],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: described.length };
    for (const d of described) c[d.category] = (c[d.category] ?? 0) + 1;
    return c;
  }, [described]);

  const filtered = useMemo(
    () => (filter === "todos" ? described : described.filter((d) => d.category === filter)),
    [described, filter],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="Filtrar histórico">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          const count = counts[f.value] ?? 0;
          return (
            <Button
              key={f.value}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              className="h-7 px-2 text-xs"
              onClick={() => setFilter(f.value)}
              aria-pressed={active}
              data-testid={`history-filter-${f.value}`}
            >
              {f.label}
              <span className="ml-1.5 opacity-70">{count}</span>
            </Button>
          );
        })}
      </div>

      <ol
        className="space-y-2 max-h-72 overflow-y-auto pr-1"
        aria-label="Linha do tempo da tarefa"
        data-testid="history-timeline"
      >
        {filtered.map((d) => {
          const meta = CATEGORY_META[d.category];
          const { Icon } = meta;
          const when = (() => {
            try {
              return format(new Date(d.entry.created_at), "dd/MM HH:mm");
            } catch {
              return "";
            }
          })();
          const autorId = d.entry.user_id;
          return (
            <li
              key={d.entry.id}
              className={cn(
                "text-xs flex items-start gap-2 border-l-2 pl-2 py-1.5 rounded-r-sm bg-muted/20",
                meta.color,
              )}
              data-testid={`history-item-${d.category}`}
            >
              <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {autorId ? (
                    <UserTag
                      userId={autorId}
                      nome={users.get(autorId)}
                      vazio="Sistema"
                      size={18}
                      nomeClassName="font-medium text-foreground"
                    />
                  ) : (
                    <span className="font-medium text-foreground">Sistema</span>
                  )}
                  <span className="text-muted-foreground">{meta.label.toLowerCase()}</span>
                  <span className="text-muted-foreground/70 ml-auto">{when}</span>
                </div>
                {d.detail && (
                  <p className="text-muted-foreground break-words">{d.detail}</p>
                )}
              </div>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="text-xs text-muted-foreground text-center py-4 list-none">
            Sem registros para este filtro
          </li>
        )}
      </ol>
    </div>
  );
}
