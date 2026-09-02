import { cn } from "@/lib/utils";
import type { MetricTone } from "./MetricCard";

const TONE_TEXT: Record<MetricTone, string> = {
  neutral: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
};

export interface StripMetric {
  label: string;
  value: string | number;
  tone?: MetricTone;
}

/**
 * Faixa densa de métricas secundárias.
 *
 * A skill de KPI limita o destaque a 5–7 indicadores e alerta contra
 * sobrecarregar o painel. Os números que ainda importam mas não dirigem uma
 * decisão imediata vivem aqui: leitura de instrumento, uma linha, dividida por
 * filetes de 1px — ocupa a altura de um cartão e cabe o dobro de informação.
 */
export function MetricStrip({ metrics, loading = false }: { metrics: StripMetric[]; loading?: boolean }) {
  return (
    <dl className="grid grid-cols-2 divide-x divide-y divide-border border border-border bg-card sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
      {metrics.map((m) => (
        <div key={m.label} className="px-4 py-3">
          <dt className="font-hud truncate text-[9px] uppercase text-muted-foreground">{m.label}</dt>
          <dd className={cn("font-hud mt-1 text-lg font-semibold leading-none", TONE_TEXT[m.tone ?? "neutral"])}>
            {loading ? "—" : m.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
