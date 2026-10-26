import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { Board, Column, Task } from "@/types/activities";
import { useDispatch } from "@/store/StoreProvider";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCardView } from "./TaskCard";
import { ColumnDialog, DeleteColumnDialog } from "../dialogs/ColumnDialog";

export function KanbanBoard({ board, tasks, onOpenTask }: { board: Board; tasks: Task[]; onOpenTask: (t: Task) => void }) {
  const dispatch = useDispatch();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Column | "new" | null>(null);
  const [deleting, setDeleting] = useState<Column | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const byColumn = useMemo(() => {
    const map = new Map<string, Task[]>(board.columns.map((c) => [c.id, []]));
    for (const t of tasks) map.get(t.columnId)?.push(t);
    return map;
  }, [board.columns, tasks]);

  const columnOf = (id: string): string | null => {
    if (byColumn.has(id)) return id;
    return board.tasks.find((t) => t.id === id)?.columnId ?? null;
  };

  const onDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));

  // Ao cruzar para outra coluna, a atividade já muda de etapa (pré-visualização ao vivo).
  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const from = columnOf(String(active.id));
    const to = columnOf(String(over.id));
    if (!from || !to || from === to) return;
    const overTask = byColumn.has(String(over.id)) ? null : String(over.id);
    dispatch({ type: "task/move", boardId: board.id, taskId: String(active.id), toColumnId: to, overTaskId: overTask });
  };

  // Reordenação dentro da coluna: o reducer insere ANTES de overTaskId.
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const to = columnOf(String(over.id));
    if (!to || byColumn.has(String(over.id))) return;
    const list = byColumn.get(to) ?? [];
    const from = list.findIndex((t) => t.id === active.id);
    const target = list.findIndex((t) => t.id === over.id);
    if (from < 0 || target < 0) return;
    const before = from < target ? (list[target + 1]?.id ?? null) : String(over.id);
    dispatch({ type: "task/move", boardId: board.id, taskId: String(active.id), toColumnId: to, overTaskId: before });
  };

  const activeTask = activeId ? board.tasks.find((t) => t.id === activeId) : null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="ds-scroll flex h-full items-start gap-4 overflow-x-auto px-4 pb-6 md:px-8">
          {board.columns.map((c, i) => (
            <KanbanColumn
              key={c.id}
              board={board}
              column={c}
              index={i}
              tasks={byColumn.get(c.id) ?? []}
              onOpenTask={onOpenTask}
              onEditColumn={setEditing}
              onDeleteColumn={setDeleting}
            />
          ))}
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex h-24 w-[300px] shrink-0 items-center justify-center gap-2 rounded-3xl border border-dashed border-stone-300 text-sm font-medium text-stone-500 hover:border-stone-400 hover:bg-stone-100 hover:text-stone-900"
          >
            <Plus className="h-4 w-4" />
            Nova etapa
          </button>
        </div>
        <DragOverlay>{activeTask && <TaskCardView board={board} task={activeTask} overlay />}</DragOverlay>
      </DndContext>

      <ColumnDialog board={board} column={editing} onClose={() => setEditing(null)} />
      <DeleteColumnDialog board={board} column={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}
