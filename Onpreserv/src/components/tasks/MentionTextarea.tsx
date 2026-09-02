import { useRef, useState, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onMentionsChange: (ids: string[]) => void;
  users: { id: string; nome: string }[];
  placeholder?: string;
  rows?: number;
}

// Formato antigo persistido: @[Nome](uuid). Mantido só para retro-compatibilidade na renderização.
const LEGACY_MENTION_RE = /@\[([^\]]+)\]\(([0-9a-f-]{36})\)/g;

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$1");
}

/** Extrai ids comparando trechos `@Nome` do texto contra a lista de usuários. */
export function extractMentionIdsFromText(text: string, users: { id: string; nome: string }[]): string[] {
  const ids = new Set<string>();
  // Suporte ao formato legado, se ainda houver
  for (const m of text.matchAll(LEGACY_MENTION_RE)) ids.add(m[2]);

  // Ordena por nome mais longo para casar primeiro e evitar prefixos ambíguos
  const sorted = [...users].sort((a, b) => b.nome.length - a.nome.length);
  for (const u of sorted) {
    const re = new RegExp(`(^|\\s)@${escapeRegex(u.nome)}(?=\\s|$|[.,;!?])`, "g");
    if (re.test(text)) ids.add(u.id);
  }
  return Array.from(ids);
}

/** Versão antiga (mantida para chamadas externas que ainda passam só texto). */
export function extractMentionIds(text: string): string[] {
  const ids = new Set<string>();
  for (const m of text.matchAll(LEGACY_MENTION_RE)) ids.add(m[2]);
  return Array.from(ids);
}

/** Converte qualquer formato legado em `@Nome` para exibição. */
export function renderMentions(text: string): string {
  return text.replace(LEGACY_MENTION_RE, (_, nome) => `@${nome}`);
}

export function MentionTextarea({ value, onChange, onMentionsChange, users, placeholder, rows = 2 }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [anchor, setAnchor] = useState(0);

  const matches = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return users.filter((u) => u.nome.toLowerCase().includes(q)).slice(0, 6);
  }, [query, users]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    onChange(v);
    onMentionsChange(extractMentionIdsFromText(v, users));

    const pos = e.target.selectionStart ?? v.length;
    const before = v.slice(0, pos);
    // Captura tudo após o último @ até o cursor (suporta nomes com espaço)
    const m = /@([^\n@]*)$/.exec(before);
    if (m) {
      setQuery(m[1]);
      setAnchor(pos - m[0].length);
    } else {
      setQuery(null);
    }
  };

  const insertMention = (u: { id: string; nome: string }) => {
    if (!ref.current) return;
    const v = value;
    const pos = ref.current.selectionStart ?? v.length;
    const token = `@${u.nome} `;
    const next = v.slice(0, anchor) + token + v.slice(pos);
    onChange(next);
    onMentionsChange(extractMentionIdsFromText(next, users));
    setQuery(null);
    requestAnimationFrame(() => {
      ref.current?.focus();
      const np = anchor + token.length;
      ref.current?.setSelectionRange(np, np);
    });
  };

  return (
    <Popover open={query !== null && matches.length > 0}>
      <PopoverAnchor asChild>
        <Textarea
          ref={ref}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          rows={rows}
          onKeyDown={(e) => {
            if (e.key === "Escape") setQuery(null);
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        align="start"
        side="top"
        className="p-1 w-60"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ul className="text-sm">
          {matches.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
              >
                {u.nome}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
