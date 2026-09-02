import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, FileType2, Loader2, CheckSquare, Filter } from "lucide-react";
import { toast } from "sonner";
import { Lot } from "@/types/lot";
import { exportLotsCsv, exportLotsPdf, exportLotsXlsx } from "@/lib/exportLots";

type Format = "xlsx" | "csv" | "pdf";
type Scope = "filtered" | "selected";

interface Props {
  filteredLots: Lot[];
  selectedLots: Lot[];
}

export function ExportMenu({ filteredLots, selectedLots }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  const run = async (scope: Scope, format: Format) => {
    const lots = scope === "selected" ? selectedLots : filteredLots;
    if (lots.length === 0) {
      toast.error(scope === "selected" ? "Nenhum lote selecionado." : "Nenhum lote para exportar.");
      return;
    }
    const key = `${scope}-${format}`;
    setLoading(key);
    const baseName = scope === "selected" ? "lotes_selecionados" : "lotes_filtrados";
    try {
      if (format === "xlsx") exportLotsXlsx(lots, baseName);
      else if (format === "csv") exportLotsCsv(lots, baseName);
      else await exportLotsPdf(lots, baseName);
      toast.success(`${lots.length} lote(s) exportado(s) em ${format.toUpperCase()}.`);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível exportar os dados.");
    } finally {
      setLoading(null);
    }
  };

  const isLoading = loading !== null;
  const selectedCount = selectedLots.length;
  const filteredCount = filteredLots.length;

  const Item = ({ scope, format, icon: Icon, label }: { scope: Scope; format: Format; icon: typeof FileSpreadsheet; label: string }) => {
    const key = `${scope}-${format}`;
    const isThis = loading === key;
    return (
      <DropdownMenuItem
        disabled={isLoading}
        onSelect={(e) => { e.preventDefault(); run(scope, format); }}
        className="cursor-pointer"
      >
        {isThis ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        <span>{label}</span>
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={isLoading}
          
        >
          {isLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2 text-xs">
          <Filter className="h-3.5 w-3.5" /> Resultados filtrados ({filteredCount})
        </DropdownMenuLabel>
        <Item scope="filtered" format="xlsx" icon={FileSpreadsheet} label="Exportar como Excel (.xlsx)" />
        <Item scope="filtered" format="csv" icon={FileType2} label="Exportar como CSV (.csv)" />
        <Item scope="filtered" format="pdf" icon={FileText} label="Exportar como PDF" />

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="flex items-center gap-2 text-xs">
          <CheckSquare className="h-3.5 w-3.5" /> Selecionados ({selectedCount})
        </DropdownMenuLabel>
        <Item scope="selected" format="xlsx" icon={FileSpreadsheet} label="Exportar como Excel (.xlsx)" />
        <Item scope="selected" format="csv" icon={FileType2} label="Exportar como CSV (.csv)" />
        <Item scope="selected" format="pdf" icon={FileText} label="Exportar como PDF" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
