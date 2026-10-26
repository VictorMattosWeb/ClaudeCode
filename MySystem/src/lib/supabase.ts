import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Cliente do Supabase, ou null quando o projeto ainda não foi configurado (.env).
 * Sem Supabase o app roda no modo local: sem login, dados só neste navegador.
 */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;
export const remoteEnabled = supabase !== null;
