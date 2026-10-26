import { useEffect, useMemo, useState } from "react";
import { Navigate, Link, useNavigate, useParams } from "react-router-dom";
import { BarChart3, ChevronLeft, Copy, KanbanSquare, List, MoreHorizontal, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import type { Task } from "@/types/activities";
import { ConfirmDialog, MenuItem, Popover } from "@/components/ui/overlays";
import { GhostIconButton, PrimaryButton, Segmented } from "@/components/ui/primitives";
import { useAppState, useDispatch } from "@/store/StoreProvider";
import { columnsImpact } from "@/store/reducer";
import { activeFilterCount, EMPTY_FILTERS, filterTasks, type Filters } from "./filters";
import { FilterBar } from "./FilterBar";
import { KanbanBoard } from "./kanban/KanbanBoard";
import { TaskList } from "./list/TaskList";
import { StatsView } from "./stats/StatsView";
import { BoardDialog } from "./dialogs/BoardDialog";
import { TagsDialog } from "./dialogs/TagsDialog";
import { TaskDialog } from "./dialogs/TaskDialog";

type View = "kanban" | "lista" | "stats";
const VIEW_KEY = "mysystem.activities.view";

function loadView(): View {
  const fromUrl = new URLSearchParams(window.location.search).get("v");
  if (fromUrl === "kanban" || fromUrl === "lista" || fromUrl === "stats") return fromUrl;
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === "kanban" || v === "lista" || v === "stats") return v;
  } catch {
    /* sem armazenamento */
  }
  return "kanban";
}

export function ActivitiesPage() {
  const { boardId } = useParams();
  const { boards, activeBoardId } = useAppState();
  const board = boards.find((b) => b.id === boardId) ?? null;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [view, setView] = useState<View>(loadView);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [openTask, setOpenTask] = useState<Task | "new" | null>(null);
  const [editingBoard, setEditingBoard] = useState(false);
  const [managingTags, setManagingTags] = useState(false);
  const [deletingBoard, setDeletingBoard] = useState(false);
  const [applyingColumns, setApplyingColumns] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* sem armazenamento */
    }
  }, [view]);

  // O quadro aberto vira o "ativo" (destaque na sidebar e último quadro visitado).
  useEffect(() => {
    if (board && board.id !== activeBoardId) dispatch({ type: "board/select", boardId: board.id });
  }, [board, activeBoardId, dispatch]);

  // Filtros são por quadro: trocar de quadro limpa.
  useEffect(() => setFilters(EMPTY_FILTERS), [board?.id]);

  const tasks = useMemo(() => (board ? filterTasks(board, filters) : []), [board, filters]);

  // Quadro inexistente (excluído ou link antigo): volta para a visão geral.
  if (!board) return <Navigate to="/atividades" replace />;

  // A atividade aberta é relida do estado para refletir mudanças (ex.: etiqueta criada no diálogo).
  const liveTask = openTask && openTask !== "new" ? (board.tasks.find((t) => t.id === openTask.id) ?? null) : openTask;
  const filtered = activeFilterCount(filters) > 0;

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 space-y-5 px-4 pt-2 pb-5 md:px-8 md:pt-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Link to="/atividades" className="inline-flex items-center gap-1 rounded-lg text-sm font-medium text-stone-500 hover:text-stone-900">
              <ChevronLeft className="h-4 w-4" />
              Todos os quadros
            </Link>
            <div className="flex items-center gap-1">
              <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">{board.name}</h1>
              <Popover trigger={({ toggle }) => <GhostIconButton icon={MoreHorizontal} label="Opções do quadro" ring onClick={toggle} />}>
                {(close) => (
                  <>
                    <MenuItem icon={Pencil} onClick={() => { close(); setEditingBoard(true); }}>Editar quadro</MenuItem>
                    <MenuItem icon={Tags} onClick={() => { close(); setManagingTags(true); }}>Gerenciar etiquetas</MenuItem>
                    <MenuItem icon={Copy} disabled={boards.length < 2} onClick={() => { close(); setApplyingColumns(true); }}>
                      Aplicar estas etapas a todos os quadros
                    </MenuItem>
                    <div className="my-1 h-px bg-stone-200" />
                    <MenuItem icon={Trash2} danger onClick={() => { close(); setDeletingBoard(true); }}>Excluir quadro</MenuItem>
                  </>
                )}
              </Popover>
            </div>
            {board.description && <p className="text-sm text-stone-500">{board.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: "kanban", label: "Kanban", icon: KanbanSquare },
                { value: "lista", label: "Lista", icon: List },
                { value: "stats", label: "Estatísticas", icon: BarChart3 },
              ]}
            />
            <PrimaryButton icon={Plus} className="py-2" onClick={() => setOpenTask("new")}>
              Nova atividade
            </PrimaryButton>
          </div>
        </div>
        <FilterBar board={board} filters={filters} onChange={setFilters} />
      </header>

      <div className={view === "kanban" ? "min-h-0 flex-1" : "ds-scroll min-h-0 flex-1 overflow-y-auto"}>
        {view === "kanban" && <KanbanBoard board={board} tasks={tasks} onOpenTask={setOpenTask} />}
        {view === "lista" && <TaskList board={board} tasks={tasks} onOpenTask={setOpenTask} />}
        {view === "stats" && <StatsView board={board} tasks={tasks} filtered={filtered} />}
      </div>

      <TaskDialog board={board} task={liveTask} onClose={() => setOpenTask(null)} />
      <BoardDialog open={editingBoard} board={board} onClose={() => setEditingBoard(false)} />
      <TagsDialog board={board} open={managingTags} onClose={() => setManagingTags(false)} />
      <ConfirmDialog
        open={deletingBoard}
        title="Excluir quadro"
        message={<>O quadro <span className="font-medium text-stone-900">“{board.name}”</span> e suas {board.tasks.length} atividades serão excluídos permanentemente.</>}
        onClose={() => setDeletingBoard(false)}
        onConfirm={() => {
          dispatch({ type: "board/delete", boardId: board.id });
          navigate("/atividades");
        }}
      />
      <ConfirmDialog
        open={applyingColumns}
        title="Aplicar etapas a todos os quadros"
        confirmLabel="Aplicar etapas"
        message={applyingColumns && (() => {
          const impact = columnsImpact(board, boards);
          return (
            <div className="space-y-3">
              <p>
                Os outros {boards.length - 1} quadros passam a ter as mesmas etapas de{" "}
                <span className="font-medium text-stone-900">{board.name}</span>, na mesma ordem e com as mesmas cores:
              </p>
              <p className="flex flex-wrap gap-1.5">
                {board.columns.map((c) => (
                  <span key={c.id} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">{c.name}</span>
                ))}
              </p>
              <p>
                Etapas com o mesmo nome mantêm suas atividades.{" "}
                {impact.displaced > 0 ? (
                  <span className="font-medium text-rose-600">
                    {impact.displaced} atividade{impact.displaced > 1 ? "s" : ""} em etapas que não existem aqui vão para “{board.columns[0]?.name}”.
                  </span>
                ) : (
                  "Nenhuma atividade muda de etapa."
                )}
              </p>
            </div>
          );
        })()}
        onClose={() => setApplyingColumns(false)}
        onConfirm={() => dispatch({ type: "board/applyColumns", sourceBoardId: board.id })}
      />
    </div>
  );
}
