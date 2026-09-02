import { useMemo, useState } from "react";
import { Task, TaskBoard, BOARD_EQUIPES } from "@/types/task";
import { groupTasksByBoard } from "@/lib/stats";
import { BoardCard } from "./BoardCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, CheckSquare, X, Search, LayoutGrid } from "lucide-react";
import { BoardFormDialog } from "./BoardFormDialog";
import { useTasks } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RowDeleteAction } from "@/components/RowDeleteAction";
import { cn } from "@/lib/utils";


interface Props {
  boards: TaskBoard[];
  tasks: Task[];
  onOpenBoard: (boardId: string | null) => void;
}

export function BoardGrid({ boards, tasks, onOpenBoard }: Props) {
  const { deleteBoard } = useTasks();
  const { isAdmin } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskBoard | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [equipeFilter, setEquipeFilter] = useState<string>("all");

  const grouped = useMemo(() => groupTasksByBoard(tasks), [tasks]);
  const activeBoards = boards.filter((b) => !b.arquivado);

  const equipeOptions = useMemo(() => {
    const fromBoards = activeBoards.map((b) => (b.equipe ?? "").trim()).filter(Boolean);
    return Array.from(new Set<string>([...BOARD_EQUIPES, ...fromBoards])).sort((a, b) => a.localeCompare(b));
  }, [activeBoards]);

  const visible = activeBoards.filter((b) => {
    if (equipeFilter === "__none__" && (b.equipe ?? "").trim()) return false;
    if (equipeFilter !== "all" && equipeFilter !== "__none__" && (b.equipe ?? "") !== equipeFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = `${b.nome} ${b.descricao ?? ""} ${b.equipe ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  


  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const allSelected = visible.length > 0 && selected.size === visible.length;
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(visible.map((b) => b.id)));
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    for (const id of ids) {
      // sequencial para evitar disparar refresh em paralelo
      // eslint-disable-next-line no-await-in-loop
      await deleteBoard(id, { force: true });
    }
    exitSelect();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card/60 p-2 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar quadro..."
            className="pl-9 border-0 bg-muted/50 focus-visible:ring-1"
          />
        </div>
        <Select value={equipeFilter} onValueChange={setEquipeFilter}>
          <SelectTrigger className="w-[190px] border-0 bg-muted/50"><SelectValue placeholder="Equipe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as equipes</SelectItem>
            <SelectItem value="__none__">Sem equipe</SelectItem>
            {equipeOptions.map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-between items-center gap-2 flex-wrap">
        {selectMode ? (
          <div className="flex items-center gap-2 text-sm">
            <Button variant="ghost" size="sm" onClick={toggleAll}>
              {allSelected ? "Desmarcar todos" : "Selecionar todos"}
            </Button>
            <span className="text-muted-foreground">
              {selected.size} selecionado(s)
            </span>
          </div>
        ) : (
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {visible.length} {visible.length === 1 ? "quadro" : "quadros"}
          </span>
        )}

        <div className="flex gap-2">
          {isAdmin && visible.length > 0 && !selectMode && (
            <Button size="sm" variant="outline" onClick={() => setSelectMode(true)}>
              <CheckSquare className="h-4 w-4 mr-1" /> Selecionar quadros
            </Button>
          )}
          {selectMode && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" disabled={selected.size === 0}>
                    <Trash2 className="h-4 w-4 mr-1" /> Excluir ({selected.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir {selected.size} quadro(s)?</AlertDialogTitle>
                    <AlertDialogDescription>
                      As tarefas dos quadros não serão excluídas, apenas ficarão sem quadro associado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button size="sm" variant="ghost" onClick={exitSelect}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
            </>
          )}
          {!selectMode && (
            <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Novo quadro
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((b) => {
          const isSel = selected.has(b.id);
          return (
            <div key={b.id} className={cn("group relative", selectMode && isSel && "ring-1 ring-primary")}>
              <BoardCard
                board={b}
                tasks={grouped.get(b.id) ?? []}
                onClick={() => (selectMode ? toggle(b.id) : onOpenBoard(b.id))}
              />
              {selectMode ? (
                <div
                  className="absolute right-3 top-3 z-10 border border-border-strong bg-background/95 p-1.5 backdrop-blur-sm"
                  onClick={(e) => { e.stopPropagation(); toggle(b.id); }}
                >
                  <Checkbox checked={isSel} />
                </div>
              ) : (
                <div className="absolute right-3 top-3 z-10 flex gap-1 opacity-0 transition-opacity duration-300 ease-out-expo focus-within:opacity-100 group-hover:opacity-100">
                  <Button size="icon" variant="secondary" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditing(b); setFormOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <div onClick={(e) => e.stopPropagation()}>
                    {isAdmin ? (
                      <BoardDeleteButton
                        board={b}
                        taskCount={grouped.get(b.id)?.length ?? 0}
                        onDelete={(deleteTasks) => deleteBoard(b.id, { force: true, deleteTasks })}
                      />
                    ) : (
                      <RowDeleteAction
                        tipo="quadro"
                        itemId={b.id}
                        itemDescricao={b.nome}
                        confirmTitle={`Excluir quadro "${b.nome}"?`}
                        confirmDescription="Solicite a exclusão deste quadro a um administrador."
                        onConfirmDelete={() => deleteBoard(b.id, { force: true })}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {visible.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/20 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center border border-border bg-muted text-muted-foreground">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {search.trim() || equipeFilter !== "all"
                  ? "Nenhum quadro encontrado"
                  : "Nenhum quadro criado"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {search.trim() || equipeFilter !== "all"
                  ? "Ajuste a busca ou o filtro de equipe."
                  : "Crie um quadro para organizar suas tarefas por frente de trabalho."}
              </p>
            </div>
            {!(search.trim() || equipeFilter !== "all") && (
              <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Novo quadro
              </Button>
            )}
          </div>
        )}

      </div>

      <BoardFormDialog open={formOpen} onOpenChange={setFormOpen} board={editing} />
    </div>
  );
}

interface BoardDeleteButtonProps {
  board: TaskBoard;
  taskCount: number;
  onDelete: (deleteTasks: boolean) => Promise<boolean>;
}

function BoardDeleteButton({ board, taskCount, onDelete }: BoardDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [deleteTasks, setDeleteTasks] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    const ok = await onDelete(taskCount > 0 ? deleteTasks : false);
    setLoading(false);
    if (ok) setOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 hover:bg-destructive/10"
        onClick={() => { setDeleteTasks(true); setOpen(true); }}
        title="Excluir quadro"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
      <AlertDialog open={open} onOpenChange={(o) => !loading && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir quadro "{board.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {taskCount > 0
                ? `Este quadro possui ${taskCount} tarefa(s) vinculada(s).`
                : "Este quadro não possui tarefas vinculadas."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {taskCount > 0 && (
            <label className="flex items-start gap-2 text-sm py-2 cursor-pointer">
              <Checkbox
                checked={deleteTasks}
                onCheckedChange={(v) => setDeleteTasks(v === true)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Excluir as {taskCount} tarefa(s) junto</span>
                <span className="block text-xs text-muted-foreground">
                  Se desmarcado, a exclusão não será concluída para evitar tarefas órfãs.
                </span>
              </span>
            </label>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading || (taskCount > 0 && !deleteTasks)}
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
            >
              {loading ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
