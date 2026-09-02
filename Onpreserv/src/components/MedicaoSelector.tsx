import { useMemo, useState } from "react";
import { CalendarRange, Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { MedicaoCronograma, ItemCalculado } from "@/types/cronograma";

const formatDate = (iso: string | null) => {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return null;
  return `${d}/${m}/${y}`;
};

/** Resumo de execução de uma medição, para leitura direto na lista. */
interface ResumoMedicao {
  total: number;
  concluidos: number;
  vencidos: number;
  percent: number;
}

/**
 * Ordena o histórico: mais recente primeiro.
 *
 * A `dataReferencia` manda, porque é ela que dá sentido a um histórico. Medições
 * sem data caem para o fim, desempatadas pelo campo `ordem` — que continua
 * sendo o que as setas de reordenação ajustam.
 */
function ordenarHistorico(medicoes: MedicaoCronograma[]): MedicaoCronograma[] {
  return [...medicoes].sort((a, b) => {
    if (a.dataReferencia && b.dataReferencia) {
      return b.dataReferencia.localeCompare(a.dataReferencia);
    }
    if (a.dataReferencia) return -1;
    if (b.dataReferencia) return 1;
    return a.ordem - b.ordem;
  });
}

interface Props {
  medicoes: MedicaoCronograma[];
  itens: ItemCalculado[];
  activeId: string | null;
  onChange: (id: string) => void;
}

/**
 * Seletor de medição do cronograma.
 *
 * Substitui as abas. Com uma dúzia de medições, o `TabsList` quebrava em três
 * linhas de "janelas" que empurravam o conteúdo para baixo e não diziam nada
 * sobre cada medição além do nome.
 *
 * A lista mostra data, progresso e vencidos de cada uma — o suficiente para
 * escolher sem precisar abrir. E, ao contrário das abas, só o conteúdo da
 * medição ativa é renderizado: antes o `TabsContent` de todas ficava montado
 * ao mesmo tempo.
 */
export function MedicaoSelector({ medicoes, itens, activeId, onChange }: Props) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");

  const ordenadas = useMemo(() => ordenarHistorico(medicoes), [medicoes]);

  // Um passe por todos os itens, agrupando por medição — evita varrer a lista
  // inteira uma vez para cada medição do histórico.
  const resumos = useMemo(() => {
    const mapa = new Map<string, ResumoMedicao>();
    for (const item of itens) {
      const r = mapa.get(item.medicaoId) ?? { total: 0, concluidos: 0, vencidos: 0, percent: 0 };
      if (item.situacao !== "nao_aplicavel") {
        r.total += 1;
        if (item.situacao === "no_prazo" || item.situacao === "divergencia") r.concluidos += 1;
        if (item.situacao === "vencido") r.vencidos += 1;
      }
      mapa.set(item.medicaoId, r);
    }
    mapa.forEach((r) => {
      r.percent = r.total === 0 ? 0 : Math.round((r.concluidos / r.total) * 100);
    });
    return mapa;
  }, [itens]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return ordenadas;
    return ordenadas.filter(
      (m) => m.nome.toLowerCase().includes(q) || (m.descricao ?? "").toLowerCase().includes(q),
    );
  }, [ordenadas, busca]);

  const ativa = medicoes.find((m) => m.id === activeId) ?? null;
  const resumoAtiva = activeId ? resumos.get(activeId) : undefined;

  const selecionar = (id: string) => {
    onChange(id);
    setAberto(false);
    setBusca("");
  };

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={aberto}
          aria-label="Selecionar medição"
          className="h-10 min-w-[260px] justify-between gap-3 px-3"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <CalendarRange className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0 text-left">
              <span className="block truncate text-xs font-semibold normal-case tracking-normal">
                {ativa?.nome ?? "Selecione a medição"}
              </span>
              {ativa && (
                <span className="font-hud block text-[9px] text-muted-foreground">
                  {formatDate(ativa.dataReferencia) ?? "sem data"}
                  {resumoAtiva ? ` · ${resumoAtiva.percent}%` : ""}
                </span>
              )}
            </span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[380px] p-0">
        <div className="border-b border-border px-3 py-2.5">
          <p className="hud-label">HISTÓRICO_DE_MEDIÇÕES</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {medicoes.length} {medicoes.length === 1 ? "medição" : "medições"}, da mais recente para a mais antiga.
          </p>
        </div>

        {/* Busca só aparece quando a lista justifica */}
        {medicoes.length > 6 && (
          <div className="relative border-b border-border">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar medição…"
              aria-label="Buscar medição"
              className="h-10 border-0 pl-9 focus-visible:ring-0"
            />
          </div>
        )}

        <ul className="max-h-[320px] overflow-y-auto p-1" role="listbox" aria-label="Medições">
          {filtradas.length === 0 && (
            <li className="px-3 py-8 text-center text-xs text-muted-foreground">
              Nenhuma medição encontrada.
            </li>
          )}

          {filtradas.map((m) => {
            const r = resumos.get(m.id);
            const ativo = m.id === activeId;
            const data = formatDate(m.dataReferencia);

            return (
              <li key={m.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={ativo}
                  onClick={() => selecionar(m.id)}
                  className={cn(
                    "flex w-full items-start gap-3 px-2.5 py-2.5 text-left transition-colors duration-200",
                    ativo ? "bg-primary-soft" : "hover:bg-accent",
                  )}
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center pt-0.5">
                    {ativo && <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate text-sm font-medium", ativo && "text-primary")}>
                        {m.nome}
                      </span>
                      <span className="font-hud shrink-0 text-[9px] text-muted-foreground">
                        {data ?? "sem data"}
                      </span>
                    </span>

                    {m.descricao && (
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {m.descricao}
                      </span>
                    )}

                    {r && r.total > 0 ? (
                      <span className="mt-1.5 block">
                        <span className="flex items-center gap-2">
                          <span className="h-1 flex-1 bg-white/[0.06]">
                            <span
                              className={cn(
                                "block h-full transition-[width] duration-500 ease-out-expo",
                                r.percent >= 90 ? "bg-success" : r.percent >= 70 ? "bg-warning" : "bg-primary",
                              )}
                              style={{ width: `${r.percent}%` }}
                            />
                          </span>
                          <span className="font-hud shrink-0 text-[9px] tabular-nums text-muted-foreground">
                            {r.concluidos}/{r.total}
                          </span>
                          {r.vencidos > 0 && (
                            <span className="font-hud shrink-0 border border-destructive/40 bg-destructive/10 px-1 text-[9px] text-destructive">
                              {r.vencidos} venc.
                            </span>
                          )}
                        </span>
                      </span>
                    ) : (
                      <span className="font-hud mt-1.5 block text-[9px] text-muted-foreground/60">
                        Sem itens
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
