import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Task, TaskBoard, TASK_STATUS_LABEL, TASK_STATUS_ORDER } from "@/types/task";
import { computeBoardStats } from "@/lib/stats";
import { AlertTriangle, Calendar, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  board: TaskBoard | null; // null = "Sem quadro"
  tasks: Task[];
  onClick?: () => void;
}

const STATUS_TONE: Record<string, string> = {
  a_fazer: "bg-muted text-muted-foreground border-border",
  em_andamento: "bg-info/10 text-info border-info/20",
  em_revisao: "bg-warning/10 text-warning border-warning/20",
  concluido: "bg-success/10 text-success border-success/20",
  bloqueado: "bg-destructive/10 text-destructive border-destructive/20",
};

const STATUS_DOT: Record<string, string> = {
  a_fazer: "bg-muted-foreground/50",
  em_andamento: "bg-info",
  em_revisao: "bg-warning",
  concluido: "bg-success",
  bloqueado: "bg-destructive",
};

export function BoardCard({ board, tasks, onClick }: Props) {
  const stats = computeBoardStats(tasks);
  const cor = board?.cor ?? "#94a3b8";
  const nome = board?.nome ?? "Sem quadro";
  const inicial = nome.trim().charAt(0).toUpperCase() || "?";

  return (
    <Card
      onClick={onClick}
      data-testid="board-card"
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-xl border-border/70",
        "transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
      )}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${cor}, ${cor}55)` }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-20"
        style={{ backgroundColor: cor }}
        aria-hidden
      />

      <CardContent className="relative p-5 space-y-4">
        <div className="flex items-start gap-3 pr-16">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center border text-sm font-bold"
            style={{ backgroundColor: `${cor}1f`, color: cor }}
            aria-hidden
          >
            {inicial}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold leading-tight">{nome}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                <ListChecks className="h-3 w-3" />
                {stats.total} {stats.total === 1 ? "tarefa" : "tarefas"}
              </span>
              {board?.equipe && (
                <span
                  className="border px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ borderColor: `${cor}66`, color: cor, backgroundColor: `${cor}12` }}
                  title="Equipe"
                >
                  {board.equipe}
                </span>
              )}
            </div>
            {board?.descricao && (
              <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{board.descricao}</p>
            )}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Conclusão
            </span>
            <span className="text-sm font-semibold tabular-nums">{stats.taxa}%</span>
          </div>
          <Progress value={stats.taxa} className="h-1.5" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {TASK_STATUS_ORDER.map((s) => (
            <span
              key={s}
              className={cn(
                "inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-medium",
                STATUS_TONE[s],
                stats.byStatus[s] === 0 && "opacity-60",
              )}
              title={TASK_STATUS_LABEL[s]}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[s])} aria-hidden />
              <span className="tabular-nums font-semibold">{stats.byStatus[s]}</span>
              <span className="hidden sm:inline">{TASK_STATUS_LABEL[s]}</span>
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {stats.proximoPrazo ? (
              <>
                <Calendar className="h-3.5 w-3.5" /> Próx. prazo:{" "}
                <span className="font-medium text-foreground">
                  {new Date(stats.proximoPrazo).toLocaleDateString("pt-BR")}
                </span>
              </>
            ) : (
              <>Sem prazos</>
            )}
          </span>
          {stats.vencidas > 0 && (
            <span className="flex items-center gap-1.5 border border-destructive/40 bg-destructive/10 px-1.5 py-0.5 font-medium text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" /> {stats.vencidas} vencida(s)
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
