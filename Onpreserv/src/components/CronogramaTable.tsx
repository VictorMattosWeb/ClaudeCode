import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, CheckCheck } from "lucide-react";
import { ItemCalculado } from "@/types/cronograma";
import { SituacaoBadge } from "./SituacaoBadge";
import { useCronograma } from "@/context/CronogramaContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Props {
  itens: ItemCalculado[];
  selected: string[];
  onSelectedChange: (ids: string[]) => void;
  onEdit: (item: ItemCalculado) => void;
}

const fmtDate = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—");

export function CronogramaTable({ itens, selected, onSelectedChange, onEdit }: Props) {
  const { deleteItem, updateItem } = useCronograma();
  const { isAdmin, canWrite } = useAuth();
  const [baixandoId, setBaixandoId] = useState<string | null>(null);

  const darBaixa = async (item: ItemCalculado) => {
    const hoje = new Date().toISOString().slice(0, 10);
    setBaixandoId(item.id);
    const ok = await updateItem(item.id, { status: "PRESERVADO", dataRealizada: hoje });
    setBaixandoId(null);
    if (ok) toast.success(`Baixa registrada para ${item.tag}`);
  };
  const allSelected = itens.length > 0 && selected.length === itens.length;

  const toggle = (id: string) =>
    onSelectedChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const toggleAll = () => onSelectedChange(allSelected ? [] : itens.map((i) => i.id));

  if (!itens.length) {
    return (
      <div className="border rounded-lg p-12 text-center text-sm text-muted-foreground">
        Nenhum item nesta medição. Importe um cronograma ou adicione manualmente.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            </TableHead>
            <TableHead>Semana</TableHead>
            <TableHead>Preservação</TableHead>
            <TableHead>TAG</TableHead>
            <TableHead>Unidade</TableHead>
            <TableHead>Gabinete</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Prevista</TableHead>
            <TableHead>Realizada</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead className="text-right">Desvio</TableHead>
            <TableHead className="w-24 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {itens.map((i) => (
            <TableRow key={i.id} data-state={selected.includes(i.id) ? "selected" : undefined}>
              <TableCell>
                <Checkbox checked={selected.includes(i.id)} onCheckedChange={() => toggle(i.id)} />
              </TableCell>
              <TableCell className="text-xs">{i.semana || "—"}</TableCell>
              <TableCell className="text-xs">{i.preservacao || "—"}</TableCell>
              <TableCell className="font-mono text-xs">{i.tag}</TableCell>
              <TableCell className="text-xs">{i.unidade}</TableCell>
              <TableCell className="text-xs">{i.gabinete}</TableCell>
              <TableCell className="text-xs">{i.tipo || "—"}</TableCell>
              <TableCell className="text-xs">{fmtDate(i.dataPrevista)}</TableCell>
              <TableCell className="text-xs">{fmtDate(i.dataRealizada)}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px]">{i.status}</Badge>
              </TableCell>
              <TableCell><SituacaoBadge situacao={i.situacao} /></TableCell>
              <TableCell className="text-right text-xs font-mono">
                {i.desvioDias === null ? "—" : (
                  <span className={i.desvioDias > 0 ? "text-warning" : i.desvioDias < 0 ? "text-success" : ""} title={i.desvioDias > 0 && i.motivoDivergencia ? i.motivoDivergencia : undefined}>
                    {i.desvioDias > 0 ? `+${i.desvioDias}` : i.desvioDias}d
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {canWrite && i.status !== "PRESERVADO" && i.situacao !== "nao_aplicavel" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-success hover:bg-success/10 hover:text-success"
                      title="Dar baixa (marcar como preservado hoje)"
                      aria-label="Dar baixa (marcar como preservado hoje)"
                      disabled={baixandoId === i.id}
                      onClick={() => darBaixa(i)}
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {canWrite && (
                    <Button size="icon" variant="ghost" aria-label="Editar item do cronograma" title="Editar item" className="h-7 w-7" onClick={() => onEdit(i)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" aria-label="Excluir item do cronograma" title="Excluir item" className="h-7 w-7 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir item?</AlertDialogTitle>
                          <AlertDialogDescription>
                            TAG {i.tag} será removida do cronograma. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteItem(i.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
