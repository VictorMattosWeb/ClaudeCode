import { toast } from "sonner";

/**
 * Tradução centralizada de erros técnicos para mensagens claras em português.
 * Nunca expõe códigos, tokens, nomes de tabela ou stack traces ao usuário.
 */

const DEFAULT_MESSAGE =
  "Não foi possível concluir a operação. Tente novamente em instantes.";

type AnyError = {
  message?: string;
  code?: string;
  status?: number;
  statusCode?: string | number;
  error_description?: string;
  details?: string;
  hint?: string;
  name?: string;
} | null | undefined;

/** Regras por código de erro (Postgres / PostgREST / Storage / HTTP). */
const CODE_MESSAGES: Record<string, string> = {
  "23505": "Já existe um registro com essas informações. Verifique os dados e tente novamente.",
  "23503": "Este registro está vinculado a outros itens e não pode ser alterado ou excluído.",
  "23502": "Preencha todos os campos obrigatórios antes de salvar.",
  "23514": "Algum valor informado não é aceito neste campo. Revise os dados.",
  "22001": "Um dos textos informados é maior que o limite permitido.",
  "22P02": "Um dos valores informados está em formato inválido.",
  "42501": "Você não tem permissão para realizar esta ação.",
  "42P01": "Recurso indisponível no momento. Tente novamente mais tarde.",
  "PGRST116": "Registro não encontrado. Ele pode ter sido removido por outro usuário.",
  "PGRST301": "Sua sessão expirou. Entre novamente para continuar.",
  "23P01": "Esta operação conflita com outro registro existente.",
  "40001": "Outro usuário alterou este registro ao mesmo tempo. Tente novamente.",
  "57014": "A operação demorou mais que o esperado e foi interrompida. Tente novamente.",
};

const STATUS_MESSAGES: Record<number, string> = {
  400: "Os dados enviados não estão completos ou válidos. Revise e tente novamente.",
  401: "Sua sessão expirou. Entre novamente para continuar.",
  403: "Você não tem permissão para realizar esta ação.",
  404: "Registro não encontrado. Ele pode ter sido removido por outro usuário.",
  409: "Já existe um registro com essas informações.",
  413: "O arquivo enviado é muito grande.",
  429: "Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.",
  500: "O servidor encontrou um problema. Tente novamente em instantes.",
  502: "Serviço temporariamente indisponível. Tente novamente em instantes.",
  503: "Serviço temporariamente indisponível. Tente novamente em instantes.",
  504: "O servidor demorou para responder. Tente novamente.",
};

/** Regras por trecho de texto da mensagem original (em inglês, do backend). */
const TEXT_RULES: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "E-mail ou senha incorretos."],
  [/email not confirmed/i, "Confirme seu e-mail antes de entrar."],
  [/user already registered|already been registered/i, "Este e-mail já possui cadastro."],
  [/password should be at least/i, "A senha deve ter pelo menos 6 caracteres."],
  [/weak password/i, "Escolha uma senha mais forte."],
  [/invalid email/i, "Informe um e-mail válido."],
  [/email rate limit|over_email_send_rate/i, "Muitos e-mails enviados. Aguarde alguns minutos."],
  [/token.*(expired|invalid)|jwt|refresh token/i, "Sua sessão expirou. Entre novamente para continuar."],
  [/signup.*disabled/i, "Novos cadastros estão desativados no momento."],
  [/row-level security|violates row-level|not authorized|permission denied|forbidden/i, "Você não tem permissão para realizar esta ação."],
  [/duplicate key|already exists/i, "Já existe um registro com essas informações."],
  [/foreign key/i, "Este registro está vinculado a outros itens e não pode ser alterado ou excluído."],
  [/violates not-null/i, "Preencha todos os campos obrigatórios antes de salvar."],
  [/failed to fetch|network ?error|networkerror|load failed|err_internet/i, "Sem conexão com o servidor. Verifique sua internet e tente novamente."],
  [/timeout|timed out|aborted/i, "A operação demorou demais e foi interrompida. Tente novamente."],
  [/payload too large|exceeded the maximum|file size/i, "O arquivo enviado é muito grande."],
  [/mime type|invalid file type|not supported/i, "Este formato de arquivo não é aceito."],
  [/bucket not found|object not found/i, "Arquivo não encontrado no armazenamento."],
  [/quota|storage limit/i, "Limite de armazenamento atingido."],
  [/rate limit|too many requests/i, "Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente."],
  [/invalid input syntax|invalid uuid/i, "Um dos valores informados está em formato inválido."],
  [/function .* does not exist|relation .* does not exist|column .* does not exist/i, "Recurso indisponível no momento. Tente novamente mais tarde."],
];

/** Detecta mensagens que não devem ser exibidas (técnicas demais). */
const LOOKS_TECHNICAL =
  /[{}<>]|https?:\/\/|[0-9a-f]{8}-[0-9a-f]{4}|eyJ[A-Za-z0-9_-]{6,}|\bat \w+\.|_id\b|::|select |insert |update |delete from|pgrst|supabase|postgres|sql|jwt|token|api[_ ]?key|stack|undefined is not|null is not|cannot read propert/i;

const looksPortuguese = (msg: string) =>
  /[ãõçáéíóúâêô]|não|erro|falha|obrigat|permiss|inválid|senha|usuário|arquivo/i.test(msg);

/**
 * Converte qualquer erro em uma mensagem clara e profissional para o usuário.
 * @param error erro original (Supabase, Error, string, etc.)
 * @param fallback mensagem contextual usada quando o erro não é reconhecido
 */
export function describeError(error: unknown, fallback?: string): string {
  const fb = fallback?.trim() || DEFAULT_MESSAGE;
  if (!error) return fb;

  if (typeof error === "string") return describeError({ message: error }, fallback);

  const err = error as AnyError;
  if (!err) return fb;

  const code = String(err.code ?? err.statusCode ?? "").trim();
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];

  const status = Number(err.status ?? err.statusCode);
  if (!Number.isNaN(status) && STATUS_MESSAGES[status]) return STATUS_MESSAGES[status];

  const raw = [err.message, err.error_description, err.details, err.hint]
    .filter(Boolean)
    .join(" | ");

  if (raw) {
    for (const [re, msg] of TEXT_RULES) if (re.test(raw)) return msg;

    const single = (err.message ?? "").trim();
    // Mensagens já escritas em português e sem conteúdo técnico podem ser exibidas.
    if (single && single.length <= 160 && looksPortuguese(single) && !LOOKS_TECHNICAL.test(single)) {
      return single.endsWith(".") ? single : `${single}.`;
    }
  }

  return fb;
}

/** Exibe um toast de erro padronizado. */
export function notifyError(error: unknown, fallback?: string) {
  const description = describeError(error, fallback);
  const title = fallback && description !== fallback ? fallback : "Não foi possível concluir";
  if (import.meta.env.DEV) console.error("[erro]", error);
  return toast.error(title, { description });
}

/** Exibe um toast de sucesso padronizado. */
export function notifySuccess(message: string, description?: string) {
  return toast.success(message, description ? { description } : undefined);
}

/** Exibe um aviso padronizado (ação bloqueada, validação, etc.). */
export function notifyWarning(message: string, description?: string) {
  return toast.warning(message, description ? { description } : undefined);
}
