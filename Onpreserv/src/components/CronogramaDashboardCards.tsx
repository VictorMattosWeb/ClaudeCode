import { Card, CardContent } from "@/components/ui/card";
import { CronogramaStats } from "@/types/cronograma";
import { CalendarCheck2, ClipboardList, AlertTriangle, Clock, CheckCircle2, TrendingUp, CalendarRange, Target } from "lucide-react";

interface Props { stats: CronogramaStats; }

const fmt = (d: string | null) => {
  if (!d) return "—";
  const [y, m, day] = d.split("T")[0].split("-");
  return `${day}/${m}/${y}`;
};

export function CronogramaDashboardCards({ stats }: Props) {
  const cards = [
    { label: "Total de itens", value: stats.total, icon: ClipboardList, color: "text-foreground" },
    { label: "Preservados", value: stats.preservados, icon: CheckCircle2, color: "text-success" },
    { label: "Pendentes", value: stats.pendentes, icon: Clock, color: "text-muted-foreground" },
    { label: "Vencidos", value: stats.vencidos, icon: AlertTriangle, color: "text-destructive" },
    { label: "% Execução", value: `${stats.percentExecucao.toFixed(1)}%`, icon: TrendingUp, color: "text-primary" },
    { label: "% No prazo", value: `${stats.percentNoPrazo.toFixed(1)}%`, icon: CalendarCheck2, color: "text-success" },
  ];

  const prazoOk = stats.cumpridoNoPrazoGeral;
  const prazoColor =
    prazoOk === null ? "text-muted-foreground" : prazoOk ? "text-success" : "text-warning";
  const prazoLabel =
    prazoOk === null
      ? "Em andamento"
      : prazoOk
      ? `Cumprido${stats.desvioPrazoGeralDias === 0 ? " no prazo" : ` ${Math.abs(stats.desvioPrazoGeralDias!)}d antes`}`
      : `Divergência ${stats.desvioPrazoGeralDias}d`;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide truncate">{c.label}</p>
                    <p className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</p>
                  </div>
                  <Icon className={`h-4 w-4 shrink-0 ${c.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 shrink-0">
              <CalendarRange className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">Prazo geral do cronograma</p>
              <p className="text-sm mt-1">
                <span className="text-muted-foreground">Previsto:</span>{" "}
                <span className="font-medium">{fmt(stats.dataInicialPrevista)}</span>
                <span className="text-muted-foreground"> → </span>
                <span className="font-medium">{fmt(stats.dataFinalPrevista)}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Realizado:</span>{" "}
                <span className="font-medium">{fmt(stats.dataInicialRealizada)}</span>
                <span className="text-muted-foreground"> → </span>
                <span className="font-medium">{fmt(stats.dataFinalRealizada)}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Target className={`h-4 w-4 ${prazoColor}`} />
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Status do prazo</p>
                <p className={`text-sm font-bold ${prazoColor}`}>{prazoLabel}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
