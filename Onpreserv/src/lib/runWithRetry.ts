import { supabase } from "@/services/adapters/supabase/client";

const RETRYABLE_FETCH_RE = /networkerror|failed to fetch|load failed|fetch/i;
const AUTH_ERROR_RE = /jwt|token|expired|not authenticated|401|permission denied for schema/i;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableNetworkError(error: unknown) {
  if (error instanceof TypeError) return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return RETRYABLE_FETCH_RE.test(message);
}

/** Detecta resultados do Supabase ({ error }) causados por sessão/token expirado. */
function isAuthResultError(result: unknown) {
  const err = (result as { error?: { message?: string; status?: number } } | null)?.error;
  if (!err) return false;
  if (err.status === 401 || err.status === 403) return true;
  return AUTH_ERROR_RE.test(err.message ?? "");
}

/** Garante que o access token esteja válido antes de disparar a requisição. */
export async function ensureFreshSession() {
  try {
    const { data } = await supabase.auth.getSession();
    const expiresAt = data.session?.expires_at;
    if (!expiresAt) return;
    // renova proativamente se faltar menos de 60s
    if (expiresAt * 1000 - Date.now() < 60_000) {
      await supabase.auth.refreshSession();
    }
  } catch {
    /* segue o fluxo — o retry cobre falhas pontuais */
  }
}

export async function runWithRetry<T>(operation: () => Promise<T>, retries = 1, delayMs = 300): Promise<T> {
  let lastError: unknown;
  await ensureFreshSession();

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const result = await operation();
      // Supabase não lança erro de auth: ele volta em result.error
      if (attempt < retries && isAuthResultError(result)) {
        await supabase.auth.refreshSession();
        await sleep(delayMs);
        continue;
      }
      return result;
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !isRetryableNetworkError(error)) {
        throw error;
      }
      await sleep(delayMs * (attempt + 1));
    }
  }

  if (lastError) throw lastError;
  return operation();
}
