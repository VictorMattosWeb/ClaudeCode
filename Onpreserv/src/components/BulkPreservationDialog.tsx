import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { UserSelect } from "@/components/UserSelect";
import { addDays } from "@/types/lot";
import { Layers, CheckCircle2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onSubmit: (data: { date: string; nextDate: string; observation: string; responsible: string }) => void;
}

export function BulkPreservationDialog({ open, onOpenChange, selectedCount, onSubmit }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [observation, setObservation] = useState("");
  const [responsible, setResponsible] = useState("");

  useEffect(() => {
    if (open) {
      setDate(today);
      setObservation("");
      setResponsible("");
    }
  }, [open]);

  const nextDate = date ? addDays(date, 15) : "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ date, nextDate, observation, responsible });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Preservação em lote
          </DialogTitle>
          <DialogDescription>
            <Badge variant="secondary" className="gap-1.5 mt-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              {selectedCount} lote(s) selecionado(s)
            </Badge>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bdate">Data da Realização</Label>
            <Input id="bdate" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="transition-all duration-200 focus:scale-[1.01]" />
          </div>
          <div className="space-y-2">
            <Label>Próxima Preservação (automático)</Label>
            <Input type="date" value={nextDate} readOnly className="bg-muted opacity-70" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bresp">Responsável</Label>
            <UserSelect id="bresp" value={responsible} onChange={setResponsible} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bobs">Observação</Label>
            <Textarea id="bobs" value={observation} onChange={(e) => setObservation(e.target.value)} className="transition-all duration-200 focus:scale-[1.01]" />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} >Cancelar</Button>
            <Button type="submit" >
              Registrar para {selectedCount} lote(s)
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
