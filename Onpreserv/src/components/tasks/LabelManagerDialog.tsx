import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTasks } from "@/context/TaskContext";
import { TaskLabel } from "@/types/task";
import { Trash2, Pencil, Plus, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const PRESET_COLORS = ["#ef4444", "#f59e0b", "#10b981", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#84cc16"];

export function LabelManagerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { labels, createLabel, updateLabel, deleteLabel } = useTasks();
  const { isAdmin } = useAuth();
  const [editing, setEditing] = useState<TaskLabel | null>(null);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#3b82f6");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setEditing(null);
    setNome("");
    setCor("#3b82f6");
    setDescricao("");
  };

  const start = (l: TaskLabel) => {
    setEditing(l);
    setNome(l.nome);
    setCor(l.cor);
    setDescricao(l.descricao ?? "");
  };

  const nomeOk = nome.trim().length >= 2;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!nomeOk || saving) return;
    setSaving(true);
    try {
      const payload = { nome: nome.trim(), cor, descricao: descricao.trim() };
      if (editing) {
        await updateLabel(editing.id, payload);
      } else {
        await createLabel(payload);
      }
      reset();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Etiquetas</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 border rounded-md p-3 bg-muted/30">
            <Label>{editing ? "Editar etiqueta" : "Nova etiqueta"}</Label>
            <Input
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome (mínimo 2 caracteres)"
            />
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (opcional)" rows={2} />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Cor:</span>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className="h-6 w-6 rounded-full border-2 transition"
                  style={{ backgroundColor: c, borderColor: cor === c ? "hsl(var(--foreground))" : "transparent" }}
                  aria-label={`Cor ${c}`}
                />
              ))}
              <input
                type="color"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                className="h-6 w-6 rounded cursor-pointer border border-input"
              />
            </div>
            <div className="flex justify-end gap-2">
              {editing && (
                <Button type="button" size="sm" variant="ghost" onClick={reset} disabled={saving}>
                  <X className="h-4 w-4 mr-1" />Cancelar
                </Button>
              )}
              <Button type="submit" size="sm" disabled={!nomeOk || saving}>
                <Plus className="h-4 w-4 mr-1" />
                {saving ? "Salvando..." : editing ? "Atualizar" : "Adicionar"}
              </Button>
            </div>
          </div>
        </form>

        <div className="max-h-64 overflow-y-auto space-y-1">
          {labels.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma etiqueta cadastrada.</p>
          )}
          {labels.map((l) => (
            <div key={l.id} className="flex items-center justify-between border rounded-md p-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: l.cor }} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{l.nome}</p>
                  {l.descricao && <p className="text-xs text-muted-foreground truncate">{l.descricao}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button type="button" size="icon" variant="ghost" onClick={() => start(l)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {isAdmin && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => deleteLabel(l.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
