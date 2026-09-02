import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTasks } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { Task, isTaskOverdue, getTaskAssignees, formatPrazo } from "@/types/task";
import { computeBoardStats, groupTasksByBoard, rankActiveBoards, computeBoardsKpis, sortByPriorityThenPrazo } from "@/lib/stats";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { ListChecks, ArrowRight, AlertTriangle, CheckCircle2, Clock, PlayCircle, LayoutGrid, Calendar, ChevronDown } from "lucide-react";

function MiniStat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${tone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold leading-none">{value}</p>
      </div>
    </div>
  );
}

export function TasksDashboardSection() {
  const { tasks, boards } = useTasks();
  const { user, isAdmin } = useAuth();

  // Não-admins veem apenas tarefas onde estão atribuídos
  const visible = useMemo(() => {
    if (isAdmin) return tasks;
    if (!user) return [];
    return tasks.filter((t) => getTaskAssignees(t).includes(user.id));
  }, [tasks, isAdmin, user]);

  const stats = useMemo(() => {
    const total = visible.length;
    const aFazer = visible.filter((t) => t.status === "a_fazer").length;
    const andamento = visible.filter((t) => t.status === "em_andamento" || t.status === "em_revisao").length;
    const concluidas = visible.filter((t) => t.status === "concluido").length;
    const vencidas = visible.filter(isTaskOverdue).length;
    const taxa = total > 0 ? Math.round((concluidas / total) * 100) : 0;
    return { total, aFazer, andamento, concluidas, vencidas, taxa };
  }, [visible]);

  const minhasTarefas = useMemo(() => {
    if (!user) return [];
    return visible
      .filter((t) => getTaskAssignees(t).includes(user.id) && t.status !== "concluido")
      .sort((a, b) => {
        const ao = isTaskOverdue(a) ? 0 : 1;
        const bo = isTaskOverdue(b) ? 0 : 1;
        if (ao !== bo) return ao - bo;
        return (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999");
      })
      .slice(0, 5);
  }, [visible, user]);

  const proximas = useMemo(() => {
    return visible
      .filter((t) => t.status !== "concluido" && t.prazo)
      .sort((a, b) => (a.prazo ?? "").localeCompare(b.prazo ?? ""))
      .slice(0, 5);
  }, [visible]);

  const quadrosAtivos = useMemo(
    () => rankActiveBoards(boards, visible, 6),
    [visible, boards],
  );

  const quadrosKpis = useMemo(
    () => computeBoardsKpis(boards, visible),
    [boards, visible],
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">Tarefas</h2>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/tarefas">
            Ver todas <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <MiniStat icon={ListChecks} label="Total" value={stats.total} tone="text-primary bg-primary/10" />
            <MiniStat icon={Clock} label="A fazer" value={stats.aFazer} tone="text-info bg-info/10" />
            <MiniStat icon={PlayCircle} label="Em andamento" value={stats.andamento} tone="text-warning bg-warning/10" />
            <MiniStat icon={CheckCircle2} label="Concluídas" value={stats.concluidas} tone="text-success bg-success/10" />
            <MiniStat icon={AlertTriangle} label="Vencidas" value={stats.vencidas} tone="text-destructive bg-destructive/10" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Taxa de conclusão</span>
              <span className="font-semibold">{stats.taxa}%</span>
            </div>
            <Progress value={stats.taxa} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Minhas tarefas pendentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {minhasTarefas.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma tarefa atribuída</p>
            )}
            {minhasTarefas.map((t) => (
              <TaskRow key={t.id} t={t} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Próximos prazos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {proximas.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Sem tarefas com prazo</p>
            )}
            {proximas.map((t) => (
              <TaskRow key={t.id} t={t} />
            ))}
          </CardContent>
        </Card>
      </div>

      {boards.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Quadros ativos</CardTitle>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link to="/tarefas">
                  Abrir quadros <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MiniStat icon={LayoutGrid} label="Quadros" value={quadrosKpis.ativos} tone="text-primary bg-primary/10" />
              <MiniStat icon={ListChecks} label="Com atividade" value={quadrosKpis.comAtividade} tone="text-info bg-info/10" />
              <MiniStat icon={CheckCircle2} label="% Conclusão" value={quadrosKpis.taxa} tone="text-success bg-success/10" />
              <MiniStat icon={AlertTriangle} label="Vencidas" value={quadrosKpis.totalVencidas} tone="text-destructive bg-destructive/10" />
            </div>

            {quadrosAtivos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhum quadro com tarefas no momento
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {quadrosAtivos.map(({ board: b, tasks: ts, stats: s }) => (
                  <BoardDrilldownCard key={b.id} board={b} tasks={ts} stats={s} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function BoardDrilldownCard({
  board: b,
  tasks: ts,
  stats: s,
}: {
  board: { id: string; nome: string; cor: string };
  tasks: Task[];
  stats: { total: number; concluidas: number; taxa: number; vencidas: number; proximoPrazo: string | null };
}) {
  const [open, setOpen] = useState(false);

  const proximas = useMemo(
    () =>
      ts
        .filter((t) => t.status !== "concluido" && t.prazo && !isTaskOverdue(t))
        .sort(sortByPriorityThenPrazo),
    [ts],
  );
  const vencidas = useMemo(
    () => ts.filter((t) => isTaskOverdue(t)).sort(sortByPriorityThenPrazo),
    [ts],
  );

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border bg-card hover:border-primary/60 transition-colors overflow-hidden"
    >
      <div className="h-1 w-full" style={{ backgroundColor: b.cor }} />
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm truncate">{b.nome}</p>
          <span className="text-[11px] text-muted-foreground shrink-0">{s.total} tarefa(s)</span>
        </div>
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-muted-foreground">Conclusão</span>
            <span className="font-semibold">
              {s.concluidas}/{s.total} ({s.taxa}%)
            </span>
          </div>
          <Progress value={s.taxa} className="h-1.5" />
        </div>
        <div className="flex items-center justify-between text-[11px] pt-1">
          <span className="flex items-center gap-1 text-muted-foreground">
            {s.proximoPrazo ? (
              <>
                <Calendar className="h-3 w-3" />
                Próx.: {formatPrazo(s.proximoPrazo, "dd/MM")}
              </>
            ) : (
              "Sem prazos"
            )}
          </span>
          {s.vencidas > 0 && (
            <span className="flex items-center gap-1 text-destructive font-medium">
              <AlertTriangle className="h-3 w-3" /> {s.vencidas} vencida(s)
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
            <Link to={`/tarefas/quadro/${b.id}`}>
              Abrir <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
          <CollapsibleTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
              {open ? "Ocultar" : "Detalhes"}
              <ChevronDown
                className={`h-3 w-3 ml-1 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="space-y-3 pt-2 border-t mt-2">
          <DrilldownList
            title="Próximas"
            tone="text-muted-foreground"
            empty="Nenhuma tarefa próxima"
            tasks={proximas}
          />
          <DrilldownList
            title="Vencidas"
            tone="text-destructive"
            empty="Nenhuma tarefa vencida"
            tasks={vencidas}
            danger
          />
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/** Limite padrão de itens visíveis no drill-down antes de "Ver mais". */
export const DRILLDOWN_DEFAULT_LIMIT = 5;

function DrilldownList({
  title,
  tone,
  empty,
  tasks,
  danger,
  limit = DRILLDOWN_DEFAULT_LIMIT,
}: {
  title: string;
  tone: string;
  empty: string;
  tasks: Task[];
  danger?: boolean;
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const total = tasks.length;
  const visible = expanded ? tasks : tasks.slice(0, limit);
  const hasMore = total > limit;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className={`text-[11px] uppercase tracking-wider font-semibold ${tone}`}>
          {title}
          {total > 0 && <span className="ml-1 text-muted-foreground">({total})</span>}
        </p>
      </div>
      {total === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">{empty}</p>
      ) : (
        <>
          <ul className="space-y-1">
            {visible.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 text-xs rounded-md border px-2 py-1.5 bg-background"
              >
                <span className="truncate font-medium">{t.titulo}</span>
                {t.prazo && (
                  <span
                    className={`text-[11px] whitespace-nowrap ${danger ? "text-destructive font-medium" : "text-muted-foreground"}`}
                  >
                    {formatPrazo(t.prazo, "dd/MM")}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1.5 text-[11px] font-medium text-primary hover:underline"
            >
              {expanded ? "Ver menos" : `Ver mais (${total - limit})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function TaskRow({ t }: { t: Task }) {
  const overdue = isTaskOverdue(t);
  const href = t.board_id ? `/tarefas?board=${t.board_id}` : "/tarefas";
  return (
    <Link
      to={href}
      className="flex items-center justify-between gap-2 text-sm rounded-md border p-2 hover:bg-accent/50 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{t.titulo}</p>
        <div className="flex items-center gap-2 mt-1">
          <TaskStatusBadge status={t.status} />
          <PriorityBadge priority={t.prioridade} />
        </div>
      </div>
      {t.prazo && (
        <span className={`text-xs whitespace-nowrap ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
          {formatPrazo(t.prazo, "dd/MM")}
        </span>
      )}
    </Link>
  );
}
