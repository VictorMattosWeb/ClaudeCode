import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, defaultAnimateLayoutChanges, AnimateLayoutChanges } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { Task, TaskStatus, TASK_STATUS_LABEL, TASK_STATUS_ORDER } from "@/types/task";
import { TaskCard } from "./TaskCard";
import { useTasks } from "@/context/TaskContext";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildTaskReorderUpdates,
  groupByStatus,
  mergeKanbanItems,
  moveTask,
  normalizeKanbanPositions,
  shouldReuseKanbanItems,
  sortKanbanItems,
} from "@/lib/taskKanban";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { notifyError } from "@/lib/errorMessages";

// `wasDragging: true` fixo obrigava o dnd-kit a animar TODOS os cards a cada
// mudança de layout, inclusive os que não se moveram. Deixar o padrão decidir
// reduz muito o trabalho de layout durante o arrasto.
const animateLayoutChanges: AnimateLayoutChanges = defaultAnimateLayoutChanges;

const COL_COLORS: Record<TaskStatus, string> = {
  a_fazer: "border-t-muted-foreground",
  em_andamento: "border-t-info",
  em_revisao: "border-t-warning",
  concluido: "border-t-success",
  bloqueado: "border-t-destructive",
};

interface Props {
  tasks: Task[];
  users: Map<string, string>;
  onCardClick: (t: Task) => void;
  onAddInColumn: (s: TaskStatus) => void;
}

function SortableCard({
  task,
  users,
  onClick,
  reducedMotion,
  saving,
  justConfirmed,
}: {
  task: Task;
  users: Map<string, string>;
  onClick: () => void;
  reducedMotion: boolean;
  saving: boolean;
  justConfirmed: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", status: task.status },
    animateLayoutChanges,
    transition: reducedMotion
      ? { duration: 1, easing: "linear" }
      : {
          // Duração única e curta. Antes o card em "salvando" usava 420ms para
          // esperar o servidor, o que fazia o quadro parecer travado logo depois
          // de soltar — justamente o momento em que ele deveria parecer pronto.
          duration: 180,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
        },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Só promove a camada de composição durante o arrasto. Mantê-lo sempre
    // ligado criava uma camada por card — caro num quadro com muitas tarefas.
    willChange: !reducedMotion && isDragging ? "transform" : undefined,
  };
  return (
    <div
      style={style}
      className={cn("relative", isDragging && "pointer-events-none")}
    >
      {/* Mantém o card no fluxo para preservar a altura/posição do slot, mas escondido */}
      <div className={cn(isDragging && "invisible")}>
        <TaskCard
          task={task}
          users={users}
          responsavelNome={task.responsavel_id ? users.get(task.responsavel_id) : undefined}
          onClick={onClick}
          reducedMotion={reducedMotion}
          saving={saving}
          justConfirmed={justConfirmed}
          dragHandleProps={{ ref: setNodeRef, attributes, listeners, isDragging }}
        />
      </div>
      {isDragging && (
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 rounded-md border-2 border-dashed border-primary/50",
            "bg-primary/5",
            !reducedMotion && "kanban-ghost-pulse",
          )}
        />
      )}
    </div>
  );
}




function Column({
  status,
  tasks,
  users,
  onCardClick,
  onAddInColumn,
  reducedMotion,
  savingIds,
  confirmedIds,
}: {
  status: TaskStatus;
  tasks: Task[];
  users: Map<string, string>;
  onCardClick: (t: Task) => void;
  onAddInColumn: (s: TaskStatus) => void;
  reducedMotion: boolean;
  savingIds: Set<string>;
  confirmedIds: Set<string>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${status}`,
    data: { type: "column", status },
  });
  return (
    <div
      className={cn(
        "flex-shrink-0 w-72 flex flex-col bg-muted/30 rounded-lg overflow-hidden transition-colors",
        isOver && "bg-accent/40 ring-1 ring-primary/40",
        reducedMotion && "motion-reduce:transition-none",
      )}
    >
      <div className={cn("p-3 border-t-4", COL_COLORS[status])}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{TASK_STATUS_LABEL[status]}</h3>
          <span className="text-xs text-muted-foreground bg-background px-1.5 rounded">{tasks.length}</span>
        </div>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} data-kanban-column-body="true" className="flex-1 px-2 pb-2 pt-2 space-y-2 min-h-[120px] overflow-y-auto">
          {tasks.map((t) => (
            <SortableCard
              key={t.id}
              task={t}
              users={users}
              onClick={() => onCardClick(t)}
              reducedMotion={reducedMotion}
              saving={savingIds.has(t.id)}
              justConfirmed={confirmedIds.has(t.id)}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs text-muted-foreground"
            onClick={() => onAddInColumn(status)}
          >
            <Plus className="h-3 w-3 mr-1" /> Adicionar
          </Button>
        </div>
      </SortableContext>
    </div>
  );
}


export function KanbanBoard({ tasks, users, onCardClick, onAddInColumn }: Props) {
  const { reorderTasks } = useTasks();
  const reducedMotion = useReducedMotion();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPersisting, setIsPersisting] = useState(false);
  // Estado local para feedback instantâneo (estilo Notion)
  // Sempre na ordem canônica: a renderização confia na ordem do array.
  const [items, setItems] = useState<Task[]>(() => sortKanbanItems(tasks));
  // IDs sendo salvos no backend (mostram skeleton/striped até confirmar)
  const [savingIds, setSavingIds] = useState<Set<string>>(() => new Set());
  // IDs recém-confirmados (pulse verde rápido após o save)
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(() => new Set());
  // IDs com escrita pendente — não sobrescrever com props até confirmar
  const pendingRef = useRef<Map<string, { status: TaskStatus; posicao: number }>>(new Map());
  const lastStableItemsRef = useRef<Task[]>(sortKanbanItems(tasks));

  const sensors = useSensors(
    // 3px em vez de 6px: o arrasto "engata" quase no primeiro movimento, sem
    // deixar de distinguir de um clique.
    useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
    // 150ms ainda separa arrasto de rolagem, mas responde bem mais rápido.
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
  );
  const boardRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  // Auto-scroll nas bordas (horizontal do board + vertical das colunas + janela) durante o drag
  useEffect(() => {
    if (!activeId) {
      pointerRef.current = null;
      return;
    }
    const EDGE = 80; // px da borda que ativa o scroll
    const MAX_SPEED = 18; // px por frame

    const onMove = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("dragover", onMove as unknown as EventListener, { passive: true });

    let raf = 0;
    // `document.elementFromPoint` força o navegador a resolver hit-testing, o
    // que era feito a cada frame (60x/s). Uma vez a cada ~100ms é suficiente
    // para acompanhar o cursor e tira o maior custo do laço.
    let ultimoHitTest = 0;
    let colunaSobCursor: HTMLElement | null = null;

    const tick = (agora: number) => {
      const p = pointerRef.current;
      if (p) {
        // Scroll horizontal do board
        const board = boardRef.current;
        if (board) {
          const r = board.getBoundingClientRect();
          if (p.x < r.left + EDGE) {
            const f = (r.left + EDGE - p.x) / EDGE;
            board.scrollLeft -= Math.ceil(f * MAX_SPEED);
          } else if (p.x > r.right - EDGE) {
            const f = (p.x - (r.right - EDGE)) / EDGE;
            board.scrollLeft += Math.ceil(f * MAX_SPEED);
          }
        }
        // Scroll vertical da coluna sob o cursor
        if (agora - ultimoHitTest > 100) {
          ultimoHitTest = agora;
          const el = document.elementFromPoint(p.x, p.y);
          colunaSobCursor = (el?.closest('[data-kanban-column-body="true"]') as HTMLElement | null) ?? null;
        }
        const col = colunaSobCursor;
        if (col) {
          const r = col.getBoundingClientRect();
          if (p.y < r.top + EDGE) {
            const f = (r.top + EDGE - p.y) / EDGE;
            col.scrollTop -= Math.ceil(f * MAX_SPEED);
          } else if (p.y > r.bottom - EDGE) {
            const f = (p.y - (r.bottom - EDGE)) / EDGE;
            col.scrollTop += Math.ceil(f * MAX_SPEED);
          }
        }
        // Scroll vertical da janela
        const vh = window.innerHeight;
        if (p.y < EDGE) {
          const f = (EDGE - p.y) / EDGE;
          window.scrollBy(0, -Math.ceil(f * MAX_SPEED));
        } else if (p.y > vh - EDGE) {
          const f = (p.y - (vh - EDGE)) / EDGE;
          window.scrollBy(0, Math.ceil(f * MAX_SPEED));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("dragover", onMove as unknown as EventListener);
      cancelAnimationFrame(raf);
    };
  }, [activeId]);

  // Mescla props com estado local: mantém posições otimistas até o servidor confirmar
  useEffect(() => {
    if (activeId) return;
    setItems((prev) => {
      const merged = mergeKanbanItems(prev, tasks, pendingRef.current);
      lastStableItemsRef.current = merged;
      return shouldReuseKanbanItems(prev, merged) ? prev : merged;
    });
  }, [tasks, activeId]);

  // Agrupa preservando a ordem do array. Reordenar por `posicao` aqui era o
  // bug central: durante o arrasto a `posicao` ainda é a antiga, então o card
  // voltava para o lugar de origem e só assentava depois de soltar.
  const grouped = useMemo(() => groupByStatus(items), [items]);

  const findContainer = (id: string): TaskStatus | null => {
    if (id.startsWith("col-")) return id.slice(4) as TaskStatus;
    const t = items.find((x) => x.id === id);
    return t ? t.status : null;
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragOver = (e: DragOverEvent) => {
    if (isPersisting) return;
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    if (activeIdStr === overIdStr) return;

    const activeCol = findContainer(activeIdStr);
    const overCol = findContainer(overIdStr);
    if (!activeCol || !overCol) return;

    // Uma única regra para os dois casos (mesma coluna e entre colunas), coberta
    // por testes em `taskKanbanMove.test.ts`.
    setItems((prev) => moveTask(prev, activeIdStr, overIdStr));
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    if (isPersisting) return;
    const { active } = e;
    const movedId = String(active.id);
    const snapshot = lastStableItemsRef.current;

    let next: Task[];
    let updates: { id: string; status: TaskStatus; posicao: number }[];
    try {
      next = normalizeKanbanPositions(items);
      // Compara com o snapshot estável, não com as props: elas podem ter sido
      // atualizadas pelo realtime no meio do arrasto e gerariam updates falsos.
      updates = buildTaskReorderUpdates(next, snapshot);
      const movedNow = next.find((t) => t.id === movedId);
      if (movedNow && !updates.some((u) => u.id === movedId)) {
        updates.push({ id: movedId, status: movedNow.status, posicao: movedNow.posicao });
      }
    } catch (err) {
      console.error("[Kanban] erro ao calcular reordenação:", err);
      toast.error("Não foi possível calcular a nova ordem. Restaurando posição anterior.");
      for (const task of items) pendingRef.current.delete(task.id);
      setItems(snapshot);
      return;
    }

    setItems(next);

    if (!updates.length) {
      lastStableItemsRef.current = next;
      return;
    }

    const updatedIds = updates.map((u) => u.id);
    for (const update of updates) {
      pendingRef.current.set(update.id, { status: update.status, posicao: update.posicao });
    }
    // Marca cards em "salvando" — UI mostra estado pendente até o backend confirmar
    setSavingIds((prev) => {
      const nextSet = new Set(prev);
      updatedIds.forEach((id) => nextSet.add(id));
      return nextSet;
    });

    setIsPersisting(true);
    let ok = false;
    try {
      ok = await reorderTasks(updates);
    } catch (err) {
      console.error("[Kanban] falha ao persistir reordenação:", err);
      notifyError(err, "Não foi possível salvar a nova ordem. A posição anterior foi restaurada.");
      ok = false;
    } finally {
      setIsPersisting(false);
      // Sempre remove o estado de "salvando" — sucesso ou falha
      setSavingIds((prev) => {
        const nextSet = new Set(prev);
        updatedIds.forEach((id) => nextSet.delete(id));
        return nextSet;
      });
    }

    if (!ok) {
      // Descarta só as pendências deste arrasto — limpar o mapa inteiro
      // derrubava movimentos de outras tarefas ainda em voo.
      for (const id of updatedIds) pendingRef.current.delete(id);
      setItems(snapshot);
      toast.error("Não foi possível salvar a nova ordem. Restaurando posição anterior.");
      return;
    }

    // Sucesso: dispara o pulse de confirmação e só então "assenta" a posição estável
    setConfirmedIds((prev) => {
      const nextSet = new Set(prev);
      updatedIds.forEach((id) => nextSet.add(id));
      return nextSet;
    });
    lastStableItemsRef.current = next;
    window.setTimeout(() => {
      setConfirmedIds((prev) => {
        const nextSet = new Set(prev);
        updatedIds.forEach((id) => nextSet.delete(id));
        return nextSet;
      });
    }, 900);
  };



  const onDragCancel = () => setActiveId(null);

  const activeTask = activeId ? items.find((t) => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div ref={boardRef} className="flex gap-3 overflow-x-auto pb-4">
        {TASK_STATUS_ORDER.map((s) => (
          <Column
            key={s}
            status={s}
            tasks={grouped.get(s) ?? []}
            users={users}
            onCardClick={onCardClick}
            onAddInColumn={onAddInColumn}
            reducedMotion={reducedMotion}
            savingIds={savingIds}
            confirmedIds={confirmedIds}
          />

        ))}
      </div>
      <DragOverlay
        dropAnimation={
          reducedMotion
            ? { duration: 1, easing: "linear" }
            : {
                duration: 280,
                easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              }
        }
      >
        {activeTask && (
          <div className={cn(
            "shadow-2xl ring-1 ring-primary/30 rounded-md transition-transform",
            !reducedMotion && "rotate-2 scale-[1.03]",
          )}>
            <TaskCard
              task={activeTask}
              users={users}
              responsavelNome={activeTask.responsavel_id ? users.get(activeTask.responsavel_id) : undefined}
              reducedMotion={reducedMotion}
              dragHandleProps={{ isDragging: true }}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
