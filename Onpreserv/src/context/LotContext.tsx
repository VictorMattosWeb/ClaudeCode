import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { Lot, LotTipo, Preservation } from "@/types/lot";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { runWithRetry } from "@/lib/runWithRetry";
import { notifyError } from "@/lib/errorMessages";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { registrarDiagnostico } from "@/lib/diagnosticoLotes";

interface LotContextType {
  lots: Lot[];
  loading: boolean;
  addLot: (lot: Omit<Lot, "id" | "preservations" | "createdAt">) => Promise<boolean>;
  updateLot: (id: string, data: Partial<Lot>) => Promise<boolean>;
  deleteLot: (id: string) => Promise<void>;
  deleteLots: (ids: string[]) => Promise<void>;
  addPreservation: (lotId: string, preservation: Omit<Preservation, "id">) => Promise<boolean>;
  addPreservationToMany: (lotIds: string[], preservation: Omit<Preservation, "id">) => Promise<void>;
  getLot: (id: string) => Lot | undefined;
}

const LotContext = createContext<LotContextType | undefined>(undefined);

type LotRow = {
  id: string; codigo: string; descricao: string; localizacao: string;
  fornecedor: string; status: "ativo" | "inativo"; observacoes: string;
  data_criacao: string; created_at: string; updated_at: string;
  identificador_interno: string; tipo_lote: LotTipo;
  rua: string | null; prateleira: string | null;
  frequencia_dias: number | null;
};
type PresRow = {
  id: string; lot_id: string; data: string; tipo: string; responsavel: string; observacoes: string; created_at: string;
};

const mapLot = (r: LotRow, pres: PresRow[]): Lot => ({
  id: r.id,
  identificadorInterno: r.identificador_interno ?? "",
  tipoLote: (r.tipo_lote ?? "novo") as LotTipo,
  code: r.codigo,
  name: r.descricao,
  location: r.localizacao ?? "",
  rua: r.rua ?? "",
  prateleira: r.prateleira ?? "",
  responsible: r.fornecedor ?? "",
  status: r.status,
  observations: r.observacoes ?? "",
  preservations: pres
    .filter((p) => p.lot_id === r.id)
    .map((p) => ({
      id: p.id,
      date: p.data,
      nextDate: p.tipo,
      observation: p.observacoes ?? "",
      responsible: p.responsavel,
    }))
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      const pa = pres.find((p) => p.id === a.id)?.created_at ?? "";
      const pb = pres.find((p) => p.id === b.id)?.created_at ?? "";
      return pa.localeCompare(pb);
    }),
  createdAt: r.created_at,
  frequenciaDias: r.frequencia_dias ?? null,
});

export function LotProvider({ children }: { children: React.ReactNode }) {
  const { session, authReady } = useAuth();
  const [lots, setLots] = useState<Lot[]>([]);
  const [presRows, setPresRows] = useState<PresRow[]>([]);
  const [lotRows, setLotRows] = useState<LotRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
    const [l, p] = await Promise.all([
      fetchAllRows<LotRow>(() =>
        supabase
          .from("lots" as any)
          .select("*")
          .order("created_at", { ascending: false })
          // Desempate obrigatório: `created_at` repete em importações em lote.
          .order("id", { ascending: true }),
      ),
      fetchAllRows<PresRow>(() =>
        supabase
          .from("preservations" as any)
          .select("*")
          .order("data", { ascending: true })
          .order("created_at", { ascending: true })
          // Idem: uma baixa em lote grava várias preservações no mesmo instante,
          // e perder uma delas altera o status de preservação do lote.
          .order("id", { ascending: true }),
      ),
    ]);
    setLotRows(l);
    setPresRows(p);
    } catch (err) {
      // Sem isto, qualquer erro de rede ou de permissão abortava a carga em
      // silêncio: a lista ficava com o conteúdo anterior (ou vazia) e o usuário
      // não tinha como saber que estava vendo dados incompletos.
      notifyError(err, "Não foi possível carregar os lotes. Os dados exibidos podem estar incompletos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!session) { setLots([]); setLoading(false); return; }
    setLoading(true);
    refresh();

    const ch = supabase
      .channel(`lots-realtime:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lots" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "preservations" }, () => refresh())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [authReady, session, refresh]);

  useEffect(() => {
    setLots(lotRows.map((r) => mapLot(r, presRows)));
  }, [lotRows, presRows]);

  // Ferramenta de diagnóstico no console (só em desenvolvimento). A referência
  // é lida na hora da chamada, então sempre reflete o estado atual.
  const lotsRef = useRef<Lot[]>([]);
  lotsRef.current = lots;
  useEffect(() => {
    registrarDiagnostico(() => lotsRef.current);
  }, []);

  const addLot: LotContextType["addLot"] = async (data) => {
    const { error } = await runWithRetry(async () => await supabase.from("lots" as any).insert({
      codigo: data.code,
      descricao: (data.name ?? "").toUpperCase(),
      localizacao: data.location ?? "",
      rua: data.rua ?? "",
      prateleira: data.prateleira ?? "",
      fornecedor: data.responsible ?? "",
      status: data.status ?? "ativo",
      observacoes: data.observations ?? "",
      tipo_lote: data.tipoLote ?? "novo",
      // Só entra no payload quando há valor. A coluna `frequencia_dias` pode
      // ainda não existir no banco (migration pendente), e mandar uma coluna
      // inexistente derruba o INSERT inteiro.
      ...(data.frequenciaDias != null ? { frequencia_dias: data.frequenciaDias } : {}),
      criado_por: session?.user.id,
    }));
    if (error) {
      notifyError(error, "Não foi possível criar o lote.");
      return false;
    }
    return true;
  };

  const updateLot: LotContextType["updateLot"] = async (id, data) => {
    const patch: any = {};
    if (data.code !== undefined) patch.codigo = data.code;
    if (data.name !== undefined) patch.descricao = (data.name ?? "").toUpperCase();
    if (data.location !== undefined) patch.localizacao = data.location;
    if (data.rua !== undefined) patch.rua = data.rua;
    if (data.prateleira !== undefined) patch.prateleira = data.prateleira;
    if (data.responsible !== undefined) patch.fornecedor = data.responsible;
    if (data.status !== undefined) patch.status = data.status;
    if (data.observations !== undefined) patch.observacoes = data.observations;
    if (data.tipoLote !== undefined) patch.tipo_lote = data.tipoLote;
    // Só entra no patch quando o formulário enviou o campo — por dois motivos:
    // o gatilho no banco rejeita a alteração vinda de quem não é administrador,
    // e a coluna pode ainda não existir (migration pendente).
    if (data.frequenciaDias !== undefined) patch.frequencia_dias = data.frequenciaDias;
    const { error } = await runWithRetry(async () => await supabase.from("lots" as any).update(patch).eq("id", id));
    if (error) {
      notifyError(error, "Não foi possível atualizar o lote.");
      return false;
    }
    return true;
  };

  const deleteLot: LotContextType["deleteLot"] = async (id) => {
    const { error } = await supabase.from("lots" as any).delete().eq("id", id);
    if (error) notifyError(error, "Não foi possível excluir o lote.");
  };

  const deleteLots: LotContextType["deleteLots"] = async (ids) => {
    const { error } = await supabase.from("lots" as any).delete().in("id", ids);
    if (error) notifyError(error, "Não foi possível excluir os lotes selecionados.");
  };

  const addPreservation: LotContextType["addPreservation"] = async (lotId, p) => {
    const { error } = await runWithRetry(async () => await supabase.from("preservations" as any).insert({
      lot_id: lotId,
      data: p.date,
      tipo: p.nextDate, // armazenamos next date em tipo p/ preservar API
      responsavel: p.responsible,
      observacoes: p.observation ?? "",
      criado_por: session?.user.id,
    }));
    if (error) {
      notifyError(error, "Não foi possível registrar a preservação.");
      return false;
    }
    return true;
  };

  const addPreservationToMany: LotContextType["addPreservationToMany"] = async (lotIds, p) => {
    const uniqueIds = Array.from(new Set(lotIds)).filter(Boolean);
    if (uniqueIds.length === 0) return;
    const rows = uniqueIds.map((lot_id) => ({
      lot_id,
      data: p.date,
      tipo: p.nextDate,
      responsavel: p.responsible,
      observacoes: p.observation ?? "",
      criado_por: session?.user.id,
    }));
    // Inserir em lotes de 200 para evitar payloads grandes / timeouts
    const CHUNK = 200;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const { error } = await runWithRetry(async () => await supabase.from("preservations" as any).insert(slice));
      if (error) {
        notifyError(error, "Não foi possível registrar as preservações.");
        throw error;
      }
    }
    await refresh();
  };

  const getLot = (id: string) => lots.find((l) => l.id === id);

  return (
    <LotContext.Provider value={{ lots, loading, addLot, updateLot, deleteLot, deleteLots, addPreservation, addPreservationToMany, getLot }}>
      {children}
    </LotContext.Provider>
  );
}

export function useLots() {
  const ctx = useContext(LotContext);
  if (!ctx) throw new Error("useLots must be used within LotProvider");
  return ctx;
}
