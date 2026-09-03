import { Card, CardContent } from "@/components/ui/card";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { Calendar, User, Link2, Users as UsersIcon, ExternalLink } from "lucide-react";
import { Task, taskModuloLabel, isTaskOverdue, getTaskAssignees, formatPrazo } from "@/types/task";
import { PriorityBadge } from "./PriorityBadge";
import { LabelChip } from "./LabelChip";
import { UserTag, UserTagGroup } from "@/components/UserTag";
import { QuickLabelPicker } from "./QuickLabelPicker";
import { cn } from "@/lib/utils";
import { useTasks } from "@/context/TaskContext";

interface Props {
  task: Task;
  users?: Map<string, string>;
  responsavelNome?: string;
  onClick?: () => void;
  reducedMotion?: boolean;
  saving?: boolean;
  justConfirmed?: boolean;
  dragHandleProps?: {
    attributes?: DraggableAttributes;
    listeners?: SyntheticListenerMap;
    ref?: (node: HTMLElement | null) => void;
    isDragging?: boolean;
  };
}

export function TaskCard({ task, users, responsavelNome, onClick, reducedMotion, saving, justConfirmed, dragHandleProps }: Props) {
  const overdue = isTaskOverdue(task);
  const { recentlyUpdatedIds } = useTasks();
  const justUpdated = recentlyUpdatedIds.has(task.id);
  const dragging = dragHandleProps?.isDragging ?? false;

  return (
    <div
      ref={dragHandleProps?.ref}
      {...(dragHandleProps?.attributes ?? {})}
      {...(dragHandleProps?.listeners ?? {})}
      className={cn(
        "select-none cursor-grab active:cursor-grabbing",
        dragging ? "touch-none cursor-grabbing" : "touch-pan-y",
      )}
    >
      <Card
        onClick={onClick}
        aria-busy={saving || undefined}
        className={cn(
          "group hover:border-primary/50 relative cursor-pointer",
          !reducedMotion && "hover:shadow-md transition-[border-color,box-shadow,transform] duration-200 ease-out will-change-transform",
          reducedMotion && "transition-none",
          overdue && "border-destructive/50",
          justUpdated && "realtime-pulse",
          saving && "kanban-saving",
          justConfirmed && "kanban-confirmed",
          dragging && "shadow-lg",
        )}
      >
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-snug line-clamp-2 flex-1">{task.titulo}</p>
            <div
              className="flex items-center gap-2 shrink-0"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <QuickLabelPicker task={task} />
              <PriorityBadge priority={task.prioridade} />
            </div>
          </div>
          {task.descricao && (
            <p className="text-xs text-muted-foreground line-clamp-2">{task.descricao}</p>
          )}
          {task.labels && task.labels.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {task.labels.map((l) => <LabelChip key={l.id} label={l} />)}
            </div>
          )}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
            <div className="flex items-center gap-2 min-w-0">
              {(() => {
                const ids = getTaskAssignees(task);
                // Sem id, sobra o nome em texto — registros anteriores ao
                // cadastro de responsáveis por id ainda existem.
                if (ids.length === 0) {
                  return responsavelNome ? (
                    <UserTag nome={responsavelNome} size={18} className="truncate" />
                  ) : null;
                }
                if (ids.length === 1) {
                  // `users` é o nome que a tela já tem em mãos: garante o texto
                  // mesmo antes de o diretório de fotos terminar de carregar.
                  return (
                    <UserTag
                      userId={ids[0]}
                      nome={users?.get(ids[0]) ?? responsavelNome}
                      size={18}
                      className="truncate"
                    />
                  );
                }
                // Vários: as fotos sobrepostas dizem QUEM sem ocupar a linha.
                return (
                  <span className="flex items-center gap-1.5 truncate">
                    <UserTagGroup userIds={ids} size={18} />
                    <span className="truncate">{ids.length} responsáveis</span>
                  </span>
                );
              })()}
              {task.modulo_relacionado !== "geral" && (
                <span className="flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  {taskModuloLabel(task.modulo_relacionado)}
                </span>
              )}
            </div>
            {task.prazo && (
              <span className={cn("flex items-center gap-1", overdue && "text-destructive font-medium")}>
                <Calendar className="h-3 w-3" />
                {formatPrazo(task.prazo, "dd/MM")}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
