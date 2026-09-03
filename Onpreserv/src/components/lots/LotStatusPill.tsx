import { CheckCircle2, Clock, AlertCircle, Minus, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { LotStatus, Lot, getLotPreservationStatus, getDaysLeftInCycle } from "@/types/lot";

/**
 * Hierarquia de estado do lote.
 *
 * A regra que este arquivo implementa: **status principal ≠ alerta ≠ informação
 * complementar**. Antes a coluna "Situação" empilhava três coisas com o mesmo
 * peso visual — preservação, sílica gel e ativo/inativo — e o olho não sabia
 * qual delas era a decisão.
 *
 *   STATUS PRINCIPAL  → a preservação (é o que define se o lote exige ação)
 *   ALERTA            → prazo curto ou vencido, já embutido no status
 *   COMPLEMENTAR      → ativo/inativo e sílica gel, com peso menor e fora da
 *                       listagem principal no caso da sílica
 */

const CONFIG: Record<LotStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  preserved: {
    label: "Em dia",
    className: "border-success/40 bg-success/10 text-success",
    Icon: CheckCircle2,
  },
  upcoming: {
    label: "Vence em breve",
    className: "border-warning/40 bg-warning/10 text-warning",
    Icon: Clock,
  },
  overdue: {
    label: "Vencida",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
    Icon: AlertCircle,
  },
  none: {
    label: "Sem preservação",
    className: "border-border bg-muted text-muted-foreground",
    Icon: Minus,
  },
};

/**
 * Status principal do lote: a situação da preservação, e só ela.
 *
 * `showDays` acrescenta o contexto do ciclo semanal — quantos dias ainda restam
 * na semana, ou quantas semanas fecharam sem registro. O rótulo sozinho não
 * distingue uma semana vencida de dez.
 */
export function LotStatusPill({
  lot,
  showDays = false,
  className,
}: {
  lot: Lot;
  showDays?: boolean;
  className?: string;
}) {
  const status = getLotPreservationStatus(lot);
  const restantes = getDaysLeftInCycle(lot);

  // O lote inativo não é cobrado, então não cai em nenhum dos quatro estados de
  // preservação. Sem este rótulo próprio ele apareceria como "Sem preservação",
  // o que é falso para um lote com histórico inteiro registrado — ele apenas
  // deixou de exigir preservação.
  const inativo = lot.status !== "ativo";
  const { label, className: tone, Icon } = inativo
    ? { label: "Inativo", className: "border-border bg-muted text-muted-foreground", Icon: Circle }
    : CONFIG[status];

  // O prazo é o que informa urgência: o rótulo sozinho não distingue vencido
  // ontem de vencido há três meses, e é essa diferença que define a ordem de
  // atendimento no campo.
  let suffix = "";
  if (showDays && restantes !== null && status !== "preserved") {
    suffix = restantes < 0 ? ` · há ${Math.abs(restantes)}d` : ` · ${restantes}d`;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 text-[11px] font-medium",
        tone,
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="whitespace-nowrap">
        {label}
        {suffix && <span className="font-hud tabular-nums">{suffix}</span>}
      </span>
    </span>
  );
}

/**
 * Informação complementar: o lote está ativo ou inativo no cadastro.
 *
 * Deliberadamente discreto — um ponto e um texto pequeno, sem moldura. Não é um
 * badge, porque não compete com o status principal.
 */
export function LotActivityMark({ lot, className }: { lot: Lot; className?: string }) {
  const ativo = lot.status === "ativo";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px]",
        ativo ? "text-muted-foreground" : "text-muted-foreground/60",
        className,
      )}
    >
      <Circle
        className={cn("h-2 w-2 shrink-0", ativo ? "fill-success text-success" : "fill-muted-foreground text-muted-foreground")}
        aria-hidden="true"
      />
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}
