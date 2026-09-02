import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/**
 * Returns the count of "pending items" relevant to the sidebar badge:
 * - Admins: number of pending solicitacoes_exclusao
 * - Users: number of unread notifications about their own solicitations
 * Updates in realtime.
 */
export function usePendingRequestsCount() {
  const { user, isAdmin } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }
    let cancelled = false;

    const load = async () => {
      if (isAdmin) {
        const [{ count: c1 }, { count: c2 }] = await Promise.all([
          supabase
            .from("solicitacoes_exclusao")
            .select("*", { count: "exact", head: true })
            .eq("status", "pendente"),
          supabase
            .from("solicitacoes_edicao_preservacao" as any)
            .select("*", { count: "exact", head: true })
            .eq("status", "pendente"),
        ]);
        if (!cancelled) setCount((c1 ?? 0) + (c2 ?? 0));
      } else {
        const { count: c } = await supabase
          .from("notificacoes")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("lida", false);
        if (!cancelled) setCount(c ?? 0);
      }
    };
    load();

    const channel = supabase
      .channel(`pending-badge:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: isAdmin ? "solicitacoes_exclusao" : "notificacoes" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "solicitacoes_edicao_preservacao" },
        () => { if (isAdmin) load(); }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin]);

  return count;
}
