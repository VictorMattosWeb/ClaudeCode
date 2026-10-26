import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Modal } from "@/components/ui/overlays";
import { Field, TextInput } from "@/components/ui/fields";
import { Pill, PrimaryButton, SecondaryButton } from "@/components/ui/primitives";
import { useAuth } from "./AuthProvider";

/** Meu perfil: nome exibido e troca de senha. O papel (admin/membro) só um admin altera. */
export function ProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(profile?.full_name ?? "");
    setPassword("");
    setConfirm("");
    setMessage(null);
  }, [open, profile]);

  const save = async () => {
    if (!supabase || !profile) return;
    if (password && password !== confirm) return setMessage({ ok: false, text: "As senhas não conferem." });
    if (password && password.length < 8) return setMessage({ ok: false, text: "A senha precisa ter ao menos 8 caracteres." });
    setBusy(true);
    setMessage(null);
    if (name.trim() !== profile.full_name) {
      const { error } = await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", profile.id);
      if (error) {
        setBusy(false);
        return setMessage({ ok: false, text: error.message });
      }
    }
    if (password) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setBusy(false);
        return setMessage({ ok: false, text: error.message });
      }
    }
    await refreshProfile();
    setBusy(false);
    setPassword("");
    setConfirm("");
    setMessage({ ok: true, text: "Perfil atualizado." });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Meu perfil"
      subtitle={profile?.email}
      width="max-w-md"
      footer={
        <>
          <SecondaryButton onClick={onClose}>Fechar</SecondaryButton>
          <PrimaryButton onClick={save} disabled={busy || !name.trim()}>{busy ? "Salvando…" : "Salvar"}</PrimaryButton>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-stone-500">Papel:</span>
          <Pill hue={profile?.role === "admin" ? "amber" : "stone"}>
            {profile?.role === "admin" && <Shield className="h-3 w-3" />}
            {profile?.role === "admin" ? "Administrador" : "Membro"}
          </Pill>
        </div>
        <Field label="Nome" hint="Aparece nos comentários e pode ser usado como responsável.">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="rounded-2xl p-4 ring-1 bg-stone-50 ring-stone-200">
          <p className="mb-3 text-sm font-medium">Trocar senha</p>
          <div className="space-y-3">
            <TextInput type="password" placeholder="Nova senha (mín. 8)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <TextInput type="password" placeholder="Repita a nova senha" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
        </div>
        {message && (
          <p className={message.ok ? "rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200" : "rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200"}>
            {message.text}
          </p>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
