import { useMemo } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Layers, ListTodo, Tags, Users } from "lucide-react";
import type { Board, Task } from "@/types/activities";
import { Card, CardHeader, Dot, IconTile, Pill, ProgressBar, GradientRing } from "@/components/ui/primitives";
import { cx } from "@/lib/cx";
import { daysUntil, dueLabel } from "@/lib/dates";
import { HUES } from "@/lib/hues";
import { computeStats } from "../stats";
import { Avatar } from "../TaskBits";
import { WeeklyChart } from "@/components/charts/WeeklyChart";

function StatCard({ label, icon: Icon, tint, value, unit, bar, barHue, caption }: {
  label: string; icon: typeof ListTodo; tint: string; value: number | string; unit?: string; bar?: number; barHue?: Parameters<typeof ProgressBar>[0]["hue"]; caption: string;
}) {
  return (
    <Card className="h-44 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-stone-500">{label}</p>
        <Icon className={cx("h-4 w-4", tint)} />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">
        {value}
        {unit && <span className="ml-1 text-base font-medium text-stone-500">{unit}</span>}
      </p>
      {bar !== undefined && <ProgressBar value={bar} hue={barHue} className="mt-3" />}
      <p className="mt-2 text-xs text-stone-500">{caption}</p>
    </Card>
  );
}

export function StatsView({ board, tasks, filtered }: { board: Board; tasks: Task[]; filtered: boolean }) {
  const s = useMemo(() => computeStats(board, tasks), [board, tasks]);
  const maxCol = Math.max(1, ...s.byColumn.map((c) => c.count));

  return (
    <div className="px-4 pb-10 md:px-8">
      {filtered && <p className="mb-4 text-xs font-medium text-stone-500">Estatísticas calculadas sobre as atividades filtradas.</p>}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Coluna esquerda */}
        <section className="space-y-6 lg:col-span-4">
          <article className="relative flex h-80 flex-col justify-between overflow-hidden rounded-3xl bg-stone-900 p-6 shadow-deep">
            <div className="absolute inset-0 bg-gradient-to-tr from-stone-900/70 via-stone-900/10 to-transparent" />
            <div className="relative">
              <p className="text-sm text-stone-300">Progresso do quadro</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">{board.name}</p>
            </div>
            <div className="relative">
              <p className="text-6xl font-semibold tracking-tight text-white tabular-nums">{s.completion}%</p>
              <p className="mt-1 text-sm text-stone-200">{s.done} de {s.total} atividades concluídas</p>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-stone-700">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${s.completion}%` }} />
              </div>
            </div>
          </article>

          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Em aberto" icon={ListTodo} tint="text-blue-600" value={s.open} caption={`${s.createdLast7} criadas em 7 dias`} />
            <StatCard label="Atrasadas" icon={AlertTriangle} tint="text-rose-500" value={s.overdue} bar={s.open ? (s.overdue / s.open) * 100 : 0} barHue="rose" caption={`${s.dueThisWeek} vencem em 7 dias`} />
            <StatCard label="Concluídas" icon={CheckCircle2} tint="text-emerald-600" value={s.completedLast7} unit="7d" bar={s.total ? (s.done / s.total) * 100 : 0} barHue="emerald" caption={`${s.done} no total`} />
            <StatCard label="Lead time" icon={CalendarClock} tint="text-indigo-600" value={s.avgLeadDays === null ? "—" : s.avgLeadDays.toFixed(1)} unit={s.avgLeadDays === null ? undefined : "dias"} caption="Média da criação à conclusão" />
          </div>
        </section>

        {/* Coluna central */}
        <section className="space-y-6 lg:col-span-5">
          <Card className="p-6">
            <CardHeader title="Por etapa" subtitle={`${board.columns.length} etapas`} size="2xl" action={<Layers className="m-2 h-5 w-5 text-stone-500" />} />
            <div className="space-y-3">
              {s.byColumn.map(({ column, count }) => {
                const pct = s.total ? Math.round((count / s.total) * 100) : 0;
                return (
                  <div key={column.id} className="flex items-center gap-4 rounded-2xl p-4 ring-1 bg-stone-50 ring-stone-200">
                    <IconTile icon={column.isDone ? CheckCircle2 : Layers} hue={column.hue} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <p className="truncate font-medium">{column.name}</p>
                        <p className="text-stone-500">{column.isDone ? "Concluído" : "Em andamento"}</p>
                      </div>
                      <ProgressBar value={(count / maxCol) * 100} hue={column.hue} className="mt-2" />
                      <p className="mt-1 text-xs text-stone-500">{count} atividade{count === 1 ? "" : "s"}</p>
                    </div>
                    <p className="w-10 text-right text-sm font-medium tabular-nums">{pct}%</p>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6">
            <CardHeader title="Próximos prazos" subtitle={`${s.upcoming.length} com data definida`} />
            <div className="space-y-3">
              {s.upcoming.map((t) => {
                const n = daysUntil(t.dueDate);
                const hue = n < 0 ? "rose" : n <= 1 ? "orange" : "stone";
                const column = board.columns.find((c) => c.id === t.columnId);
                return (
                  <div key={t.id} className="flex items-center gap-4 rounded-2xl p-4 ring-1 bg-stone-50 ring-stone-200">
                    <IconTile icon={n < 0 ? AlertTriangle : CalendarClock} hue={hue} size={10} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{t.title}</p>
                      <p className="truncate text-sm text-stone-500">{column?.name}{t.assignee ? ` • ${t.assignee}` : ""}</p>
                    </div>
                    <Pill hue={hue}>{dueLabel(t.dueDate)}</Pill>
                  </div>
                );
              })}
              {!s.upcoming.length && <p className="text-sm text-stone-500">Nenhuma atividade em aberto com prazo.</p>}
            </div>
          </Card>
        </section>

        {/* Coluna direita */}
        <section className="space-y-6 lg:col-span-3">
          <article className="h-80 rounded-3xl bg-stone-900 p-6 text-stone-100 shadow-deep">
            <div className="mb-4">
              <h2 className="text-xl font-semibold tracking-tight">Ritmo semanal</h2>
              <p className="text-sm text-stone-300">Concluídas vs. criadas · 8 semanas</p>
            </div>
            <div className="h-44 rounded-2xl bg-stone-800/60 p-3">
              <WeeklyChart {...s.weekly} />
            </div>
          </article>

          <Card className="p-6">
            <CardHeader title="Etiquetas" subtitle="Concluídas / total" action={<Tags className="m-2 h-5 w-5 text-stone-500" />} />
            <div className="space-y-4">
              <GradientRing value={s.completion} label={`${s.completion}%`} caption="concluído" />
              <div className="grid grid-cols-2 gap-3 text-center">
                {s.byTag.map(({ tag, total, done }) => (
                  <div key={tag.id} className={cx("rounded-2xl p-3 ring-1", HUES[tag.hue].surface)}>
                    <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-white/70">
                      <div className={cx("h-full rounded-full", HUES[tag.hue].dot)} style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                    </div>
                    <p className={cx("truncate text-xs font-medium", HUES[tag.hue].pill.split(" ")[0])}>{tag.name}</p>
                    <p className="text-sm font-semibold tabular-nums">{done}/{total}</p>
                  </div>
                ))}
              </div>
              {!s.byTag.length && <p className="text-sm text-stone-500">Sem etiquetas no quadro.</p>}
            </div>
          </Card>

          <Card className="p-6">
            <CardHeader title="Responsáveis" subtitle="Em aberto" size="lg" action={<Users className="m-2 h-4 w-4 text-stone-500" />} />
            <div className="space-y-3">
              {s.byAssignee.map((a) => (
                <div key={a.name} className="flex items-center gap-3">
                  <Avatar name={a.name === "Sem responsável" ? "?" : a.name} size={8} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-stone-500">{a.done} concluída{a.done === 1 ? "" : "s"}</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs text-stone-400"><Dot hue="orange" />{a.open}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
