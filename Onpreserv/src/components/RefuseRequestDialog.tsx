import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X } from "lucide-react";
import { validators, runChecks } from "@/lib/validators";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  itemDescricao?: string | null;
  onConfirm: (motivo: string) => Promise<void> | void;
}

export function RefuseRequestDialog({ open, onOpenChange, itemDescricao, onConfirm }: Props) {
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = runChecks(
      validators.required(motivo, "Motivo"),
      validators.minLength(motivo, 5, "Motivo"),
      validators.maxLength(motivo, 500, "Motivo"),
    );
    if (check.ok === false) {
      toast.error(check.error);
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(motivo.trim());
      setMotivo("");
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Recusar solicitação</DialogTitle>
            <DialogDescription>
              Informe o motivo da recusa. Ele será exibido ao solicitante.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {itemDescricao && (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <div className="text-xs text-muted-foreground">Item</div>
                <div className="font-medium truncate">{itemDescricao}</div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="motivo-recusa">Motivo da recusa *</Label>
              <Textarea
                id="motivo-recusa"
                rows={4}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Explique por que a solicitação está sendo recusada"
                required
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{motivo.length}/500</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Confirmar recusa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
