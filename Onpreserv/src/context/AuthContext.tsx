import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { describeError } from "@/lib/errorMessages";

export type AppRole = "admin" | "user" | "viewer";
/**
 * Módulos da aplicação. Fonte única da verdade: derivada de ALL_MODULES para que
 * adicionar/remover um módulo seja uma mudança em um único lugar (OCP).
 */
export const ALL_MODULES = [
  "dashboard",
  "lotes",
  "preservacoes",
  "atividades",
  "cronograma",
  "tarefas",
  "solicitacoes",
] as const;

export type AppModule = (typeof ALL_MODULES)[number];

export interface Profile {
  id: string;
  nome: string;
  email: string;
  status: "ativo" | "inativo";
  cargo?: string | null;
  /** Caminho do arquivo no bucket `avatars`, não uma URL — o bucket é privado. */
  avatar_url?: string | null;
}

export type Permissions = Record<AppModule, boolean>;

/** Mapa de permissões com o mesmo valor para todos os módulos. */
export const defaultPermissions = (allowed: boolean): Permissions =>
  ALL_MODULES.reduce((acc, m) => ({ ...acc, [m]: allowed }), {} as Permissions);

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  permissions: Permissions;
  loading: boolean;
  isAdmin: boolean;
  isViewer: boolean;
  canWrite: boolean;
  authReady: boolean;
  canAccess: (module: AppModule) => boolean;
  /** Relê o perfil do servidor. Usado após editar nome ou foto. */
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<Permissions>(defaultPermissions(false));
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  const loadProfile = async (uid: string) => {
    const [{ data: prof }, { data: roles }, { data: perms }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("user_permissions").select("module, allowed, is_override").eq("user_id", uid),
    ]);
    setProfile(prof as Profile | null);
    const r = roles?.find((x) => x.role === "admin") ? "admin" : roles?.[0]?.role ?? null;
    const effectiveRole = (r as AppRole) ?? null;
    setRole(effectiveRole);

    // Carrega permissões globais do perfil (role_permissions, ação "view")
    const map = defaultPermissions(false);
    if (effectiveRole === "admin") {
      ALL_MODULES.forEach((m) => (map[m] = true));
    } else if (effectiveRole) {
      const { data: rolePerms } = await supabase
        .from("role_permissions")
        .select("module, allowed")
        .eq("role", effectiveRole)
        .eq("action", "view");
      (rolePerms ?? []).forEach((p: any) => {
        if (p.module in map) map[p.module as AppModule] = !!p.allowed;
      });
    }

    // Overrides individuais (apenas quando is_override = true) prevalecem
    (perms ?? []).forEach((p: any) => {
      if (p.is_override && p.module in map) map[p.module as AppModule] = !!p.allowed;
    });
    setPermissions(map);
  };


  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setAuthReady(true);
      if (sess?.user) {
        setLoading(true);
        setTimeout(() => {
          loadProfile(sess.user.id).finally(() => setLoading(false));
        }, 0);
      } else {
        setProfile(null);
        setRole(null);
        setPermissions(defaultPermissions(false));
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setAuthReady(true);
      if (sess?.user) loadProfile(sess.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: describeError(error, "Não foi possível entrar. Verifique seus dados e tente novamente.") };
    if (data.user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", data.user.id)
        .maybeSingle();
      if (prof?.status === "inativo") {
        await supabase.auth.signOut();
        return { error: "Seu acesso está inativo. Procure um administrador." };
      }
    }
    return { error: null };
  };

  const signUp = async (email: string, password: string, nome: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl, data: { nome } },
    });
    if (error) return { error: describeError(error, "Não foi possível criar a conta. Tente novamente.") };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Relê apenas o perfil (não papéis nem permissões): é o que muda quando a
  // pessoa edita a própria conta, e recarregar o resto seria desperdício.
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (data) setProfile(data as Profile);
  }, [user]);

  const isAdmin = role === "admin";
  const isViewer = role === "viewer";
  const canWrite = !isViewer && !!role;
  const canAccess = (module: AppModule) => isAdmin || permissions[module] === true;
  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      role,
      permissions,
      loading,
      isAdmin,
      isViewer,
      canWrite,
      authReady,
      canAccess,
      refreshProfile,
      signIn,
      signUp,
      signOut,
    }),
    [session, user, profile, role, permissions, loading, isAdmin, isViewer, canWrite, authReady, refreshProfile],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
