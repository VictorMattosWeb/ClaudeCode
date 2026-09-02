import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCronograma } from "@/context/CronogramaContext";
import { CronogramaItem, CRONOGRAMA_STATUS_VALUES, calcularSituacao } from "@/types/cronograma";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  medicaoId: string;
  item?: CronogramaItem | null;
}

export function CronogramaItemDialog({ open, onOpenChange, medicaoId, item }: Props) {
  const { addItem, updateItem } = useCronograma();
  const [form, setForm] = useState({
    semana: "", preservacao: "", tag: "", unidade: "", gabinete: "", tipo: "",
    dataPrevista: "", dataRealizada: "", status: "PENDENTE", observacoes: "",
    motivoDivergencia: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        semana: item?.semana ?? "", preservacao: item?.preservacao ?? "",
        tag: item?.tag ?? "", unidade: item?.unidade ?? "", gabinete: item?.gabinete ?? "",
        tipo: item?.tipo ?? "",
        dataPrevista: item?.dataPrevista ?? "", dataRealizada: item?.dataRealizada ?? "",
        status: item?.status ?? "PENDENTE", observacoes: item?.observacoes ?? "",
        motivoDivergencia: item?.motivoDivergencia ?? "",
      });
    }
  }, [open, item]);

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // Detecta divergência em tempo real para condicionar o campo de motivo
  const previewSituacao = calcularSituacao({
    ...(item ?? ({} as CronogramaItem)),
    dataPrevista: form.dataPrevista || null,
    dataRealizada: form.dataRealizada || null,
    status: form.status,
  } as CronogramaItem).situacao;
  const isDivergencia = previewSituacao === "divergencia";

  const handleSave = async () => {
    if (!form.tag.trim() || !form.unidade.trim() || !form.gabinete.trim() || saving) return;
    setSaving(true);
    const payload = {
      ...form,
      dataPrevista: form.dataPrevista || null,
      dataRealizada: form.dataRealizada || null,
    };
    try {
      if (item) {
        const updated = await updateItem(item.id, payload as Partial<CronogramaItem>);
        if (!updated) return;
        toast.success("Item atualizado");
      } else {
        const created = await addItem({ medicaoId, ...payload });
        if (!created) return;
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Editar item" : "Novo item do cronograma"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Semana</Label>
            <Input value={form.semana} onChange={(e) => set("semana", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Preservação</Label>
            <Input value={form.preservacao} onChange={(e) => set("preservacao", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>TAG *</Label>
            <Input value={form.tag} onChange={(e) => set("tag", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Unidade *</Label>
            <Input value={form.unidade} onChange={(e) => set("unidade", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Gabinete *</Label>
            <Input value={form.gabinete} onChange={(e) => set("gabinete", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Input value={form.tipo} onChange={(e) => set("tipo", e.target.value)} placeholder="SDCD, Triconex..." />
          </div>
          <div className="space-y-1.5">
            <Label>Data prevista</Label>
            <Input type="date" value={form.dataPrevista} onChange={(e) => set("dataPrevista", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Data realizada</Label>
            <Input type="date" value={form.dataRealizada} onChange={(e) => set("dataRealizada", e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CRONOGRAMA_STATUS_VALUES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {(isDivergencia || form.motivoDivergencia) && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-warning">
                Motivo da divergência {isDivergencia && "*"}
              </Label>
              <Textarea
                value={form.motivoDivergencia}
                onChange={(e) => set("motivoDivergencia", e.target.value)}
                rows={2}
                placeholder="Explique o motivo da divergência entre a data prevista e a realizada..."
                className="border-warning/40 focus-visible:ring-warning"
              />
            </div>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.tag.trim() || !form.unidade.trim() || !form.gabinete.trim()}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
