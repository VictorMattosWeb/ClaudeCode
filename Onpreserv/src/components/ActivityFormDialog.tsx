import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActivities } from "@/context/ActivityContext";
import { ActivityLocal, ACTIVITY_LOCAL_LABEL, PreservationActivity } from "@/types/activity";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: PreservationActivity | null;
  /** Local default usado para novas atividades quando 'activity' for null. */
  defaultLocal?: ActivityLocal;
}

export function ActivityFormDialog({ open, onOpenChange, activity, defaultLocal = "campo" }: Props) {
  const { addActivity, updateActivity } = useActivities();
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [frequencia, setFrequencia] = useState(30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCodigo(activity?.codigo ?? "");
      setDescricao(activity?.descricao ?? "");
      setFrequencia(activity?.frequencia ?? 30);
    }
  }, [open, activity]);

  const local: ActivityLocal = activity?.local ?? defaultLocal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const payload = {
      codigo,
      descricao,
      local,
      frequencia: Number(frequencia),
    };
    try {
      const res = activity
        ? await updateActivity(activity.id, payload)
        : await addActivity(payload);
      if (!res.ok) { toast.error(res.error ?? "Não foi possível salvar a atividade."); return; }
      toast.success(activity ? "Atividade atualizada" : "Atividade criada");
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle>
            {activity ? "Editar atividade" : "Nova atividade"}
          </DialogTitle>
          <DialogDescription>
            Lista de <strong>{ACTIVITY_LOCAL_LABEL[local]}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="codigo">Código *</Label>
            <Input id="codigo" required value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Input id="descricao" required value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="freq">Frequência (dias) *</Label>
            <Input id="freq" type="number" min={1} required value={frequencia} onChange={(e) => setFrequencia(Number(e.target.value))} />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
