import { Card, CardContent } from "@/components/ui/card";
import { Task, isTaskOverdue } from "@/types/task";
import { CheckCircle2, Clock, ListTodo, AlertTriangle, PlayCircle } from "lucide-react";

interface Props {
  tasks: Task[];
}

export function TaskDashboardCards({ tasks }: Props) {
  const total = tasks.length;
  const abertas = tasks.filter((t) => t.status === "a_fazer").length;
  const andamento = tasks.filter((t) => t.status === "em_andamento" || t.status === "em_revisao").length;
  const concluidas = tasks.filter((t) => t.status === "concluido").length;
  const vencidas = tasks.filter(isTaskOverdue).length;

  const items = [
    { label: "Total", value: total, icon: ListTodo, color: "text-muted-foreground" },
    { label: "A fazer", value: abertas, icon: Clock, color: "text-info" },
    { label: "Em andamento", value: andamento, icon: PlayCircle, color: "text-warning" },
    { label: "Concluídas", value: concluidas, icon: CheckCircle2, color: "text-success" },
    { label: "Vencidas", value: vencidas, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((it) => (
        <Card key={it.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${it.color}`}>
              <it.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{it.label}</p>
              <p className="text-2xl font-semibold leading-none">{it.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
