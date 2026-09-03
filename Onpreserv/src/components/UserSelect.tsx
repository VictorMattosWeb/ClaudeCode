import { useEffect, useState } from "react";
import { supabase } from "@/services/adapters/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserTag } from "@/components/UserTag";

interface Props {
  value: string;
  onChange: (nome: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
}

export function UserSelect({ value, onChange, placeholder = "Selecione um responsável", id }: Props) {
  const [users, setUsers] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    supabase
      .rpc("list_public_profiles")
      .then(({ data }) => {
        const list = ((data ?? []) as { id: string; nome: string; status: string }[])
          .filter((u) => u.status === "ativo");
        setUsers(list.map((u) => ({ id: u.id, nome: u.nome })));
      });
  }, []);

  // Se o valor atual não está na lista (ex: nome antigo livre), inclui-o para manter
  const hasValue = !value || users.some((u) => u.nome === value);
  const options = hasValue ? users : [...users, { id: "__legacy__", nome: value }];

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((u) => (
          <SelectItem key={u.id} value={u.nome}>
            <UserTag userId={u.id === "__legacy__" ? undefined : u.id} nome={u.nome} size={20} />
          </SelectItem>
        ))}
        {options.length === 0 && (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhum usuário ativo</div>
        )}
      </SelectContent>
    </Select>
  );
}
