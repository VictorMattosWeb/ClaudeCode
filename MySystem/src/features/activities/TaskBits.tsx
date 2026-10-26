import { CalendarDays, FileText, ListChecks, MessageSquare } from "lucide-react";
import type { Board, Task } from "@/types/activities";
import { Pill } from "@/components/ui/primitives";
import { cx } from "@/lib/cx";
import { daysUntil, dueLabel, formatShort } from "@/lib/dates";
import { PRIORITIES } from "@/lib/hues";
import { isTaskDone } from "./filters";

export function TagPills({ board, task, max }: { board: Board; task: Task; max?: number }) {
  const tags = board.tags.filter((t) => task.tagIds.includes(t.id));
  const shown = max ? tags.slice(0, max) : tags;
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((t) => (
        <Pill key={t.id} hue={t.hue} className="!px-2 !py-0.5">
          {t.name}
        </Pill>
      ))}
      {max && tags.length > max && <Pill hue="stone" className="!px-2 !py-0.5">+{tags.length - max}</Pill>}
    </div>
  );
}

export function PriorityPill({ task }: { task: Task }) {
  const p = PRIORITIES[task.priority];
  return <Pill hue={p.hue} className="!px-2 !py-0.5">{p.label}</Pill>;
}

/** Avatar de iniciais no lugar das fotos do design system (h-6 w-6 rounded-full, ring-2 ring-white no empilhamento). */
export function Avatar({ name, size = 6, light, className }: { name: string; size?: 6 | 8; light?: boolean; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <span
      title={name}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        light ? "bg-stone-100 text-stone-900" : "bg-stone-900 text-stone-100",
        size === 6 ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs",
        className,
      )}
    >
      {initials || "?"}
    </span>
  );
}

/** Prazo: stone quando no prazo, orange para hoje/amanhã, rose quando atrasada; some quando concluída. */
export function DueBadge({ board, task }: { board: Board; task: Task }) {
  if (!task.dueDate) return null;
  const done = isTaskDone(board, task);
  const n = daysUntil(task.dueDate);
  const tone = done ? "text-stone-400" : n < 0 ? "text-rose-600" : n <= 1 ? "text-orange-600" : "text-stone-500";
  return (
    <span className={cx("inline-flex items-center gap-1 text-xs font-medium", tone)}>
      <CalendarDays className="h-3.5 w-3.5" />
      {done ? formatShort(task.dueDate) : dueLabel(task.dueDate)}
    </span>
  );
}

export function ChecklistBadge({ task }: { task: Task }) {
  if (!task.checklist.length) return null;
  const done = task.checklist.filter((c) => c.done).length;
  const all = done === task.checklist.length;
  return (
    <span className={cx("inline-flex items-center gap-1 text-xs font-medium tabular-nums", all ? "text-emerald-700" : "text-stone-500")}>
      <ListChecks className="h-3.5 w-3.5" />
      {done}/{task.checklist.length}
    </span>
  );
}

export function CommentsBadge({ task }: { task: Task }) {
  if (!task.comments.length) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium tabular-nums text-stone-500">
      <MessageSquare className="h-3.5 w-3.5" />
      {task.comments.length}
    </span>
  );
}

/** Código do documento em mono, como referência técnica. */
export function DocCode({ code, className }: { code: string; className?: string }) {
  if (!code) return null;
  return (
    <span className={cx("inline-flex min-w-0 items-center gap-1 font-mono text-[11px] text-stone-500", className)} title={code}>
      <FileText className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{code}</span>
    </span>
  );
}
