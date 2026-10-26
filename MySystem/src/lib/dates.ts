const DAY = 86_400_000;

/** Data local de hoje em yyyy-mm-dd. */
export function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysISO(days: number, now = new Date()): string {
  return todayISO(new Date(now.getTime() + days * DAY));
}

/** Dias entre hoje e a data (negativo = atrasada). */
export function daysUntil(iso: string, now = new Date()): number {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / DAY);
}

export function formatShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(".", "");
}

/** Rótulo relativo da data limite: "Hoje", "Amanhã", "3d atrasada", "12 nov". */
export function dueLabel(iso: string, now = new Date()): string {
  const n = daysUntil(iso, now);
  if (n === 0) return "Hoje";
  if (n === 1) return "Amanhã";
  if (n < 0) return `${-n}d atrasada`;
  return formatShort(iso);
}

/** "agora", "há 5 min", "há 3 h", "há 2 d" e, passada uma semana, a data. */
export function timeAgo(iso: string, now = new Date()): string {
  const min = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d} d`;
  return formatDateTime(iso);
}
