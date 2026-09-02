import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Filter, X } from "lucide-react";
import { SITUACAO_LABEL, SituacaoCalculada } from "@/types/cronograma";

export interface DashFilterState {
  medicao: string;
  semana: string;
  unidade: string;
  gabinete: string;
  tipo: string;
  status: string;
  situacao: SituacaoCalculada | "todos";
  de: string;
  ate: string;
}

export const initialDashFilters: DashFilterState = {
  medicao: "todos", semana: "todos", unidade: "todos", gabinete: "todos",
  tipo: "todos", status: "todos", situacao: "todos", de: "", ate: "",
};

interface Props {
  value: DashFilterState;
  onChange: (v: DashFilterState) => void;
  medicoes: { id: string; nome: string }[];
  semanas: string[];
  unidades: string[];
  gabinetes?: string[];
  tipos?: string[];
  statuses?: string[];
}

interface FieldProps {
  current: string;
  onValueChange: (v: string) => void;
  label: string;
  opts: { value: string; label: string }[];
}

function FilterSelect({ current, onValueChange, label, opts }: FieldProps) {
  // Filter out empty strings to avoid Radix SelectItem error
  const safeOpts = opts.filter((o) => o.value && o.value.trim() !== "");
  return (
    <Select value={current} onValueChange={onValueChange}>
      <SelectTrigger className="h-9 w-full"><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">Todos · {label}</SelectItem>
        {safeOpts.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
      </SelectContent>
    </Select>
  );
}

export function DashboardFilters({ value, onChange, medicoes, semanas, unidades }: Props) {
  const set = (k: keyof DashFilterState, v: string) => onChange({ ...value, [k]: v });
  const reset = () => onChange(initialDashFilters);
  const wrap = (s: string[]) => s.map((v) => ({ value: v, label: v }));

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filtros</p>
          <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={reset}>
            <X className="h-3 w-3" /> Limpar
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <FilterSelect current={value.medicao} onValueChange={(v) => set("medicao", v)} label="Medição" opts={medicoes.map((m) => ({ value: m.id, label: m.nome }))} />
          <FilterSelect current={value.semana} onValueChange={(v) => set("semana", v)} label="Semana" opts={wrap(semanas)} />
          <FilterSelect current={value.unidade} onValueChange={(v) => set("unidade", v)} label="Unidade" opts={wrap(unidades)} />
        </div>
      </CardContent>
    </Card>
  );
}
