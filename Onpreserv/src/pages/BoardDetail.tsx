import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, AlertTriangle, Calendar, History, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTasks } from "@/context/TaskContext";
import { supabase } from "@/services/adapters/supabase/client";
import { Task, TaskHistoryEntry, isTaskOverdue, formatPrazo } from "@/types/task";
import { computeBoardStats, sortByPriorityThenPrazo } from "@/lib/stats";
import { TaskHistoryView } from "@/components/tasks/TaskHistoryView";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { useAuth } from "@/context/AuthContext";

export default function BoardDetail() {
  const { boardId = "" } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { tasks, boards } = useTasks();
  const { isAdmin } = useAuth();

  const board = useMemo(() => boards.find((b) => b.id === boardId) ?? null, [boards, boardId]);
  const boardTasks = useMemo(
    () => tasks.filter((t) => t.board_id === boardId),
    [tasks, boardId],
  );
  const stats = useMemo(() => computeBoardStats(boardTasks), [boardTasks]);

  const proximas = useMemo(
    () =>
      boardTasks
        .filter((t) => t.status !== "concluido" && t.prazo && !isTaskOverdue(t))
        .sort(sortByPriorityThenPrazo),
    [boardTasks],
  );
  const vencidas = useMemo(
    () => boardTasks.filter((t) => isTaskOverdue(t)).sort(sortByPriorityThenPrazo),
    [boardTasks],
  );

  const [users, setUsers] = useState<{ id: string; nome: string }[]>([]);
  const [history, setHistory] = useState<TaskHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    document.title = board ? `${board.nome} | Quadro` : "Quadro";
  }, [board]);

  useEffect(() => {
    supabase
      .rpc("list_public_profiles")
      .then(({ data }) => {
        const list = ((data ?? []) as { id: string; nome: string; status: string }[]);
        setUsers(list.map((u) => ({ id: u.id, nome: u.nome })));
      });
  }, []);

  useEffect(() => {
    const ids = boardTasks.map((t) => t.id);
    if (ids.length === 0) {
      setHistory([]);
      return;
    }
    setLoadingHistory(true);
    supabase
      .from("task_history")
      .select("*")
      .in("task_id", ids)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setHistory((data ?? []) as TaskHistoryEntry[]);
        setLoadingHistory(false);
      });
  }, [boardTasks]);

  const usersMap = useMemo(() => new Map(users.map((u) => [u.id, u.nome])), [users]);
  const boardsMap = useMemo(() => new Map(boards.map((b) => [b.id, b.nome])), [boards]);

  if (!board) {
    return (
      <div className="p-6 space-y-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/tarefas")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <p className="text-muted-foreground">Quadro não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/tarefas")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Quadros
          </Button>
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: board.cor }} />
          <h1 className="text-xl font-bold">{board.nome}</h1>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to={`/tarefas?board=${board.id}`}>
            Ver tarefas <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>

      {board.descricao && <p className="text-sm text-muted-foreground">{board.descricao}</p>}

      <Card>
        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Total" value={stats.total} />
          <Stat label="Concluídas" value={stats.concluidas} />
          <Stat label="Vencidas" value={stats.vencidas} tone="text-destructive" />
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Conclusão</p>
            <p className="text-lg font-bold leading-none">{stats.taxa}%</p>
            <Progress value={stats.taxa} className="h-1.5 mt-2" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TaskList
          title="Próximas"
          icon={<Calendar className="h-4 w-4" />}
          empty="Nenhuma tarefa próxima"
          tasks={proximas}
        />
        <TaskList
          title="Vencidas"
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          empty="Nenhuma tarefa vencida"
          tasks={vencidas}
          danger
        />
      </div>

      {isAdmin && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" /> Histórico do quadro
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <p className="text-xs text-muted-foreground">Carregando…</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem registros para este quadro.</p>
            ) : (
              <TaskHistoryView entries={history} users={usersMap} boards={boardsMap} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold leading-none ${tone ?? ""}`}>{value}</p>
    </div>
  );
}

function TaskList({
  title,
  icon,
  empty,
  tasks,
  danger,
}: {
  title: string;
  icon: React.ReactNode;
  empty: string;
  tasks: Task[];
  danger?: boolean;
}) {
  const [limit, setLimit] = useState(5);
  const visible = tasks.slice(0, limit);
  const hasMore = tasks.length > limit;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {icon} {title}
          <span className="ml-auto text-xs text-muted-foreground font-normal">{tasks.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">{empty}</p>
        ) : (
          <>
            {visible.map((t) => (
              <Link
                key={t.id}
                to={`/tarefas?task=${t.id}`}
                className="flex items-center justify-between gap-2 text-sm rounded-md border p-2 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{t.titulo}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <TaskStatusBadge status={t.status} />
                    <PriorityBadge priority={t.prioridade} />
                  </div>
                </div>
                {t.prazo && (
                  <span
                    className={`text-xs whitespace-nowrap ${danger ? "text-destructive font-medium" : "text-muted-foreground"}`}
                  >
                    {formatPrazo(t.prazo, "dd/MM")}
                  </span>
                )}
              </Link>
            ))}
            {hasMore ? (
              <button
                type="button"
                onClick={() => setLimit((n) => n + 5)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Ver mais ({tasks.length - limit})
              </button>
            ) : (
              tasks.length > 5 && (
                <button
                  type="button"
                  onClick={() => setLimit(5)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Ver menos
                </button>
              )
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
