import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Board, Task } from "@/types/activities";
import { cx } from "@/lib/cx";
import { isOverdue, isTaskDone } from "../filters";
import { Avatar, ChecklistBadge, CommentsBadge, DocCode, DueBadge, PriorityPill, TagPills } from "../TaskBits";

/**
 * Card de atividade = inset tile do design system (rounded-2xl p-4 ring-1 bg-stone-50 ring-stone-200);
 * concluída usa a superfície do "workout row" concluído (bg-emerald-50 ring-emerald-200).
 */
export function TaskCardView({
  board,
  task,
  dragging,
  overlay,
  onOpen,
}: {
  board: Board;
  task: Task;
  dragging?: boolean;
  overlay?: boolean;
  onOpen?: () => void;
}) {
  const done = isTaskDone(board, task);
  const late = isOverdue(board, task);

  return (
    <div
      onClick={onOpen}
      className={cx(
        "group cursor-grab select-none rounded-2xl p-4 ring-1 transition-shadow active:cursor-grabbing",
        done ? "bg-emerald-50 ring-emerald-200" : late ? "bg-stone-50 ring-rose-200" : "bg-stone-50 ring-stone-200",
        "hover:bg-white hover:shadow-card",
        dragging && "opacity-40",
        overlay && "rotate-[2deg] bg-white shadow-deep",
      )}
    >
      <TagPills board={board} task={task} max={3} />
      <p className={cx("text-sm font-medium leading-snug", board.tags.some((t) => task.tagIds.includes(t.id)) && "mt-2", done && "text-stone-500 line-through decoration-stone-300")}>
        {task.title}
      </p>
      <DocCode code={task.docCode} className="mt-1 max-w-full" />
      {task.checklist.length > 0 && !done && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500"
            style={{ width: `${(task.checklist.filter((c) => c.done).length / task.checklist.length) * 100}%` }}
          />
        </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <PriorityPill task={task} />
          <DueBadge board={board} task={task} />
          <ChecklistBadge task={task} />
          <CommentsBadge task={task} />
        </div>
        {task.assignee && <Avatar name={task.assignee} />}
      </div>
    </div>
  );
}

export function SortableTaskCard({ board, task, onOpen }: { board: Board; task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", columnId: task.columnId },
  });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes} {...listeners}>
      <TaskCardView board={board} task={task} dragging={isDragging} onOpen={onOpen} />
    </div>
  );
}
