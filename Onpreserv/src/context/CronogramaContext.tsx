import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { CronogramaItem, MedicaoCronograma, calcularSituacao, ItemCalculado } from "@/types/cronograma";
import { toast } from "sonner";
import { runWithRetry } from "@/lib/runWithRetry";
import { notifyError } from "@/lib/errorMessages";

type MedicaoRow = {
  id: string; nome: string; descricao: string | null; data_referencia: string | null;
  ordem: number | null; created_at: string; updated_at: string;
};
type ItemRow = {
  id: string; medicao_id: string; semana: string | null; preservacao: string | null;
  tag: string; unidade: string; gabinete: string; tipo: string | null;
  data_prevista: string | null; data_realizada: string | null; status: string;
  observacoes: string | null; motivo_divergencia: string | null;
  created_at: string; updated_at: string;
};

const mapMedicao = (r: MedicaoRow): MedicaoCronograma => ({
  id: r.id, nome: r.nome, descricao: r.descricao ?? "",
  dataReferencia: r.data_referencia, ordem: r.ordem ?? 0,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

const mapItem = (r: ItemRow): CronogramaItem => ({
  id: r.id, medicaoId: r.medicao_id, semana: r.semana ?? "", preservacao: r.preservacao ?? "",
  tag: r.tag, unidade: r.unidade, gabinete: r.gabinete, tipo: r.tipo ?? "",
  dataPrevista: r.data_prevista, dataRealizada: r.data_realizada, status: r.status,
  observacoes: r.observacoes ?? "", motivoDivergencia: r.motivo_divergencia ?? "",
  createdAt: r.created_at, updatedAt: r.updated_at,
});

export interface NewMedicao { nome: string; descricao?: string; dataReferencia?: string | null; }
export interface NewItem {
  medicaoId: string;
  semana?: string; preservacao?: string;
  tag: string; unidade: string; gabinete: string; tipo?: string;
  dataPrevista?: string | null; dataRealizada?: string | null;
  status?: string; observacoes?: string; motivoDivergencia?: string;
}

interface Ctx {
  medicoes: MedicaoCronograma[];
  itens: CronogramaItem[];
  itensCalculados: ItemCalculado[];
  loading: boolean;
  refresh: () => Promise<void>;
  addMedicao: (m: NewMedicao) => Promise<MedicaoCronograma | null>;
  updateMedicao: (id: string, m: Partial<NewMedicao>) => Promise<boolean>;
  deleteMedicao: (id: string) => Promise<void>;
  reorderMedicao: (id: string, direction: "up" | "down") => Promise<void>;
  addItem: (i: NewItem) => Promise<CronogramaItem | null>;
  addItemsBulk: (items: NewItem[]) => Promise<number>;
  updateItem: (id: string, data: Partial<CronogramaItem>) => Promise<boolean>;
  deleteItem: (id: string) => Promise<void>;
  deleteItems: (ids: string[]) => Promise<void>;
}

const CronogramaCtx = createContext<Ctx | undefined>(undefined);

export function CronogramaProvider({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth();
  const [medicoes, setMedicoes] = useState<MedicaoCronograma[]>([]);
  const [itens, setItens] = useState<CronogramaItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!authReady) return;
    if (!user) { setMedicoes([]); setItens([]); return; }
    setLoading(true);
    const [{ data: meds, error: e1 }, { data: its, error: e2 }] = await Promise.all([
      supabase.from("cronograma_medicoes").select("*").order("ordem", { ascending: true }).order("created_at", { ascending: true }),
      supabase.from("cronograma_itens").select("*").order("created_at", { ascending: true }),
    ]);
    if (e1) toast.error("Não foi possível carregar as medições.");
    if (e2) toast.error("Não foi possível carregar os itens.");
    setMedicoes((meds ?? []).map(mapMedicao));
    setItens((its ?? []).map(mapItem));
    setLoading(false);
  }, [authReady, user]);

  useEffect(() => { load(); }, [load]);

  // Realtime
  useEffect(() => {
    if (!authReady || !user) return;
    const ch = supabase
      .channel(`cronograma-changes:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cronograma_medicoes" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "cronograma_itens" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [authReady, user, load]);

  const addMedicao = async (m: NewMedicao) => {
    if (!user) return null;
    const maxOrdem = medicoes.reduce((mx, x) => Math.max(mx, x.ordem ?? 0), 0);
    const { data, error } = await runWithRetry(async () => await supabase.from("cronograma_medicoes").insert({
      nome: m.nome, descricao: m.descricao ?? "", data_referencia: m.dataReferencia ?? null,
      ordem: maxOrdem + 1, criado_por: user.id,
    }).select("*").single());
    if (error) { notifyError(error); return null; }
    const novo = mapMedicao(data as MedicaoRow);
    setMedicoes((p) => [...p, novo]);
    toast.success("Medição criada");
    return novo;
  };

  const updateMedicao = async (id: string, m: Partial<NewMedicao>) => {
    const payload: any = {};
    if (m.nome !== undefined) payload.nome = m.nome;
    if (m.descricao !== undefined) payload.descricao = m.descricao;
    if (m.dataReferencia !== undefined) payload.data_referencia = m.dataReferencia;
    const { error } = await runWithRetry(async () => await supabase.from("cronograma_medicoes").update(payload).eq("id", id));
    if (error) {
      notifyError(error);
      return false;
    }
    toast.success("Medição atualizada");
    await load();
    return true;
  };

  const reorderMedicao = async (id: string, direction: "up" | "down") => {
    const sorted = [...medicoes].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    const idx = sorted.findIndex((x) => x.id === id);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    const ordemA = a.ordem ?? 0;
    const ordemB = b.ordem ?? 0;
    const finalA = ordemA === ordemB ? ordemA + (direction === "up" ? -1 : 1) : ordemB;
    const finalB = ordemA === ordemB ? ordemA : ordemA;
    setMedicoes((prev) => prev.map((x) => x.id === a.id ? { ...x, ordem: finalA } : x.id === b.id ? { ...x, ordem: finalB } : x).sort((x, y) => (x.ordem ?? 0) - (y.ordem ?? 0)));
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("cronograma_medicoes").update({ ordem: finalA }).eq("id", a.id),
      supabase.from("cronograma_medicoes").update({ ordem: finalB }).eq("id", b.id),
    ]);
    if (e1 || e2) { toast.error("Não foi possível reordenar os itens."); await load(); }
  };

  const deleteMedicao = async (id: string) => {
    const { error } = await supabase.from("cronograma_medicoes").delete().eq("id", id);
    if (error) notifyError(error);
    else { setMedicoes((p) => p.filter((x) => x.id !== id)); setItens((p) => p.filter((x) => x.medicaoId !== id)); toast.success("Medição excluída"); }
  };

  const insertItem = (i: NewItem) => ({
    medicao_id: i.medicaoId, semana: i.semana ?? "", preservacao: i.preservacao ?? "",
    tag: i.tag, unidade: i.unidade, gabinete: i.gabinete, tipo: i.tipo ?? "",
    data_prevista: i.dataPrevista ?? null, data_realizada: i.dataRealizada ?? null,
    status: i.status ?? "PENDENTE", observacoes: i.observacoes ?? "",
    motivo_divergencia: i.motivoDivergencia ?? "",
    criado_por: user?.id ?? null,
  });

  const addItem = async (i: NewItem) => {
    const { data, error } = await runWithRetry(async () => await supabase.from("cronograma_itens").insert(insertItem(i)).select("*").single());
    if (error) { notifyError(error); return null; }
    const novo = mapItem(data as ItemRow);
    setItens((p) => [...p, novo]);
    return novo;
  };

  const addItemsBulk = async (items: NewItem[]) => {
    if (!items.length) return 0;
    const payload = items.map(insertItem);
    const { data, error } = await runWithRetry(async () => await supabase.from("cronograma_itens").insert(payload).select("*"));
    if (error) { notifyError(error); return 0; }
    const novos = (data ?? []).map((r) => mapItem(r as ItemRow));
    setItens((p) => [...p, ...novos]);
    return novos.length;
  };

  const updateItem = async (id: string, data: Partial<CronogramaItem>) => {
    const payload: any = {};
    if (data.semana !== undefined) payload.semana = data.semana;
    if (data.preservacao !== undefined) payload.preservacao = data.preservacao;
    if (data.tag !== undefined) payload.tag = data.tag;
    if (data.unidade !== undefined) payload.unidade = data.unidade;
    if (data.gabinete !== undefined) payload.gabinete = data.gabinete;
    if (data.tipo !== undefined) payload.tipo = data.tipo;
    if (data.dataPrevista !== undefined) payload.data_prevista = data.dataPrevista;
    if (data.dataRealizada !== undefined) payload.data_realizada = data.dataRealizada;
    if (data.status !== undefined) payload.status = data.status;
    if (data.observacoes !== undefined) payload.observacoes = data.observacoes;
    if (data.motivoDivergencia !== undefined) payload.motivo_divergencia = data.motivoDivergencia;
    // .select() permite detectar updates que retornaram 0 linhas (RLS / id inválido)
    // e impedir que a UI mostre "sucesso" silenciosamente quando nada foi gravado.
    const { data: rows, error } = await runWithRetry(async () =>
      await supabase.from("cronograma_itens").update(payload).eq("id", id).select("id"),
    );
    if (error) { notifyError(error); return false; }
    if (!rows || rows.length === 0) {
      toast.error("Não foi possível atualizar este item (sem permissão ou item inexistente).");
      return false;
    }
    setItens((p) => p.map((x) => (x.id === id ? { ...x, ...data } : x)));
    return true;
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("cronograma_itens").delete().eq("id", id);
    if (error) notifyError(error);
    else { setItens((p) => p.filter((x) => x.id !== id)); toast.success("Item excluído"); }
  };

  const deleteItems = async (ids: string[]) => {
    if (!ids.length) return;
    const { error } = await supabase.from("cronograma_itens").delete().in("id", ids);
    if (error) notifyError(error);
    else { setItens((p) => p.filter((x) => !ids.includes(x.id))); toast.success(`${ids.length} item(ns) excluído(s)`); }
  };

  const itensCalculados = useMemo<ItemCalculado[]>(
    () => itens.map((i) => {
      const c = calcularSituacao(i);
      return { ...i, situacao: c.situacao, desvioDias: c.desvioDias };
    }),
    [itens]
  );

  return (
    <CronogramaCtx.Provider value={{
      medicoes, itens, itensCalculados, loading, refresh: load,
      addMedicao, updateMedicao, deleteMedicao, reorderMedicao,
      addItem, addItemsBulk, updateItem, deleteItem, deleteItems,
    }}>
      {children}
    </CronogramaCtx.Provider>
  );
}

export function useCronograma() {
  const ctx = useContext(CronogramaCtx);
  if (!ctx) throw new Error("useCronograma deve ser usado dentro de CronogramaProvider");
  return ctx;
}
