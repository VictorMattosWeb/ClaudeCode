import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Inbox, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardAlert {
  id: string;
  severity: "critical" | "warning";
  /** Frase de ação, não rótulo: "12 itens vencidos exigem baixa". */
  message: string;
  to?: string;
  icon?: "overdue" | "pending" | "requests";
}

const ICONS = {
  overdue: AlertTriangle,
  pending: Clock,
  requests: Inbox,
} as const;

/**
 * Faixa de alertas — o "Key alerts" da hierarquia de dashboard.
 *
 * Fica no topo, acima dos KPIs, e **só existe quando há algo a fazer**: uma
 * barra que aparece todo dia deixa de ser lida em uma semana (a skill chama isso
 * de alert fatigue). Cada alerta é uma frase de ação com link para o lugar onde
 * a ação acontece, não um número solto.
 */
export function AlertBar({ alerts }: { alerts: DashboardAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <section aria-label="Alertas" className="flex flex-col gap-px">
      {alerts.map((a) => {
        const Icon = ICONS[a.icon ?? "overdue"];
        const critical = a.severity === "critical";
        const body = (
          <>
            <span
              className={cn("h-full w-[2px] shrink-0", critical ? "bg-destructive" : "bg-warning")}
              aria-hidden="true"
            />
            <Icon
              className={cn("h-4 w-4 shrink-0", critical ? "text-destructive" : "text-warning")}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-sm">{a.message}</span>
            {a.to && (
              <ArrowRight
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary"
                aria-hidden="true"
              />
            )}
          </>
        );

        const className = cn(
          "group flex items-stretch gap-3 border bg-card py-2.5 pr-4 transition-colors duration-300",
          critical
            ? "border-destructive/35 hover:border-destructive/70"
            : "border-warning/35 hover:border-warning/70",
        );

        return a.to ? (
          <Link key={a.id} to={a.to} className={cn(className, "items-center")}>
            {body}
          </Link>
        ) : (
          <div key={a.id} className={cn(className, "items-center")}>
            {body}
          </div>
        );
      })}
    </section>
  );
}
