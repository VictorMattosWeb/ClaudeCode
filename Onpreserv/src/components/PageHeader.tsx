import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  /** Uma linha explicando a função da página. */
  subtitle?: string;
  /** Código de instrumento à direita do título (ex.: "CRN_01"). */
  code?: string;
  /** Botões da página. */
  actions?: ReactNode;
  className?: string;
}

/**
 * Cabeçalho de página.
 *
 * Existia um cabeçalho diferente em cada tela: Lotes usava `sticky` com fundo
 * translúcido, Cronograma uma faixa com borda inferior, Solicitações um `h1`
 * solto de 2xl e Usuários outro. Nenhum deles concordava em altura, tamanho de
 * título ou tratamento do ícone — e três repetiam o título que o `AppLayout` já
 * mostra na barra superior.
 *
 * Este componente é o único formato: quadrado com borda, título em maiúsculas
 * com tracking, subtítulo em fonte de instrumento e as ações à direita.
 */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  code,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-card text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2.5">
            <h1 className="truncate text-base font-semibold uppercase tracking-wide">{title}</h1>
            {code && <span className="font-hud shrink-0 text-[9px] text-primary/70">{code}</span>}
          </div>
          {subtitle && (
            <p className="font-hud mt-0.5 truncate text-[10px] uppercase text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
