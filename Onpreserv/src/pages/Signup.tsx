import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Loader2, ArrowRight, UserPlus, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/** Motivos que a função `validar_convite` pode devolver. */
const MOTIVO_TEXTO: Record<string, string> = {
  inexistente: "Este link de cadastro não existe.",
  revogado: "Este convite foi revogado pelo administrador.",
  usado: "Este convite já foi utilizado para criar uma conta.",
  expirado: "Este convite expirou. Peça um novo ao administrador.",
};

/** Retorno de `validar_convite`. Regerar `types.ts` após aplicar a migration. */
interface ConviteValidado {
  valido: boolean;
  motivo: string;
  email: string | null;
  cargo: string | null;
}

type Validacao =
  | { estado: "carregando" }
  | { estado: "invalido"; motivo: string }
  | { estado: "valido"; email: string | null; cargo: string | null };

const SENHA_MINIMA = 8;

/**
 * Cadastro por convite.
 *
 * Rota pública em `/cadastro/:token`. A validação do token acontece no banco,
 * via `validar_convite`, uma função `SECURITY DEFINER` que devolve apenas se o
 * convite serve e para qual e-mail — a tabela `convites` continua invisível
 * para quem não é administrador, então um link inválido não revela nada sobre
 * os outros convites existentes.
 */
export default function Signup() {
  const { token = "" } = useParams();
  const { session, signUp, signIn } = useAuth();
  const navigate = useNavigate();

  const [validacao, setValidacao] = useState<Validacao>({ estado: "carregando" });
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    document.title = "Criar conta | onPreserv";
  }, []);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      // `as never` nos argumentos porque `types.ts` é gerado e ainda não conhece
      // as RPCs criadas nesta migration. Regerar os tipos depois de aplicá-la.
      const { data, error } = await supabase.rpc(
        "validar_convite" as never,
        { _token: token } as never,
      );
      if (cancelado) return;

      if (error) {
        setValidacao({ estado: "invalido", motivo: "Não foi possível validar o convite." });
        return;
      }
      // A RPC devolve uma linha; `data` chega como `never` porque o nome da
      // função ainda não existe nos tipos gerados.
      const bruto = data as unknown;
      const linha = (Array.isArray(bruto) ? bruto[0] : bruto) as ConviteValidado | null | undefined;
      if (!linha?.valido) {
        setValidacao({
          estado: "invalido",
          motivo: MOTIVO_TEXTO[linha?.motivo ?? ""] ?? "Convite inválido.",
        });
        return;
      }
      setValidacao({ estado: "valido", email: linha.email ?? null, cargo: linha.cargo ?? null });
      if (linha.email) setEmail(linha.email);
    })();

    return () => { cancelado = true; };
  }, [token]);

  // Já autenticado e sem cadastro em andamento: não há o que fazer aqui.
  if (session && !concluido) return <Navigate to="/" replace />;

  const emailTravado = validacao.estado === "valido" && !!validacao.email;

  const erroSenha =
    senha.length > 0 && senha.length < SENHA_MINIMA
      ? `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres.`
      : confirmacao.length > 0 && senha !== confirmacao
        ? "As senhas não coincidem."
        : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (erroSenha || senha.length < SENHA_MINIMA || senha !== confirmacao) return;

    setEnviando(true);
    const { error } = await signUp(email, senha, nome);

    if (error) {
      setEnviando(false);
      toast.error("Não foi possível criar a conta", { description: error });
      return;
    }

    // O signUp pode ou não já deixar a sessão ativa, dependendo da confirmação
    // de e-mail do projeto. Tentamos entrar para conseguir consumir o convite —
    // `consumir_convite` exige um usuário autenticado.
    const { error: erroLogin } = await signIn(email, senha);
    if (!erroLogin) {
      const { error: erroConsumo } = await supabase.rpc(
        "consumir_convite" as never,
        { _token: token } as never,
      );
      if (erroConsumo) {
        // A conta existe; o convite ficar aberto é problema menor e recuperável
        // pelo administrador. Não vale bloquear o acesso por isso.
        console.error("[Signup] falha ao consumir convite:", erroConsumo);
      }
      setEnviando(false);
      toast.success("Conta criada. Bem-vindo!");
      navigate("/");
      return;
    }

    // Sem sessão: o projeto exige confirmação por e-mail.
    setEnviando(false);
    setConcluido(true);
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-6 py-10">
      {/* Cantos de HUD */}
      <div className="pointer-events-none fixed inset-0 z-50 p-4" aria-hidden="true">
        <span className="hud-mark left-4 top-4 border-l border-t" />
        <span className="hud-mark right-4 top-4 border-r border-t" />
        <span className="hud-mark bottom-4 left-4 border-b border-l" />
        <span className="hud-mark bottom-4 right-4 border-b border-r" />
      </div>

      <main className="w-full max-w-[420px]">
        <div className="mb-7">
          <span className="hud-label">CRIAR_CONTA</span>
          <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tightest">onPreserv</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Preencha seus dados para ativar o acesso ao sistema.
          </p>
        </div>

        {/* ---------- Validando ---------- */}
        {validacao.estado === "carregando" && (
          <div className="flex items-center gap-3 border border-border bg-card p-6">
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Validando convite…</p>
          </div>
        )}

        {/* ---------- Convite inválido ---------- */}
        {validacao.estado === "invalido" && (
          <div className="border border-destructive/40 bg-card p-6 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-destructive" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium">Convite indisponível</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{validacao.motivo}</p>
            <Button asChild variant="outline" size="sm" className="mt-5">
              <Link to="/auth">Ir para o acesso</Link>
            </Button>
          </div>
        )}

        {/* ---------- Cadastro concluído, aguardando confirmação ---------- */}
        {concluido && (
          <div className="border border-primary/40 bg-card p-6 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium">Conta criada</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Enviamos um e-mail de confirmação para <strong>{email}</strong>. Confirme o endereço
              e depois entre no sistema.
            </p>
            <Button asChild size="sm" className="mt-5">
              <Link to="/auth">Ir para o acesso</Link>
            </Button>
          </div>
        )}

        {/* ---------- Formulário ---------- */}
        {validacao.estado === "valido" && !concluido && (
          <form onSubmit={handleSubmit} className="space-y-5 border border-border bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="s-nome" className="font-hud text-[10px] uppercase text-muted-foreground">
                Nome completo
              </Label>
              <Input
                id="s-nome"
                required
                autoComplete="name"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="s-email" className="font-hud text-[10px] uppercase text-muted-foreground">
                Email
              </Label>
              <Input
                id="s-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={emailTravado}
                aria-describedby={emailTravado ? "s-email-hint" : undefined}
                placeholder="voce@empresa.com"
                className="h-11 read-only:opacity-70"
              />
              {emailTravado && (
                <p id="s-email-hint" className="text-[11px] text-muted-foreground">
                  Este convite é exclusivo para este endereço.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="s-senha" className="font-hud text-[10px] uppercase text-muted-foreground">
                Senha
              </Label>
              <Input
                id="s-senha"
                type="password"
                required
                minLength={SENHA_MINIMA}
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo de 8 caracteres"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="s-conf" className="font-hud text-[10px] uppercase text-muted-foreground">
                Confirmar senha
              </Label>
              <Input
                id="s-conf"
                type="password"
                required
                autoComplete="new-password"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                placeholder="Repita a senha"
                className="h-11"
                aria-invalid={!!erroSenha}
              />
            </div>

            {erroSenha && (
              <p role="alert" className="text-xs text-destructive">
                {erroSenha}
              </p>
            )}

            <Button type="submit" disabled={enviando || !!erroSenha} className="group h-11 w-full">
              {enviando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Criando conta…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Criar conta
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </>
              )}
            </Button>

            <div className="tech-separator" aria-hidden="true" />

            <p className="text-center text-xs text-muted-foreground">
              Já tem conta?{" "}
              <Link to="/auth" className="link-underline text-primary">
                Entrar
              </Link>
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
