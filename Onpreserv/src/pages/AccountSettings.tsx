import { useEffect, useMemo, useRef, useState } from "react";
import { UserCog, Loader2, Upload, Trash2, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/services/adapters/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notifyError } from "@/lib/errorMessages";
import { uploadAvatar, removeAvatarFile } from "@/lib/avatar";
import { UserAvatar } from "@/components/UserAvatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SENHA_MINIMA = 8;
const TAMANHO_MAXIMO = 2 * 1024 * 1024; // 2 MB
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];

/** Bloco de conteúdo com rótulo de instrumento. */
function Section({ title, code, children }: { title: string; code: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-3">
        <h2 className="shrink-0 text-xs font-semibold uppercase tracking-wide">{title}</h2>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        <span className="font-hud shrink-0 text-[9px] text-primary/70">{code}</span>
      </div>
      {children}
    </section>
  );
}

/**
 * Configurações da conta.
 *
 * Um único formulário com um único "Salvar alterações". A foto escolhida fica
 * **em espera** até o salvamento: antes ela subia no instante do clique, o que
 * criava um estado ambíguo — parte das mudanças já aplicada, parte não, sem a
 * tela deixar isso claro. Agora ou tudo é salvo, ou nada é.
 *
 * O botão só habilita quando existe diferença em relação ao servidor, e a barra
 * de ações lista o que está pendente.
 */
export default function AccountSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const inputFileRef = useRef<HTMLInputElement>(null);

  // ---- estado do servidor ----
  const [avatarPath, setAvatarPath] = useState<string | null>(null);

  // ---- rascunho local ----
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [fotoNova, setFotoNova] = useState<File | null>(null);
  const [previewLocal, setPreviewLocal] = useState<string | null>(null);
  const [marcadaParaRemover, setMarcadaParaRemover] = useState(false);

  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    document.title = "Minha conta | onPreserv";
  }, []);

  useEffect(() => {
    setNome(profile?.nome ?? "");
    setAvatarPath(profile?.avatar_url ?? null);
  }, [profile]);

  // A URL de preview é um recurso do navegador: sem revogar, cada troca de
  // arquivo deixa um blob pendurado na memória da aba.
  useEffect(() => {
    if (!fotoNova) {
      setPreviewLocal(null);
      return;
    }
    const url = URL.createObjectURL(fotoNova);
    setPreviewLocal(url);
    return () => URL.revokeObjectURL(url);
  }, [fotoNova]);


  // Marcada para remover: esconde o que está salvo sem apagar nada ainda.
  const pathExibido = marcadaParaRemover ? null : avatarPath;

  // ---------------------------------------------------------------- validação
  const erroSenha =
    senha.length > 0 && senha.length < SENHA_MINIMA
      ? `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres.`
      : confirmacao.length > 0 && senha !== confirmacao
        ? "As senhas não coincidem."
        : senha.length > 0 && confirmacao.length === 0
          ? "Confirme a nova senha."
          : null;

  const alteracoes = useMemo(() => {
    const lista: string[] = [];
    if (nome.trim() && nome.trim() !== (profile?.nome ?? "")) lista.push("nome");
    if (fotoNova) lista.push("foto");
    else if (marcadaParaRemover && avatarPath) lista.push("remoção da foto");
    if (senha.length > 0) lista.push("senha");
    return lista;
  }, [nome, profile?.nome, fotoNova, marcadaParaRemover, avatarPath, senha]);

  const podeSalvar = alteracoes.length > 0 && !erroSenha && !salvando;

  const descartar = () => {
    setNome(profile?.nome ?? "");
    setSenha("");
    setConfirmacao("");
    setFotoNova(null);
    setMarcadaParaRemover(false);
  };

  // ------------------------------------------------------------------ arquivo
  const escolherArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite reescolher o mesmo arquivo
    if (!file) return;

    if (!TIPOS_ACEITOS.includes(file.type)) {
      toast.error("Formato não aceito", { description: "Use JPG, PNG ou WebP." });
      return;
    }
    if (file.size > TAMANHO_MAXIMO) {
      toast.error("Arquivo muito grande", { description: "O limite é 2 MB." });
      return;
    }

    setFotoNova(file);
    setMarcadaParaRemover(false);
  };

  // ------------------------------------------------------------------- salvar
  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !podeSalvar) return;

    setSalvando(true);
    const pathAnterior = avatarPath;

    try {
      // 1. Foto primeiro, para o update do perfil já levar o caminho definitivo.
      let novoPath = avatarPath;
      if (fotoNova) novoPath = await uploadAvatar(user.id, fotoNova);
      else if (marcadaParaRemover) novoPath = null;

      // 2. Perfil: nome e caminho da foto num único update.
      const patch: Record<string, unknown> = {};
      if (nome.trim() && nome.trim() !== (profile?.nome ?? "")) patch.nome = nome.trim();
      if (novoPath !== avatarPath) patch.avatar_url = novoPath;

      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from("profiles").update(patch as never).eq("id", user.id);
        if (error) throw error;
      }

      // 3. Senha por último: é a operação que pode invalidar a sessão.
      if (senha.length > 0) {
        const { error } = await supabase.auth.updateUser({ password: senha });
        if (error) throw error;
      }

      // Só agora apaga o arquivo antigo. Apagar antes e falhar no meio deixaria
      // o perfil apontando para um arquivo que já não existe.
      if (novoPath !== pathAnterior) void removeAvatarFile(pathAnterior);

      setAvatarPath(novoPath);
      setFotoNova(null);
      setMarcadaParaRemover(false);
      setSenha("");
      setConfirmacao("");
      // Sem isto o cabeçalho segue com a foto antiga até a página recarregar.
      await refreshProfile();
      toast.success("Alterações salvas");
    } catch (err) {
      const msg = String((err as { message?: string })?.message ?? "");
      if (/bucket not found/i.test(msg) || /avatar_url/i.test(msg)) {
        toast.error("Armazenamento de fotos não configurado", {
          description: "O bucket `avatars` ou a coluna `avatar_url` ainda não existem no banco.",
        });
      } else {
        notifyError(err, "Não foi possível salvar as alterações.");
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={salvar} className="container mx-auto max-w-3xl space-y-8 px-3 py-6 sm:px-4">
      <PageHeader icon={UserCog} title="Minha conta" subtitle={profile?.email ?? ""} code="CTA_01" />

      {/* ---------------- Foto ---------------- */}
      <Section title="Foto de perfil" code="CTA_02">
        <div className="flex flex-wrap items-center gap-5 border border-border bg-card p-5">
          <UserAvatar
            path={pathExibido}
            nome={profile?.nome}
            previewUrl={previewLocal}
            size={80}
            className={cn(
              fotoNova || marcadaParaRemover ? "border-primary/60" : "border-border-strong",
            )}
          />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{profile?.nome ?? "—"}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              JPG, PNG ou WebP, até 2 MB.
              {(fotoNova || marcadaParaRemover) && (
                <span className="ml-1 text-primary">Pendente de salvamento.</span>
              )}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <input
                ref={inputFileRef}
                type="file"
                accept={TIPOS_ACEITOS.join(",")}
                onChange={escolherArquivo}
                className="sr-only"
                aria-label="Escolher foto de perfil"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={salvando}
                onClick={() => inputFileRef.current?.click()}
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                {avatarPath || fotoNova ? "Trocar foto" : "Escolher foto"}
              </Button>

              {(avatarPath || fotoNova) && !marcadaParaRemover && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={salvando}
                  onClick={() => { setFotoNova(null); setMarcadaParaRemover(true); }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Remover
                </Button>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* ---------------- Dados ---------------- */}
      <Section title="Dados pessoais" code="CTA_03">
        <div className="grid gap-4 border border-border bg-card p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="c-nome" className="font-hud text-[10px] uppercase text-muted-foreground">
              Nome
            </Label>
            <Input id="c-nome" value={nome} onChange={(e) => setNome(e.target.value)} required className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-email" className="font-hud text-[10px] uppercase text-muted-foreground">
              Email
            </Label>
            <Input
              id="c-email"
              value={profile?.email ?? ""}
              readOnly
              className="h-11 opacity-70"
              aria-describedby="c-email-hint"
            />
            <p id="c-email-hint" className="text-[11px] text-muted-foreground">
              A troca de e-mail é feita pelo administrador.
            </p>
          </div>
        </div>
      </Section>

      {/* ---------------- Senha ---------------- */}
      <Section title="Alterar senha" code="CTA_04">
        <div className="space-y-4 border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">Deixe em branco para manter a senha atual.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-senha" className="font-hud text-[10px] uppercase text-muted-foreground">
                Nova senha
              </Label>
              <Input
                id="c-senha"
                type="password"
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo de 8 caracteres"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-conf" className="font-hud text-[10px] uppercase text-muted-foreground">
                Confirmar
              </Label>
              <Input
                id="c-conf"
                type="password"
                autoComplete="new-password"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                placeholder="Repita a nova senha"
                className="h-11"
                aria-invalid={!!erroSenha}
              />
            </div>
          </div>

          {erroSenha && (
            <p role="alert" className="text-xs text-destructive">
              {erroSenha}
            </p>
          )}
        </div>
      </Section>

      {/* ---------------- Barra de salvamento ----------------
          Fixa no rodapé: o botão fica alcançável qualquer que seja a seção que
          a pessoa está editando, sem precisar rolar até o fim. */}
      <div className="sticky bottom-0 -mx-3 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/90 px-3 py-3 backdrop-blur-xl sm:-mx-4 sm:px-4">
        <p className="font-hud text-[10px] uppercase text-muted-foreground" aria-live="polite">
          {alteracoes.length === 0 ? "Nenhuma alteração pendente" : `Pendente: ${alteracoes.join(", ")}`}
        </p>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={descartar}
            disabled={alteracoes.length === 0 || salvando}
          >
            Descartar
          </Button>
          <Button type="submit" size="sm" disabled={!podeSalvar}>
            {salvando ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
            Salvar alterações
          </Button>
        </div>
      </div>
    </form>
  );
}
