import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCronograma } from "@/context/CronogramaContext";
import { MedicaoCronograma } from "@/types/cronograma";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  medicao?: MedicaoCronograma | null;
  onCreated?: (m: MedicaoCronograma) => void;
}

export function MedicaoFormDialog({ open, onOpenChange, medicao, onCreated }: Props) {
  const { addMedicao, updateMedicao } = useCronograma();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataReferencia, setDataReferencia] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(medicao?.nome ?? "");
      setDescricao(medicao?.descricao ?? "");
      setDataReferencia(medicao?.dataReferencia ?? "");
    }
  }, [open, medicao]);

  const handleSave = async () => {
    if (!nome.trim() || saving) return;
    setSaving(true);
    try {
      if (medicao) {
        const ok = await updateMedicao(medicao.id, { nome: nome.trim(), descricao, dataReferencia: dataReferencia || null });
        if (!ok) return;
      } else {
        const novo = await addMedicao({ nome: nome.trim(), descricao, dataReferencia: dataReferencia || null });
        if (novo) onCreated?.(novo);
        else return;
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{medicao ? "Editar medição" : "Nova medição"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: 1ª Medição" />
          </div>
          <div className="space-y-1.5">
            <Label>Data de referência</Label>
            <Input type="date" value={dataReferencia} onChange={(e) => setDataReferencia(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !nome.trim()}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
