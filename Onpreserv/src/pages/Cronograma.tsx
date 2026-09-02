import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { MedicaoSelector } from "@/components/MedicaoSelector";
import { CalendarRange, Plus, Upload, Download, FileSpreadsheet, Pencil, Trash2, CheckCheck, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCronograma } from "@/context/CronogramaContext";
import { useAuth } from "@/context/AuthContext";
import { CronogramaDashboardCards } from "@/components/CronogramaDashboardCards";
import { CronogramaFilters, FilterState, initialFilters } from "@/components/CronogramaFilters";
import { CronogramaTable } from "@/components/CronogramaTable";
import { MedicaoFormDialog } from "@/components/MedicaoFormDialog";
import { CronogramaItemDialog } from "@/components/CronogramaItemDialog";
import { CronogramaImportDialog } from "@/components/CronogramaImportDialog";
import { CronogramaBulkPreservationDialog } from "@/components/CronogramaBulkPreservationDialog";
import { ItemCalculado } from "@/types/cronograma";
import { computeCronogramaStats as calcularStats } from "@/lib/stats";
import { exportItensXlsx, exportItensCsv, exportItensPdf } from "@/lib/exportCronograma";

export default function Cronograma() {
  const { medicoes, itensCalculados, loading, deleteMedicao, reorderMedicao } = useCronograma();
  const { isAdmin, canWrite } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [medicaoDialog, setMedicaoDialog] = useState<{ open: boolean; edit?: any }>({ open: false });
  const [itemDialog, setItemDialog] = useState<{ open: boolean; edit?: any }>({ open: false });
  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => { document.title = "Cronograma | onPreserv"; }, []);

  useEffect(() => {
    if (!activeId && medicoes.length) setActiveId(medicoes[0].id);
    if (activeId && !medicoes.find((m) => m.id === activeId)) {
      setActiveId(medicoes[0]?.id ?? null);
    }
  }, [medicoes, activeId]);

  const activeMedicao = medicoes.find((m) => m.id === activeId) ?? null;
  const itensMedicao = useMemo(
    () => itensCalculados.filter((i) => i.medicaoId === activeId),
    [itensCalculados, activeId]
  );

  const semanas = useMemo(() => {
    const key = (s: string) => {
      const m = s.match(/\d+/);
      return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER;
    };
    return Array.from(new Set(itensMedicao.map((i) => i.semana).filter(Boolean)))
      .sort((a, b) => key(a) - key(b) || a.localeCompare(b));
  }, [itensMedicao]);
  const unidades = useMemo(() => Array.from(new Set(itensMedicao.map((i) => i.unidade).filter(Boolean))).sort(), [itensMedicao]);
  const gabinetes = useMemo(() => Array.from(new Set(itensMedicao.map((i) => i.gabinete).filter(Boolean))).sort(), [itensMedicao]);
  const tipos = useMemo(() => Array.from(new Set(itensMedicao.map((i) => i.tipo).filter(Boolean))).sort(), [itensMedicao]);
  const statuses = useMemo(() => Array.from(new Set(itensMedicao.map((i) => i.status).filter(Boolean))).sort(), [itensMedicao]);

  const semanaKey = (s: string): [number, string] => {
    const m = (s ?? "").match(/\d+/);
    return [m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER, (s ?? "").toLowerCase()];
  };

  const filtrados = useMemo<ItemCalculado[]>(() => {
    const b = filters.busca.toLowerCase().trim();
    const list = itensMedicao.filter((i) => {
      if (b && !`${i.tag} ${i.unidade} ${i.gabinete} ${i.preservacao} ${i.tipo}`.toLowerCase().includes(b)) return false;
      if (filters.semana !== "todos" && i.semana !== filters.semana) return false;
      if (filters.unidade !== "todos" && i.unidade !== filters.unidade) return false;
      if (filters.gabinete !== "todos" && i.gabinete !== filters.gabinete) return false;
      if (filters.tipo !== "todos" && i.tipo !== filters.tipo) return false;
      if (filters.status !== "todos" && i.status !== filters.status) return false;
      if (filters.situacao !== "todos" && i.situacao !== filters.situacao) return false;
      return true;
    });
    return list.sort((a, b) => {
      const [an, as] = semanaKey(a.semana);
      const [bn, bs] = semanaKey(b.semana);
      if (an !== bn) return an - bn;
      if (as !== bs) return as.localeCompare(bs);
      return (a.tag || "").localeCompare(b.tag || "");
    });
  }, [itensMedicao, filters]);

  const stats = useMemo(() => calcularStats(filtrados), [filtrados]);

  return (
    <main className="container mx-auto space-y-6 px-3 py-6 sm:px-4">
      <PageHeader
        icon={CalendarRange}
        title="Cronograma de preservação"
        subtitle="Importação, acompanhamento e indicadores por medição"
        code="CRN_01"
        actions={
          isAdmin ? (
            <Button size="sm" onClick={() => setMedicaoDialog({ open: true })}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Nova medição
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-4">
        {medicoes.length === 0 ? (
          <div className="border border-dashed border-border p-12 text-center space-y-3">
            <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {loading ? "Carregando..." : "Nenhuma medição cadastrada."}
            </p>
            {isAdmin && !loading && (
              <Button onClick={() => setMedicaoDialog({ open: true })}>
                <Plus className="h-4 w-4" /> Criar primeira medição
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <MedicaoSelector
                medicoes={medicoes}
                itens={itensCalculados}
                activeId={activeId}
                onChange={(id) => { setActiveId(id); setSelected([]); setFilters(initialFilters); }}
              />

              {activeMedicao && (
                <div className="flex items-center gap-2">
                  {canWrite && selected.length > 0 && (
                    <Button size="sm" onClick={() => setBulkOpen(true)}>
                      <CheckCheck className="h-4 w-4" /> Dar baixa em lote ({selected.length})
                    </Button>
                  )}
                  {canWrite && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setItemDialog({ open: true })}>
                        <Plus className="h-4 w-4" /> Item
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                        <Upload className="h-4 w-4" /> Importar
                      </Button>
                    </>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4" /> Exportar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => exportItensXlsx(filtrados, activeMedicao)}>
                        Excel (.xlsx)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportItensCsv(filtrados, activeMedicao)}>
                        CSV (.csv)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportItensPdf(filtrados, activeMedicao)}>
                        PDF (.pdf)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {isAdmin && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Subir na lista (só afeta medições sem data de referência)"
                        aria-label="Subir medição na lista"
                        disabled={medicoes.findIndex((m) => m.id === activeMedicao.id) === 0}
                        onClick={() => reorderMedicao(activeMedicao.id, "up")}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Descer na lista (só afeta medições sem data de referência)"
                        aria-label="Descer medição na lista"
                        disabled={medicoes.findIndex((m) => m.id === activeMedicao.id) === medicoes.length - 1}
                        onClick={() => reorderMedicao(activeMedicao.id, "down")}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Editar medição" title="Editar medição" onClick={() => setMedicaoDialog({ open: true, edit: activeMedicao })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label="Excluir medição" title="Excluir medição" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir medição?</AlertDialogTitle>
                            <AlertDialogDescription>
                              A medição "{activeMedicao.nome}" e todos os {itensMedicao.length} itens associados serão removidos permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMedicao(activeMedicao.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Só a medição ativa é renderizada. Antes o TabsContent de todas
                ficava montado ao mesmo tempo, cada uma com sua tabela. */}
            {activeMedicao && (
              <div className="space-y-4">
                <CronogramaDashboardCards stats={stats} />
                <CronogramaFilters
                  value={filters}
                  onChange={setFilters}
                  semanas={semanas}
                  unidades={unidades}
                  gabinetes={gabinetes}
                  tipos={tipos}
                  statuses={statuses}
                />
                <CronogramaTable
                  itens={filtrados}
                  selected={selected}
                  onSelectedChange={setSelected}
                  onEdit={(i) => setItemDialog({ open: true, edit: i })}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <MedicaoFormDialog
        open={medicaoDialog.open}
        onOpenChange={(o) => setMedicaoDialog({ open: o })}
        medicao={medicaoDialog.edit}
        onCreated={(m) => setActiveId(m.id)}
      />
      {activeId && (
        <>
          <CronogramaItemDialog
            open={itemDialog.open}
            onOpenChange={(o) => setItemDialog({ open: o })}
            medicaoId={activeId}
            item={itemDialog.edit}
          />
          <CronogramaImportDialog
            open={importOpen}
            onOpenChange={setImportOpen}
            medicaoId={activeId}
          />
          <CronogramaBulkPreservationDialog
            open={bulkOpen}
            onOpenChange={setBulkOpen}
            itens={itensMedicao.filter((i) => selected.includes(i.id))}
            onDone={() => setSelected([])}
          />
        </>
      )}
    </main>
  );
}
