import type { LucideIcon } from "lucide-react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type MetricTone = "neutral" | "success" | "warning" | "destructive" | "info";

const TONE: Record<MetricTone, { text: string; bar: string; border: string }> = {
  neutral: { text: "text-foreground", bar: "bg-muted-foreground", border: "border-border" },
  success: { text: "text-success", bar: "bg-success", border: "border-success/40" },
  warning: { text: "text-warning", bar: "bg-warning", border: "border-warning/40" },
  destructive: { text: "text-destructive", bar: "bg-destructive", border: "border-destructive/40" },
  info: { text: "text-info", bar: "bg-info", border: "border-info/40" },
};

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  /** Contexto obrigatório para KPI de destaque: "X de Y", "meta 90%", etc. */
  context?: string;
  tone?: MetricTone;
  /** 0–100. Desenha a barra de progresso sob o valor. */
  progress?: number;
  /** Explicação da metodologia de cálculo. */
  info?: string;
  loading?: boolean;
  className?: string;
}

/**
 * KPI de destaque.
 *
 * A skill de KPI é categórica: um número sozinho não informa nada — ele precisa
 * de comparação, tendência ou meta ao lado ("show context"). Por isso `context`
 * e `progress` existem, e por isso este cartão é grande e reservado aos 5 a 7
 * indicadores que realmente dirigem decisão. O resto vai para o `MetricStrip`.
 */
export function MetricCard({
  icon: Icon,
  label,
  value,
  context,
  tone = "neutral",
  progress,
  info,
  loading = false,
  className,
}: MetricCardProps) {
  const t = TONE[tone];
  const pct = progress === undefined ? undefined : Math.max(0, Math.min(100, progress));

  return (
    <article
      className={cn(
        "hover-card group relative flex flex-col justify-between border bg-card p-4",
        t.border,
        className,
      )}
    >
      {/* Barra de acento à esquerda: dá a leitura de severidade antes da leitura
          do número, que é o que a operação faz ao bater o olho no painel. */}
      <span className={cn("absolute inset-y-0 left-0 w-[2px]", t.bar)} aria-hidden="true" />

      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="font-hud truncate text-[9px] uppercase text-muted-foreground">{label}</p>
          {info && (
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`Como ${label} é calculado`}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
                >
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                {info}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <Icon className={cn("h-4 w-4 shrink-0 opacity-60", t.text)} aria-hidden="true" />
      </header>

      <p className={cn("mt-3 font-hud text-3xl font-semibold leading-none tracking-tight", t.text)}>
        {loading ? "—" : value}
      </p>

      {pct !== undefined && (
        <div
          className="mt-3 h-1 w-full bg-white/[0.06]"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          <div
            className={cn("h-full transition-[width] duration-700 ease-out-expo", t.bar)}
            style={{ width: loading ? "0%" : `${pct}%` }}
          />
        </div>
      )}

      {context && (
        <p className="mt-2 truncate text-[11px] text-muted-foreground">{context}</p>
      )}
    </article>
  );
}
