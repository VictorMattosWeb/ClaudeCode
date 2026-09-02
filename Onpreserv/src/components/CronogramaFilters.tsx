import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { SITUACAO_LABEL, SituacaoCalculada } from "@/types/cronograma";

export interface FilterState {
  busca: string;
  semana: string;
  unidade: string;
  gabinete: string;
  tipo: string;
  status: string;
  situacao: SituacaoCalculada | "todos";
}

export const initialFilters: FilterState = {
  busca: "", semana: "todos", unidade: "todos", gabinete: "todos", tipo: "todos", status: "todos", situacao: "todos",
};

interface Props {
  value: FilterState;
  onChange: (v: FilterState) => void;
  semanas: string[];
  unidades: string[];
  gabinetes: string[];
  tipos: string[];
  statuses: string[];
}

export function CronogramaFilters({ value, onChange, semanas, unidades, gabinetes, tipos, statuses }: Props) {
  const set = (k: keyof FilterState, v: string) => onChange({ ...value, [k]: v });

  const SelectField = ({ k, label, opts }: { k: keyof FilterState; label: string; opts: string[] }) => (
    <Select value={value[k] as string} onValueChange={(v) => set(k, v)}>
      <SelectTrigger className="h-9 w-full"><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">Todos os {label.toLowerCase()}</SelectItem>
        {opts.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2">
      <div className="relative xl:col-span-2">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={value.busca}
          onChange={(e) => set("busca", e.target.value)}
          placeholder="Buscar TAG, unidade, gabinete..."
          className="h-9 pl-8"
        />
      </div>
      <SelectField k="semana" label="Semanas" opts={semanas} />
      <SelectField k="unidade" label="Unidades" opts={unidades} />
      <SelectField k="gabinete" label="Gabinetes" opts={gabinetes} />
      <SelectField k="tipo" label="Tipos" opts={tipos} />
      <SelectField k="status" label="Status" opts={statuses} />
      <Select value={value.situacao} onValueChange={(v) => set("situacao", v as any)}>
        <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Situação" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas as situações</SelectItem>
          {(Object.keys(SITUACAO_LABEL) as SituacaoCalculada[]).map((s) => (
            <SelectItem key={s} value={s}>{SITUACAO_LABEL[s]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
