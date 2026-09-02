import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTasks } from "@/context/TaskContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { TaskBoard, BOARD_EQUIPES } from "@/types/task";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  board?: TaskBoard | null;
}

const PRESET_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#64748b"];
const NONE = "__none__";
const CUSTOM = "__custom__";

export function BoardFormDialog({ open, onOpenChange, board }: Props) {
  const { createBoard, updateBoard } = useTasks();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cor, setCor] = useState(PRESET_COLORS[0]);
  const [equipeSel, setEquipeSel] = useState<string>(NONE);
  const [equipeCustom, setEquipeCustom] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (board) {
      setNome(board.nome);
      setDescricao(board.descricao ?? "");
      setCor(board.cor);
      const eq = board.equipe ?? "";
      if (!eq) { setEquipeSel(NONE); setEquipeCustom(""); }
      else if ((BOARD_EQUIPES as readonly string[]).includes(eq)) { setEquipeSel(eq); setEquipeCustom(""); }
      else { setEquipeSel(CUSTOM); setEquipeCustom(eq); }
    } else {
      setNome(""); setDescricao(""); setCor(PRESET_COLORS[0]);
      setEquipeSel(NONE); setEquipeCustom("");
    }
  }, [board, open]);

  const handleSave = async () => {
    if (!nome.trim() || saving) return;
    setSaving(true);
    const equipe =
      equipeSel === NONE ? "" :
      equipeSel === CUSTOM ? equipeCustom.trim() :
      equipeSel;
    try {
      if (board) {
        const ok = await updateBoard(board.id, { nome: nome.trim(), descricao, cor, equipe });
        if (ok) onOpenChange(false);
      } else {
        const created = await createBoard({ nome: nome.trim(), descricao, cor, equipe });
        if (created) onOpenChange(false);
      }
    } catch (e: any) {
      toast.error("Não foi possível salvar o quadro. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{board ? "Editar quadro" : "Novo quadro de tarefas"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Preservação Junho" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Equipe</Label>
            <Select value={equipeSel} onValueChange={setEquipeSel}>
              <SelectTrigger><SelectValue placeholder="Selecione a equipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem equipe</SelectItem>
                {BOARD_EQUIPES.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
                <SelectItem value={CUSTOM}>Outra...</SelectItem>
              </SelectContent>
            </Select>
            {equipeSel === CUSTOM && (
              <Input
                className="mt-2"
                value={equipeCustom}
                onChange={(e) => setEquipeCustom(e.target.value)}
                placeholder="Nome da equipe"
              />
            )}
          </div>
          <div>
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className="h-8 w-8 rounded-full border-2 transition"
                  style={{ backgroundColor: c, borderColor: cor === c ? "hsl(var(--foreground))" : "transparent" }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !nome.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {saving ? "Salvando..." : board ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
