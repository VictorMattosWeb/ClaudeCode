import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { notifyError } from "@/lib/errorMessages";

export type DeleteItemType = Database["public"]["Enums"]["delete_item_type"];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tipo: DeleteItemType;
  itemId: string;
  itemDescricao?: string;
}

// Parcial de propósito: o enum `delete_item_type` do banco ainda contém valores de
// módulos desativados (ex.: estoque). Rótulo ausente cai no fallback em vez de quebrar.
const tipoLabel: Partial<Record<DeleteItemType, string>> = {
  lote: "Lote",
  preservacao: "Preservação",
  atividade: "Atividade",
  tarefa: "Tarefa",
  quadro: "Quadro",
};

const labelDoTipo = (tipo: DeleteItemType) => tipoLabel[tipo] ?? "Registro";

export function DeleteRequestDialog({ open, onOpenChange, tipo, itemId, itemDescricao }: Props) {
  const { user } = useAuth();
  const [justificativa, setJustificativa] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (justificativa.trim().length < 5) {
      toast.error("Descreva o motivo com pelo menos 5 caracteres.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("solicitacoes_exclusao").insert({
      tipo,
      item_id: itemId,
      item_descricao: itemDescricao ?? null,
      solicitante_id: user.id,
      justificativa: justificativa.trim(),
    });
    setSubmitting(false);
    if (error) {
      notifyError(error);
      return;
    }
    toast.success("Solicitação enviada para aprovação");
    setJustificativa("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Solicitar exclusão</DialogTitle>
            <DialogDescription>
              Sua solicitação será enviada para um administrador. Apenas após aprovação o item
              será excluído.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <div className="text-xs text-muted-foreground">Item</div>
              <div className="font-medium">
                {labelDoTipo(tipo)} {itemDescricao ? `— ${itemDescricao}` : ""}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="just">Motivo da exclusão *</Label>
              <Textarea
                id="just"
                rows={4}
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Explique por que este item deve ser excluído"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar solicitação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
