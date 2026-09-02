import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Task,
  TaskBoard,
  TASK_STATUS_LABEL,
  TASK_STATUS_ORDER,
  TASK_PRIORITY_LABEL,
  taskModuloLabel,
  getTaskAssignees,
} from "@/types/task";
import { computeBoardStats, averageLeadTimeDays, groupTasksByBoard } from "@/lib/stats";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9", "#ec4899"];

interface Props {
  tasks: Task[];
  users: Map<string, string>;
  boards?: TaskBoard[];
  showByUser?: boolean;
}

export function TaskStatsPanel({ tasks, users, boards = [], showByUser = true }: Props) {
  const [mode, setMode] = useState<"geral" | "quadros">("geral");

  const byStatus = useMemo(() => {
    const m = new Map<string, number>();
    tasks.forEach((t) => m.set(TASK_STATUS_LABEL[t.status], (m.get(TASK_STATUS_LABEL[t.status]) ?? 0) + 1));
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [tasks]);

  const byPriority = useMemo(() => {
    const m = new Map<string, number>();
    tasks.forEach((t) => m.set(TASK_PRIORITY_LABEL[t.prioridade], (m.get(TASK_PRIORITY_LABEL[t.prioridade]) ?? 0) + 1));
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [tasks]);

  const byModulo = useMemo(() => {
    const m = new Map<string, number>();
    tasks.forEach((t) => m.set(taskModuloLabel(t.modulo_relacionado), (m.get(taskModuloLabel(t.modulo_relacionado)) ?? 0) + 1));
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [tasks]);

  const byResponsavel = useMemo(() => {
    const m = new Map<string, { total: number; concluidas: number }>();
    tasks.forEach((t) => {
      const ids = getTaskAssignees(t);
      const targets = ids.length === 0 ? ["Sem responsável"] : ids.map((id) => users.get(id) ?? "Sem responsável");
      targets.forEach((key) => {
        const cur = m.get(key) ?? { total: 0, concluidas: 0 };
        cur.total++;
        if (t.status === "concluido") cur.concluidas++;
        m.set(key, cur);
      });
    });
    return [...m.entries()].map(([name, v]) => ({ name, total: v.total, concluidas: v.concluidas }));
  }, [tasks, users]);

  const tempoMedio = useMemo(() => averageLeadTimeDays(tasks) ?? 0, [tasks]);

  const perBoard = useMemo(() => {
    const grouped = groupTasksByBoard(tasks);
    const rows: { id: string | null; nome: string; cor: string; stats: ReturnType<typeof computeBoardStats> }[] = [];
    for (const b of boards) {
      const ts = grouped.get(b.id) ?? [];
      rows.push({ id: b.id, nome: b.nome, cor: b.cor, stats: computeBoardStats(ts) });
    }
    const semQuadro = grouped.get(null) ?? [];
    if (semQuadro.length > 0) {
      rows.push({ id: null, nome: "Sem quadro", cor: "#94a3b8", stats: computeBoardStats(semQuadro) });
    }
    return rows;
  }, [tasks, boards]);

  return (
    <div className="space-y-4">
      {boards.length > 0 && (
        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList>
            <TabsTrigger value="geral">Visão geral</TabsTrigger>
            <TabsTrigger value="quadros">Por quadro</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {mode === "geral" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Por status</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={80} label>
                    {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Por prioridade</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byPriority}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Por módulo</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byModulo}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          {showByUser && (
            <Card>
              <CardHeader>
                <CardTitle>Ranking por responsável</CardTitle>
                <p className="text-xs text-muted-foreground">Tempo médio de conclusão: {tempoMedio} dia(s)</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={byResponsavel} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" name="Total" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="concluidas" name="Concluídas" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {mode === "quadros" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {perBoard.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full text-center py-8">
              Nenhum quadro com tarefas para exibir.
            </p>
          )}
          {perBoard.map((row) => (
            <Card key={row.id ?? "none"} className="hover-lift">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: row.cor }}
                    />
                    <CardTitle className="text-base truncate">{row.nome}</CardTitle>
                  </div>
                  <Badge variant="secondary">{row.stats.total} tarefa(s)</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Conclusão</span>
                    <span className="font-semibold">
                      {row.stats.concluidas}/{row.stats.total} ({row.stats.taxa}%)
                    </span>
                  </div>
                  <Progress value={row.stats.taxa} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {TASK_STATUS_ORDER.map((s) => (
                    <div
                      key={s}
                      className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1"
                    >
                      <span className="text-muted-foreground truncate">{TASK_STATUS_LABEL[s]}</span>
                      <span className="font-semibold tabular-nums">{row.stats.byStatus[s] ?? 0}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 text-xs pt-1">
                  <Badge variant="outline" className="border-destructive/40 text-destructive">
                    {row.stats.vencidas} vencida(s)
                  </Badge>
                  <Badge variant="outline">
                    Lead time:{" "}
                    {(() => {
                      const grouped = groupTasksByBoard(tasks).get(row.id) ?? [];
                      const lt = averageLeadTimeDays(grouped);
                      return lt === null ? "—" : `${lt}d`;
                    })()}
                  </Badge>
                  {row.stats.proximoPrazo && (
                    <Badge variant="outline">
                      Próx. prazo: {row.stats.proximoPrazo.split("-").reverse().join("/")}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
