import { useState, type ReactNode } from "react";
import {
  Plus, Pencil, Trash2, Download, FileSpreadsheet, FileText, FileType2, Timer,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLots } from "@/context/LotContext";
import { useAuth } from "@/context/AuthContext";
import {
  Lot, Preservation, LOT_TIPO_LABEL,
  getLotPreservationStatus,
  getLotOverdueWeeks,
  getDaysLeftInWeek,
  currentWeekRange,
  getLotCycle,
  getDaysLeftInCycle,
  getNextCycleDueDate,
  getLotNextDueDate,
  getSilicaDaysRemaining, getSilicaExpiryDate, getSilicaStatus, SILICA_VALIDITY_DAYS,
} from "@/types/lot";
import { LotStatusPill, LotActivityMark } from "./LotStatusPill";
import { PreservationTimeline } from "./PreservationTimeline";
import { PreservationDialog } from "@/components/PreservationDialog";
import { PreservationEditDialog } from "@/components/PreservationEditDialog";
import { exportPreservationsCsv, exportPreservationsPdf, exportPreservationsXlsx } from "@/lib/exportPreservations";
import { supabase } from "@/integrations/supabase/client";
import { notifyError } from "@/lib/errorMessages";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const formatDate = (d?: string) => {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  if (!y || !m || !day) return "—";
  return `${day}/${m}/${y}`;
};

/** Bloco de conteúdo com rótulo de instrumento — o agrupamento da informação. */
function Section({ title, code, action, children }: {
  title: string; code: string; action?: ReactNode; children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-3">
        <h3 className="shrink-0 text-xs font-semibold uppercase tracking-wide">{title}</h3>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        {action}
        <span className="font-hud shrink-0 text-[9px] text-primary/70">{code}</span>
      </div>
      {children}
    </section>
  );
}

/** Par rótulo/valor. `mono` para códigos e datas. */
function Field({ label, value, mono = false, full = false }: {
  label: string; value: ReactNode; mono?: boolean; full?: boolean;
}) {
  return (
    <div className={cn("min-w-0", full && "col-span-2")}>
      <dt className="font-hud text-[9px] uppercase text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 truncate text-sm", mono && "font-hud tabular-nums")}>{value || "—"}</dd>
    </div>
  );
}

interface Props {
  lot: Lot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (lot: Lot) => void;
}

/**
 * Painel de detalhes do lote.
 *
 * Substitui o modal antigo por um **sheet lateral**: o contexto da lista fica
 * visível atrás, o que permite abrir um lote, conferir e passar ao próximo sem
 * a sensação de ter navegado para outro lugar. Num modal centralizado a lista
 * some, e o usuário perde a posição a cada consulta.
 *
 * A informação foi reagrupada em seções com hierarquia explícita, no lugar da
 * grade de "caixinhas" onde local, responsável, status e sílica gel tinham o
 * mesmo peso:
 *
 *   1. Cabeçalho    — identidade do lote e status principal
 *   2. Preservação  — estado atual, próxima data e a sílica gel (quando ativa)
 *   3. Histórico    — a linha do tempo dos eventos
 *   4. Identificação e localização
 *   5. Registro     — cadastro e observações
 */
export function LotDetailSheet({ lot: initialLot, open, onOpenChange, onEdit }: Props) {
  const { getLot, addPreservation } = useLots();
  const { canWrite, isAdmin } = useAuth();
  const [presOpen, setPresOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Preservation | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Relê do contexto para refletir uma preservação registrada com o painel aberto.
  const lot = getLot(initialLot.id) || initialLot;

  const statusSemana = getLotPreservationStatus(lot);
  const ciclo = getLotCycle(lot);
  const cicloLongo = ciclo.tipo === "dias_corridos";
  const semanasAtraso = getLotOverdueWeeks(lot);
  const diasRestantes = getDaysLeftInWeek();
  const semana = currentWeekRange();
  const diasCiclo = getDaysLeftInCycle(lot);
  const vencimentoCiclo = getNextCycleDueDate(lot);
  const proximaPrevista = getLotNextDueDate(lot);
  const ultima = lot.preservations[lot.preservations.length - 1];

  // Sílica gel: só existe quando a funcionalidade está ativa para o lote —
  // isto é, não é lote de cabo e já há um primeiro registro de preservação.
  // `getSilicaStatus` devolve "none" nos dois casos, e é a única condição que
  // libera qualquer menção à sílica na interface.
  const silicaStatus = getSilicaStatus(lot);
  const silicaAtiva = silicaStatus !== "none";
  const silicaDias = silicaAtiva ? getSilicaDaysRemaining(lot)! : null;
  const silicaExpiry = silicaAtiva ? getSilicaExpiryDate(lot)! : null;

  const handleClearHistory = async () => {
    setClearing(true);
    const { error } = await supabase.from("preservations").delete().eq("lot_id", lot.id);
    setClearing(false);
    if (error) {
      notifyError(error, "Não foi possível limpar o histórico.");
    } else {
      toast.success("Histórico de preservações limpo");
      setClearOpen(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl"
        >
          {/* ============ 1. Cabeçalho ============ */}
          <SheetHeader className="space-y-0 border-b border-border p-5 pr-14 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="font-hud border border-primary/40 bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {lot.identificadorInterno}
                </span>
                <SheetTitle className="mt-2 truncate text-lg font-semibold tracking-tight">
                  {lot.name}
                </SheetTitle>
                <p className="font-hud mt-0.5 text-xs text-muted-foreground">{lot.code}</p>
              </div>

              {canWrite && onEdit && (
                <Button variant="hud" size="sm" onClick={() => onEdit(lot)} className="shrink-0">
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Editar
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3">
              <LotStatusPill lot={lot} showDays />
              <LotActivityMark lot={lot} />
              <span className="font-hud text-[10px] uppercase text-muted-foreground">
                {LOT_TIPO_LABEL[lot.tipoLote]}
              </span>
              <span className="font-hud border border-border px-1.5 text-[9px] uppercase text-muted-foreground">
                {ciclo.label}
              </span>
            </div>
          </SheetHeader>

          <div className="space-y-7 p-5">
            {/* ============ 2. Preservação ============ */}
            <Section
              title="Preservação"
              code="PRS_01"
              action={
                canWrite ? (
                  <Button size="sm" variant="hud" onClick={() => setPresOpen(true)}>
                    <Plus className="h-3 w-3" aria-hidden="true" />
                    Registrar
                  </Button>
                ) : undefined
              }
            >
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 border border-border bg-card p-4">
                <Field label="Última preservação" value={formatDate(ultima?.date)} mono />
                <Field label="Próxima prevista" value={formatDate(proximaPrevista ?? undefined)} mono />
                <Field
                  label={cicloLongo ? `Ciclo (${ciclo.label})` : "Ciclo da semana"}
                  value={
                    statusSemana === "none"
                      ? "Sem registro"
                      : cicloLongo
                        ? diasCiclo === null
                          ? "—"
                          : diasCiclo < 0
                            ? `${Math.abs(diasCiclo)} dia(s) de atraso`
                            : `${diasCiclo} dia(s) restantes`
                        : statusSemana === "preserved"
                          ? "Cumprido"
                          : statusSemana === "upcoming"
                            ? `Aberto · ${diasRestantes} dia(s)`
                            : `${semanasAtraso} semana(s) vencida(s)`
                  }
                  mono
                />
                <Field label="Registros" value={`${lot.preservations.length}`} mono />

                <div className="col-span-2 border-t border-border pt-3">
                  <p className="font-hud text-[9px] uppercase text-muted-foreground">
                    {cicloLongo ? "Próximo vencimento" : "Semana de referência"}
                  </p>
                  <p className="font-hud mt-0.5 text-sm tabular-nums">
                    {cicloLongo
                      ? vencimentoCiclo
                        ? formatDate(vencimentoCiclo.toISOString().slice(0, 10))
                        : "—"
                      : `${formatDate(semana.inicio)} — ${formatDate(semana.fim)}`}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {cicloLongo
                      ? `Este lote é preservado a cada ${ciclo.dias} dias corridos, contados a partir do último registro. Se o vencimento cai em fim de semana, ele passa para a segunda-feira.`
                      : "O status considera a semana inteira: uma preservação em qualquer dia entre segunda e domingo cumpre o ciclo."}
                  </p>
                </div>

                {/* Sílica gel — só aparece quando a funcionalidade está ativa. */}
                {silicaAtiva && (
                  <div className="col-span-2 border-t border-border pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="font-hud flex items-center gap-1.5 text-[9px] uppercase text-muted-foreground">
                        <Timer
                          className={cn(
                            "h-3 w-3",
                            silicaStatus === "expired" ? "text-destructive"
                              : silicaStatus === "warning" ? "text-warning" : "text-success",
                          )}
                          aria-hidden="true"
                        />
                        Sílica gel
                      </dt>
                      <dd className="font-hud text-xs tabular-nums text-muted-foreground">
                        vence em {formatDate(silicaExpiry!.toISOString().slice(0, 10))}
                      </dd>
                    </div>

                    <p
                      className={cn(
                        "mt-1.5 text-sm font-semibold",
                        silicaStatus === "expired" ? "text-destructive"
                          : silicaStatus === "warning" ? "text-warning" : "text-success",
                      )}
                    >
                      {silicaStatus === "expired"
                        ? `Vencida há ${Math.abs(silicaDias!)} dia(s)`
                        : `${silicaDias} dia(s) restantes`}
                    </p>

                    <div
                      className="mt-2 h-1 w-full bg-white/[0.06]"
                      role="progressbar"
                      aria-valuenow={Math.max(0, Math.min(100, Math.round((silicaDias! / SILICA_VALIDITY_DAYS) * 100)))}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Validade da sílica gel"
                    >
                      <div
                        className={cn(
                          "h-full transition-[width] duration-700 ease-out-expo",
                          silicaStatus === "expired" ? "bg-destructive"
                            : silicaStatus === "warning" ? "bg-warning" : "bg-success",
                        )}
                        style={{ width: `${Math.max(0, Math.min(100, Math.round((silicaDias! / SILICA_VALIDITY_DAYS) * 100)))}%` }}
                      />
                    </div>

                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Validade de 1 ano a partir do primeiro registro de preservação.
                    </p>
                  </div>
                )}
              </div>
            </Section>

            {/* ============ 3. Histórico ============ */}
            <Section
              title="Histórico de preservação"
              code="PRS_02"
              action={
                lot.preservations.length > 0 ? (
                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="hud">
                          <Download className="h-3 w-3" aria-hidden="true" />
                          Exportar
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); exportPreservationsXlsx(lot); }}>
                          <FileSpreadsheet className="h-4 w-4" /> Excel (.xlsx)
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); exportPreservationsCsv(lot); }}>
                          <FileType2 className="h-4 w-4" /> CSV (.csv)
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); exportPreservationsPdf(lot); }}>
                          <FileText className="h-4 w-4" /> PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {isAdmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setClearOpen(true)}
                        aria-label="Limpar histórico de preservações"
                        title="Limpar histórico"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ) : undefined
              }
            >
              <PreservationTimeline
                preservations={lot.preservations}
                canWrite={canWrite}
                onEdit={setEditTarget}
              />
            </Section>

            {/* ============ 4. Identificação e localização ============ */}
            <Section title="Identificação e localização" code="LOC_03">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border border-border bg-card p-4">
                <Field label="Identificador" value={lot.identificadorInterno} mono />
                <Field label="Código / NF" value={lot.code} mono />
                <Field label="Tipo" value={LOT_TIPO_LABEL[lot.tipoLote]} />
                <Field label="Responsável" value={lot.responsible} />
                <Field label="Local" value={lot.location} />
                <Field
                  label="Posição física"
                  value={[lot.rua && `Rua ${lot.rua}`, lot.prateleira && `Prat. ${lot.prateleira}`].filter(Boolean).join(" · ")}
                  mono
                />
              </dl>
            </Section>

            {/* ============ 5. Registro ============ */}
            <Section title="Registro" code="REG_04">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border border-border bg-card p-4">
                <Field label="Cadastrado em" value={formatDate(lot.createdAt)} mono />
                <Field label="Situação do cadastro" value={lot.status === "ativo" ? "Ativo" : "Inativo"} />
                {lot.observations && <Field label="Observações" value={lot.observations} full />}
              </dl>
            </Section>
          </div>
        </SheetContent>
      </Sheet>

      <PreservationDialog
        open={presOpen}
        onOpenChange={setPresOpen}
        onSubmit={(data) => addPreservation(lot.id, data)}
      />

      {editTarget && (
        <PreservationEditDialog
          open={!!editTarget}
          onOpenChange={(o) => { if (!o) setEditTarget(null); }}
          preservation={editTarget}
          lotId={lot.id}
        />
      )}

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar histórico de preservações?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá <strong>todos os {lot.preservations.length} registros</strong> de
              preservação deste lote e não pode ser desfeita. A contagem da sílica gel, que parte do
              primeiro registro, também será perdida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleClearHistory(); }}
              disabled={clearing}
              className="bg-destructive text-destructive-foreground hover:bg-white hover:text-destructive"
            >
              {clearing ? "Limpando…" : "Limpar tudo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
