import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook simples para indicar o estado da conexão realtime.
 * Cria um canal heartbeat e atualiza o status quando o Supabase confirma a inscrição.
 */
export function useRealtimeStatus() {
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");

  useEffect(() => {
    const channel = supabase
      .channel(`heartbeat:${Math.random().toString(36).slice(2)}`)
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setStatus("live");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setStatus("offline");
        else setStatus("connecting");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return status;
}
