import { Fragment } from "react";

const LEGACY = /@\[([^\]]+)\]\([0-9a-f-]{36}\)/g;
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface Props {
  text: string;
  users: Map<string, string>;
  className?: string;
}

/** Renderiza texto destacando menções (@Nome) com estilo diferenciado. */
export function MentionText({ text, users, className }: Props) {
  const normalized = text.replace(LEGACY, (_, nome) => `@${nome}`);
  const names = Array.from(users.values()).filter(Boolean).sort((a, b) => b.length - a.length);

  if (names.length === 0) {
    return <span className={className}>{normalized}</span>;
  }

  const pattern = new RegExp(
    `@(?:${names.map(escapeRegex).join("|")})(?=\\s|$|[.,;!?])`,
    "g",
  );

  const parts: Array<{ type: "text" | "mention"; value: string }> = [];
  let last = 0;
  for (const m of normalized.matchAll(pattern)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push({ type: "text", value: normalized.slice(last, idx) });
    parts.push({ type: "mention", value: m[0] });
    last = idx + m[0].length;
  }
  if (last < normalized.length) parts.push({ type: "text", value: normalized.slice(last) });

  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.type === "mention" ? (
          <span
            key={i}
            className="inline-flex items-center rounded px-1 py-0.5 bg-primary/10 text-primary font-medium ring-1 ring-primary/20"
          >
            {p.value}
          </span>
        ) : (
          <Fragment key={i}>{p.value}</Fragment>
        ),
      )}
    </span>
  );
}
