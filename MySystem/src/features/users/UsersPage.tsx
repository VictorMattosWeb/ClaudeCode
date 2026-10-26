import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { KeyRound, MoreHorizontal, Shield, Trash2, UserPlus, Users } from "lucide-react";
import { useAuth, type Profile } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { ConfirmDialog, MenuItem, Modal, Popover } from "@/components/ui/overlays";
import { Field, Select, TextInput } from "@/components/ui/fields";
import { Card, GhostIconButton, IconTile, Pill, PrimaryButton, SecondaryButton } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/dates";
import { Avatar } from "@/features/activities/TaskBits";

type Row = Profile & { created_at: string };

/** Chama a Edge Function de gestão de contas (valida no servidor que quem chama é admin). */
async function adminCall(body: Record<string, unknown>): Promise<string | null> {
  const { data, error } = await supabase!.functions.invoke("admin-users", { body });
  if (error) {
    // Erros 4xx da função chegam como FunctionsHttpError com o JSON no contexto.
    try {
      const detail = await (error as { context?: Response }).context?.json();
      if (detail?.error) return detail.error as string;
    } catch {
      /* corpo não-JSON */
    }
    return error.message;
  }
  return (data as { error?: string })?.error ?? null;
}

function CreateUserDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("member");
    setError(null);
  }, [open]);

  const save = async () => {
    setBusy(true);
    setError(null);
    const err = await adminCall({ action: "create", fullName, email, password, role });
    setBusy(false);
    if (err) return setError(err);
    onDone();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova conta"
      subtitle="A pessoa entra com este e-mail e senha e pode trocar a senha depois em Meu perfil."
      width="max-w-md"
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={save} disabled={busy || !fullName.trim() || !email.trim() || password.length < 8}>
            {busy ? "Criando…" : "Criar conta"}
          </PrimaryButton>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Field label="Nome">
          <TextInput autoFocus value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome e sobrenome" />
        </Field>
        <Field label="E-mail">
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@empresa.com" />
        </Field>
        <Field label="Senha inicial" hint="Mínimo de 8 caracteres. Passe para a pessoa por um canal seguro.">
          <TextInput type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="Papel">
          <Select value={role} onChange={(e) => setRole(e.target.value as "member" | "admin")}>
            <option value="member">Membro: usa os quadros</option>
            <option value="admin">Administrador: também gerencia contas</option>
          </Select>
        </Field>
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">{error}</p>}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: Row | null; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setPassword("");
    setError(null);
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const err = await adminCall({ action: "reset-password", userId: user.id, password });
    setBusy(false);
    if (err) return setError(err);
    onClose();
  };

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title="Redefinir senha"
      subtitle={user?.full_name || user?.email}
      width="max-w-md"
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={save} disabled={busy || password.length < 8}>{busy ? "Salvando…" : "Definir senha"}</PrimaryButton>
        </>
      }
    >
      <Field label="Nova senha" hint="Mínimo de 8 caracteres.">
        <TextInput autoFocus type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
      </Field>
      {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">{error}</p>}
    </Modal>
  );
}

export function UsersPage() {
  const { isAdmin, profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase!.from("profiles").select("id,email,full_name,role,created_at").order("created_at");
    if (error) setError(error.message);
    else setRows((data ?? []) as Row[]);
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  if (!isAdmin) return <Navigate to="/painel" replace />;

  const run = async (body: Record<string, unknown>) => {
    const err = await adminCall(body);
    setError(err);
    await load();
  };

  return (
    <div className="ds-scroll h-full overflow-y-auto">
      <div className="px-4 pt-2 pb-10 md:px-8 md:pt-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-stone-500">Administração</p>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Usuários</h1>
            <p className="text-sm text-stone-500">{rows.length} conta{rows.length === 1 ? "" : "s"} · só administradores criam contas</p>
          </div>
          <PrimaryButton icon={UserPlus} className="py-2" onClick={() => setCreating(true)}>
            Nova conta
          </PrimaryButton>
        </header>

        {error && <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">{error}</p>}

        <Card className="overflow-hidden">
          <div className="flex items-center gap-3 p-6 pb-4">
            <IconTile icon={Users} hue="blue" />
            <p className="text-sm text-stone-500">Membros usam os quadros; administradores também gerenciam as contas.</p>
          </div>
          <div className="divide-y divide-stone-100 border-t border-stone-200">
            {rows.map((u) => {
              const me = u.id === profile?.id;
              return (
                <div key={u.id} className="flex items-center gap-4 px-6 py-4">
                  <Avatar name={u.full_name || u.email} size={8} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {u.full_name || "Sem nome"} {me && <span className="text-stone-400">(você)</span>}
                    </p>
                    <p className="truncate text-xs text-stone-500">{u.email}</p>
                  </div>
                  <span className="hidden text-xs text-stone-400 sm:inline">desde {formatDateTime(u.created_at)}</span>
                  <Pill hue={u.role === "admin" ? "amber" : "stone"}>
                    {u.role === "admin" && <Shield className="h-3 w-3" />}
                    {u.role === "admin" ? "Admin" : "Membro"}
                  </Pill>
                  <Popover align="right" trigger={({ toggle }) => <GhostIconButton icon={MoreHorizontal} label="Ações" ring small onClick={toggle} />}>
                    {(close) => (
                      <>
                        <MenuItem
                          icon={Shield}
                          disabled={me}
                          onClick={() => {
                            close();
                            void run({ action: "set-role", userId: u.id, role: u.role === "admin" ? "member" : "admin" });
                          }}
                        >
                          {u.role === "admin" ? "Tornar membro" : "Tornar administrador"}
                        </MenuItem>
                        <MenuItem icon={KeyRound} onClick={() => { close(); setResetting(u); }}>
                          Redefinir senha
                        </MenuItem>
                        <div className="my-1 h-px bg-stone-200" />
                        <MenuItem icon={Trash2} danger disabled={me} onClick={() => { close(); setDeleting(u); }}>
                          Excluir conta
                        </MenuItem>
                      </>
                    )}
                  </Popover>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <CreateUserDialog open={creating} onClose={() => setCreating(false)} onDone={() => void load()} />
      <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />
      <ConfirmDialog
        open={!!deleting}
        title="Excluir conta"
        message={<>A conta de <span className="font-medium text-stone-900">{deleting?.full_name || deleting?.email}</span> será excluída. As atividades e comentários dela continuam nos quadros.</>}
        confirmLabel="Excluir conta"
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && void run({ action: "delete", userId: deleting.id })}
      />
    </div>
  );
}
