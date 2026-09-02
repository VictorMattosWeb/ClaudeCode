import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KeyRound, MoreVertical, Pencil, Power, Shield, History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { ManagedUser } from "@/pages/UsersKanban";

interface Props {
  user: ManagedUser;
  hasOverride: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  onResetPassword: () => void;
  onViewPermissions: () => void;
  onViewHistory: () => void;
  /** Quando true, renderiza estaticamente (uso no DragOverlay). */
  isOverlay?: boolean;
}

export function UserCard({
  user,
  hasOverride,
  onEdit,
  onToggleStatus,
  onResetPassword,
  onViewPermissions,
  onViewHistory,
  isOverlay = false,
}: Props) {
  const sortable = useSortable({
    id: user.id,
    data: { type: "user", role: user.role ?? "user" },
    disabled: isOverlay,
  });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const initials = user.nome
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const style = isOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      };

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      {...(isOverlay ? {} : attributes)}
      {...(isOverlay ? {} : listeners)}
      className={cn(
        "group rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:shadow-md cursor-grab active:cursor-grabbing select-none",
        user.status === "inativo" && "opacity-60",
        isOverlay && "rotate-1 shadow-xl cursor-grabbing",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {initials || "?"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-tight">{user.nome}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onViewPermissions}>
                  <Shield className="h-4 w-4" /> Permissões
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onResetPassword}>
                  <KeyRound className="h-4 w-4" /> Redefinir senha
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onViewHistory}>
                  <History className="h-4 w-4" /> Histórico
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onToggleStatus} className="text-destructive focus:text-destructive">
                  <Power className="h-4 w-4" /> {user.status === "ativo" ? "Inativar" : "Ativar"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant={user.status === "ativo" ? "default" : "secondary"} className="text-[10px] h-5 px-1.5">
              {user.status === "ativo" ? "Ativo" : "Inativo"}
            </Badge>
            {hasOverride && (
              <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] h-5 px-1.5">
                Permissão personalizada
              </Badge>
            )}
            {user.created_at && (
              <span className="text-[10px] text-muted-foreground">
                criado {format(new Date(user.created_at), "dd/MM/yy", { locale: ptBR })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
