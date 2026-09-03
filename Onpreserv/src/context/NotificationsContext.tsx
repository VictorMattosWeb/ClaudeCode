import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/services/adapters/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export type NotifTipo =
  | "solicitacao_criada"
  | "solicitacao_aprovada"
  | "solicitacao_recusada"
  | "solicitacao_respondida"
  | "tarefa_atribuida"
  | "tarefa_mencionada"
  | "tarefa_comentario"
  | "tarefa_prazo"
  | "tarefa_vencida"
  | "tarefa_concluida";

export interface Notificacao {
  id: string;
  user_id: string;
  tipo: NotifTipo;
  titulo: string;
  mensagem: string;
  referencia_id: string | null;
  referencia_tipo: string | null;
  lida: boolean;
  created_at: string;
}

interface Ctx {
  notifications: Notificacao[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<Ctx | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notificacao[]>([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const { data, error } = await supabase
      .from("notificacoes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) setNotifications(data as Notificacao[]);
  }, [user]);

  useEffect(() => {
    refresh();
    if (!user) return;

    const channel = supabase
      .channel(`notificacoes:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificacoes", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notificacao;
          setNotifications((prev) => [n, ...prev].slice(0, 50));
          toast.message(n.titulo, { description: n.mensagem });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notificacoes", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notificacao;
          setNotifications((prev) => prev.map((x) => (x.id === n.id ? n : x)));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notificacoes", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const old = payload.old as { id: string };
          setNotifications((prev) => prev.filter((x) => x.id !== old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })));
    await supabase
      .from("notificacoes")
      .update({ lida: true })
      .eq("user_id", user.id)
      .eq("lida", false);
  };

  const clearAll = async () => {
    if (!user) return;
    const prev = notifications;
    setNotifications([]);
    const { error } = await supabase.from("notificacoes").delete().eq("user_id", user.id);
    if (error) {
      setNotifications(prev);
      toast.error("Não foi possível limpar o histórico.");
      return;
    }
    toast.success("Histórico de notificações limpo");
  };

  const unreadCount = notifications.filter((n) => !n.lida).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearAll, refresh }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications deve ser usado dentro de NotificationsProvider");
  return ctx;
}
