import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useTasks } from "@/context/TaskContext";
import { TaskSubtask } from "@/types/task";
import { supabase } from "@/services/adapters/supabase/client";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  taskId: string;
}

interface RowProps {
  item: TaskSubtask;
  onToggle: (id: string, v: boolean) => void;
  onDelete: (id: string) => void;
}

function SubtaskRow({ item, onToggle, onDelete }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 group rounded-md px-2 py-1.5 hover:bg-muted/40 bg-background"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Reordenar item"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Checkbox
        checked={item.concluido}
        onCheckedChange={(v) => onToggle(item.id, !!v)}
      />
      <span
        className={cn(
          "text-sm flex-1",
          item.concluido && "line-through text-muted-foreground",
        )}
      >
        {item.titulo}
      </span>
      <Button
        size="icon"
        variant="ghost"
        className="opacity-0 group-hover:opacity-100"
        onClick={() => onDelete(item.id)}
      >
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );
}

export function SubtaskList({ taskId }: Props) {
  const { fetchSubtasks, addSubtask, toggleSubtask, deleteSubtask, updateSubtask } =
    useTasks();
  const [items, setItems] = useState<TaskSubtask[]>([]);
  const [novo, setNovo] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = () => fetchSubtasks(taskId).then(setItems);

  useEffect(() => {
    reload();
    const ch = supabase
      .channel(`task-subtasks-${taskId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_subtasks", filter: `task_id=eq.${taskId}` },
        () => reload(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const handleAdd = async () => {
    if (!novo.trim() || busy) return;
    setBusy(true);
    try {
      await addSubtask(taskId, novo);
      setNovo("");
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (id: string, v: boolean) => {
    // Otimista
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, concluido: v } : it)));
    await toggleSubtask(id, v);
    reload();
  };

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    await deleteSubtask(id);
    reload();
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered); // optimistic

    // Persist new positions for affected items
    await Promise.all(
      reordered.map((it, idx) =>
        it.posicao === idx ? Promise.resolve() : updateSubtask(it.id, { posicao: idx }),
      ),
    );
  };

  const total = items.length;
  const done = items.filter((s) => s.concluido).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-3">
      {total > 0 && (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progresso do checklist</span>
            <span className="font-semibold">
              {done}/{total} ({pct}%)
            </span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
      )}

      <div className="space-y-1 max-h-64 overflow-y-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {items.map((s) => (
              <SubtaskRow key={s.id} item={s} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </SortableContext>
        </DndContext>
        {total === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhum item no checklist
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          placeholder="Adicionar item ao checklist..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button onClick={handleAdd} disabled={!novo.trim() || busy}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
