// Centralized validation rules + regex used across all forms.
// Keep regex here so they can be reused and audited in one place.

export const regex = {
  nome: /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,100}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  senhaForte: /^(?=.*[A-Za-z])(?=.*\d).{8,}$/,
  codigo: /^[A-Za-z0-9._-]{2,40}$/,
  numeroPositivo: /^\d+([.,]\d+)?$/,
  inteiroNaoNegativo: /^\d+$/,
  notaFiscal: /^\d{1,44}$/,
};

export type ValidationResult = { ok: true } | { ok: false; error: string };

const pass = (): ValidationResult => ({ ok: true });
const fail = (error: string): ValidationResult => ({ ok: false, error });

export const validators = {
  required(value: unknown, label = "Campo"): ValidationResult {
    if (value === null || value === undefined) return fail(`${label} é obrigatório`);
    if (typeof value === "string" && value.trim() === "") return fail(`${label} é obrigatório`);
    return pass();
  },
  minLength(value: string, min: number, label = "Campo"): ValidationResult {
    if ((value ?? "").trim().length < min) return fail(`${label} deve ter no mínimo ${min} caracteres`);
    return pass();
  },
  maxLength(value: string, max: number, label = "Campo"): ValidationResult {
    if ((value ?? "").length > max) return fail(`${label} deve ter no máximo ${max} caracteres`);
    return pass();
  },
  nome(value: string): ValidationResult {
    if (!regex.nome.test(value.trim())) return fail("Nome inválido (2 a 100 letras)");
    return pass();
  },
  email(value: string): ValidationResult {
    if (!regex.email.test(value.trim())) return fail("E-mail inválido");
    return pass();
  },
  senhaForte(value: string): ValidationResult {
    if (!regex.senhaForte.test(value)) return fail("Senha deve ter 8+ caracteres, com letra e número");
    return pass();
  },
  codigo(value: string): ValidationResult {
    if (!regex.codigo.test(value.trim())) return fail("Código inválido (use letras, números, . _ -)");
    return pass();
  },
  numeroPositivo(value: string | number): ValidationResult {
    if (!regex.numeroPositivo.test(String(value))) return fail("Informe um número válido");
    if (Number(String(value).replace(",", ".")) < 0) return fail("Número não pode ser negativo");
    return pass();
  },
  quantidade(value: string | number): ValidationResult {
    const r = validators.numeroPositivo(value);
    if (!r.ok) return r;
    if (Number(String(value).replace(",", ".")) <= 0) return fail("Quantidade deve ser maior que zero");
    return pass();
  },
  notaFiscal(value: string): ValidationResult {
    if (!value) return pass();
    if (!regex.notaFiscal.test(value.trim())) return fail("Nota fiscal inválida (apenas dígitos)");
    return pass();
  },
};

/** Run a list of checks and return the first failure (or ok). */
export function runChecks(...checks: ValidationResult[]): ValidationResult {
  for (const c of checks) if (!c.ok) return c;
  return pass();
}
