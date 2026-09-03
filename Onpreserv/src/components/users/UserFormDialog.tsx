import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { supabase } from "@/services/adapters/supabase/client";
import { toast } from "sonner";
import { ALL_MODULES, defaultPermissions, type AppModule, type AppRole } from "@/context/AuthContext";
import { MODULE_LABELS, ROLE_LABELS } from "@/lib/permissions";
import type { ManagedUser } from "@/pages/UsersKanban";
import { applyRolePermissionsToUsers } from "@/lib/applyRolePermissions";
import { runWithRetry } from "@/lib/runWithRetry";
import { notifyError } from "@/lib/errorMessages";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: "create" | "edit";
  initialRole?: AppRole;
  user?: ManagedUser | null;
  onDone: () => void;
}

export function UserFormDialog({ open, onOpenChange, mode, initialRole, user, onDone }: Props) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("user");
  const [status, setStatus] = useState<"ativo" | "inativo">("ativo");
  const [cargo, setCargo] = useState<string>("");
  const [cargosDisponiveis, setCargosDisponiveis] = useState<{ nome: string; categoria: string }[]>([]);
  const [override, setOverride] = useState(false);
  // Derivado de ALL_MODULES: incluir ou remover um módulo não exige mais editar este arquivo.
  const [perms, setPerms] = useState<Record<AppModule, boolean>>(() => defaultPermissions(true));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from("cargos" as any).select("nome, categoria").order("nome").then(({ data }) => {
      setCargosDisponiveis((data ?? []) as any);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && user) {
      setNome(user.nome);
      setEmail(user.email);
      setRole(user.role ?? "user");
      setStatus(user.status);
      setCargo("");
      supabase.from("profiles").select("cargo").eq("id", user.id).maybeSingle().then(({ data }) => {
        setCargo(((data as any)?.cargo as string) ?? "");
      });
      // load overrides
      supabase.from("user_permissions").select("module, allowed, is_override").eq("user_id", user.id).eq("is_override", true).then(({ data }) => {
        if (data && data.length > 0) {
          setOverride(true);
          const map = { ...perms };
          data.forEach((p: any) => { if (p.module in map) map[p.module as AppModule] = !!p.allowed; });
          setPerms(map);
        } else {
          setOverride(false);
        }
      });
    } else {
      setNome(""); setEmail(""); setPassword(""); setCargo("");
      setRole(initialRole ?? "user");
      setStatus("ativo");
      setOverride(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (mode === "create") {
        const { data, error } = await runWithRetry(async () => await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/`, data: { nome, role } },
        }));
        if (error) throw error;
        if (data.user) {
          if (cargo) {
            await runWithRetry(async () => await supabase.from("profiles").update({ cargo }).eq("id", data.user!.id));
          }
          if (role !== "user") {
            const { error: deleteRoleError } = await runWithRetry(async () => await supabase.from("user_roles").delete().eq("user_id", data.user.id));
            if (deleteRoleError) throw deleteRoleError;
            const { error: insertRoleError } = await runWithRetry(async () => await supabase.from("user_roles").insert({ user_id: data.user.id, role }));
            if (insertRoleError) throw insertRoleError;
          }
          if (override) {
            const { error: deletePermsError } = await runWithRetry(async () => await supabase.from("user_permissions").delete().eq("user_id", data.user.id));
            if (deletePermsError) throw deletePermsError;
            const { error: insertPermsError } = await runWithRetry(async () => await supabase.from("user_permissions").insert(
              ALL_MODULES.map((m) => ({ user_id: data.user!.id, module: m, allowed: perms[m], is_override: true })),
            ));
            if (insertPermsError) throw insertPermsError;
          } else {
            // garante que o novo usuário herde as permissões do perfil
            await applyRolePermissionsToUsers(role, [data.user.id]);
          }
          const { error: auditError } = await runWithRetry(async () => await supabase.from("user_audit_log").insert({
            user_id: data.user.id,
            actor_id: (await supabase.auth.getUser()).data.user?.id ?? null,
            acao: "criado",
            detalhes: { nome, email, role },
          }));
          if (auditError) throw auditError;
        }
        toast.success("Usuário criado");
      } else if (user) {
        const { error: profileError } = await runWithRetry(async () => await supabase.from("profiles").update({ nome, status, cargo: cargo || null }).eq("id", user.id));
        if (profileError) throw profileError;
        if (role !== user.role) {
          const { error: deleteRoleError } = await runWithRetry(async () => await supabase.from("user_roles").delete().eq("user_id", user.id));
          if (deleteRoleError) throw deleteRoleError;
          const { error: insertRoleError } = await runWithRetry(async () => await supabase.from("user_roles").insert({ user_id: user.id, role }));
          if (insertRoleError) throw insertRoleError;
          const { error: auditRoleError } = await runWithRetry(async () => await supabase.from("user_audit_log").insert({
            user_id: user.id,
            actor_id: (await supabase.auth.getUser()).data.user?.id ?? null,
            acao: "perfil_alterado",
            detalhes: { de: user.role, para: role },
          }));
          if (auditRoleError) throw auditRoleError;
        }
        const { error: deletePermsError } = await runWithRetry(async () => await supabase.from("user_permissions").delete().eq("user_id", user.id));
        if (deletePermsError) throw deletePermsError;
        if (override) {
          const { error: insertPermsError } = await runWithRetry(async () => await supabase.from("user_permissions").insert(
            ALL_MODULES.map((m) => ({ user_id: user.id, module: m, allowed: perms[m], is_override: true })),
          ));
          if (insertPermsError) throw insertPermsError;
          const { error: auditPermsError } = await runWithRetry(async () => await supabase.from("user_audit_log").insert({
            user_id: user.id,
            actor_id: (await supabase.auth.getUser()).data.user?.id ?? null,
            acao: "permissoes_alteradas",
            detalhes: perms,
          }));
          if (auditPermsError) throw auditPermsError;
        } else {
          // sem override → herda do perfil
          await applyRolePermissionsToUsers(role, [user.id]);
        }
        toast.success("Usuário atualizado");
      }
      onOpenChange(false);
      onDone();
    } catch (err: any) {
      notifyError(err, "Não foi possível salvar as alterações.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "Novo usuário" : "Editar usuário"}</DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Crie um novo acesso e defina o perfil."
                : "Atualize dados, perfil e permissões personalizadas."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" required disabled={mode === "edit"} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            {mode === "create" && (
              <div className="space-y-1.5">
                <Label>Senha temporária</Label>
                <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Perfil</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                    <SelectItem value="user">{ROLE_LABELS.user}</SelectItem>
                    <SelectItem value="viewer">{ROLE_LABELS.viewer}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {mode === "edit" && (
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as "ativo" | "inativo")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Cargo</Label>
              <Select value={cargo || "__none__"} onValueChange={(v) => setCargo(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Sem cargo —</SelectItem>
                  {cargosDisponiveis.map((c) => (
                    <SelectItem key={c.nome} value={c.nome}>
                      {c.nome} <span className="text-xs text-muted-foreground ml-1">({c.categoria})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Permissões personalizadas</p>
                  <p className="text-xs text-muted-foreground">
                    Sobrescreve quais módulos este usuário pode visualizar.
                  </p>
                </div>
                <Switch checked={override} onCheckedChange={setOverride} />
              </div>
              {override && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {ALL_MODULES.map((m) => (
                    <label key={m} className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
                      <span>{MODULE_LABELS[m]}</span>
                      <Switch checked={perms[m]} onCheckedChange={(c) => setPerms({ ...perms, [m]: !!c })} />
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
