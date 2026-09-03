import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { supabase } from "@/services/adapters/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { InviteLinkDialog } from "@/components/users/InviteLinkDialog";
import { Link2, Loader2, Search, Settings2, UserCog, Users2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth, type AppRole } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/lib/permissions";
import { UserKanbanColumn } from "@/components/users/UserKanbanColumn";
import { UserCard } from "@/components/users/UserCard";
import { UserFormDialog } from "@/components/users/UserFormDialog";
import { RolePermissionsDrawer } from "@/components/users/RolePermissionsDrawer";
import { UserAuditDialog } from "@/components/users/UserAuditDialog";
import { applyRolePermissionsToUsers } from "@/lib/applyRolePermissions";
import { runWithRetry } from "@/lib/runWithRetry";
import { notifyError } from "@/lib/errorMessages";

export interface ManagedUser {
  id: string;
  nome: string;
  email: string;
  status: "ativo" | "inativo";
  role: AppRole | null;
  created_at: string;
}

export default function UsersKanban() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [overrides, setOverrides] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ativo" | "inativo">("all");

  const [activeId, setActiveId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formInitialRole, setFormInitialRole] = useState<AppRole>("user");
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);

  const [permsOpen, setPermsOpen] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditUser, setAuditUser] = useState<ManagedUser | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  // Pendências otimistas — evitam flicker até o servidor/realtime confirmar
  const pendingRef = useRef<Map<string, AppRole>>(new Map());

  useEffect(() => {
    document.title = "Usuários e Permissões | onPreserv";
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: perms }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("user_permissions").select("user_id").eq("is_override", true),
    ]);
    const merged: ManagedUser[] = (profiles ?? []).map((p: any) => {
      const ur = roles?.filter((r) => r.user_id === p.id) ?? [];
      const role = ur.find((r) => r.role === "admin")?.role ?? ur[0]?.role ?? null;
      const pending = pendingRef.current.get(p.id);
      return { ...p, role: (pending ?? (role as AppRole | null)) };
    });
    // limpa pendências já confirmadas
    merged.forEach((u) => {
      const p = pendingRef.current.get(u.id);
      if (p && u.role === p) pendingRef.current.delete(u.id);
    });
    setUsers(merged);
    const overrideSet = new Set<string>();
    (perms ?? []).forEach((p: any) => overrideSet.add(p.user_id));
    setOverrides(overrideSet);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!u.nome.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [users, search, statusFilter]);

  const grouped = useMemo(() => {
    const g: Record<AppRole, ManagedUser[]> = { admin: [], user: [], viewer: [] };
    filtered.forEach((u) => {
      const r = u.role ?? "user";
      g[r].push(u);
    });
    return g;
  }, [filtered]);

  const stats = useMemo(() => ({
    total: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    user: users.filter((u) => u.role === "user").length,
    viewer: users.filter((u) => u.role === "viewer").length,
    ativos: users.filter((u) => u.status === "ativo").length,
    inativos: users.filter((u) => u.status === "inativo").length,
    overrides: overrides.size,
  }), [users, overrides]);

  const findRoleOf = (id: string): AppRole | null => {
    if (id.startsWith("col-")) return id.slice(4) as AppRole;
    const u = users.find((x) => x.id === id);
    return (u?.role as AppRole) ?? null;
  };

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  // Feedback ao vivo: o card "voa" para a coluna alvo enquanto arrasta
  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    if (activeIdStr === overIdStr) return;

    const activeRole = findRoleOf(activeIdStr);
    const overRole = findRoleOf(overIdStr);
    if (!activeRole || !overRole) return;

    setUsers((prev) => {
      const activeIdx = prev.findIndex((t) => t.id === activeIdStr);
      if (activeIdx === -1) return prev;

      if (activeRole !== overRole) {
        const next = [...prev];
        const moved = { ...next[activeIdx], role: overRole };
        next.splice(activeIdx, 1);
        if (overIdStr.startsWith("col-")) {
          next.push(moved);
        } else {
          const overIdx = next.findIndex((t) => t.id === overIdStr);
          next.splice(overIdx >= 0 ? overIdx : next.length, 0, moved);
        }
        return next;
      }

      // Reordenação visual dentro da mesma coluna
      if (overIdStr.startsWith("col-")) return prev;
      const overIdx = prev.findIndex((t) => t.id === overIdStr);
      if (overIdx === -1 || activeIdx === overIdx) return prev;
      return arrayMove(prev, activeIdx, overIdx);
    });
  };

  const handleDragCancel = () => setActiveId(null);

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const userId = String(e.active.id);
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const newRole = (user.role ?? "user") as AppRole;

    // Descobre o role original consultando o servidor (já temos a lista anterior)
    const { data: currentRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const originalRole =
      (currentRoles?.find((r: any) => r.role === "admin")?.role as AppRole | undefined) ??
      (currentRoles?.[0]?.role as AppRole | undefined) ??
      null;

    if (originalRole === newRole) return;

    if (user.id === currentUser?.id && originalRole === "admin" && newRole !== "admin") {
      toast.error("Você não pode remover seu próprio acesso de administrador.");
      // rollback visual
      setUsers((us) => us.map((u) => (u.id === userId ? { ...u, role: originalRole } : u)));
      return;
    }

    pendingRef.current.set(userId, newRole);

    const { error: delErr } = await runWithRetry(async () => await supabase.from("user_roles").delete().eq("user_id", userId));
    if (delErr) {
      notifyError(delErr);
      pendingRef.current.delete(userId);
      setUsers((us) => us.map((u) => (u.id === userId ? { ...u, role: originalRole } : u)));
      return;
    }
    const { error: insErr } = await runWithRetry(async () => await supabase.from("user_roles").insert({ user_id: userId, role: newRole }));
    if (insErr) {
      notifyError(insErr);
      pendingRef.current.delete(userId);
      await runWithRetry(async () => await supabase.from("user_roles").insert({ user_id: userId, role: originalRole ?? "user" }));
      setUsers((us) => us.map((u) => (u.id === userId ? { ...u, role: originalRole } : u)));
      return;
    }
    await runWithRetry(async () => await supabase.from("user_audit_log").insert({
      user_id: userId,
      actor_id: currentUser?.id ?? null,
      acao: "movido",
      detalhes: { de: originalRole, para: newRole },
    }));
    await applyRolePermissionsToUsers(newRole, [userId]);
    toast.success(`${user.nome} foi movido para "${ROLE_LABELS[newRole]}" e herdou as permissões desse perfil.`);
    load();
  };

  const handleCreate = (role: AppRole) => {
    setFormMode("create");
    setFormInitialRole(role);
    setEditingUser(null);
    setFormOpen(true);
  };
  const handleEdit = (u: ManagedUser) => {
    setFormMode("edit");
    setEditingUser(u);
    setFormOpen(true);
  };
  const handleToggleStatus = async (u: ManagedUser) => {
    const novo = u.status === "ativo" ? "inativo" : "ativo";
    const { error } = await runWithRetry(async () => await supabase.from("profiles").update({ status: novo }).eq("id", u.id));
    if (error) { notifyError(error); return; }
    await runWithRetry(async () => await supabase.from("user_audit_log").insert({
      user_id: u.id, actor_id: currentUser?.id ?? null,
      acao: "status_alterado", detalhes: { de: u.status, para: novo },
    }));
    toast.success(`Usuário ${novo}`);
    load();
  };
  const handleResetPassword = async (u: ManagedUser) => {
    const { error } = await runWithRetry(async () => await supabase.auth.resetPasswordForEmail(u.email, {
      redirectTo: `${window.location.origin}/auth`,
    }));
    if (error) { notifyError(error); return; }
    await runWithRetry(async () => await supabase.from("user_audit_log").insert({
      user_id: u.id, actor_id: currentUser?.id ?? null,
      acao: "senha_redefinida", detalhes: {},
    }));
    toast.success(`Email de redefinição enviado para ${u.email}`);
  };
  const handleViewHistory = (u: ManagedUser) => {
    setAuditUser(u);
    setAuditOpen(true);
  };

  const activeUser = activeId ? users.find((u) => u.id === activeId) : null;

  const statCards: { label: string; value: number; icon?: React.ReactNode; tone?: string }[] = [
    { label: "Total", value: stats.total, tone: "text-foreground" },
    { label: "Administradores", value: stats.admin, tone: "text-primary" },
    { label: "Usuários padrão", value: stats.user, tone: "text-emerald-600 dark:text-emerald-400" },
    { label: "Visualizadores", value: stats.viewer, tone: "text-muted-foreground" },
    { label: "Ativos", value: stats.ativos, tone: "text-emerald-600 dark:text-emerald-400" },
    { label: "Inativos", value: stats.inativos, tone: "text-muted-foreground" },
    { label: "Personalizadas", value: stats.overrides, tone: "text-amber-600 dark:text-amber-400" },
  ];

  return (
    <main className="container mx-auto space-y-6 px-3 py-6 sm:px-4">
      <PageHeader
        icon={UserCog}
        title="Usuários e permissões"
        subtitle="Acessos por perfil, quadro e matriz de permissões"
        code="USR_01"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
              <Link2 className="h-4 w-4" aria-hidden="true" /> Link de cadastro
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPermsOpen(true)}>
              <Settings2 className="h-4 w-4" aria-hidden="true" /> Permissões globais
            </Button>
            <Button size="sm" onClick={() => handleCreate("user")}>
              <Users2 className="h-4 w-4" aria-hidden="true" /> Novo usuário
            </Button>
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.tone ?? ""}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou email" className="pl-8" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Kanban */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {(["admin", "user", "viewer"] as AppRole[]).map((r) => (
              <UserKanbanColumn
                key={r}
                role={r}
                users={grouped[r]}
                overrides={overrides}
                onAddUser={() => handleCreate(r)}
                onEditUser={handleEdit}
                onToggleStatus={handleToggleStatus}
                onResetPassword={handleResetPassword}
                onViewPermissions={handleEdit}
                onViewHistory={handleViewHistory}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
            {activeUser ? (
              <UserCard
                user={activeUser}
                hasOverride={overrides.has(activeUser.id)}
                isOverlay
                onEdit={() => {}}
                onToggleStatus={() => {}}
                onResetPassword={() => {}}
                onViewPermissions={() => {}}
                onViewHistory={() => {}}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initialRole={formInitialRole}
        user={editingUser}
        onDone={load}
      />
      <RolePermissionsDrawer open={permsOpen} onOpenChange={setPermsOpen} />
      <InviteLinkDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <UserAuditDialog open={auditOpen} onOpenChange={setAuditOpen} user={auditUser} />
    </main>
  );
}
