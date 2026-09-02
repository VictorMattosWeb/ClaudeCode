import { useEffect, useState } from "react";
import { Link2, Copy, Check, Loader2, Ban, RefreshCw } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { notifyError } from "@/lib/errorMessages";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Convite {
  id: string;
  token: string;
  email: string | null;
  cargo: string | null;
  criado_em: string;
  expira_em: string;
  usado_em: string | null;
  revogado: boolean;
}

const VALIDADES = [
  { dias: 1, label: "1 dia" },
  { dias: 7, label: "7 dias" },
  { dias: 30, label: "30 dias" },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const linkDoToken = (token: string) => `${window.location.origin}/cadastro/${token}`;

/**
 * Token do convite.
 *
 * `crypto.getRandomValues` em vez de `Math.random`: o token é a única coisa que
 * separa um estranho de uma conta no sistema, e `Math.random` é previsível o
 * bastante para não servir a esse papel. 32 bytes em base64url dão ~256 bits.
 */
function gerarToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Estado de um convite, para leitura rápida na lista. */
function situacao(c: Convite): { label: string; tone: string } {
  if (c.revogado) return { label: "Revogado", tone: "border-border bg-muted text-muted-foreground" };
  if (c.usado_em) return { label: "Utilizado", tone: "border-success/40 bg-success/10 text-success" };
  if (new Date(c.expira_em) < new Date())
    return { label: "Expirado", tone: "border-border bg-muted text-muted-foreground" };
  return { label: "Ativo", tone: "border-primary/40 bg-primary-soft text-primary" };
}

/**
 * Geração de links de cadastro.
 *
 * O administrador cria um link, envia por fora (e-mail, mensagem) e a pessoa se
 * cadastra sozinha em `/cadastro/<token>`. A tabela `convites` é protegida por
 * RLS que exige o papel de administrador, então esta tela nem carrega para
 * outros perfis — e a rota `/usuarios` que a contém já é `requireAdmin`.
 */
export function InviteLinkDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [convites, setConvites] = useState<Convite[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState("");
  const [validade, setValidade] = useState("7");

  const carregar = async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from("convites" as never)
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(30);
    setCarregando(false);
    if (error) {
      notifyError(error, "Não foi possível carregar os convites.");
      return;
    }
    setConvites((data ?? []) as unknown as Convite[]);
  };

  useEffect(() => {
    if (open) void carregar();
  }, [open]);

  const gerar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGerando(true);

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setGerando(false);
      toast.error("Sessão expirada. Entre novamente.");
      return;
    }

    const token = gerarToken();
    const expira = new Date();
    expira.setDate(expira.getDate() + Number(validade));

    const { error } = await supabase.from("convites" as never).insert({
      token,
      email: email.trim() || null,
      cargo: cargo.trim() || null,
      criado_por: uid,
      expira_em: expira.toISOString(),
    } as never);

    setGerando(false);
    if (error) {
      notifyError(error, "Não foi possível gerar o convite.");
      return;
    }

    await navigator.clipboard.writeText(linkDoToken(token)).catch(() => undefined);
    toast.success("Link gerado e copiado", {
      description: "Envie para a pessoa que vai criar a conta.",
    });
    setEmail("");
    setCargo("");
    void carregar();
  };

  const copiar = async (token: string) => {
    await navigator.clipboard.writeText(linkDoToken(token));
    setCopiado(token);
    toast.success("Link copiado");
    window.setTimeout(() => setCopiado(null), 1800);
  };

  const revogar = async (id: string) => {
    const { error } = await supabase
      .from("convites" as never)
      .update({ revogado: true } as never)
      .eq("id", id);
    if (error) {
      notifyError(error, "Não foi possível revogar o convite.");
      return;
    }
    toast.success("Convite revogado");
    void carregar();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[95vw] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="pr-10">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4 text-primary" aria-hidden="true" />
            Links de cadastro
          </DialogTitle>
          <DialogDescription className="text-xs">
            Gere um link para que a pessoa crie a própria conta. O link expira e pode ser revogado
            a qualquer momento.
          </DialogDescription>
        </DialogHeader>

        {/* ---------- Novo convite ---------- */}
        <form onSubmit={gerar} className="space-y-4 border border-border bg-card p-4">
          <p className="hud-label">NOVO_CONVITE</p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="i-email" className="font-hud text-[10px] uppercase text-muted-foreground">
                Restringir ao email (opcional)
              </Label>
              <Input
                id="i-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pessoa@empresa.com"
                className="h-10"
                aria-describedby="i-email-hint"
              />
              <p id="i-email-hint" className="text-[11px] text-muted-foreground">
                Se preenchido, o campo vem travado no cadastro.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="i-validade" className="font-hud text-[10px] uppercase text-muted-foreground">
                Validade
              </Label>
              <Select value={validade} onValueChange={setValidade}>
                <SelectTrigger id="i-validade" className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VALIDADES.map((v) => (
                    <SelectItem key={v.dias} value={String(v.dias)}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="i-cargo" className="font-hud text-[10px] uppercase text-muted-foreground">
              Cargo (opcional)
            </Label>
            <Input
              id="i-cargo"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="Ex.: Técnico de preservação"
              className="h-10"
            />
          </div>

          <Button type="submit" size="sm" disabled={gerando}>
            {gerando ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Link2 className="h-4 w-4" aria-hidden="true" />
            )}
            Gerar link
          </Button>
        </form>

        {/* ---------- Convites existentes ---------- */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-3">
            <h3 className="shrink-0 text-xs font-semibold uppercase tracking-wide">Convites recentes</h3>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void carregar()} aria-label="Recarregar">
              <RefreshCw className={cn("h-3.5 w-3.5", carregando && "animate-spin")} />
            </Button>
          </div>

          {carregando && convites.length === 0 && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
            </div>
          )}

          {!carregando && convites.length === 0 && (
            <div className="border border-dashed border-border px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">Nenhum convite gerado ainda.</p>
            </div>
          )}

          {convites.map((c) => {
            const s = situacao(c);
            const ativo = s.label === "Ativo";
            return (
              <div key={c.id} className="flex flex-wrap items-center gap-3 border border-border bg-card p-3">
                <span className={cn("border px-1.5 py-0.5 text-[10px] font-medium", s.tone)}>{s.label}</span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{c.email || "Qualquer email"}</p>
                  <p className="font-hud mt-0.5 text-[10px] text-muted-foreground">
                    {c.cargo ? `${c.cargo} · ` : ""}expira {formatDate(c.expira_em)}
                  </p>
                </div>

                {ativo && (
                  <div className="flex gap-1">
                    <Button variant="hud" size="sm" onClick={() => void copiar(c.token)}>
                      {copiado === c.token ? (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {copiado === c.token ? "Copiado" : "Copiar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => void revogar(c.id)}
                      aria-label="Revogar convite"
                      title="Revogar"
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
