import type { ReactNode } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { Board, Priority } from "@/types/activities";
import { Popover } from "@/components/ui/overlays";
import { Dot } from "@/components/ui/primitives";
import { cx } from "@/lib/cx";
import { PRIORITIES } from "@/lib/hues";
import { activeFilterCount, assigneesOf, EMPTY_FILTERS, type DueFilter, type Filters } from "./filters";

const DUE_OPTIONS: Array<{ value: DueFilter; label: string }> = [
  { value: "all", label: "Qualquer prazo" },
  { value: "overdue", label: "Atrasadas" },
  { value: "week", label: "Vencem em 7 dias" },
  { value: "none", label: "Sem prazo" },
];

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/** Gatilho no estilo das pílulas do week strip; vira ink quando há seleção. */
function FilterButton({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors",
        count ? "bg-stone-900 text-stone-100" : "ring-1 bg-stone-50 ring-stone-200 text-stone-600 hover:text-stone-900",
      )}
    >
      {label}
      {count > 0 && <span className="rounded-full bg-stone-700 px-1.5 text-[10px] tabular-nums">{count}</span>}
      <ChevronDown className="h-3.5 w-3.5" />
    </button>
  );
}

function Option({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-stone-700 hover:bg-stone-50"
    >
      <span className={cx("flex h-4 w-4 shrink-0 items-center justify-center rounded", on ? "bg-stone-900 text-white" : "ring-1 ring-stone-300")}>
        {on && <Check className="h-3 w-3" />}
      </span>
      {children}
    </button>
  );
}

export function FilterBar({ board, filters, onChange }: { board: Board; filters: Filters; onChange: (f: Filters) => void }) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const assignees = assigneesOf(board);
  const count = activeFilterCount(filters);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative min-w-[200px] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Buscar atividades…"
          className="w-full rounded-xl py-2 pl-9 pr-3 text-sm ring-1 bg-stone-50 ring-stone-200 placeholder:text-stone-400 outline-none focus:bg-white focus:ring-2 focus:ring-stone-900"
        />
      </label>

      <Popover trigger={({ toggle: t }) => <FilterButton label="Etiquetas" count={filters.tagIds.length} onClick={t} />}>
        {() => (
          <div className="max-h-72 overflow-y-auto">
            {board.tags.map((tag) => (
              <Option key={tag.id} on={filters.tagIds.includes(tag.id)} onClick={() => set({ tagIds: toggle(filters.tagIds, tag.id) })}>
                <Dot hue={tag.hue} />
                {tag.name}
              </Option>
            ))}
            {!board.tags.length && <p className="px-3 py-2 text-sm text-stone-500">Sem etiquetas.</p>}
          </div>
        )}
      </Popover>

      <Popover trigger={({ toggle: t }) => <FilterButton label="Etapas" count={filters.columnIds.length} onClick={t} />}>
        {() =>
          board.columns.map((c) => (
            <Option key={c.id} on={filters.columnIds.includes(c.id)} onClick={() => set({ columnIds: toggle(filters.columnIds, c.id) })}>
              <Dot hue={c.hue} />
              {c.name}
            </Option>
          ))
        }
      </Popover>

      <Popover trigger={({ toggle: t }) => <FilterButton label="Prioridade" count={filters.priorities.length} onClick={t} />}>
        {() =>
          (Object.keys(PRIORITIES) as Priority[]).map((p) => (
            <Option key={p} on={filters.priorities.includes(p)} onClick={() => set({ priorities: toggle(filters.priorities, p) })}>
              <Dot hue={PRIORITIES[p].hue} />
              {PRIORITIES[p].label}
            </Option>
          ))
        }
      </Popover>

      <Popover trigger={({ toggle: t }) => <FilterButton label="Responsável" count={filters.assignees.length} onClick={t} />}>
        {() => (
          <>
            {assignees.map((a) => (
              <Option key={a} on={filters.assignees.includes(a)} onClick={() => set({ assignees: toggle(filters.assignees, a) })}>
                {a}
              </Option>
            ))}
            <Option on={filters.assignees.includes("")} onClick={() => set({ assignees: toggle(filters.assignees, "") })}>
              <span className="text-stone-500">Sem responsável</span>
            </Option>
          </>
        )}
      </Popover>

      <Popover trigger={({ toggle: t }) => <FilterButton label={filters.due === "all" ? "Prazo" : DUE_OPTIONS.find((o) => o.value === filters.due)!.label} count={filters.due === "all" ? 0 : 1} onClick={t} />}>
        {(close) =>
          DUE_OPTIONS.map((o) => (
            <Option key={o.value} on={filters.due === o.value} onClick={() => { set({ due: o.value }); close(); }}>
              {o.label}
            </Option>
          ))
        }
      </Popover>

      {count > 0 && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900"
        >
          <X className="h-3.5 w-3.5" />
          Limpar ({count})
        </button>
      )}
    </div>
  );
}
