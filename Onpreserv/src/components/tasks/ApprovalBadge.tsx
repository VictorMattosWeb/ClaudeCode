import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TaskAprovacao, TASK_APROVACAO_COLOR, TASK_APROVACAO_SHORT } from "@/types/task";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";

const ICON: Record<TaskAprovacao, typeof CheckCircle2> = {
  pendente: Clock3,
  aprovado: CheckCircle2,
  reprovado: XCircle,
};

interface Props {
  aprovacao?: TaskAprovacao | null;
  /** Oculta o badge quando ainda está pendente (útil em cards compactos). */
  hidePendente?: boolean;
  className?: string;
}

export function ApprovalBadge({ aprovacao, hidePendente, className }: Props) {
  const value: TaskAprovacao = aprovacao ?? "pendente";
  if (hidePendente && value === "pendente") return null;
  const Icon = ICON[value];
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 border text-[10px] font-medium",
        TASK_APROVACAO_COLOR[value],
        className,
      )}
      title={`Aprovação: ${TASK_APROVACAO_SHORT[value]}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {TASK_APROVACAO_SHORT[value]}
    </Badge>
  );
}
