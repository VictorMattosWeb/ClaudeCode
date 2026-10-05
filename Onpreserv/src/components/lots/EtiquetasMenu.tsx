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
import { Printer, Loader2, AlertTriangle, Clock, CheckSquare, Filter } from "lucide-react";
import { toast } from "sonner";
import { Lot, getLotPreservationStatus } from "@/types/lot";

/**
 * Emissão das etiquetas de preservação.
 *
 * O escopo é a decisão de quem imprime: raramente se quer o acervo inteiro. O
 * caso comum é levar para o campo só o que está vencido ou vence nesta semana,
 * e por isso esses dois vêm primeiro, com a contagem à vista — quem abre o menu
 * já sabe quantas folhas vai gastar antes de clicar.
 *
 * Lotes inativos ficam de fora dos escopos por situação: eles não exigem
 * preservação, então uma etiqueta para eles seria trabalho perdido. Continuam
 * disponíveis por seleção manual, para o caso de alguém precisar reidentificar
 * material parado no almoxarifado.
 */

type Escopo = "vencidos" | "aVencer" | "selecionados" | "filtrados";

interface Props {
  /** Lotes atualmente visíveis na listagem, já filtrados. */
  filteredLots: Lot[];
  /** Lotes marcados pelo usuário. */
  selectedLots: Lot[];
}

export function EtiquetasMenu({ filteredLots, selectedLots }: Props) {
  const [emitindo, setEmitindo] = useState<Escopo | null>(null);

  const ativos = filteredLots.filter((l) => l.status === "ativo");
  const vencidos = ativos.filter((l) => getLotPreservationStatus(l) === "overdue");
  const aVencer = ativos.filter((l) => getLotPreservationStatus(l) === "upcoming");

  const conjuntos: Record<Escopo, { lotes: Lot[]; arquivo: string; vazio: string }> = {
    vencidos: {
      lotes: vencidos,
      arquivo: "etiquetas_vencidas",
      vazio: "Nenhum lote com a semana vencida.",
    },
    aVencer: {
      lotes: aVencer,
      arquivo: "etiquetas_a_vencer",
      vazio: "Nenhum lote vence nesta semana.",
    },
    selecionados: {
      lotes: selectedLots,
      arquivo: "etiquetas_selecionadas",
      vazio: "Nenhum lote selecionado.",
    },
    filtrados: {
      lotes: filteredLots,
      arquivo: "etiquetas_lotes",
      vazio: "Nenhum lote na listagem.",
    },
  };

  const emitir = async (escopo: Escopo) => {
    const { lotes, arquivo, vazio } = conjuntos[escopo];
    if (lotes.length === 0) {
      toast.error(vazio);
      return;
    }

    setEmitindo(escopo);
    try {
      const { gerarEtiquetasPdf } = await import("@/lib/etiquetasLotes");
      const r = await gerarEtiquetasPdf(lotes, arquivo);
      toast.success(
        `${r.etiquetas} etiqueta(s) em ${r.paginas} página(s).`,
        { description: r.arquivo },
      );
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível gerar as etiquetas.");
    } finally {
      setEmitindo(null);
    }
  };

  const ocupado = emitindo !== null;

  const Item = ({
    escopo,
    icon: Icon,
    label,
    tom,
  }: {
    escopo: Escopo;
    icon: typeof Printer;
    label: string;
    tom?: string;
  }) => {
    const quantidade = conjuntos[escopo].lotes.length;
    return (
      <DropdownMenuItem
        disabled={ocupado}
        onSelect={(e) => {
          e.preventDefault();
          void emitir(escopo);
        }}
        className="cursor-pointer gap-2"
      >
        {emitindo === escopo ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Icon className={`h-4 w-4 ${tom ?? "text-muted-foreground"}`} />
        )}
        <span className="flex-1">{label}</span>
        <span className="font-hud text-xs text-muted-foreground">{quantidade}</span>
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={ocupado} className="gap-2">
          {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          Etiquetas
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Emitir etiquetas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Item escopo="vencidos" icon={AlertTriangle} label="Semana vencida" tom="text-destructive" />
        <Item escopo="aVencer" icon={Clock} label="Vence nesta semana" tom="text-warning" />
        <DropdownMenuSeparator />
        <Item escopo="selecionados" icon={CheckSquare} label="Selecionados" />
        <Item escopo="filtrados" icon={Filter} label="Todos da listagem" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
