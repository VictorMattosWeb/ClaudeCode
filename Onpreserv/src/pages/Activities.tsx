import { useEffect, useState } from "react";
import { ActivityTable } from "@/components/ActivityTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/PageHeader";
import { ClipboardList, Download, FileSpreadsheet, FileText, FileType2, Loader2, Truck, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { useActivities } from "@/context/ActivityContext";
import { exportActivitiesCsv, exportActivitiesPdf, exportActivitiesXlsx } from "@/lib/exportActivities";

export default function Activities() {
  const { activities } = useActivities();
  const [tab, setTab] = useState<"campo" | "almoxarifado">("campo");
  useEffect(() => { document.title = "Atividades | onPreserv"; }, []);

  const countCampo = activities.filter((a) => a.local === "campo").length;
  const countAlmox = activities.filter((a) => a.local === "almoxarifado").length;
  const [loadingExport, setLoadingExport] = useState<null | "xlsx" | "csv" | "pdf">(null);

  const activeActivities = activities.filter((activity) => activity.local === tab);

  const runExport = async (format: "xlsx" | "csv" | "pdf") => {
    if (!activeActivities.length) {
      toast.error("Nenhuma atividade para exportar nesta aba.");
      return;
    }

    setLoadingExport(format);
    const baseName = `atividades_${tab}`;

    try {
      if (format === "xlsx") exportActivitiesXlsx(activeActivities, baseName);
      else if (format === "csv") exportActivitiesCsv(activeActivities, baseName);
      else await exportActivitiesPdf(activeActivities, baseName);
      toast.success(`${activeActivities.length} atividade(s) exportada(s) em ${format.toUpperCase()}.`);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível exportar as atividades.");
    } finally {
      setLoadingExport(null);
    }
  };

  return (
    <main className="container mx-auto space-y-6 px-3 py-6 sm:px-4">
      <PageHeader
        icon={ClipboardList}
        title="Atividades de preservação"
        subtitle="Campo e almoxarifado, com frequências independentes"
        code="ATV_01"
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={loadingExport !== null}>
                {loadingExport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); void runExport("xlsx"); }}>
                <FileSpreadsheet className="h-4 w-4" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); void runExport("csv"); }}>
                <FileType2 className="h-4 w-4" /> CSV (.csv)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); void runExport("pdf"); }}>
                <FileText className="h-4 w-4" /> PDF (.pdf)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "campo" | "almoxarifado")} className="space-y-4">
          <TabsList className="w-full justify-start sm:w-auto">
            <TabsTrigger value="campo" className="flex-1 gap-1.5 sm:flex-none">
              <Truck className="h-3.5 w-3.5" />
              Campo
              <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 rounded-full bg-muted px-1 text-[10px] font-medium">
                {countCampo}
              </span>
            </TabsTrigger>
            <TabsTrigger value="almoxarifado" className="flex-1 gap-1.5 sm:flex-none">
              <Warehouse className="h-3.5 w-3.5" />
              Almoxarifado
              <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 rounded-full bg-muted px-1 text-[10px] font-medium">
                {countAlmox}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campo" className="mt-0">
            <ActivityTable
              local="campo"
              emptyLabel='Nenhuma atividade de campo. Clique em "Nova" para cadastrar.'
            />
          </TabsContent>
          <TabsContent value="almoxarifado" className="mt-0">
            <ActivityTable
              local="almoxarifado"
              emptyLabel='Nenhuma atividade de almoxarifado. Clique em "Nova" para cadastrar.'
            />
          </TabsContent>
        </Tabs>
    </main>
  );
}
