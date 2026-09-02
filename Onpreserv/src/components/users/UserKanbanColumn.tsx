import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_COLORS, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";
import type { AppRole } from "@/context/AuthContext";
import { UserCard } from "./UserCard";
import type { ManagedUser } from "@/pages/UsersKanban";

interface Props {
  role: AppRole;
  users: ManagedUser[];
  overrides: Set<string>;
  onAddUser: () => void;
  onEditUser: (u: ManagedUser) => void;
  onToggleStatus: (u: ManagedUser) => void;
  onResetPassword: (u: ManagedUser) => void;
  onViewPermissions: (u: ManagedUser) => void;
  onViewHistory: (u: ManagedUser) => void;
}

export function UserKanbanColumn({
  role,
  users,
  overrides,
  onAddUser,
  onEditUser,
  onToggleStatus,
  onResetPassword,
  onViewPermissions,
  onViewHistory,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${role}`,
    data: { type: "column", role },
  });
  const colors = ROLE_COLORS[role];

  return (
    <div
      className={cn(
        "flex h-full min-h-[60vh] flex-col rounded-xl border border-border bg-muted/30 p-3 transition-colors",
        isOver && "border-primary bg-primary/5 ring-2 ring-primary/30",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", colors.bg.replace("/10", ""))} />
            <h3 className="text-sm font-semibold">{ROLE_LABELS[role]}</h3>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium ring-1", colors.bg, colors.text, colors.ring)}>
              {users.length}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{ROLE_DESCRIPTIONS[role]}</p>
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={onAddUser} className="mb-3 w-full justify-center">
        <Plus className="h-4 w-4" /> Adicionar usuário
      </Button>

      <SortableContext items={users.map((u) => u.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex-1 space-y-2 overflow-y-auto min-h-[120px]">
          {users.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              hasOverride={overrides.has(u.id)}
              onEdit={() => onEditUser(u)}
              onToggleStatus={() => onToggleStatus(u)}
              onResetPassword={() => onResetPassword(u)}
              onViewPermissions={() => onViewPermissions(u)}
              onViewHistory={() => onViewHistory(u)}
            />
          ))}
          {users.length === 0 && (
            <div className="flex items-center justify-center rounded-md border border-dashed border-border py-10 text-xs text-muted-foreground">
              Nenhum usuário neste perfil
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
