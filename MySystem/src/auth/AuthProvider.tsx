import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "member";
}

interface AuthValue {
  /** "unconfigured": build sem as variáveis do Supabase. */
  mode: "unconfigured" | "remote";
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  /** Sessão válida mas o perfil não pôde ser lido. */
  profileError: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Traduz as mensagens mais comuns do Supabase Auth. */
function friendly(message: string): string {
  if (/invalid login credentials/i.test(message)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(message)) return "E-mail ainda não confirmado. Fale com o administrador.";
  if (/network|fetch/i.test(message)) return "Sem conexão com o servidor. Verifique a internet.";
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(supabase !== null);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!supabase || !s) {
      setProfile(null);
      setProfileError(null);
      return;
    }
    const { data, error } = await supabase.from("profiles").select("id,email,full_name,role").eq("id", s.user.id).maybeSingle();
    setProfile((data as Profile | null) ?? null);
    setProfileError(error ? error.message : data ? null : "Seu usuário não tem perfil no sistema. Fale com o administrador.");
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session);
      if (active) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // Fora do callback: chamar o Supabase dentro dele pode travar a sessão.
      setTimeout(() => void loadProfile(s), 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return "Supabase não configurado.";
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? friendly(error.message) : null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  const refreshProfile = useCallback(() => loadProfile(session), [loadProfile, session]);

  return (
    <AuthContext.Provider
      value={{
        mode: supabase ? "remote" : "unconfigured",
        loading,
        session,
        profile,
        isAdmin: profile?.role === "admin",
        profileError,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fora do AuthProvider");
  return ctx;
}
