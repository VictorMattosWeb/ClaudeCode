import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2 } from "lucide-react";
import { ItemCalculado } from "@/types/cronograma";
import { useCronograma } from "@/context/CronogramaContext";
import { selecionarParaBaixa } from "@/lib/cronogramaBaixa";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  itens: ItemCalculado[];
  onDone?: () => void;
}

export function CronogramaBulkPreservationDialog({ open, onOpenChange, itens, onDone }: Props) {
  const { updateItem } = useCronograma();
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setData(new Date().toISOString().slice(0, 10));
      setObs("");
    }
  }, [open]);

  const aPreservar = selecionarParaBaixa(itens);
  const jaPreservados = itens.filter(
    (i) => (i.status || "").toUpperCase() === "PRESERVADO" || !!i.dataRealizada,
  ).length;
  const naoAplicaveis = itens.filter((i) => i.situacao === "nao_aplicavel").length;

  const confirmar = async () => {
    if (!data) { toast.error("Informe a data de realização."); return; }
    if (!aPreservar.length) { toast.error("Selecione ao menos um item pendente."); return; }
    setLoading(true);
    let ok = 0, fail = 0;
    for (const i of aPreservar) {
      const updated = await updateItem(i.id, {
        status: "PRESERVADO",
        dataRealizada: data,
        ...(obs.trim() ? { observacoes: obs.trim() } : {}),
      });
      if (updated) ok++;
      else fail++;
    }
    setLoading(false);
    if (fail > 0) {
      toast.error(
        `Baixa parcial: ${ok} preservado(s), ${fail} falha(s). Verifique permissões ou tente novamente.`,
      );
    } else {
      toast.success(
        `Baixa concluída: ${ok} preservado(s)` +
        (jaPreservados ? `, ${jaPreservados} já estavam preservados` : "") +
        (naoAplicaveis ? `, ${naoAplicaveis} N/A ignorado(s)` : ""),
      );
    }
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dar baixa em lote</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">{itens.length} selecionado(s)</Badge>
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              <CheckCircle2 className="h-3 w-3" /> {aPreservar.length} a preservar
            </Badge>
            {jaPreservados > 0 && (
              <Badge variant="outline" className="bg-muted">
                {jaPreservados} já preservado(s) — serão ignorados
              </Badge>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="data">Data da preservação *</Label>
            <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="obs">Observações (opcional)</Label>
            <Textarea id="obs" value={obs} onChange={(e) => setObs(e.target.value)}
              placeholder="Aplicada a todos os itens preservados nesta baixa" rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={confirmar} disabled={loading || aPreservar.length === 0}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar baixa ({aPreservar.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
