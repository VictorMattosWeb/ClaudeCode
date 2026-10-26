import { useState } from "react";
import { ArrowRight, Lock, Mail, Zap } from "lucide-react";
import { Field, TextInput } from "@/components/ui/fields";
import { useAuth } from "./AuthProvider";

/** Login: media card stone-900 do design system ao lado do formulário em card claro. Sem cadastro público. */
export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await signIn(email, password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-stone-200 p-4">
      <div className="grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
        <article className="relative hidden min-h-[440px] flex-col justify-between overflow-hidden rounded-3xl bg-stone-900 p-8 shadow-deep md:flex">
          <div className="absolute inset-0 bg-gradient-to-tr from-stone-900/70 via-stone-900/10 to-transparent" />
          <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-900 shadow-md">
            <Zap className="h-6 w-6" />
          </span>
          <div className="relative">
            <p className="text-3xl font-semibold tracking-tight text-white">
              MySystem
              <br />
              Comissionamento
            </p>
            <p className="mt-2 text-sm text-stone-200">Quadros, documentos e prazos do time num só lugar.</p>
          </div>
        </article>

        <div className="ring-1 ring-stone-200 bg-white rounded-3xl shadow-card p-8">
          <div className="mb-8 flex items-center gap-2.5 md:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-900 text-stone-100 shadow-md">
              <Zap className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold tracking-tight">MySystem</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
          <p className="text-sm text-stone-500">Use o e-mail e a senha fornecidos pelo administrador.</p>

          <form className="mt-8 space-y-5" onSubmit={submit}>
            <Field label="E-mail">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <TextInput type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="voce@empresa.com" />
              </div>
            </Field>
            <Field label="Senha">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <TextInput type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" placeholder="••••••••" />
              </div>
            </Field>

            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-stone-100 hover:bg-stone-800 disabled:opacity-50"
            >
              {busy ? "Entrando…" : "Entrar"}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-6 border-t border-stone-200 pt-4 text-sm text-stone-500">
            {forgot ? (
              <p>Peça ao administrador do sistema para redefinir a sua senha.</p>
            ) : (
              <button type="button" onClick={() => setForgot(true)} className="font-medium text-stone-600 hover:text-stone-900">
                Esqueci a senha
              </button>
            )}
            <p className="mt-2 text-xs text-stone-400">Não há cadastro aberto: as contas são criadas pelo administrador.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
