import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTasks } from "@/context/TaskContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Tags, Upload, Pencil, Trash2 } from "lucide-react";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { BoardFormDialog } from "@/components/tasks/BoardFormDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { TaskFilters, TaskFilterState } from "@/components/tasks/TaskFilters";
import { TaskDashboardCards } from "@/components/tasks/TaskDashboardCards";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TaskStatsPanel } from "@/components/tasks/TaskStatsPanel";
import { LabelManagerDialog } from "@/components/tasks/LabelManagerDialog";
import { BoardGrid } from "@/components/tasks/BoardGrid";
import { TaskImportDialog } from "@/components/tasks/TaskImportDialog";
import { supabase } from "@/services/adapters/supabase/client";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Task, TaskStatus, isTaskOverdue, getTaskAssignees } from "@/types/task";
import { useAuth } from "@/context/AuthContext";
import { RowDeleteAction } from "@/components/RowDeleteAction";

export default function Tasks() {
  const { tasks, loading, boards, deleteBoard } = useTasks();
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<{ id: string; nome: string }[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus | undefined>();
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [labelMgrOpen, setLabelMgrOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [boardEditOpen, setBoardEditOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // ----- URL <-> estado (single source of truth = URL) -----
  // null/ausente em ?board= => visão de quadros; "all" / "none" / uuid => visões específicas
  const activeView = searchParams.get("board") ?? "boards";
  const activeTab = searchParams.get("tab") ?? "kanban";
  const filters: TaskFilterState = useMemo(
    () => ({
      search: searchParams.get("q") ?? "",
      status: (searchParams.get("status") as TaskFilterState["status"]) || "all",
      prioridade: (searchParams.get("prioridade") as TaskFilterState["prioridade"]) || "all",
      modulo: (searchParams.get("modulo") as TaskFilterState["modulo"]) || "all",
      responsavel: searchParams.get("responsavel") || "all",
      vencidas: searchParams.get("vencidas") === "1",
    }),
    [searchParams],
  );

  const updateParams = (patch: Record<string, string | null | undefined>) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v === null || v === undefined || v === "" || v === "all" || v === "0") next.delete(k);
          else next.set(k, v);
        }
        return next;
      },
      { replace: true },
    );
  };

  const setActiveView = (v: string) => {
    updateParams({ board: v === "boards" ? null : v });
  };
  const setActiveTab = (v: string) => {
    updateParams({ tab: v === "kanban" ? null : v });
  };
  const setFilters = (next: TaskFilterState) => {
    updateParams({
      q: next.search || null,
      status: next.status === "all" ? null : next.status,
      prioridade: next.prioridade === "all" ? null : next.prioridade,
      modulo: next.modulo === "all" ? null : next.modulo,
      responsavel: next.responsavel === "all" ? null : next.responsavel,
      vencidas: next.vencidas ? "1" : null,
    });
  };


  useEffect(() => {
    supabase.rpc("list_public_profiles").then(({ data }) => {
      const list = ((data ?? []) as { id: string; nome: string; status: string }[])
        .filter((u) => u.status === "ativo");
      setUsers(list.map((u) => ({ id: u.id, nome: u.nome })));
    });
  }, []);

  const usersMap = useMemo(() => new Map(users.map((u) => [u.id, u.nome])), [users]);

  // Aplica escopo de quadro antes dos filtros
  const scoped = useMemo(() => {
    if (activeView === "boards" || activeView === "all") return tasks;
    if (activeView === "none") return tasks.filter((t) => !t.board_id);
    return tasks.filter((t) => t.board_id === activeView);
  }, [tasks, activeView]);

  const filtered = useMemo(() => {
    return scoped.filter((t) => {
      if (filters.search && !t.titulo.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.status !== "all" && t.status !== filters.status) return false;
      if (filters.prioridade !== "all" && t.prioridade !== filters.prioridade) return false;
      if (filters.modulo !== "all" && t.modulo_relacionado !== filters.modulo) return false;
      if (filters.responsavel === "me") {
        if (!user) return false;
        const ids = getTaskAssignees(t);
        if (!ids.includes(user.id)) return false;
      } else if (filters.responsavel !== "all") {
        const ids = getTaskAssignees(t);
        if (!ids.includes(filters.responsavel)) return false;
      }
      if (filters.vencidas && !isTaskOverdue(t)) return false;
      return true;
    });
  }, [scoped, filters, user]);

  const openNew = (status?: TaskStatus) => {
    setEditing(null);
    setDefaultStatus(status);
    setFormOpen(true);
  };

  const openEdit = (t: Task) => {
    setEditing(t);
    setDefaultStatus(undefined);
    setFormOpen(true);
    setDetailTask(null);
  };

  const activeBoard = boards.find((b) => b.id === activeView) ?? null;
  const showingBoardsView = activeView === "boards";
  const isSpecialView = activeView === "boards" || activeView === "all" || activeView === "none";

  // Valida ?board= contra a lista carregada: id desconhecido ou arquivado => volta para visão segura.
  useEffect(() => {
    if (loading) return;
    if (isSpecialView) return;
    if (!activeBoard) {
      toast.error("Quadro não encontrado", {
        description: "O quadro informado não existe ou foi removido. Voltando para a visão de quadros.",
      });
      setActiveView("boards");
      return;
    }
    if (activeBoard.arquivado) {
      toast.warning("Quadro arquivado", {
        description: `"${activeBoard.nome}" está arquivado. Voltando para a visão de quadros.`,
      });
      setActiveView("boards");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isSpecialView, activeBoard?.id, activeBoard?.arquivado]);

  const scopeLabel = showingBoardsView
    ? "Quadros"
    : activeView === "all"
      ? "Todas as tarefas"
      : activeView === "none"
        ? "Sem quadro"
        : activeBoard?.nome ?? "Quadro";

  useEffect(() => {
    document.title = showingBoardsView
      ? "Tarefas | onPreserv"
      : `${scopeLabel} · Tarefas | onPreserv`;
  }, [showingBoardsView, scopeLabel]);

  // Abre tarefa via ?task=<id> (usado pelas notificações)
  const taskParam = searchParams.get("task");
  useEffect(() => {
    if (!taskParam) return;
    const t = tasks.find((x) => x.id === taskParam);
    if (t) setDetailTask(t);
  }, [taskParam, tasks]);

  useEffect(() => {
    if (!detailTask) return;
    const nextTask = tasks.find((task) => task.id === detailTask.id);
    if (!nextTask) {
      setDetailTask(null);
      return;
    }
    if (nextTask !== detailTask) {
      setDetailTask(nextTask);
    }
  }, [tasks, detailTask]);

  const closeDetail = (o: boolean) => {
    if (!o) {
      setDetailTask(null);
      if (searchParams.get("task")) updateParams({ task: null });
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              {showingBoardsView ? (
                <BreadcrumbPage>Tarefas</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <button type="button" onClick={() => setActiveView("boards")}>Tarefas</button>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!showingBoardsView && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="flex items-center gap-1.5">
                    {activeBoard && (
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: activeBoard.cor }}
                        aria-hidden
                      />
                    )}
                    {scopeLabel}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
        {!showingBoardsView && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setActiveView("boards")}
                data-testid="clear-board-filter"
              >
                Voltar aos quadros
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove o filtro ?board= e volta para a grade de quadros</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            {activeBoard && (
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: activeBoard.cor }}
                aria-hidden
              />
            )}
            {showingBoardsView ? "Tarefas" : scopeLabel}
          </h1>
          <p className="text-sm text-muted-foreground">
            {showingBoardsView
              ? "Central operacional integrada ao sistema"
              : activeBoard?.descricao || "Central operacional integrada ao sistema"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {showingBoardsView && (
            <Button variant="outline" onClick={() => setActiveView("all")}>
              Ver todas
            </Button>
          )}
          {activeBoard && (
            <>
              <Button variant="outline" onClick={() => setBoardEditOpen(true)}>
                <Pencil className="h-4 w-4 mr-1" /> Editar quadro
              </Button>
              <RowDeleteAction
                tipo="quadro"
                itemId={activeBoard.id}
                itemDescricao={activeBoard.nome}
                size="sm"
                confirmTitle={`Excluir quadro "${activeBoard.nome}"?`}
                confirmDescription={
                  scoped.length > 0
                    ? `Este quadro possui ${scoped.length} tarefa(s) vinculada(s). As tarefas não serão excluídas, apenas ficarão sem quadro associado.`
                    : "Este quadro não possui tarefas vinculadas."
                }
                onConfirmDelete={async () => {
                  const ok = await deleteBoard(activeBoard.id, { force: true });
                  if (ok) setActiveView("boards");
                }}
              />
            </>
          )}
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1" /> Importar
          </Button>
          <Button variant="outline" onClick={() => setLabelMgrOpen(true)}>
            <Tags className="h-4 w-4 mr-1" /> Etiquetas
          </Button>
          <Button onClick={() => openNew()}>
            <Plus className="h-4 w-4 mr-1" /> Nova tarefa
          </Button>
        </div>
      </div>

      {showingBoardsView ? (
        <BoardGrid boards={boards} tasks={tasks} onOpenBoard={(id) => setActiveView(id ?? "none")} />
      ) : (
        <>
          <TaskDashboardCards tasks={filtered} />
          <TaskFilters value={filters} onChange={setFilters} users={users} showResponsavelFilter={isAdmin} />
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="kanban">Kanban</TabsTrigger>
              <TabsTrigger value="tabela">Tabela</TabsTrigger>
              <TabsTrigger value="estatisticas">Estatísticas</TabsTrigger>
            </TabsList>
            <TabsContent value="kanban" className="mt-4">
              {loading ? (
                <div className="text-center text-muted-foreground py-12">Carregando...</div>
              ) : (
                <KanbanBoard
                  tasks={filtered}
                  users={usersMap}
                  onCardClick={setDetailTask}
                  onAddInColumn={openNew}
                />
              )}
            </TabsContent>
            <TabsContent value="tabela" className="mt-4">
              <TaskTable tasks={filtered} users={usersMap} onEdit={openEdit} onRowClick={setDetailTask} />
            </TabsContent>
            <TabsContent value="estatisticas" className="mt-4">
              <TaskStatsPanel tasks={filtered} users={usersMap} boards={boards} showByUser={isAdmin} />
            </TabsContent>
          </Tabs>
        </>
      )}

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} task={editing} defaultStatus={defaultStatus} />
      <TaskDetailDialog task={detailTask} open={!!detailTask} onOpenChange={closeDetail} onEdit={openEdit} users={usersMap} />
      <LabelManagerDialog open={labelMgrOpen} onOpenChange={setLabelMgrOpen} />
      <TaskImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <BoardFormDialog open={boardEditOpen} onOpenChange={setBoardEditOpen} board={activeBoard} />
    </div>
  );
}

