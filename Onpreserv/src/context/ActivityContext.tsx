import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ActivityLocal, PreservationActivity, SEED_ACTIVITIES } from "@/types/activity";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { runWithRetry } from "@/lib/runWithRetry";
import { notifyError, describeError } from "@/lib/errorMessages";

interface ActivityContextType {
  activities: PreservationActivity[];
  loading: boolean;
  addActivity: (data: Omit<PreservationActivity, "id" | "createdAt" | "updatedAt" | "frequenciaCampo" | "frequenciaAlmoxarifado">) => Promise<{ ok: boolean; error?: string }>;
  updateActivity: (id: string, data: Partial<Pick<PreservationActivity, "codigo" | "descricao" | "local" | "frequencia">>) => Promise<{ ok: boolean; error?: string }>;
  deleteActivity: (id: string) => Promise<void>;
  deleteActivities: (ids: string[]) => Promise<void>;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

type Row = {
  id: string; codigo: string; descricao: string;
  frequencia_almoxarifado: number; frequencia_campo: number;
  local: string | null;
  created_at: string; updated_at: string;
};

const mapRow = (r: Row): PreservationActivity => {
  const local: ActivityLocal = r.local === "almoxarifado" ? "almoxarifado" : "campo";
  const frequencia = local === "almoxarifado" ? r.frequencia_almoxarifado : r.frequencia_campo;
  return {
    id: r.id,
    codigo: r.codigo,
    descricao: r.descricao,
    local,
    frequencia,
    frequenciaAlmoxarifado: r.frequencia_almoxarifado,
    frequenciaCampo: r.frequencia_campo,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const { session, authReady } = useAuth();
  const [activities, setActivities] = useState<PreservationActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from("activities" as any).select("*").order("codigo");
    setActivities(((data ?? []) as unknown as Row[]).map(mapRow));
    setLoading(false);
  }, []);

  // Seed inicial: se o admin loga e a tabela está vazia, popula com os padrões.
  useEffect(() => {
    if (!authReady || !session || seeded) return;
    (async () => {
      const { count } = await runWithRetry(async () => await supabase.from("activities" as any).select("id", { count: "exact", head: true }));
      if (count === 0) {
        const rows = SEED_ACTIVITIES.map((a) => ({
          codigo: a.codigo,
          descricao: a.descricao,
          local: a.local,
          frequencia_almoxarifado: a.local === "almoxarifado" ? a.frequencia : a.frequencia,
          frequencia_campo: a.local === "campo" ? a.frequencia : a.frequencia,
          criado_por: session.user.id,
        }));
        await runWithRetry(async () => await supabase.from("activities" as any).insert(rows));
      }
      setSeeded(true);
    })();
  }, [authReady, session, seeded]);

  useEffect(() => {
    if (!authReady) return;
    if (!session) { setActivities([]); setLoading(false); return; }
    setLoading(true);
    refresh();
    const ch = supabase
      .channel(`activities-realtime:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [authReady, session, refresh]);

  const addActivity: ActivityContextType["addActivity"] = async (data) => {
    const codigo = data.codigo.trim();
    if (!codigo) return { ok: false, error: "Informe o código da atividade." };
    if (!data.frequencia || data.frequencia <= 0)
      return { ok: false, error: "A frequência deve ser maior que zero." };
    const { error } = await runWithRetry(async () => await supabase.from("activities" as any).insert({
      codigo,
      descricao: data.descricao,
      local: data.local,
      // Espelha o valor nas duas colunas legadas para manter integridade.
      frequencia_almoxarifado: data.frequencia,
      frequencia_campo: data.frequencia,
      criado_por: session?.user.id,
    }));
    if (error) {
      if (error.code === "23505") return { ok: false, error: "Já existe uma atividade com este código." };
      return { ok: false, error: describeError(error, "Não foi possível salvar a atividade.") };
    }
    return { ok: true };
  };

  const updateActivity: ActivityContextType["updateActivity"] = async (id, data) => {
    const patch: any = {};
    if (data.codigo !== undefined) {
      const c = data.codigo.trim();
      if (!c) return { ok: false, error: "Informe o código da atividade." };
      patch.codigo = c;
    }
    if (data.descricao !== undefined) patch.descricao = data.descricao;
    if (data.local !== undefined) patch.local = data.local;
    if (data.frequencia !== undefined) {
      if (data.frequencia <= 0) return { ok: false, error: "A frequência deve ser maior que zero." };
      // Atualiza a coluna do local correspondente. Se 'local' veio no patch usa ele,
      // senão buscamos o local atual da atividade.
      const novoLocal: ActivityLocal | undefined = data.local
        ?? activities.find((a) => a.id === id)?.local;
      if (novoLocal === "almoxarifado") {
        patch.frequencia_almoxarifado = data.frequencia;
      } else {
        patch.frequencia_campo = data.frequencia;
      }
    }
    const { error } = await runWithRetry(async () => await supabase.from("activities" as any).update(patch).eq("id", id));
    if (error) {
      if (error.code === "23505") return { ok: false, error: "Já existe uma atividade com este código." };
      return { ok: false, error: describeError(error, "Não foi possível atualizar a atividade.") };
    }
    return { ok: true };
  };

  const deleteActivity: ActivityContextType["deleteActivity"] = async (id) => {
    const { error } = await supabase.from("activities" as any).delete().eq("id", id);
    if (error) notifyError(error, "Não foi possível excluir a atividade.");
  };

  const deleteActivities: ActivityContextType["deleteActivities"] = async (ids) => {
    const { error } = await supabase.from("activities" as any).delete().in("id", ids);
    if (error) notifyError(error, "Não foi possível excluir as atividades selecionadas.");
  };

  return (
    <ActivityContext.Provider value={{ activities, loading, addActivity, updateActivity, deleteActivity, deleteActivities }}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivities() {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error("useActivities must be used within ActivityProvider");
  return ctx;
}
