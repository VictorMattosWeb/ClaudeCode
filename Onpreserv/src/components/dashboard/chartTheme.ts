/**
 * Tema compartilhado dos gráficos do dashboard.
 *
 * Existe para que nenhum gráfico redefina cor, grade ou tooltip por conta
 * própria: a skill de KPI é explícita em "use consistent colors" — a mesma
 * situação precisa ter a mesma cor em todos os painéis, senão o leitor perde a
 * capacidade de comparar dois gráficos lado a lado.
 */

/** Paleta semântica. Verde = bom, vermelho = ruim, âmbar = atenção. */
export const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  destructive: "hsl(var(--destructive))",
  info: "hsl(var(--info))",
  muted: "hsl(var(--muted-foreground))",
} as const;

/** Cor por situação do item de cronograma — a mesma em pizza, barra e badge. */
export const SITUACAO_COLOR: Record<string, string> = {
  no_prazo: CHART_COLORS.success,
  preservado: CHART_COLORS.success,
  divergencia: CHART_COLORS.warning,
  pendente: CHART_COLORS.muted,
  vencido: CHART_COLORS.destructive,
  nao_aplicavel: CHART_COLORS.info,
};

/** Grade discreta, no mesmo tom das linhas do grid técnico do Aetheris. */
export const GRID_PROPS = {
  stroke: "hsl(0 0% 100% / 0.06)",
  strokeDasharray: "0",
  vertical: false,
} as const;

/** Eixos em fonte de instrumento, sem linha de eixo desenhada. */
export const AXIS_PROPS = {
  stroke: "hsl(var(--muted-foreground))",
  tick: { fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fill: "hsl(var(--muted-foreground))" },
  tickLine: false,
  axisLine: false,
} as const;

/** Tooltip no painel escuro, aresta reta — nada de borda arredondada. */
export const TOOLTIP_PROPS = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border-strong))",
    borderRadius: 0,
    fontSize: 12,
    boxShadow: "0 8px 28px -8px hsl(0 0% 0% / 0.9)",
  },
  labelStyle: {
    color: "hsl(var(--foreground))",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    marginBottom: 4,
  },
  cursor: { fill: "hsl(0 0% 100% / 0.03)" },
} as const;

/** Legenda compacta. */
export const LEGEND_PROPS = {
  wrapperStyle: {
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "0.06em",
  },
} as const;
