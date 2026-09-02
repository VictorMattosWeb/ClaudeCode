import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskStatus, TaskPriority, TaskModulo, TASK_STATUS_LABEL, TASK_PRIORITY_LABEL, TASK_MODULO_LABEL, TASK_STATUS_ORDER } from "@/types/task";
import { Search } from "lucide-react";

export interface TaskFilterState {
  search: string;
  status: TaskStatus | "all";
  prioridade: TaskPriority | "all";
  modulo: TaskModulo | "all";
  responsavel: string | "all" | "me";
  vencidas: boolean;
}

interface Props {
  value: TaskFilterState;
  onChange: (v: TaskFilterState) => void;
  users: { id: string; nome: string }[];
  showResponsavelFilter?: boolean;
}

export function TaskFilters({ value, onChange, users, showResponsavelFilter = true }: Props) {
  const set = <K extends keyof TaskFilterState>(k: K, v: TaskFilterState[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={value.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Buscar tarefa..."
          className="pl-9"
        />
      </div>
      <Select value={value.status} onValueChange={(v) => set("status", v as any)}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos status</SelectItem>
          {TASK_STATUS_ORDER.map((s) => (
            <SelectItem key={s} value={s}>{TASK_STATUS_LABEL[s]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={value.prioridade} onValueChange={(v) => set("prioridade", v as any)}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toda prioridade</SelectItem>
          {(["baixa", "media", "alta", "critica"] as TaskPriority[]).map((p) => (
            <SelectItem key={p} value={p}>{TASK_PRIORITY_LABEL[p]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={value.modulo} onValueChange={(v) => set("modulo", v as any)}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Módulo" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos módulos</SelectItem>
          {(Object.keys(TASK_MODULO_LABEL) as TaskModulo[]).map((m) => (
            <SelectItem key={m} value={m}>{TASK_MODULO_LABEL[m]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={value.responsavel} onValueChange={(v) => set("responsavel", v as any)}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Responsável" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="me">Atribuídas a mim</SelectItem>
          {showResponsavelFilter && users.map((u) => (
            <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={value.vencidas}
          onChange={(e) => set("vencidas", e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        Vencidas
      </label>
    </div>
  );
}
