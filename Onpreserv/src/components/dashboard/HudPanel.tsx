import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface HudPanelProps {
  /** Título humano do painel. */
  title: string;
  /** Uma linha explicando o que o painel mostra. */
  subtitle?: string;
  /** Código de instrumento exibido à direita do cabeçalho (ex.: "EXEC_01"). */
  code?: string;
  /** Altura fixa do corpo — necessária para os contêineres de gráfico. */
  bodyClassName?: string;
  className?: string;
  loading?: boolean;
  /** Mensagem exibida quando não há dados. */
  empty?: string;
  /** Quando verdadeiro, exibe `empty` no lugar do conteúdo. */
  isEmpty?: boolean;
  children: ReactNode;
}

/**
 * Painel padrão do dashboard, na linguagem do Aetheris: superfície #080808,
 * borda de 1px que acende no mint ao passar o mouse, aresta reta e cabeçalho
 * com rótulo de instrumento.
 *
 * Concentra num só lugar os três estados que todo painel precisa ter —
 * carregando, vazio e com dados. Antes cada painel reimplementava os três, e
 * dois deles simplesmente não tratavam o estado vazio.
 */
export function HudPanel({
  title,
  subtitle,
  code,
  bodyClassName,
  className,
  loading = false,
  empty = "Sem dados no período",
  isEmpty = false,
  children,
}: HudPanelProps) {
  return (
    <section className={cn("hover-card border border-border bg-card", className)}>
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold tracking-tight">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {code && (
          <span className="font-hud shrink-0 text-[9px] text-primary/70">{code}</span>
        )}
      </header>

      <div className={cn("p-4", bodyClassName)}>
        {loading ? (
          <Skeleton className="h-full min-h-[120px] w-full" />
        ) : isEmpty ? (
          <div className="flex h-full min-h-[120px] items-center justify-center">
            <p className="font-hud text-[10px] uppercase text-muted-foreground/60">{empty}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
