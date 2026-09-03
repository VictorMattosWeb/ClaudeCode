import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useTasks } from "@/context/TaskContext";
import { Task, TaskStatus, TaskPriority, TaskModulo, TASK_STATUS_LABEL, TASK_PRIORITY_LABEL, TASK_MODULO_LABEL, TASK_STATUS_ORDER, getTaskAssignees } from "@/types/task";
import { supabase } from "@/services/adapters/supabase/client";
import { Check, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  task?: Task | null;
  defaultStatus?: TaskStatus;
}

interface UserOpt {
  id: string;
  nome: string;
}

export function TaskFormDialog({ open, onOpenChange, task, defaultStatus }: Props) {
  const { createTask, updateTask, labels, boards } = useTasks();
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<TaskStatus>("a_fazer");
  const [prioridade, setPrioridade] = useState<TaskPriority>("media");
  const [responsaveis, setResponsaveis] = useState<string[]>([]);
  const [modulo, setModulo] = useState<TaskModulo>("geral");
  const [itemDesc, setItemDesc] = useState("");
  const [itemId, setItemId] = useState("");
  const [prazo, setPrazo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [boardId, setBoardId] = useState<string>("none");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.rpc("list_public_profiles").then(({ data }) => {
      const list = ((data ?? []) as { id: string; nome: string; status: string }[])
        .filter((u) => u.status === "ativo");
      setUsers(list.map((u) => ({ id: u.id, nome: u.nome })) as UserOpt[]);
    });
  }, [open]);

  useEffect(() => {
    if (task) {
      setTitulo(task.titulo);
      setDescricao(task.descricao ?? "");
      setStatus(task.status);
      setPrioridade(task.prioridade);
      setResponsaveis(getTaskAssignees(task));
      setModulo(task.modulo_relacionado);
      setItemDesc(task.item_relacionado_descricao ?? "");
      setItemId(task.item_relacionado_id ?? "");
      setPrazo(task.prazo ?? "");
      setObservacoes(task.observacoes ?? "");
      setBoardId(task.board_id ?? "none");
      setSelectedLabels((task.labels ?? []).map((l) => l.id));
    } else {
      setTitulo("");
      setDescricao("");
      setStatus(defaultStatus ?? "a_fazer");
      setPrioridade("media");
      setResponsaveis([]);
      setModulo("geral");
      setItemDesc("");
      setItemId("");
      setPrazo("");
      setObservacoes("");
      setBoardId("none");
      setSelectedLabels([]);
    }
  }, [task, open, defaultStatus]);

  const toggleLabel = (id: string) => {
    setSelectedLabels((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleResponsavel = (id: string) => {
    setResponsaveis((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const tituloOk = titulo.trim().length >= 3;

  const handleSave = async () => {
    if (!tituloOk || saving) return;
    setSaving(true);
    const payload: any = {
      titulo: titulo.trim(),
      descricao,
      status,
      prioridade,
      modulo_relacionado: modulo,
      item_relacionado_id: itemId || null,
      item_relacionado_descricao: itemDesc,
      prazo: prazo || null,
      observacoes,
      board_id: boardId === "none" ? null : boardId,
    };
    try {
      if (task) {
        const ok = await updateTask(task.id, payload, selectedLabels, responsaveis);
        if (ok) onOpenChange(false);
      } else {
        const created = await createTask(payload, selectedLabels, responsaveis);
        if (created) onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Título *</Label>
            <Input
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título da tarefa (mínimo 3 caracteres)"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
            {!tituloOk && titulo.length > 0 && (
              <p className="text-xs text-destructive mt-1">Mínimo de 3 caracteres.</p>
            )}
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>{TASK_STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["baixa", "media", "alta", "critica"] as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>{TASK_PRIORITY_LABEL[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsáveis</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" type="button" className="w-full justify-start font-normal">
                    <Users className="h-4 w-4 mr-2" />
                    {responsaveis.length === 0
                      ? "Sem responsável"
                      : responsaveis.length === 1
                        ? users.find((u) => u.id === responsaveis[0])?.nome ?? "1 selecionado"
                        : `${responsaveis.length} responsáveis`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2 max-h-72 overflow-y-auto" align="start">
                  {users.length === 0 && (
                    <p className="text-xs text-muted-foreground p-2">Nenhum usuário ativo.</p>
                  )}
                  {users.map((u) => {
                    const checked = responsaveis.includes(u.id);
                    return (
                      <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer">
                        <Checkbox checked={checked} onCheckedChange={() => toggleResponsavel(u.id)} />
                        <span className="text-sm">{u.nome}</span>
                      </label>
                    );
                  })}
                </PopoverContent>
              </Popover>
              {responsaveis.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {responsaveis.map((id) => {
                    const u = users.find((x) => x.id === id);
                    return (
                      <span key={id} className="inline-flex items-center gap-1 border border-border bg-muted px-1.5 py-0.5 text-xs">
                        {u?.nome ?? id.slice(0, 6)}
                        <button type="button" onClick={() => toggleResponsavel(id)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <Label>Prazo</Label>
              <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </div>
            <div>
              <Label>Módulo relacionado</Label>
              <Select value={modulo} onValueChange={(v) => setModulo(v as TaskModulo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TASK_MODULO_LABEL) as TaskModulo[]).map((m) => (
                    <SelectItem key={m} value={m}>{TASK_MODULO_LABEL[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Item relacionado (descrição)</Label>
              <Input value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} placeholder="Ex.: Lote PN-12-204" />
            </div>
            <div className="col-span-2">
              <Label>Quadro</Label>
              <Select value={boardId} onValueChange={setBoardId}>
                <SelectTrigger><SelectValue placeholder="Sem quadro" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem quadro</SelectItem>
                  {boards.filter((b) => !b.arquivado).map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Etiquetas</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {labels.map((l) => {
                const active = selectedLabels.includes(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => toggleLabel(l.id)}
                    className={cn(
                      "inline-flex items-center gap-1 border px-2 py-0.5 text-xs transition-colors duration-300 ease-out-expo",
                      active ? "ring-2 ring-offset-1 ring-primary" : "opacity-70 hover:opacity-100",
                    )}
                    style={{ backgroundColor: `${l.cor}22`, color: l.cor, borderColor: `${l.cor}66` }}
                  >
                    {active && <Check className="h-3 w-3" />}
                    {l.nome}
                  </button>
                );
              })}
              {labels.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma etiqueta cadastrada.</span>}
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button type="button" onClick={handleSave} disabled={saving || !tituloOk}>
            {saving ? "Salvando..." : task ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
