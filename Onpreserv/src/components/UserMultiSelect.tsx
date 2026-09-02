import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X } from "lucide-react";

interface Props {
  value: string[];
  onChange: (nomes: string[]) => void;
  placeholder?: string;
  id?: string;
}

type Profile = { id: string; nome: string; status: string; cargo: string | null };

export function UserMultiSelect({ value, onChange, placeholder = "Selecionar responsáveis", id }: Props) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.rpc("list_public_profiles").then(({ data }) => {
      const list = ((data ?? []) as Profile[]).filter((u) => u.status === "ativo");
      setUsers(list);
    });
  }, []);

  const toggle = (nome: string) => {
    if (value.includes(nome)) onChange(value.filter((v) => v !== nome));
    else onChange([...value, nome]);
  };

  const remove = (nome: string) => onChange(value.filter((v) => v !== nome));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="text-muted-foreground">
              {value.length === 0 ? placeholder : `${value.length} selecionado(s)`}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <ul className="max-h-64 overflow-auto py-1">
            {users.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">Nenhum usuário ativo</li>
            )}
            {users.map((u) => {
              const on = value.includes(u.nome);
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => toggle(u.nome)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                  >
                    <div className={`h-4 w-4 rounded border flex items-center justify-center ${on ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                      {on && <Check className="h-3 w-3" />}
                    </div>
                    <span className="flex-1 text-left">{u.nome}</span>
                    {u.cargo && <span className="text-[10px] text-muted-foreground">{u.cargo}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((n) => (
            <Badge key={n} variant="secondary" className="gap-1">
              {n}
              <button type="button" onClick={() => remove(n)} aria-label={`Remover ${n}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
