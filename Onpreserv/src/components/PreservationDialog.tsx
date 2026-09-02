import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserSelect } from "@/components/UserSelect";
import { addDays } from "@/types/lot";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { date: string; nextDate: string; observation: string; responsible: string }) => Promise<boolean>;
}

export function PreservationDialog({ open, onOpenChange, onSubmit }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [observation, setObservation] = useState("");
  const [responsible, setResponsible] = useState("");
  const [saving, setSaving] = useState(false);

  const nextDate = date ? addDays(date, 15) : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const ok = await onSubmit({ date, nextDate, observation, responsible });
    setSaving(false);
    if (!ok) return;
    onOpenChange(false);
    setDate(today);
    setObservation("");
    setResponsible("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle>Registrar Preservação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pdate">Data da Realização</Label>
            <Input id="pdate" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="transition-all duration-200 focus:scale-[1.01]" />
          </div>
          <div className="space-y-2">
            <Label>Próxima Preservação (automático)</Label>
            <Input type="date" value={nextDate} readOnly className="bg-muted opacity-70" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="presp">Responsável</Label>
            <UserSelect id="presp" value={responsible} onChange={setResponsible} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pobs">Observação</Label>
            <Textarea id="pobs" value={observation} onChange={(e) => setObservation(e.target.value)} className="transition-all duration-200 focus:scale-[1.01]" />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving} >Cancelar</Button>
            <Button type="submit" disabled={saving} >{saving ? "Salvando..." : "Registrar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
