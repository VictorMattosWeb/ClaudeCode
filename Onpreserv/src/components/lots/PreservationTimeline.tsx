import { Pencil, CircleDot, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Preservation } from "@/types/lot";

const formatDate = (d?: string) => {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  if (!y || !m || !day) return "—";
  return `${day}/${m}/${y}`;
};

/** Distância em dias entre duas datas ISO, ou null se faltar alguma. */
function intervaloDias(anterior?: string, atual?: string): number | null {
  if (!anterior || !atual) return null;
  const a = new Date(anterior.slice(0, 10)).getTime();
  const b = new Date(atual.slice(0, 10)).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

interface Props {
  preservations: Preservation[];
  canWrite: boolean;
  onEdit: (p: Preservation) => void;
}

/**
 * Histórico de preservação como linha do tempo.
 *
 * A tabela anterior respondia "quais registros existem". Ela não respondia a
 * pergunta que a operação realmente faz: *"o que aconteceu com este lote e com
 * que regularidade?"* — para isso é preciso ver a sequência e o intervalo entre
 * os eventos, que numa tabela o leitor teria de calcular de cabeça.
 *
 * O evento mais recente vem primeiro e é destacado; os anteriores descem com
 * peso menor. Entre um evento e o seguinte, o intervalo em dias é exibido no
 * próprio traço — é o que revela um lote que passou de 90 dias sem preservação.
 */
export function PreservationTimeline({ preservations, canWrite, onEdit }: Props) {
  if (preservations.length === 0) {
    return (
      <div className="border border-dashed border-border px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">Nenhuma preservação registrada.</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          O primeiro registro também inicia a contagem da sílica gel.
        </p>
      </div>
    );
  }

  // `preservations` chega em ordem cronológica; a timeline mostra do mais novo
  // para o mais antigo, que é a ordem em que a pergunta é feita.
  const eventos = [...preservations].reverse();

  return (
    <ol className="relative space-y-0">
      {eventos.map((p, i) => {
        const atual = i === 0;
        const anterior = eventos[i + 1];
        const gap = intervaloDias(anterior?.date, p.date);
        const ultimo = i === eventos.length - 1;

        return (
          <li key={p.id} className="relative flex gap-3 pb-5 last:pb-0">
            {/* Trilho + marcador */}
            <div className="flex flex-col items-center">
              {atual ? (
                <CircleDot className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
              )}
              {!ultimo && <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />}
            </div>

            {/* Evento */}
            <div className="min-w-0 flex-1 -mt-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span
                  className={cn(
                    "font-hud text-sm font-semibold tabular-nums",
                    atual ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {formatDate(p.date)}
                </span>
                {atual && (
                  <span className="font-hud border border-primary/40 bg-primary-soft px-1.5 text-[9px] uppercase text-primary">
                    Atual
                  </span>
                )}
                {gap !== null && (
                  <span className="font-hud text-[10px] text-muted-foreground/70">
                    +{gap}d desde a anterior
                  </span>
                )}

                {canWrite && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-6 w-6 shrink-0"
                    title="Editar registro (requer aprovação)"
                    aria-label={`Editar preservação de ${formatDate(p.date)}`}
                    onClick={() => onEdit(p)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                <div className="flex gap-1.5">
                  <dt>Próxima</dt>
                  <dd className="font-hud tabular-nums text-foreground/80">{formatDate(p.nextDate)}</dd>
                </div>
                {p.responsible && (
                  <div className="flex gap-1.5">
                    <dt>Responsável</dt>
                    <dd className="text-foreground/80">{p.responsible}</dd>
                  </div>
                )}
              </dl>

              {p.observation && (
                <p className="mt-1.5 border-l border-border pl-2.5 text-xs leading-relaxed text-muted-foreground">
                  {p.observation}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
