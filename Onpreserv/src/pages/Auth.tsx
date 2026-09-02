import { useState, useEffect, useMemo } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { Loader2, BookOpen, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/** Quantidade de partículas flutuantes sobre a arte. */
const MOTE_COUNT = 14;

/**
 * Posições e tempos das partículas.
 *
 * Sorteados uma única vez por montagem (useMemo sem dependências): se fossem
 * recalculados a cada render, as motas saltariam de lugar a cada tecla digitada
 * no formulário.
 */
function useMotes() {
  return useMemo(
    () =>
      Array.from({ length: MOTE_COUNT }, (_, i) => {
        const size = 1.5 + Math.random() * 3;
        return {
          id: i,
          left: `${8 + Math.random() * 84}%`,
          top: `${20 + Math.random() * 60}%`,
          width: `${size}px`,
          height: `${size}px`,
          animationDuration: `${11 + Math.random() * 14}s`,
          animationDelay: `${-Math.random() * 18}s`,
        };
      }),
    [],
  );
}

/**
 * Tela de acesso — duas colunas.
 *
 * Esquerda: o formulário, ocupando a altura inteira sobre o void com grid
 * técnico. Direita: o palco com a arte "Life Is On | Preserv", animada a partir
 * dos próprios elementos dela (esfera que respira, arco na borda iluminada,
 * flare central pulsando e partículas subindo).
 *
 * Abaixo de `lg` as colunas empilham: a arte vira uma faixa no topo e o
 * formulário assume a largura toda.
 */
export default function Auth() {
  const { session, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const motes = useMotes();

  useEffect(() => {
    document.title = "Entrar | onPreserv";
  }, []);

  if (!loading && session) return <Navigate to="/" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error });
    } else {
      toast.success("Acesso concedido");
      navigate("/");
    }
  };

  return (
    <div className="relative grid min-h-screen w-full grid-rows-[38vh_1fr] bg-background lg:grid-cols-[minmax(340px,25%)_1fr] lg:grid-rows-1">
      {/* Cantos de HUD nas quatro extremidades da tela (Aetheris). */}
      <div className="pointer-events-none fixed inset-0 z-50 p-4" aria-hidden="true">
        <span className="hud-mark left-4 top-4 border-l border-t" />
        <span className="hud-mark right-4 top-4 border-r border-t" />
        <span className="hud-mark bottom-4 left-4 border-b border-l" />
        <span className="hud-mark bottom-4 right-4 border-b border-r" />
      </div>

      {/* ================= COLUNA ESQUERDA — formulário ================= */}
      <div className="relative order-2 flex flex-col justify-between px-6 py-8 sm:px-10 lg:order-1 lg:px-8 lg:py-9 xl:px-10">
        {/* Topo: marca + status */}
        <header className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
            <span className="inline-block h-3 w-[2px] bg-primary shadow-glow" aria-hidden="true" />
            onPreserv
          </span>
          <div className="flex items-center gap-2">
            <span className="hud-dot" aria-hidden="true" />
            <span className="font-hud text-[10px] text-primary">SISTEMA ONLINE</span>
          </div>
        </header>

        {/* Meio: formulário */}
        <main className="flex flex-1 flex-col justify-center py-10">
          <div className="reveal-up mx-auto w-full max-w-[340px]">
            <div className="mb-8">
              <span className="hud-label">ACESSO_RESTRITO</span>
              <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tightest xl:text-3xl">
                Entre no sistema
              </h1>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                Lotes, cronograma e tarefas de campo em um só lugar.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="group space-y-2">
                <Label htmlFor="login-email" className="font-hud text-[10px] uppercase text-muted-foreground transition-colors duration-300 group-focus-within:text-primary">
                  Email
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@empresa.com"
                  className="h-11"
                />
              </div>

              <div className="group space-y-2">
                <Label htmlFor="login-password" className="font-hud text-[10px] uppercase text-muted-foreground">
                  Senha
                </Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11"
                />
              </div>

              <Button type="submit" disabled={submitting} className="group h-11 w-full">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Autenticando…
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </>
                )}
              </Button>
            </form>

            <div className="tech-separator my-7" aria-hidden="true" />

            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              Novas contas são criadas pelo administrador do sistema.
            </p>
          </div>
        </main>

        {/* Base: documentação + assinatura */}
        <footer className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="hud" size="sm">
            <Link to="/docs">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Documentação
            </Link>
          </Button>
          <span className="font-hud text-[9px] uppercase text-muted-foreground/50">
            Acesso monitorado
          </span>
        </footer>
      </div>

      {/* Emenda entre as colunas: fio mint no desktop, horizontal no mobile. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-[38vh] z-30 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent lg:inset-x-auto lg:inset-y-0 lg:left-[max(340px,25%)] lg:h-auto lg:w-px lg:bg-none"
        aria-hidden="true"
      >
        <span className="seam-line hidden lg:block" />
      </div>

      {/* ================= COLUNA DIREITA — a arte ================= */}
      <div className="login-stage order-1 lg:order-2" aria-hidden="true">
        <div className="login-art" />
        <div className="login-orbit" />
        <div className="login-core" />
        {motes.map(({ id, ...style }) => (
          <span key={id} className="login-mote" style={style} />
        ))}
        <div className="login-seam" />
      </div>
    </div>
  );
}
