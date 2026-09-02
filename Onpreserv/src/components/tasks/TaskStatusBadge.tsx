import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TaskStatus, TASK_STATUS_LABEL } from "@/types/task";

const cls: Record<TaskStatus, string> = {
  a_fazer: "bg-muted text-muted-foreground border-border",
  em_andamento: "bg-info/15 text-info border-info/30",
  em_revisao: "bg-warning/15 text-warning border-warning/30",
  concluido: "bg-success/15 text-success border-success/30",
  bloqueado: "bg-destructive/15 text-destructive border-destructive/30",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium border", cls[status])}>
      {TASK_STATUS_LABEL[status]}
    </Badge>
  );
}
