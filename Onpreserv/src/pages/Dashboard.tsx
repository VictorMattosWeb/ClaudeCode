import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Package, ClipboardList, CalendarRange, Inbox,
  CheckCircle2, Clock, AlertTriangle, MinusCircle, TrendingUp, AlertCircle, Timer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area,
} from "recharts";
import { useAuth } from "@/context/AuthContext";
import { useCronograma } from "@/context/CronogramaContext";
import { useLots } from "@/context/LotContext";
import { usePendingRequestsCount } from "@/hooks/usePendingRequestsCount";
import { ItemCalculado, SITUACAO_LABEL } from "@/types/cronograma";
import { computeCronogramaStats as calcularStats } from "@/lib/stats";
import { DashboardFilters, DashFilterState, initialDashFilters } from "@/components/DashboardFilters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TasksDashboardSection } from "@/components/tasks/TasksDashboardSection";
import { HudPanel } from "@/components/dashboard/HudPanel";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { MetricStrip, type StripMetric } from "@/components/dashboard/MetricStrip";
import { AlertBar, type DashboardAlert } from "@/components/dashboard/AlertBar";
import { CHART_COLORS, GRID_PROPS, AXIS_PROPS, TOOLTIP_PROPS, LEGEND_PROPS } from "@/components/dashboard/chartTheme";
import {
  computeMedicaoPeriodo as computeMedicaoPeriodoLib,
  lotesNoPeriodo as lotesNoPeriodoLib,
  lotesPreservadosNoPeriodo as lotesPreservadosNoPeriodoLib,
} from "@/lib/medicaoLotes";

const COLORS = {
  primary: CHART_COLORS.primary,
  success: CHART_COLORS.success,
  warning: CHART_COLORS.warning,
  destructive: CHART_COLORS.destructive,
  muted: CHART_COLORS.muted,
  info: CHART_COLORS.info,
};

const fmtPct = (n: number) => `${n.toFixed(1)}%`;
const diffDays = (a: string, b: string) =>
  Math.round((new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24));

export default function Dashboard() {
  const { canAccess, profile, isAdmin } = useAuth();
  const { medicoes, itensCalculados, loading: loadingCron } = useCronograma();
  const { lots, loading: loadingLots } = useLots();
  const pendingRequests = usePendingRequestsCount();

  const [filters, setFilters] = useState<DashFilterState>(initialDashFilters);

  useEffect(() => { document.title = "Dashboard | onPreserv"; }, []);

  const canCron = canAccess("cronograma");
  const canLotes = canAccess("lotes");
  const canTarefas = canAccess("tarefas");

  // Filter options derived from cronograma data
  const semanas = useMemo(() => Array.from(new Set(itensCalculados.map(i => i.semana).filter(Boolean))).sort(), [itensCalculados]);
  const unidades = useMemo(() => Array.from(new Set(itensCalculados.map(i => i.unidade).filter(Boolean))).sort(), [itensCalculados]);
  const gabinetes = useMemo(() => Array.from(new Set(itensCalculados.map(i => i.gabinete).filter(Boolean))).sort(), [itensCalculados]);
  const tipos = useMemo(() => Array.from(new Set(itensCalculados.map(i => i.tipo).filter(Boolean))).sort(), [itensCalculados]);
  const statuses = useMemo(() => Array.from(new Set(itensCalculados.map(i => i.status).filter(Boolean))).sort(), [itensCalculados]);

  // Apply filters
  const filtrados = useMemo<ItemCalculado[]>(() => {
    return itensCalculados.filter((i) => {
      if (filters.medicao !== "todos" && i.medicaoId !== filters.medicao) return false;
      if (filters.semana !== "todos" && i.semana !== filters.semana) return false;
      if (filters.unidade !== "todos" && i.unidade !== filters.unidade) return false;
      if (filters.gabinete !== "todos" && i.gabinete !== filters.gabinete) return false;
      if (filters.tipo !== "todos" && i.tipo !== filters.tipo) return false;
      if (filters.status !== "todos" && i.status !== filters.status) return false;
      if (filters.situacao !== "todos" && i.situacao !== filters.situacao) return false;
      if (filters.de && i.dataPrevista && i.dataPrevista < filters.de) return false;
      if (filters.ate && i.dataPrevista && i.dataPrevista > filters.ate) return false;
      return true;
    });
  }, [itensCalculados, filters]);

  const stats = useMemo(() => calcularStats(filtrados), [filtrados]);

  // Aggregations
  const statusPie = useMemo(() => [
    { name: "Preservado", value: stats.preservados, color: COLORS.success },
    { name: "Pendente", value: stats.pendentes, color: COLORS.muted },
    { name: "Vencido", value: stats.vencidos, color: COLORS.destructive },
    { name: "N/A", value: stats.naoAplicavel, color: COLORS.info },
  ].filter(d => d.value > 0), [stats]);

  const prazoPie = useMemo(() => [
    { name: "No prazo", value: stats.noPrazo, color: COLORS.success },
    { name: "Divergência", value: stats.divergencias, color: COLORS.warning },
    { name: "Pendente", value: stats.pendentes, color: COLORS.muted },
    { name: "Vencido", value: stats.vencidos, color: COLORS.destructive },
  ].filter(d => d.value > 0), [stats]);

  const groupBy = (items: ItemCalculado[], key: (i: ItemCalculado) => string) => {
    const map = new Map<string, { name: string; planejado: number; preservado: number; pendente: number; vencido: number }>();
    items.forEach((i) => {
      const k = key(i) || "—";
      const r = map.get(k) ?? { name: k, planejado: 0, preservado: 0, pendente: 0, vencido: 0 };
      r.planejado += 1;
      if (i.situacao === "no_prazo" || i.situacao === "divergencia") r.preservado += 1;
      else if (i.situacao === "pendente") r.pendente += 1;
      else if (i.situacao === "vencido") r.vencido += 1;
      map.set(k, r);
    });
    return Array.from(map.values());
  };

  const porMedicao = useMemo(() => {
    const map = new Map(medicoes.map(m => [m.id, m.nome]));
    return groupBy(filtrados, (i) => map.get(i.medicaoId) ?? "—");
  }, [filtrados, medicoes]);

  const porSemana = useMemo(() => groupBy(filtrados, i => i.semana).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })), [filtrados]);
  const porUnidade = useMemo(() => groupBy(filtrados, i => i.unidade).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })), [filtrados]);
  const porTipo = useMemo(() => groupBy(filtrados, i => i.tipo).sort((a, b) => a.name.localeCompare(b.name)), [filtrados]);

  // Boca de jacaré: curvas cumulativas Previsto vs Realizado ao longo do tempo
  const bocaJacare = useMemo(() => {
    const datas = new Set<string>();
    filtrados.forEach((i) => {
      if (i.dataPrevista) datas.add(i.dataPrevista);
      if (i.dataRealizada) datas.add(i.dataRealizada);
    });
    const eixo = Array.from(datas).sort();
    return eixo.map((d) => ({
      data: d,
      previsto: filtrados.filter((i) => i.dataPrevista && i.dataPrevista <= d).length,
      realizado: filtrados.filter((i) => i.dataRealizada && i.dataRealizada <= d).length,
    }));
  }, [filtrados]);

  // Boca de jacaré acumulada por semana
  const bocaJacarePorSemana = useMemo(() => {
    const semanasOrdenadas = Array.from(new Set(filtrados.map(i => i.semana).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    let accPrev = 0, accReal = 0;
    return semanasOrdenadas.map((s) => {
      const itens = filtrados.filter(i => i.semana === s);
      accPrev += itens.filter(i => i.dataPrevista).length;
      accReal += itens.filter(i => i.dataRealizada).length;
      return { name: s, previsto: accPrev, realizado: accReal };
    });
  }, [filtrados]);

  // Tables
  const today = new Date().toISOString().slice(0, 10);
  const proximas = useMemo(() => filtrados
    .filter(i => !i.dataRealizada && i.dataPrevista && i.dataPrevista >= today && i.situacao !== "nao_aplicavel")
    .sort((a, b) => (a.dataPrevista ?? "").localeCompare(b.dataPrevista ?? ""))
    .slice(0, 8), [filtrados, today]);

  const vencidos = useMemo(() => filtrados
    .filter(i => i.situacao === "vencido" && i.dataPrevista)
    .map(i => ({ ...i, atrasoDias: diffDays(today, i.dataPrevista!) }))
    .sort((a, b) => b.atrasoDias - a.atrasoDias)
    .slice(0, 8), [filtrados, today]);

  const maioresAtrasos = useMemo(() => filtrados
    .filter(i => i.situacao === "divergencia" && i.desvioDias !== null)
    .sort((a, b) => (b.desvioDias ?? 0) - (a.desvioDias ?? 0))
    .slice(0, 8), [filtrados]);

  const totalPreservacoes = useMemo(() => lots.reduce((acc, l) => acc + l.preservations.length, 0), [lots]);
  // Período da medição selecionada — DISJUNTO entre medições (ver lib/medicaoLotes).
  const medicaoPeriodo = useMemo(() => {
    if (filters.medicao === "todos") return null;
    const atual = medicoes.find(m => m.id === filters.medicao);
    if (!atual) return null;
    // Tenta o cálculo padrão (baseado em dataReferencia)
    const p = computeMedicaoPeriodoLib(filters.medicao, medicoes.map(m => ({ id: m.id, dataReferencia: m.dataReferencia })));
    if (p) return p;
    // Fallback: medição sem dataReferencia — usa min..max dos itens
    const datas: string[] = [];
    itensCalculados.filter(i => i.medicaoId === atual.id).forEach(i => {
      if (i.dataPrevista) datas.push(i.dataPrevista);
      if (i.dataRealizada) datas.push(i.dataRealizada);
    });
    if (datas.length === 0) return null;
    datas.sort();
    return { inicio: datas[0], fim: datas[datas.length - 1] };
  }, [filters.medicao, itensCalculados, medicoes]);

  const medicaoNome = useMemo(
    () => filters.medicao === "todos" ? null : (medicoes.find(m => m.id === filters.medicao)?.nome ?? null),
    [filters.medicao, medicoes],
  );

  const lotesNoPeriodo = useMemo(() => {
    if (!medicaoPeriodo) return [];
    return lotesNoPeriodoLib(lots, medicaoPeriodo);
  }, [lots, medicaoPeriodo]);

  // Lotes DISTINTOS preservados no período (não eventos), limitado aos lotes cadastrados no período.
  // Invariante garantido por testes: nunca ultrapassa lotesNoPeriodo.length.
  const lotesPreservadosNoPeriodo = useMemo(() => {
    if (!medicaoPeriodo) return 0;
    return lotesPreservadosNoPeriodoLib(lots, medicaoPeriodo);
  }, [lots, medicaoPeriodo]);

  const loading = loadingCron || loadingLots;

  // --- Alertas: só entram na tela quando exigem ação hoje. -------------------
  const alerts = useMemo<DashboardAlert[]>(() => {
    const out: DashboardAlert[] = [];
    if (canCron && stats.vencidos > 0) {
      out.push({
        id: "vencidos",
        severity: "critical",
        icon: "overdue",
        message: `${stats.vencidos} ${stats.vencidos === 1 ? "item vencido exige" : "itens vencidos exigem"} baixa no cronograma`,
        to: "/cronograma",
      });
    }
    if (pendingRequests > 0) {
      out.push({
        id: "solicitacoes",
        severity: "warning",
        icon: "requests",
        message: `${pendingRequests} ${pendingRequests === 1 ? "solicitação aguarda" : "solicitações aguardam"} aprovação`,
        to: "/solicitacoes",
      });
    }
    const previstasHoje = proximas.filter((i) => i.dataPrevista === today).length;
    if (canCron && previstasHoje > 0) {
      out.push({
        id: "hoje",
        severity: "warning",
        icon: "pending",
        message: `${previstasHoje} ${previstasHoje === 1 ? "preservação prevista" : "preservações previstas"} para hoje`,
        to: "/cronograma",
      });
    }
    return out;
  }, [canCron, stats.vencidos, pendingRequests, proximas, today]);

  // --- Métricas secundárias: contexto, não decisão. --------------------------
  const stripMetrics = useMemo<StripMetric[]>(() => {
    const out: StripMetric[] = [];
    if (canCron) {
      out.push({ label: "Itens cronograma", value: stats.total });
      out.push({ label: "No prazo", value: stats.noPrazo, tone: "success" });
      out.push({ label: "Divergências", value: stats.divergencias, tone: "warning" });
      out.push({ label: "Não aplicável", value: stats.naoAplicavel, tone: "info" });
      out.push({ label: "Desvio médio", value: `${stats.mediaDivergenciaDias.toFixed(1)}d` });
    }
    if (canLotes) out.push({ label: "Preservações", value: totalPreservacoes, tone: "success" });
    out.push({ label: "Solicitações", value: pendingRequests, tone: pendingRequests > 0 ? "warning" : "neutral" });
    return out;
  }, [canCron, canLotes, stats, totalPreservacoes, pendingRequests]);

  const medicaoAtual = filters.medicao === "todos"
    ? "Todas as medições"
    : medicoes.find((m) => m.id === filters.medicao)?.nome ?? "—";

  return (
    <div className="min-h-full">
      {/* ===================== Cabeçalho ===================== */}
      <div className="border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-card text-primary">
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-semibold uppercase tracking-wide">Dashboard</h1>
              <p className="font-hud truncate text-[10px] uppercase text-muted-foreground">
                {medicaoAtual}
                {profile?.nome ? ` · ${profile.nome}` : ""}
              </p>
            </div>
          </div>

          {canCron && medicoes.length > 0 && (
            <div className="flex items-center gap-2 sm:w-72">
              <span className="font-hud whitespace-nowrap text-[9px] uppercase text-muted-foreground">
                Medição
              </span>
              <Select value={filters.medicao} onValueChange={(v) => setFilters({ ...filters, medicao: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as medições</SelectItem>
                  {medicoes.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <main className="container mx-auto space-y-8 px-3 py-6 sm:px-4">
        {/* ===================== Alertas ===================== */}
        {!loading && <AlertBar alerts={alerts} />}

        {/* ===================== Filtros ===================== */}
        {canCron && (
          <DashboardFilters
            value={filters}
            onChange={setFilters}
            medicoes={medicoes.map((m) => ({ id: m.id, nome: m.nome }))}
            semanas={semanas}
            unidades={unidades}
            gabinetes={gabinetes}
            tipos={tipos}
            statuses={statuses}
          />
        )}

        {/* ===================== Resumo executivo ===================== */}
        <section aria-labelledby="resumo" className="space-y-3">
          <SectionLabel id="resumo" title="Resumo executivo" code="KPI_01" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {canCron && (
              <MetricCard
                icon={TrendingUp}
                label="Execução"
                value={fmtPct(stats.percentExecucao)}
                progress={stats.percentExecucao}
                context={`${stats.preservados} de ${stats.totalValidos} itens`}
                tone={stats.percentExecucao >= 90 ? "success" : stats.percentExecucao >= 70 ? "warning" : "destructive"}
                loading={loading}
                info="Itens preservados dividido pelos itens válidos do cronograma (exclui os marcados como não aplicável)."
              />
            )}
            {canCron && (
              <MetricCard
                icon={Timer}
                label="Aderência ao prazo"
                value={fmtPct(stats.percentNoPrazo)}
                progress={stats.percentNoPrazo}
                context={`${stats.noPrazo} no prazo · ${stats.divergencias} fora`}
                tone={stats.percentNoPrazo >= 90 ? "success" : stats.percentNoPrazo >= 70 ? "warning" : "destructive"}
                loading={loading}
                info="Percentual de itens executados dentro da data prevista, sobre o total de itens já executados."
              />
            )}
            {canCron && (
              <MetricCard
                icon={AlertTriangle}
                label="Vencidos"
                value={stats.vencidos}
                context={stats.vencidos > 0 ? "Exigem ação imediata" : "Nenhum item vencido"}
                tone={stats.vencidos > 0 ? "destructive" : "success"}
                loading={loading}
              />
            )}
            {canCron && (
              <MetricCard
                icon={Clock}
                label="Pendentes"
                value={stats.pendentes}
                context={`${proximas.length} previstos adiante`}
                tone={stats.pendentes > 0 ? "warning" : "success"}
                loading={loading}
              />
            )}
            {canLotes && (
              <MetricCard
                icon={Package}
                label="Lotes"
                value={lots.length}
                context={`${totalPreservacoes} preservações registradas`}
                tone="info"
                loading={loading}
              />
            )}
          </div>

          <MetricStrip metrics={stripMetrics} loading={loading} />
        </section>

        {/* ===================== Lotes no período ===================== */}
        {canLotes && medicaoPeriodo && (
          <section aria-labelledby="lotes-periodo" className="space-y-3">
            <SectionLabel
              id="lotes-periodo"
              title={`Lotes na medição${medicaoNome ? ` · ${medicaoNome}` : ""}`}
              code="LOT_02"
              hint={`${medicaoPeriodo.inicio <= "0001-01-01" ? "início" : new Date(medicaoPeriodo.inicio).toLocaleDateString("pt-BR")} – ${medicaoPeriodo.fim >= "9999-01-01" ? "atual" : new Date(medicaoPeriodo.fim).toLocaleDateString("pt-BR")}`}
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard
                icon={Package}
                label="Cadastrados no período"
                value={lotesNoPeriodo.length}
                context={`de ${lots.length} no total`}
                loading={loading}
              />
              <MetricCard
                icon={CheckCircle2}
                label="Preservados no período"
                value={lotesPreservadosNoPeriodo}
                progress={lotesNoPeriodo.length === 0 ? 0 : (lotesPreservadosNoPeriodo / lotesNoPeriodo.length) * 100}
                context={`de ${lotesNoPeriodo.length} cadastrados`}
                tone="success"
                loading={loading}
                info="Conta lotes distintos (não eventos de preservação) com ao menos uma preservação dentro do período da medição. Limitado ao conjunto cadastrado no mesmo período, por isso nunca ultrapassa 'Cadastrados no período'."
              />
              <MetricCard
                icon={ClipboardList}
                label="Ativos no período"
                value={lotesNoPeriodo.filter((l) => l.status === "ativo").length}
                tone="info"
                loading={loading}
              />
              <MetricCard
                icon={MinusCircle}
                label="Inativos no período"
                value={lotesNoPeriodo.filter((l) => l.status === "inativo").length}
                tone="warning"
                loading={loading}
              />
            </div>
          </section>
        )}

        {canTarefas && <TasksDashboardSection />}

        {canCron && (
          <>
            {/* ===================== Aderência ===================== */}
            <section aria-labelledby="aderencia" className="space-y-3">
              <SectionLabel id="aderencia" title="Aderência ao cronograma" code="ADR_03" />
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <HudPanel title="Prazo geral" code="ADR_03A" loading={loading}>
                  <dl className="space-y-2.5 text-sm">
                    <Row label="% No prazo" value={fmtPct(stats.percentNoPrazo)} valueClass="text-success" />
                    <Row label="% Divergência" value={fmtPct(stats.percentDivergencia)} valueClass="text-warning" />
                    <Row label="Desvio médio" value={`${stats.mediaDivergenciaDias.toFixed(1)} dias`} />
                    <div className="tech-separator my-3" aria-hidden="true" />
                    <Row label="Início previsto" value={stats.dataInicialPrevista ?? "—"} />
                    <Row label="Fim previsto" value={stats.dataFinalPrevista ?? "—"} />
                    <Row label="Fim realizado" value={stats.dataFinalRealizada ?? "—"} />
                  </dl>
                  {stats.cumpridoNoPrazoGeral !== null && (
                    <Badge
                      variant="outline"
                      className={`font-hud mt-4 text-[9px] ${
                        stats.cumpridoNoPrazoGeral
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-warning/40 bg-warning/10 text-warning"
                      }`}
                    >
                      {stats.cumpridoNoPrazoGeral ? "CUMPRIDO NO PRAZO" : `DIVERGÊNCIA ${stats.desvioPrazoGeralDias}D`}
                    </Badge>
                  )}
                </HudPanel>

                <DonutPanel title="Status geral" code="ADR_03B" data={statusPie} loading={loading} />
                <DonutPanel title="Cumprimento do prazo" code="ADR_03C" data={prazoPie} loading={loading} />
              </div>
            </section>

            {/* ===================== Previsto vs Realizado ===================== */}
            <section aria-labelledby="curva" className="space-y-3">
              <SectionLabel id="curva" title="Previsto vs Realizado" code="CRV_04" />
              <BocaJacarePanel
                title="Acumulado por data"
                subtitle="Distância entre a curva prevista e a realizada ao longo do tempo."
                code="CRV_04A"
                data={bocaJacare}
                xKey="data"
                loading={loading}
              />
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <BocaJacarePanel
                  title="Acumulado por semana"
                  subtitle="Mesma leitura, agregada por semana do cronograma."
                  code="CRV_04B"
                  data={bocaJacarePorSemana}
                  xKey="name"
                  loading={loading}
                />
                <BarPanel title="Execução por medição" code="CRV_04C" data={porMedicao} loading={loading} />
              </div>
            </section>

            {/* ===================== Listas operacionais ===================== */}
            <section aria-labelledby="operacao" className="space-y-3">
              <SectionLabel id="operacao" title="Ações do dia" code="OPS_05" />
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <ItemTablePanel
                  title="Próximas preservações"
                  code="OPS_05A"
                  empty="Sem itens previstos"
                  loading={loading}
                  headers={["TAG", "Unidade", "Prevista", "Situação"]}
                  rows={proximas.map((i) => ({
                    id: i.id,
                    cells: [
                      i.tag,
                      i.unidade,
                      i.dataPrevista ?? "—",
                      <Badge key="s" variant="outline" className="font-hud border-border bg-muted text-[9px] text-muted-foreground">
                        {SITUACAO_LABEL[i.situacao]}
                      </Badge>,
                    ],
                  }))}
                />

                <ItemTablePanel
                  title="Itens vencidos"
                  code="OPS_05B"
                  empty="Nenhum vencido"
                  loading={loading}
                  headers={["TAG", "Unidade", "Prevista", "Atraso"]}
                  rows={vencidos.map((i) => ({
                    id: i.id,
                    cells: [
                      i.tag,
                      i.unidade,
                      i.dataPrevista ?? "—",
                      <span key="d" className="font-hud font-semibold text-destructive">{i.atrasoDias}d</span>,
                    ],
                  }))}
                />

                <ItemTablePanel
                  title="Maiores divergências"
                  code="OPS_05C"
                  empty="Sem divergências"
                  loading={loading}
                  headers={["TAG", "Prevista", "Realizada", "Desvio"]}
                  rows={maioresAtrasos.map((i) => ({
                    id: i.id,
                    cells: [
                      i.tag,
                      i.dataPrevista ?? "—",
                      i.dataRealizada ?? "—",
                      <span key="d" className="font-hud font-semibold text-warning">+{i.desvioDias}d</span>,
                    ],
                  }))}
                />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

/** Cabeçalho de seção: rótulo de instrumento + filete, na linguagem do Aetheris. */
function SectionLabel({ id, title, code, hint }: { id: string; title: string; code: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <h2 id={id} className="shrink-0 text-sm font-semibold uppercase tracking-wide">
        {title}
      </h2>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
      {hint && <span className="font-hud shrink-0 text-[9px] text-muted-foreground">{hint}</span>}
      <span className="font-hud shrink-0 text-[9px] text-primary/70">{code}</span>
    </div>
  );
}

/** Linha rótulo/valor das fichas técnicas. */
function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`font-hud text-right font-semibold ${valueClass ?? ""}`}>{value}</dd>
    </div>
  );
}

function DonutPanel({ title, code, data, loading }: {
  title: string; code: string; data: { name: string; value: number; color: string }[]; loading: boolean;
}) {
  return (
    <HudPanel title={title} code={code} loading={loading} isEmpty={data.length === 0} bodyClassName="h-[260px] p-2">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={2} stroke="none">
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <RTooltip {...TOOLTIP_PROPS} />
          <Legend {...LEGEND_PROPS} />
        </PieChart>
      </ResponsiveContainer>
    </HudPanel>
  );
}

function BocaJacarePanel({ title, subtitle, code, data, xKey, loading }: {
  title: string; subtitle?: string; code: string; data: Record<string, unknown>[]; xKey: string; loading: boolean;
}) {
  return (
    <HudPanel title={title} subtitle={subtitle} code={code} loading={loading} isEmpty={data.length === 0} bodyClassName="h-[320px] p-2">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="gradPrevisto" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.muted} stopOpacity={0.28} />
              <stop offset="100%" stopColor={COLORS.muted} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradRealizado" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.35} />
              <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey={xKey} {...AXIS_PROPS} minTickGap={24} />
          <YAxis {...AXIS_PROPS} width={44} />
          <RTooltip {...TOOLTIP_PROPS} />
          <Legend {...LEGEND_PROPS} />
          <Area type="monotone" dataKey="previsto" name="Previsto" stroke={COLORS.muted} strokeWidth={1.5} fill="url(#gradPrevisto)" />
          <Area type="monotone" dataKey="realizado" name="Realizado" stroke={COLORS.primary} strokeWidth={2} fill="url(#gradRealizado)" />
        </AreaChart>
      </ResponsiveContainer>
    </HudPanel>
  );
}

function BarPanel({ title, code, data, loading }: {
  title: string; code: string;
  data: { name: string; preservado: number; pendente: number; vencido: number }[];
  loading: boolean;
}) {
  return (
    <HudPanel title={title} code={code} loading={loading} isEmpty={data.length === 0} bodyClassName="h-[320px] p-2">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="name" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} width={44} />
          <RTooltip {...TOOLTIP_PROPS} />
          <Legend {...LEGEND_PROPS} />
          <Bar dataKey="preservado" name="Preservado" stackId="a" fill={COLORS.success} />
          <Bar dataKey="pendente" name="Pendente" stackId="a" fill={COLORS.muted} />
          <Bar dataKey="vencido" name="Vencido" stackId="a" fill={COLORS.destructive} />
        </BarChart>
      </ResponsiveContainer>
    </HudPanel>
  );
}

function ItemTablePanel({ title, code, headers, rows, empty, loading }: {
  title: string; code: string; headers: string[];
  rows: { id: string; cells: React.ReactNode[] }[];
  empty: string; loading: boolean;
}) {
  return (
    <HudPanel title={title} code={code} empty={empty} loading={loading} isEmpty={rows.length === 0} bodyClassName="p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              {headers.map((h) => (
                <TableHead key={h} className="font-hud h-9 text-[9px] uppercase text-muted-foreground">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} className="border-border transition-colors duration-200 hover:bg-white/[0.02]">
                {r.cells.map((c, i) => (
                  <TableCell key={i} className={i === 0 ? "font-hud text-xs font-semibold text-primary" : "text-xs"}>
                    {c}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </HudPanel>
  );
}
