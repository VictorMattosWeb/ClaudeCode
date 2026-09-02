import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TaskPriority, TASK_PRIORITY_COLOR, TASK_PRIORITY_LABEL } from "@/types/task";

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium border", TASK_PRIORITY_COLOR[priority])}>
      {TASK_PRIORITY_LABEL[priority]}
    </Badge>
  );
}
