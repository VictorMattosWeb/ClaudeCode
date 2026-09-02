import { useEffect, useMemo, useState } from "react";
import { Package, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { useLots } from "@/context/LotContext";
import { computeLotStats } from "@/lib/stats";
import { filterLots, DEFAULT_FILTERS, type LotFiltersValue } from "@/lib/lotFilters";
import { LotTable } from "@/components/lots/LotTable";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { AlertBar, type DashboardAlert } from "@/components/dashboard/AlertBar";

/**
 * Página de Lotes.
 *
 * O cabeçalho próprio ("Gestão de Preservação") foi removido: o `AppLayout` já
 * renderiza um cabeçalho fixo com o título da rota, e os dois empilhados
 * custavam 120px de altura útil. Pior, o daqui era `sticky top-0 z-50` contra o
 * `z-40` do layout — ele cobria o cabeçalho do sistema ao rolar a página.
 *
 * A tabela "Histórico de cadastro de lotes", que repetia as mesmas colunas da
 * listagem principal para os últimos 20 registros e só para administradores,
 * deu lugar ao filtro por período de cadastro: mesma pergunta, respondida sobre
 * a lista inteira, com filtro combinável e visível para quem tem acesso.
 */
const Index = () => {
  const { lots, loading } = useLots();
  const [filters, setFilters] = useState<LotFiltersValue>(DEFAULT_FILTERS);

  useEffect(() => { document.title = "Lotes | onPreserv"; }, []);

  // Filtro aplicado uma única vez: indicadores e tabela leem o mesmo conjunto.
  const filteredLots = useMemo(() => filterLots(lots, filters), [lots, filters]);
  const stats = useMemo(() => computeLotStats(filteredLots), [filteredLots]);

  const filtrando = filteredLots.length !== lots.length;

  // Alertas sobre a base inteira, não sobre o recorte filtrado: um lote vencido
  // continua vencido mesmo quando o filtro atual não o mostra.
  const alerts = useMemo<DashboardAlert[]>(() => {
    const geral = computeLotStats(lots);
    const out: DashboardAlert[] = [];
    if (geral.vencidos > 0) {
      out.push({
        id: "vencidos",
        severity: "critical",
        icon: "overdue",
        message: `${geral.vencidos} ${geral.vencidos === 1 ? "lote fechou semana" : "lotes fecharam semana"} sem preservação`,
      });
    }
    if (geral.upcoming > 0) {
      out.push({
        id: "upcoming",
        severity: "warning",
        icon: "pending",
        message: `${geral.upcoming} ${geral.upcoming === 1 ? "lote ainda não foi preservado" : "lotes ainda não foram preservados"} nesta semana`,
      });
    }
    return out;
  }, [lots]);

  return (
    <main className="container mx-auto space-y-6 px-3 py-6 sm:px-4">
      {!loading && <AlertBar alerts={alerts} />}

      {/* ---------- Indicadores ---------- */}
      <section aria-label="Indicadores dos lotes" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          icon={Package}
          label={filtrando ? "Lotes no filtro" : "Total de lotes"}
          value={stats.total}
          context={filtrando ? `de ${lots.length} cadastrados` : undefined}
          loading={loading}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Semana cumprida"
          value={stats.preservados}
          progress={stats.taxaPreservacao}
          context={`${stats.taxaPreservacao}% do conjunto`}
          tone={stats.taxaPreservacao >= 90 ? "success" : stats.taxaPreservacao >= 70 ? "warning" : "destructive"}
          loading={loading}
          info="Lotes com ao menos uma preservação registrada dentro da semana corrente (segunda a domingo), em qualquer dia."
        />
        <MetricCard
          icon={Clock}
          label="Pendentes na semana"
          value={stats.upcoming}
          context={stats.upcoming > 0 ? "Ainda há tempo nesta semana" : "Semana em dia"}
          tone={stats.upcoming > 0 ? "warning" : "success"}
          loading={loading}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Semana(s) vencida(s)"
          value={stats.vencidos}
          context={stats.vencidos > 0 ? "Exige ação imediata" : "Nenhum vencido"}
          tone={stats.vencidos > 0 ? "destructive" : "success"}
          loading={loading}
        />
      </section>

      {/* ---------- Listagem ---------- */}
      <LotTable
        filters={filters}
        onFiltersChange={setFilters}
        filteredLots={filteredLots}
        loading={loading}
      />
    </main>
  );
};

export default Index;
