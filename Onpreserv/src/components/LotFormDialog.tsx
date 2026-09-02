import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { FREQUENCIA_OPCOES } from "@/types/lot";
import { Lot, LotTipo, LOT_TIPO_LABEL, LOT_TIPO_PREFIX } from "@/types/lot";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { notifyError } from "@/lib/errorMessages";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Lot, "id" | "preservations" | "createdAt">) => Promise<boolean>;
  initialData?: Lot;
}

export function LotFormDialog({ open, onOpenChange, onSubmit, initialData }: Props) {
  const { isAdmin } = useAuth();
  const [form, setForm] = useState({
    code: "",
    name: "",
    location: "",
    rua: "",
    prateleira: "",
    responsible: "",
    status: "ativo" as "ativo" | "inativo",
    observations: "",
    tipoLote: "novo" as LotTipo,
    identificadorInterno: "",
    // `null` = ciclo semanal. Só administrador altera (regra reforçada por
    // gatilho no banco, não só aqui).
    frequenciaDias: null as number | null,
  });
  const [saving, setSaving] = useState(false);

  const ALPHANUM_HYPHEN = /^[A-Za-z0-9-]*$/;
  const sanitize = (v: string) => v.replace(/[^A-Za-z0-9-]/g, "");

  useEffect(() => {
    if (initialData) {
      setForm({
        code: initialData.code,
        name: initialData.name,
        location: initialData.location,
        rua: initialData.rua ?? "",
        prateleira: initialData.prateleira ?? "",
        responsible: initialData.responsible,
        status: initialData.status,
        observations: initialData.observations,
        tipoLote: initialData.tipoLote,
        identificadorInterno: initialData.identificadorInterno,
        frequenciaDias: initialData.frequenciaDias ?? null,
      });
    } else {
      setForm({ code: "", name: "", location: "", rua: "", prateleira: "", responsible: "", status: "ativo", observations: "", tipoLote: "novo", identificadorInterno: "", frequenciaDias: null });
    }
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const ok = await onSubmit(form);
      if (ok) onOpenChange(false);
    } catch (error: any) {
      notifyError(error, "Não foi possível salvar o lote.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-10">
          <DialogTitle>{initialData ? "Editar Lote" : "Novo Lote"}</DialogTitle>
          {!initialData && (
            <DialogDescription className="flex items-center gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              O identificador será gerado automaticamente ({LOT_TIPO_PREFIX[form.tipoLote]}-XXXX)
            </DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {initialData && (
            <div className="space-y-2">
              <Label>Identificador Interno</Label>
              <Input value={form.identificadorInterno} readOnly className="bg-muted opacity-70 font-mono" />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Lote</Label>
              <Select value={form.tipoLote} onValueChange={(v) => setForm({ ...form, tipoLote: v as LotTipo })}>
                <SelectTrigger className="transition-all duration-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(LOT_TIPO_LABEL) as LotTipo[]).map((t) => (
                    <SelectItem key={t} value={t}>{LOT_TIPO_LABEL[t]} ({LOT_TIPO_PREFIX[t]})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="frequencia">Frequência de preservação</Label>
                <Select
                  value={form.frequenciaDias === null ? "semanal" : String(form.frequenciaDias)}
                  onValueChange={(v) =>
                    setForm({ ...form, frequenciaDias: v === "semanal" ? null : Number(v) })
                  }
                >
                  <SelectTrigger id="frequencia"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIA_OPCOES.map((o) => (
                      <SelectItem key={o.label} value={o.valor === null ? "semanal" : String(o.valor)}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Semanal: qualquer dia entre segunda e domingo cumpre o ciclo. Por dias: contagem
                  corrida a partir do último registro, com vencimento rolado para dia útil.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input id="code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="transition-all duration-200 focus:scale-[1.01]" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome / Descrição</Label>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })} className="uppercase transition-all duration-200 focus:scale-[1.01]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Local</Label>
              <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="transition-all duration-200 focus:scale-[1.01]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsible">Responsável</Label>
              <Input id="responsible" value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} className="transition-all duration-200 focus:scale-[1.01]" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rua">Rua (almoxarifado)</Label>
              <Input
                id="rua"
                value={form.rua}
                onChange={(e) => setForm({ ...form, rua: sanitize(e.target.value) })}
                placeholder="Ex.: A-12"
                className="transition-all duration-200 focus:scale-[1.01]"
              />
              <p className="text-[11px] text-muted-foreground">Letras, números e hífen</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prateleira">Prateleira</Label>
              <Input
                id="prateleira"
                value={form.prateleira}
                onChange={(e) => setForm({ ...form, prateleira: sanitize(e.target.value) })}
                placeholder="Ex.: P-03"
                className="transition-all duration-200 focus:scale-[1.01]"
              />
              <p className="text-[11px] text-muted-foreground">Letras, números e hífen</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "ativo" | "inativo" })}>
              <SelectTrigger className="transition-all duration-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="obs">Observações</Label>
            <Textarea id="obs" value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} className="transition-all duration-200 focus:scale-[1.01]" />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving} >Cancelar</Button>
            <Button type="submit" disabled={saving} >{saving ? "Salvando..." : initialData ? "Salvar" : "Criar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
