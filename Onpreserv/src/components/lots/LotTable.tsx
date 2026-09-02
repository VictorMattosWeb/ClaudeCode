import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
  Plus, Pencil, Trash2, FileSpreadsheet, Layers, X, Download, PackageOpen, SearchX,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLots } from "@/context/LotContext";
import { useAuth } from "@/context/AuthContext";
import { Lot, LOT_TIPO_LABEL, getLotCycle, getLotNextDueDate } from "@/types/lot";
import { filterLots, DEFAULT_FILTERS, type LotFiltersValue } from "@/lib/lotFilters";
import { LotStatusPill, LotActivityMark } from "./LotStatusPill";
import { LotFilterBar } from "./LotFilterBar";
import { LotDetailSheet } from "./LotDetailSheet";
import { LotFormDialog } from "@/components/LotFormDialog";
import { RowDeleteAction } from "@/components/RowDeleteAction";
import { ImportDialog } from "@/components/ImportDialog";
import { BulkPreservationDialog } from "@/components/BulkPreservationDialog";
import { ExportMenu } from "@/components/ExportMenu";
import { exportLotsXlsx } from "@/lib/exportLots";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PAGE_SIZE = 15;

const formatDate = (iso?: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
};

interface Props {
  filters: LotFiltersValue;
  onFiltersChange: (v: LotFiltersValue) => void;
  /** Já filtrado pela página — evita refiltrar e divergir dos indicadores. */
  filteredLots: Lot[];
  loading?: boolean;
}

/**
 * Listagem de lotes.
 *
 * O filtro **não** é aplicado aqui. Antes este componente reimplementava a
 * filtragem inteira enquanto a página usava `filterLots` para os indicadores do
 * topo — duas cópias da mesma regra, livres para divergir e fazer os cartões
 * contarem um conjunto enquanto a tabela mostrava outro. Agora a página filtra
 * uma vez e passa o resultado para cá.
 */
export function LotTable({ filters, onFiltersChange, filteredLots, loading = false }: Props) {
  const { lots, addLot, updateLot, deleteLot, deleteLots, addPreservationToMany } = useLots();
  const { isAdmin, canWrite } = useAuth();

  const [formOpen, setFormOpen] = useState(false);
  const [editingLot, setEditingLot] = useState<Lot | undefined>();
  const [detailLot, setDetailLot] = useState<Lot | undefined>();
  const [importOpen, setImportOpen] = useState(false);
  const [bulkPresOpen, setBulkPresOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [sortCreated, setSortCreated] = useState<"desc" | "asc" | null>("desc");

  const sortedLots = useMemo(() => {
    if (!sortCreated) return filteredLots;
    const dir = sortCreated === "asc" ? 1 : -1;
    return [...filteredLots].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (ta - tb) * dir;
    });
  }, [filteredLots, sortCreated]);

  const totalPages = Math.max(1, Math.ceil(sortedLots.length / PAGE_SIZE));
  useEffect(() => { setPage(1); }, [filters]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  const pagedLots = useMemo(
    () => sortedLots.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sortedLots, page],
  );
  const rangeStart = sortedLots.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, sortedLots.length);

  const visibleIds = useMemo(() => pagedLots.map((l) => l.id), [pagedLots]);
  const selectedVisibleCount = visibleIds.filter((id) => selected.has(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  const toggleAllVisible = (checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      visibleIds.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });

  const toggleOne = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });

  const clearSelection = () => setSelected(new Set());
  const selectedCount = selected.size;

  const toggleSortCreated = () =>
    setSortCreated((prev) => (prev === "desc" ? "asc" : prev === "asc" ? null : "desc"));

  const handleCreate = () => { setEditingLot(undefined); setFormOpen(true); };
  const handleEdit = (lot: Lot) => { setEditingLot(lot); setFormOpen(true); };

  const handleSubmit = async (data: Omit<Lot, "id" | "preservations" | "createdAt">) =>
    editingLot ? await updateLot(editingLot.id, data) : await addLot(data);

  const handleBulkDelete = () => {
    const ids = Array.from(selected);
    deleteLots(ids);
    toast.success(`${ids.length} lote(s) excluído(s).`);
    clearSelection();
    setBulkDeleteOpen(false);
  };

  const handleBulkPreservation = async (data: {
    date: string; nextDate: string; observation: string; responsible: string;
  }) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      await addPreservationToMany(ids, data);
      toast.success(`Preservação registrada em ${ids.length} lote(s).`);
      clearSelection();
    } catch {
      // O contexto já exibiu o toast de erro.
    }
  };

  const semLotes = lots.length === 0;
  const semResultado = !semLotes && sortedLots.length === 0;

  return (
    <div className="space-y-4">
      {/* ---------- Ações principais ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Lotes</h2>
          <span className="font-hud text-[9px] text-primary/70">LOT_01</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportMenu filteredLots={sortedLots} selectedLots={lots.filter((l) => selected.has(l.id))} />
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Importar</span>
            </Button>
          )}
          {canWrite && (
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Novo lote</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          )}
        </div>
      </div>

      {/* ---------- Filtros ---------- */}
      <LotFilterBar
        value={filters}
        onChange={onFiltersChange}
        resultCount={sortedLots.length}
        totalCount={lots.length}
      />

      {/* ---------- Barra de seleção ---------- */}
      {selectedCount > 0 && (
        <div className="animate-slide-up flex flex-col gap-3 border border-primary/40 bg-primary-soft p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-hud font-semibold text-primary">{selectedCount}</span>
            <span className="text-muted-foreground">lote(s) selecionado(s)</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearSelection}
              aria-label="Limpar seleção"
              className="h-7 w-7"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const sel = lots.filter((l) => selected.has(l.id));
                exportLotsXlsx(sel, "lotes_selecionados");
                toast.success(`${sel.length} lote(s) exportado(s) em XLSX.`);
              }}
            >
              <Download className="h-4 w-4" aria-hidden="true" /> Exportar
            </Button>
            {canWrite && (
              <Button size="sm" onClick={() => setBulkPresOpen(true)}>
                <Layers className="h-4 w-4" aria-hidden="true" /> Registrar preservação
              </Button>
            )}
            {isAdmin && (
              <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Excluir
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ---------- Carregando ---------- */}
      {loading && (
        <div className="space-y-2 border border-border bg-card p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      )}

      {/* ---------- Estados vazios ---------- */}
      {!loading && (semLotes || semResultado) && (
        <div className="border border-dashed border-border px-6 py-16 text-center">
          {semLotes ? (
            <>
              <PackageOpen className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium">Nenhum lote cadastrado</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                Cadastre o primeiro lote ou importe uma planilha para começar a controlar as preservações.
              </p>
              {canWrite && (
                <Button size="sm" onClick={handleCreate} className="mt-5">
                  <Plus className="h-4 w-4" aria-hidden="true" /> Cadastrar primeiro lote
                </Button>
              )}
            </>
          ) : (
            <>
              <SearchX className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium">Nenhum lote corresponde aos filtros</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                Tente remover um dos critérios ativos ou ampliar o período de cadastro.
              </p>
              <Button size="sm" variant="outline" onClick={() => onFiltersChange(DEFAULT_FILTERS)} className="mt-5">
                <X className="h-4 w-4" aria-hidden="true" /> Limpar filtros
              </Button>
            </>
          )}
        </div>
      )}

      {/* ---------- Cartões (mobile) ---------- */}
      {!loading && pagedLots.length > 0 && (
        <div className="space-y-2 md:hidden">
          {pagedLots.map((lot) => {
            const checked = selected.has(lot.id);
            const ultima = lot.preservations[lot.preservations.length - 1];
            return (
              <article
                key={lot.id}
                className={cn(
                  "hover-card cursor-pointer border border-border bg-card p-3",
                  checked && "border-primary/60 bg-primary-soft",
                )}
                onClick={() => setDetailLot(lot)}
              >
                <div className="flex items-start gap-2.5">
                  <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => toggleOne(lot.id, !!c)}
                      aria-label={`Selecionar ${lot.identificadorInterno}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-hud border border-primary/40 bg-primary-soft px-1.5 text-[10px] font-semibold text-primary">
                        {lot.identificadorInterno}
                      </span>
                      <span className="font-hud truncate text-[11px] text-muted-foreground">{lot.code}</span>
                    </div>
                    <p className="mt-1.5 truncate text-sm font-medium">{lot.name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <LotStatusPill lot={lot} showDays />
                      <LotActivityMark lot={lot} />
                    </div>
                    <p className="font-hud mt-2 text-[10px] tabular-nums text-muted-foreground">
                      Últ. {formatDate(ultima?.date)} · Próx. {formatDate(getLotNextDueDate(lot) ?? undefined)}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ---------- Tabela (desktop) ---------- */}
      {!loading && pagedLots.length > 0 && (
        <div className="hidden overflow-x-auto border border-border bg-card md:block">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-10 px-3">
                  <Checkbox
                    checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                    onCheckedChange={(c) => toggleAllVisible(!!c)}
                    aria-label="Selecionar todos os lotes desta página"
                  />
                </TableHead>
                <TableHead className="w-[150px] px-3">
                  <button
                    type="button"
                    onClick={toggleSortCreated}
                    className="font-hud inline-flex items-center gap-1 text-[9px] uppercase text-muted-foreground transition-colors hover:text-primary"
                    title="Ordenar por data de cadastro"
                  >
                    Identificador
                    {sortCreated === "desc" ? <ArrowDown className="h-3 w-3" />
                      : sortCreated === "asc" ? <ArrowUp className="h-3 w-3" />
                        : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                  </button>
                </TableHead>
                <TableHead className="font-hud px-3 text-[9px] uppercase text-muted-foreground">Lote</TableHead>
                <TableHead className="font-hud hidden w-[170px] px-3 text-[9px] uppercase text-muted-foreground lg:table-cell">
                  Localização
                </TableHead>
                <TableHead className="font-hud w-[150px] px-3 text-[9px] uppercase text-muted-foreground">
                  Preservação
                </TableHead>
                <TableHead className="font-hud w-[160px] px-3 text-[9px] uppercase text-muted-foreground">
                  Situação
                </TableHead>
                <TableHead className="font-hud w-[100px] px-3 text-right text-[9px] uppercase text-muted-foreground">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedLots.map((lot) => {
                const checked = selected.has(lot.id);
                const ultima = lot.preservations[lot.preservations.length - 1];
                const localizacao = [
                  lot.location,
                  lot.rua && `R. ${lot.rua}`,
                  lot.prateleira && `Prat. ${lot.prateleira}`,
                ].filter(Boolean).join(" · ");

                return (
                  <TableRow
                    key={lot.id}
                    className={cn(
                      "group cursor-pointer border-border transition-colors duration-200 hover:bg-white/[0.02]",
                      checked && "bg-primary-soft",
                    )}
                    onClick={() => setDetailLot(lot)}
                  >
                    <TableCell className="px-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => toggleOne(lot.id, !!c)}
                        aria-label={`Selecionar ${lot.identificadorInterno}`}
                      />
                    </TableCell>

                    <TableCell className="px-3">
                      <span className="font-hud border border-primary/40 bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        {lot.identificadorInterno}
                      </span>
                      <p className="font-hud mt-1 text-[9px] uppercase text-muted-foreground">
                        {LOT_TIPO_LABEL[lot.tipoLote]}
                      </p>
                      {getLotCycle(lot).tipo === "dias_corridos" && (
                        <p className="font-hud mt-0.5 text-[9px] uppercase text-primary/70">
                          {getLotCycle(lot).label}
                        </p>
                      )}
                    </TableCell>

                    <TableCell className="px-3">
                      <p className="truncate text-sm font-medium" title={lot.name}>{lot.name}</p>
                      <p className="font-hud mt-0.5 truncate text-[10px] text-muted-foreground">
                        {lot.code}
                        {lot.responsible && ` · ${lot.responsible}`}
                      </p>
                    </TableCell>

                    <TableCell className="hidden px-3 text-xs text-muted-foreground lg:table-cell">
                      <span className="line-clamp-2" title={localizacao || "—"}>{localizacao || "—"}</span>
                    </TableCell>

                    <TableCell className="px-3">
                      <p className="font-hud text-[11px] tabular-nums text-muted-foreground">
                        Últ. <span className="text-foreground/80">{formatDate(ultima?.date)}</span>
                      </p>
                      <p className="font-hud text-[11px] tabular-nums text-muted-foreground">
                        Próx. <span className="text-foreground/80">{formatDate(getLotNextDueDate(lot) ?? undefined)}</span>
                      </p>
                    </TableCell>

                    {/* Situação: só o status principal + a marca de atividade.
                        A sílica gel saiu daqui — é informação complementar e
                        vive no painel de detalhes, na área de preservação. */}
                    <TableCell className="px-3">
                      <div className="flex flex-col items-start gap-1.5">
                        <LotStatusPill lot={lot} showDays />
                        <LotActivityMark lot={lot} />
                      </div>
                    </TableCell>

                    <TableCell className="px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-0.5 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100">
                        {canWrite && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Editar ${lot.identificadorInterno}`}
                              title="Editar"
                              className="h-8 w-8"
                              onClick={() => handleEdit(lot)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <RowDeleteAction
                              tipo="lote"
                              itemId={lot.id}
                              itemDescricao={`${lot.code} — ${lot.name}`}
                              confirmTitle="Excluir lote?"
                              confirmDescription={`Esta ação não pode ser desfeita. O lote "${lot.name}" e todo seu histórico serão removidos.`}
                              onConfirmDelete={() => deleteLot(lot.id)}
                            />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ---------- Paginação ---------- */}
      {!loading && sortedLots.length > 0 && (
        <div className="flex flex-col gap-3 border border-border bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-hud text-[10px] uppercase text-muted-foreground">
            {rangeStart}–{rangeEnd} de {sortedLots.length}
          </p>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>
            <span className="font-hud px-2 text-[11px] tabular-nums">
              <span className="text-primary">{page}</span> / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8"
            >
              <span className="hidden sm:inline">Próxima</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* ---------- Diálogos ---------- */}
      <LotFormDialog open={formOpen} onOpenChange={setFormOpen} onSubmit={handleSubmit} initialData={editingLot} />

      {detailLot && (
        <LotDetailSheet
          lot={detailLot}
          open={!!detailLot}
          onOpenChange={(o) => !o && setDetailLot(undefined)}
          onEdit={(l) => { setDetailLot(undefined); handleEdit(l); }}
        />
      )}

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <BulkPreservationDialog
        open={bulkPresOpen}
        onOpenChange={setBulkPresOpen}
        selectedCount={selectedCount}
        onSubmit={handleBulkPreservation}
      />

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedCount} lote(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os lotes selecionados e seus históricos de
              preservação serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-white hover:text-destructive"
            >
              Excluir {selectedCount} lote(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
