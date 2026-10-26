import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Flame,
  LayoutGrid,
  ListTodo,
  Users,
  X,
} from "lucide-react";
import type { Hue } from "@/types/activities";
import { WeeklyChart } from "@/components/charts/WeeklyChart";
import { Popover } from "@/components/ui/overlays";
import { Card, CardHeader, Dot, IconTile, Pill, ProgressBar, Segmented } from "@/components/ui/primitives";
import { cx } from "@/lib/cx";
import { daysUntil, dueLabel } from "@/lib/dates";
import { HUES } from "@/lib/hues";
import { useAppState } from "@/store/StoreProvider";
import { Avatar } from "@/features/activities/TaskBits";
import { boardActivity, byPerson, byStage, flatten, NO_ASSIGNEE, people, personStats, summary, upcoming, weekly } from "./metrics";

type Period = "7" | "30" | "90";
const RANK_HUES: Hue[] = ["amber", "orange", "rose", "blue", "purple", "indigo", "emerald"];

function StatCard({
  label,
  icon: Icon,
  tint,
  value,
  caption,
  bar,
  barHue,
}: {
  label: string;
  icon: typeof ListTodo;
  tint: string;
  value: number | string;
  caption: string;
  bar?: number;
  barHue?: Hue;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-stone-500">{label}</p>
        <Icon className={cx("h-4 w-4", tint)} />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {bar !== undefined && <ProgressBar value={bar} hue={barHue} className="mt-3" />}
      <p className="mt-2 text-xs text-stone-500">{caption}</p>
    </Card>
  );
}

export function DashboardPage() {
  const { boards } = useAppState();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("30");
  const [person, setPerson] = useState<string | null>(null);

  const days = Number(period);
  const since = useMemo(() => Date.now() - days * 86_400_000, [days]);

  const all = useMemo(() => flatten(boards), [boards]);
  const items = useMemo(() => byPerson(all, person), [all, person]);
  const names = useMemo(() => people(all), [all]);

  const s = useMemo(() => summary(items, since), [items, since]);
  const activity = useMemo(() => boardActivity(items, since).slice(0, 6), [items, since]);
  const perPerson = useMemo(() => personStats(all, since), [all, since]);
  const series = useMemo(() => weekly(items, 12), [items]);
  const stages = useMemo(() => byStage(items), [items]);
  const next = useMemo(() => upcoming(items), [items]);
  const maxMoved = Math.max(1, ...activity.map((a) => a.moved));

  return (
    <div className="ds-scroll h-full overflow-y-auto">
      <div className="px-4 pt-2 pb-10 md:px-8 md:pt-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-stone-500">Painel</p>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Visão geral</h1>
            <p className="text-sm text-stone-500">
              {boards.length} quadros · {all.length} atividades · últimos {days} dias
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Popover
              align="right"
              trigger={({ toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                    person ? "bg-stone-900 text-stone-100" : "ring-1 bg-stone-50 ring-stone-200 text-stone-600 hover:text-stone-900",
                  )}
                >
                  <Users className="h-4 w-4" />
                  {person ?? "Todos os responsáveis"}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              )}
            >
              {(close) => (
                <div className="max-h-80 overflow-y-auto">
                  {[null, ...names].map((n) => (
                    <button
                      key={n ?? "__all"}
                      type="button"
                      onClick={() => {
                        setPerson(n);
                        close();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-stone-700 hover:bg-stone-50"
                    >
                      {n ? <Avatar name={n === NO_ASSIGNEE ? "?" : n} /> : <Users className="h-4 w-4 text-stone-500" />}
                      <span className="flex-1">{n ?? "Todos os responsáveis"}</span>
                      {person === n && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              )}
            </Popover>
            <Segmented
              value={period}
              onChange={setPeriod}
              options={[
                { value: "7", label: "7 dias" },
                { value: "30", label: "30 dias" },
                { value: "90", label: "90 dias" },
              ]}
            />
          </div>
        </header>

        {person && (
          <div className="mb-6 flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-2 text-sm font-medium ring-1 ring-stone-200">
              <Avatar name={person === NO_ASSIGNEE ? "?" : person} />
              Mostrando apenas: {person}
              <button type="button" aria-label="Limpar filtro" onClick={() => setPerson(null)} className="rounded-full p-0.5 text-stone-500 hover:bg-stone-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
        )}

        {/* Linha 1: progresso + indicadores */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <article className="flex flex-col justify-between rounded-3xl bg-stone-900 p-6 shadow-deep lg:col-span-4">
            <div>
              <p className="text-sm text-stone-300">{person ? `Progresso de ${person}` : "Progresso geral"}</p>
              <p className="mt-2 text-5xl font-semibold tracking-tight text-white tabular-nums">{s.completion}%</p>
              <p className="mt-1 text-sm text-stone-200">
                {s.done} de {s.total} atividades concluídas
              </p>
            </div>
            <div className="mt-6">
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-stone-700">
                {s.total > 0 &&
                  stages
                    .filter((st) => st.count)
                    .map((st) => <div key={st.name} className={cx("h-full", HUES[st.hue].dot)} style={{ width: `${(st.count / s.total) * 100}%` }} title={`${st.name}: ${st.count}`} />)}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                {stages.map((st) => (
                  <span key={st.name} className="inline-flex items-center gap-1.5 text-xs text-stone-300">
                    <Dot hue={st.hue} />
                    {st.name} <span className="font-semibold text-white tabular-nums">{st.count}</span>
                  </span>
                ))}
              </div>
            </div>
          </article>

          <div className="grid grid-cols-2 gap-4 lg:col-span-8 xl:grid-cols-4">
            <StatCard label="Em aberto" icon={ListTodo} tint="text-blue-600" value={s.open} caption={`${s.dueSoon} vencem em 7 dias`} />
            <StatCard
              label="Atrasadas"
              icon={AlertTriangle}
              tint="text-rose-500"
              value={s.overdue}
              bar={s.open ? (s.overdue / s.open) * 100 : 0}
              barHue="rose"
              caption={`${s.open ? Math.round((s.overdue / s.open) * 100) : 0}% das em aberto`}
            />
            <StatCard
              label="Concluídas"
              icon={CheckCircle2}
              tint="text-emerald-600"
              value={s.doneInPeriod}
              bar={s.total ? (s.done / s.total) * 100 : 0}
              barHue="emerald"
              caption={`nos últimos ${days} dias · ${s.done} no total`}
            />
            <StatCard label="Movimentadas" icon={Activity} tint="text-amber-600" value={s.movedInPeriod} caption={`atividades com movimento em ${days} dias`} />
          </div>
        </div>

        {/* Linha 2: kanbans mais movimentados + ritmo */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="p-6 lg:col-span-7">
            <CardHeader
              title="Kanbans mais movimentados"
              subtitle={`Atividades criadas, movidas, concluídas ou comentadas nos últimos ${days} dias`}
              size="2xl"
              action={<Flame className="m-2 h-5 w-5 text-orange-500" />}
            />
            {activity.length ? (
              <div className="space-y-3">
                {activity.map((a, i) => (
                  <button
                    key={a.board.id}
                    type="button"
                    onClick={() => navigate(`/atividades/${a.board.id}`)}
                    className="flex w-full items-center gap-4 rounded-2xl p-4 text-left ring-1 bg-stone-50 ring-stone-200 transition hover:bg-white hover:shadow-card"
                  >
                    <IconTile icon={LayoutGrid} hue={RANK_HUES[i % RANK_HUES.length]} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <p className="truncate font-medium">{a.board.name}</p>
                        <p className="shrink-0 text-stone-500">{a.open} em aberto</p>
                      </div>
                      <ProgressBar value={(a.moved / maxMoved) * 100} hue={RANK_HUES[i % RANK_HUES.length]} className="mt-2" />
                      <p className="mt-1 text-xs text-stone-500">
                        {a.created} criada{a.created === 1 ? "" : "s"} · {a.completed} concluída{a.completed === 1 ? "" : "s"} · {a.comments} comentário
                        {a.comments === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="w-12 text-right">
                      <p className="text-lg font-semibold tracking-tight tabular-nums">{a.moved}</p>
                      <p className="text-[10px] uppercase tracking-wide text-stone-400">mov.</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-stone-200 px-4 py-10 text-center text-sm text-stone-400">
                Nenhuma movimentação nos últimos {days} dias{person ? ` para ${person}` : ""}.
              </p>
            )}
          </Card>

          <article className="flex flex-col rounded-3xl bg-stone-900 p-6 text-stone-100 shadow-deep lg:col-span-5">
            <div className="mb-4">
              <h2 className="text-xl font-semibold tracking-tight">Ritmo semanal</h2>
              <p className="text-sm text-stone-300">Concluídas vs. criadas · 12 semanas</p>
            </div>
            <div className="min-h-[220px] flex-1 rounded-2xl bg-stone-800/60 p-3">
              <WeeklyChart {...series} />
            </div>
            <div className="mt-3 flex gap-4 text-xs text-stone-300">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Concluídas
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-3 border-t border-dashed border-stone-400" />
                Criadas
              </span>
            </div>
          </article>
        </div>

        {/* Linha 3: por pessoa + prazos */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="overflow-hidden lg:col-span-8">
            <div className="p-6 pb-0">
              <CardHeader title="Por pessoa" subtitle="Clique em uma pessoa para filtrar o painel" action={<Users className="m-2 h-5 w-5 text-stone-500" />} />
            </div>
            <div className="ds-scroll overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-y border-stone-200 text-xs text-stone-500">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Responsável</th>
                    <th className="px-3 py-3 text-right font-medium">Em aberto</th>
                    <th className="px-3 py-3 text-right font-medium">Atrasadas</th>
                    <th className="px-3 py-3 text-right font-medium">Concl. {days}d</th>
                    <th className="px-3 py-3 text-right font-medium">Mov. {days}d</th>
                    <th className="w-40 px-3 py-3 text-left font-medium">Progresso</th>
                    <th className="px-3 py-3 text-right font-medium">Quadros</th>
                    <th className="px-6 py-3 text-right font-medium">Lead time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {perPerson.map((p) => {
                    const selected = person === p.name;
                    return (
                      <tr
                        key={p.name}
                        onClick={() => setPerson(selected ? null : p.name)}
                        className={cx("cursor-pointer transition-colors", selected ? "bg-amber-50" : "hover:bg-stone-50")}
                      >
                        <td className="px-6 py-3">
                          <span className="flex items-center gap-3">
                            <Avatar name={p.name === NO_ASSIGNEE ? "?" : p.name} size={8} />
                            <span className="min-w-0">
                              <span className={cx("block truncate font-medium", p.name === NO_ASSIGNEE && "text-stone-500")}>{p.name}</span>
                              <span className="block text-xs text-stone-500">{p.total} atividades</span>
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-medium tabular-nums">{p.open}</td>
                        <td className={cx("px-3 py-3 text-right tabular-nums", p.overdue ? "font-medium text-rose-600" : "text-stone-400")}>{p.overdue}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{p.doneInPeriod}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{p.movedInPeriod}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <ProgressBar value={p.completion} hue="emerald" className="flex-1" />
                            <span className="w-9 text-right text-xs font-medium text-stone-600 tabular-nums">{p.completion}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{p.boards}</td>
                        <td className="px-6 py-3 text-right text-stone-600 tabular-nums">{p.avgLeadDays === null ? "—" : `${p.avgLeadDays.toFixed(1)} d`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-6 lg:col-span-4">
            <CardHeader title="Próximos prazos" subtitle={person ? `De ${person}` : "Todas as pessoas"} action={<CalendarClock className="m-2 h-5 w-5 text-stone-500" />} />
            <div className="space-y-3">
              {next.map((i) => {
                const n = daysUntil(i.task.dueDate);
                const hue: Hue = n < 0 ? "rose" : n <= 1 ? "orange" : "stone";
                return (
                  <button
                    key={i.task.id}
                    type="button"
                    onClick={() => navigate(`/atividades/${i.board.id}`)}
                    className="flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 bg-stone-50 ring-stone-200 hover:bg-white"
                  >
                    <IconTile icon={n < 0 ? AlertTriangle : CalendarClock} hue={hue} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{i.task.title}</p>
                      <p className="truncate text-xs text-stone-500">
                        {i.board.name}
                        {i.task.assignee && !person ? ` · ${i.task.assignee}` : ""}
                      </p>
                    </div>
                    <Pill hue={hue}>{dueLabel(i.task.dueDate)}</Pill>
                  </button>
                );
              })}
              {!next.length && <p className="text-sm text-stone-500">Nenhuma atividade em aberto com prazo.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
