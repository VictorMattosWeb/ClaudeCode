import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { LoginPage } from "./LoginPage";

/** Nada do sistema aparece sem login. Sem Supabase configurado no build, mostra o erro em vez de rodar sem banco. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { mode, loading, session, profile, profileError, signOut } = useAuth();
  if (mode === "unconfigured")
    return (
      <div className="flex h-full items-center justify-center bg-stone-200 p-6 text-center">
        <div className="max-w-md">
          <p className="text-lg font-semibold tracking-tight">Sistema sem banco de dados configurado</p>
          <p className="mt-1 text-sm text-stone-500">Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no build (arquivo .env ou variáveis da Cloudflare).</p>
        </div>
      </div>
    );
  if (loading) return <div className="flex h-full items-center justify-center bg-stone-200 text-sm text-stone-500">Carregando…</div>;
  if (!session) return <LoginPage />;
  if (!profile && profileError)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-stone-200 p-6 text-center">
        <p className="text-sm text-stone-600">{profileError}</p>
        <button type="button" onClick={() => void signOut()} className="rounded-xl bg-stone-900 px-3 py-2 text-xs font-medium text-stone-100 hover:bg-stone-800">
          Sair
        </button>
      </div>
    );
  if (!profile) return <div className="flex h-full items-center justify-center bg-stone-200 text-sm text-stone-500">Carregando perfil…</div>;
  return <>{children}</>;
}
