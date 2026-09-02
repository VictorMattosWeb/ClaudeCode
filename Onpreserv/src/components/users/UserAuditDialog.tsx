import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ManagedUser } from "@/pages/UsersKanban";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user: ManagedUser | null;
}

const ACAO_LABELS: Record<string, string> = {
  criado: "Usuário criado",
  perfil_alterado: "Perfil alterado",
  permissoes_alteradas: "Permissões alteradas",
  status_alterado: "Status alterado",
  senha_redefinida: "Senha redefinida",
  movido: "Movido entre perfis",
};

export function UserAuditDialog({ open, onOpenChange, user }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    supabase
      .from("user_audit_log")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems(data ?? []);
        setLoading(false);
      });
  }, [open, user?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Histórico — {user?.nome}</DialogTitle>
          <DialogDescription>Alterações registradas neste usuário.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma alteração registrada.</div>
        ) : (
          <ol className="relative space-y-4 border-l border-border pl-4 max-h-[60vh] overflow-y-auto">
            {items.map((it) => (
              <li key={it.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                <p className="text-sm font-medium">{ACAO_LABELS[it.acao] ?? it.acao}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(it.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                {it.detalhes && Object.keys(it.detalhes).length > 0 && (
                  <pre className="mt-1 rounded bg-muted p-2 text-[10px] text-muted-foreground overflow-x-auto">
                    {JSON.stringify(it.detalhes, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
