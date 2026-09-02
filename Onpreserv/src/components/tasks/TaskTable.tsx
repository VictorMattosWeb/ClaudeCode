import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Task, taskModuloLabel, TASK_STATUS_LABEL, TaskStatus, isTaskOverdue, getTaskAssignees, formatPrazo } from "@/types/task";
import { PriorityBadge } from "./PriorityBadge";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { LabelChip } from "./LabelChip";
import { QuickLabelPicker } from "./QuickLabelPicker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, CheckSquare, X, UserPlus, ArrowRightLeft } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useTasks } from "@/context/TaskContext";
import { RowDeleteAction } from "@/components/RowDeleteAction";
import { cn } from "@/lib/utils";

interface Props {
  tasks: Task[];
  users: Map<string, string>;
  onEdit: (t: Task) => void;
  onRowClick?: (t: Task) => void;
}

export function TaskTable({ tasks, users, onEdit, onRowClick }: Props) {
  const { isAdmin, isViewer } = useAuth();
  const { deleteTask, bulkDeleteTasks, bulkUpdateStatus, bulkAssignTasks } = useTasks();
  const canBulk = !isViewer;
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSelected, setAssignSelected] = useState<Set<string>>(new Set());

  const visibleIds = useMemo(() => tasks.map((t) => t.id), [tasks]);
  const allSelected = visibleIds.length > 0 && selected.size === visibleIds.length;
  const userList = useMemo(() => Array.from(users.entries()).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome)), [users]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(visibleIds));
  const exitSelect = () => { setSelectMode(false); setSelected(new Set()); };

  const handleBulkDelete = async () => {
    const n = await bulkDeleteTasks(Array.from(selected));
    if (n > 0) exitSelect();
  };

  const handleBulkStatus = async (status: TaskStatus) => {
    const n = await bulkUpdateStatus(Array.from(selected), status);
    if (n > 0) exitSelect();
  };

  const openAssign = () => {
    setAssignSelected(new Set());
    setAssignOpen(true);
  };
  const toggleAssign = (id: string) => {
    setAssignSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const handleBulkAssign = async () => {
    const n = await bulkAssignTasks(Array.from(selected), Array.from(assignSelected));
    setAssignOpen(false);
    if (n > 0) exitSelect();
  };

  return (
    <div className="space-y-2">
      {canBulk && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {selectMode ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Button variant="ghost" size="sm" onClick={toggleAll}>
                  {allSelected ? "Desmarcar todos" : "Selecionar todos"}
                </Button>
                <span className="text-muted-foreground">{selected.size} selecionada(s)</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" disabled={selected.size === 0}>
                      <ArrowRightLeft className="h-4 w-4 mr-1" /> Alterar status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(Object.keys(TASK_STATUS_LABEL) as TaskStatus[]).map((s) => (
                      <DropdownMenuItem key={s} onClick={() => handleBulkStatus(s)}>
                        {TASK_STATUS_LABEL[s]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={selected.size === 0} onClick={openAssign}>
                      <UserPlus className="h-4 w-4 mr-1" /> Atribuir
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Atribuir {selected.size} tarefa(s)</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                      Os responsáveis selecionados substituirão os atuais. Deixe vazio para remover todos.
                    </p>
                    <div className="max-h-64 overflow-y-auto space-y-1 border rounded-md p-2">
                      {userList.length === 0 && (
                        <p className="text-sm text-muted-foreground p-2">Nenhum usuário ativo</p>
                      )}
                      {userList.map((u) => (
                        <label key={u.id} className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-muted cursor-pointer">
                          <Checkbox
                            checked={assignSelected.has(u.id)}
                            onCheckedChange={() => toggleAssign(u.id)}
                          />
                          {u.nome}
                        </label>
                      ))}
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setAssignOpen(false)}>Cancelar</Button>
                      <Button onClick={handleBulkAssign}>Aplicar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive" disabled={selected.size === 0}>
                        <Trash2 className="h-4 w-4 mr-1" /> Excluir ({selected.size})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir {selected.size} tarefa(s)?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button size="sm" variant="ghost" onClick={exitSelect}>
                  <X className="h-4 w-4 mr-1" /> Cancelar
                </Button>
              </div>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setSelectMode(true)} disabled={tasks.length === 0}>
              <CheckSquare className="h-4 w-4 mr-1" /> Selecionar tarefas
            </Button>
          )}
        </div>
      )}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {selectMode && (
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </TableHead>
              )}
              <TableHead>Tarefa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Responsáveis</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead>Etiquetas</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 && (
              <TableRow><TableCell colSpan={selectMode ? 9 : 8} className="text-center py-8 text-muted-foreground">Nenhuma tarefa</TableCell></TableRow>
            )}
            {tasks.map((t) => {
              const overdue = isTaskOverdue(t);
              const isSel = selected.has(t.id);
              return (
                <TableRow
                  key={t.id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/60 transition-colors",
                    selectMode && isSel && "bg-primary/5",
                  )}
                  onClick={() => !selectMode && onRowClick?.(t)}
                >
                  {selectMode && (
                    <TableCell>
                      <Checkbox checked={isSel} onCheckedChange={() => toggle(t.id)} />
                    </TableCell>
                  )}
                  <TableCell className="font-medium max-w-[280px]">
                    <div className="line-clamp-1">{t.titulo}</div>
                    {t.item_relacionado_descricao && (
                      <div className="text-xs text-muted-foreground line-clamp-1">{t.item_relacionado_descricao}</div>
                    )}
                  </TableCell>
                  <TableCell><TaskStatusBadge status={t.status} /></TableCell>
                  <TableCell><PriorityBadge priority={t.prioridade} /></TableCell>
                  <TableCell className="text-sm">
                    {(() => {
                      const ids = getTaskAssignees(t);
                      if (ids.length === 0) return "—";
                      const nomes = ids.map((id) => users.get(id) ?? "—");
                      if (ids.length <= 2) return nomes.join(", ");
                      return `${nomes.slice(0, 2).join(", ")} +${ids.length - 2}`;
                    })()}
                  </TableCell>
                  <TableCell className="text-sm">{taskModuloLabel(t.modulo_relacionado)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      {(t.labels ?? []).map((l) => <LabelChip key={l.id} label={l} />)}
                      <QuickLabelPicker task={t} variant={(t.labels?.length ?? 0) === 0 ? "chip" : "icon"} />
                    </div>
                  </TableCell>
                  <TableCell className={cn("text-sm", overdue && "text-destructive font-medium")}>
                    {t.prazo ? formatPrazo(t.prazo) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => onEdit(t)} className="h-8 w-8">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <RowDeleteAction
                      tipo="tarefa"
                      itemId={t.id}
                      itemDescricao={t.titulo}
                      confirmTitle={`Excluir tarefa "${t.titulo}"?`}
                      confirmDescription="Esta ação não pode ser desfeita."
                      onConfirmDelete={() => deleteTask(t.id)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
