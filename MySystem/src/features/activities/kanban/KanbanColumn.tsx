import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ArrowLeft, ArrowRight, CheckCircle2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import type { Board, Column, Task } from "@/types/activities";
import { cx } from "@/lib/cx";
import { HUES } from "@/lib/hues";
import { Dot, GhostIconButton } from "@/components/ui/primitives";
import { MenuItem, Popover } from "@/components/ui/overlays";
import { useDispatch } from "@/store/StoreProvider";
import { SortableTaskCard } from "./TaskCard";

/** Coluna = card claro do design system (rounded-3xl, sombra de seis camadas) com os cards como inset tiles. */
export function KanbanColumn({
  board,
  column,
  tasks,
  index,
  onOpenTask,
  onEditColumn,
  onDeleteColumn,
}: {
  board: Board;
  column: Column;
  tasks: Task[];
  index: number;
  onOpenTask: (task: Task) => void;
  onEditColumn: (column: Column) => void;
  onDeleteColumn: (column: Column) => void;
}) {
  const dispatch = useDispatch();
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: "column" } });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  const quickAdd = () => {
    const t = title.trim();
    if (!t) return setAdding(false);
    dispatch({
      type: "task/create",
      boardId: board.id,
      task: { title: t, docCode: "", description: "", columnId: column.id, tagIds: [], priority: "media", assignee: "", dueDate: "", checklist: [], comments: [] },
    });
    setTitle("");
  };

  return (
    <section
      className={cx(
        "flex max-h-full w-[300px] shrink-0 flex-col ring-1 bg-white rounded-3xl shadow-card transition-colors",
        isOver ? "ring-stone-400" : "ring-stone-200",
      )}
    >
      <header className="flex items-center gap-2 px-5 pt-5 pb-3">
        <Dot hue={column.hue} />
        <h3 className="min-w-0 flex-1 truncate font-medium" title={column.name}>
          {column.name}
        </h3>
        {column.isDone && <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Etapa de conclusão" />}
        <span className={cx("rounded-full px-2 py-0.5 text-xs font-medium tabular-nums", HUES[column.hue].pill)}>{tasks.length}</span>
        <Popover
          align="right"
          trigger={({ toggle }) => <GhostIconButton icon={MoreHorizontal} label="Opções da etapa" ring small onClick={toggle} />}
        >
          {(close) => (
            <>
              <MenuItem icon={Pencil} onClick={() => { close(); onEditColumn(column); }}>Editar etapa</MenuItem>
              <MenuItem
                icon={CheckCircle2}
                onClick={() => {
                  close();
                  dispatch({ type: "column/update", boardId: board.id, columnId: column.id, patch: { isDone: !column.isDone } });
                }}
              >
                {column.isDone ? "Desmarcar como conclusão" : "Marcar como conclusão"}
              </MenuItem>
              <MenuItem icon={ArrowLeft} disabled={index === 0} onClick={() => { close(); dispatch({ type: "column/move", boardId: board.id, columnId: column.id, dir: -1 }); }}>
                Mover para a esquerda
              </MenuItem>
              <MenuItem icon={ArrowRight} disabled={index === board.columns.length - 1} onClick={() => { close(); dispatch({ type: "column/move", boardId: board.id, columnId: column.id, dir: 1 }); }}>
                Mover para a direita
              </MenuItem>
              <div className="my-1 h-px bg-stone-200" />
              <MenuItem icon={Trash2} danger onClick={() => { close(); onDeleteColumn(column); }}>Excluir etapa</MenuItem>
            </>
          )}
        </Popover>
      </header>

      <div ref={setNodeRef} className="ds-scroll min-h-[80px] flex-1 space-y-3 overflow-y-auto px-3 pt-1 pb-3">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <SortableTaskCard key={t.id} board={board} task={t} onOpen={() => onOpenTask(t)} />
          ))}
        </SortableContext>
        {tasks.length === 0 && !adding && (
          <div className="flex h-20 items-center justify-center rounded-2xl border border-dashed border-stone-200 text-xs text-stone-400">
            Arraste atividades para cá
          </div>
        )}
      </div>

      <footer className="px-3 pb-3">
        {adding ? (
          <div className="rounded-2xl p-3 ring-1 bg-stone-50 ring-stone-200">
            <textarea
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  quickAdd();
                }
                if (e.key === "Escape") {
                  setTitle("");
                  setAdding(false);
                }
              }}
              onBlur={() => !title.trim() && setAdding(false)}
              placeholder="Título da atividade…"
              rows={2}
              className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-stone-400"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-stone-400">Enter para salvar</span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={quickAdd}
                className="rounded-xl px-3 py-1.5 text-xs font-medium bg-stone-900 text-stone-100 hover:bg-stone-800"
              >
                Adicionar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-stone-500 hover:bg-stone-50 hover:text-stone-900"
          >
            <Plus className="h-4 w-4" />
            Adicionar atividade
          </button>
        )}
      </footer>
    </section>
  );
}
