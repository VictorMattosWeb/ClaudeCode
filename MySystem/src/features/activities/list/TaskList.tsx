import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Inbox } from "lucide-react";
import type { Board, Task } from "@/types/activities";
import { Card, Dot } from "@/components/ui/primitives";
import { cx } from "@/lib/cx";
import { PRIORITIES } from "@/lib/hues";
import { useDispatch } from "@/store/StoreProvider";
import { isOverdue, isTaskDone } from "../filters";
import { Avatar, ChecklistBadge, CommentsBadge, DocCode, DueBadge, PriorityPill, TagPills } from "../TaskBits";

type SortKey = "title" | "column" | "priority" | "assignee" | "dueDate" | "createdAt";

/** Visão em lista: card claro com linhas no padrão "workout row" e cabeçalhos ordenáveis. */
export function TaskList({ board, tasks, onOpenTask }: { board: Board; tasks: Task[]; onOpenTask: (t: Task) => void }) {
  const dispatch = useDispatch();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "column", dir: 1 });
  const doneColumn = board.columns.find((c) => c.isDone);
  const firstOpenColumn = board.columns.find((c) => !c.isDone);

  const sorted = useMemo(() => {
    const colIndex = new Map(board.columns.map((c, i) => [c.id, i]));
    const cmp = (a: Task, b: Task): number => {
      switch (sort.key) {
        case "title":
          return a.title.localeCompare(b.title, "pt-BR");
        case "column":
          return (colIndex.get(a.columnId) ?? 0) - (colIndex.get(b.columnId) ?? 0);
        case "priority":
          return PRIORITIES[a.priority].rank - PRIORITIES[b.priority].rank;
        case "assignee":
          return (a.assignee || "~").localeCompare(b.assignee || "~", "pt-BR");
        case "dueDate":
          // Sem prazo sempre no fim.
          if (!a.dueDate || !b.dueDate) return a.dueDate ? -1 : b.dueDate ? 1 : 0;
          return a.dueDate.localeCompare(b.dueDate);
        case "createdAt":
          return a.createdAt.localeCompare(b.createdAt);
      }
    };
    return [...tasks].sort((a, b) => cmp(a, b) * sort.dir);
  }, [tasks, sort, board.columns]);

  const header = (key: SortKey, label: string, className?: string) => {
    const on = sort.key === key;
    const Icon = on ? (sort.dir === 1 ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <th className={cx("px-3 py-3 text-left font-medium", className)}>
        <button
          type="button"
          onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}
          className={cx("inline-flex items-center gap-1 rounded-lg hover:text-stone-900", on && "text-stone-900")}
        >
          {label}
          <Icon className="h-3.5 w-3.5" />
        </button>
      </th>
    );
  };

  const toggleDone = (t: Task) => {
    const done = isTaskDone(board, t);
    const to = done ? firstOpenColumn : doneColumn;
    if (to) dispatch({ type: "task/move", boardId: board.id, taskId: t.id, toColumnId: to.id, overTaskId: null });
  };

  if (!tasks.length) {
    return (
      <div className="px-4 md:px-8">
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-200 text-stone-600">
            <Inbox className="h-5 w-5" />
          </div>
          <p className="font-medium">Nenhuma atividade encontrada</p>
          <p className="text-sm text-stone-500">Ajuste os filtros ou crie uma nova atividade.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 pb-8 md:px-8">
      <Card className="overflow-hidden">
        <div className="ds-scroll overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-stone-200 text-xs text-stone-500">
              <tr>
                <th className="w-12 py-3 pl-5" aria-label="Concluir" />
                {header("title", "Atividade")}
                {header("column", "Etapa")}
                {header("priority", "Prioridade")}
                {header("assignee", "Responsável")}
                {header("dueDate", "Prazo")}
                <th className="px-3 py-3 pr-5 text-left font-medium">Checklist · Coment.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {sorted.map((t) => {
                const column = board.columns.find((c) => c.id === t.columnId);
                const done = isTaskDone(board, t);
                const late = isOverdue(board, t);
                return (
                  <tr
                    key={t.id}
                    onClick={() => onOpenTask(t)}
                    className={cx("cursor-pointer transition-colors", done ? "bg-emerald-50/60 hover:bg-emerald-50" : "hover:bg-stone-50")}
                  >
                    <td className="py-3 pl-5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        aria-label={done ? "Reabrir atividade" : "Concluir atividade"}
                        title={done ? "Reabrir" : doneColumn ? `Mover para ${doneColumn.name}` : "Defina uma etapa de conclusão"}
                        disabled={!doneColumn}
                        onClick={() => toggleDone(t)}
                        className={cx(
                          "flex h-6 w-6 items-center justify-center rounded-lg transition disabled:opacity-40",
                          done ? "bg-emerald-500 text-white" : "ring-1 ring-stone-300 bg-white text-transparent hover:text-stone-400",
                        )}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="max-w-[360px] px-3 py-3">
                      <p className={cx("truncate font-medium", done && "text-stone-500 line-through decoration-stone-300")}>{t.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <DocCode code={t.docCode} />
                        <TagPills board={board} task={t} />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {column && (
                        <span className="inline-flex items-center gap-2 whitespace-nowrap text-stone-600">
                          <Dot hue={column.hue} />
                          {column.name}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3"><PriorityPill task={t} /></td>
                    <td className="px-3 py-3">
                      {t.assignee ? (
                        <span className="inline-flex items-center gap-2 whitespace-nowrap">
                          <Avatar name={t.assignee} />
                          {t.assignee}
                        </span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className={cx("px-3 py-3 whitespace-nowrap", late && "font-medium")}>
                      {t.dueDate ? <DueBadge board={board} task={t} /> : <span className="text-stone-400">—</span>}
                    </td>
                    <td className="px-3 py-3 pr-5">
                      {t.checklist.length || t.comments.length ? (
                        <span className="inline-flex items-center gap-3">
                          <ChecklistBadge task={t} />
                          <CommentsBadge task={t} />
                        </span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-stone-200 px-5 py-3 text-xs text-stone-500">
          {tasks.length} atividade{tasks.length > 1 ? "s" : ""}
        </div>
      </Card>
    </div>
  );
}
