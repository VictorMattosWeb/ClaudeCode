import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Lot, Preservation, getLotFrequencyDays, proximaDataPrevista } from "@/types/lot";
import { useAuth } from "@/context/AuthContext";
import { services } from "@/services";
import { notifyError } from "@/lib/errorMessages";
import { registrarDiagnostico } from "@/lib/diagnosticoLotes";

/**
 * Estado dos lotes.
 *
 * O contexto cuida de estado de tela — carregar, guardar, avisar o React. Como
 * os dados chegam do servidor é assunto de `services/lots`, e este arquivo não
 * conhece Supabase, HTTP nem SQL.
 *
 * Antes ele misturava as três coisas: mapeamento de colunas, paginação do banco
 * e estado de React no mesmo lugar, com o nome das colunas espalhado por sete
 * funções. Trocar de banco exigiria reescrevê-lo inteiro.
 */
interface LotContextType {
  lots: Lot[];
  loading: boolean;
  addLot: (lot: Omit<Lot, "id" | "preservations" | "createdAt">) => Promise<boolean>;
  updateLot: (id: string, data: Partial<Lot>) => Promise<boolean>;
  deleteLot: (id: string) => Promise<void>;
  deleteLots: (ids: string[]) => Promise<void>;
  addPreservation: (lotId: string, preservation: Omit<Preservation, "id">) => Promise<boolean>;
  addPreservationToMany: (lotIds: string[], preservation: Omit<Preservation, "id">) => Promise<void>;
  clearPreservations: (lotId: string) => Promise<boolean>;
  getLot: (id: string) => Lot | undefined;
  refresh: () => Promise<void>;
}

const LotContext = createContext<LotContextType | undefined>(undefined);

export function LotProvider({ children }: { children: React.ReactNode }) {
  const { session, authReady } = useAuth();
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLots(await services.lots.listar());
    } catch (err) {
      // Sem isto, uma falha de rede ou de permissão abortava a carga em
      // silêncio: a lista ficava com o conteúdo anterior e o usuário não tinha
      // como saber que estava vendo dados incompletos.
      notifyError(err, "Não foi possível carregar os lotes. Os dados exibidos podem estar incompletos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!session) {
      setLots([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void refresh();
    return services.lots.observar(() => void refresh());
  }, [authReady, session, refresh]);

  // Diagnóstico da busca no console, só em desenvolvimento. A referência é lida
  // na hora da chamada, então sempre reflete o estado atual.
  const lotsRef = useRef<Lot[]>([]);
  lotsRef.current = lots;
  useEffect(() => {
    registrarDiagnostico(() => lotsRef.current);
  }, []);

  /**
   * Executa uma escrita e devolve se deu certo.
   *
   * O serviço lança em erro; a interface trabalha com booleano. A tradução fica
   * aqui, num lugar só, em vez de repetida em cada função — e com ela a
   * garantia de que nenhuma falha passa sem aviso ao usuário.
   */
  const executar = useCallback(async (acao: () => Promise<void>, mensagemDeErro: string): Promise<boolean> => {
    try {
      await acao();
      return true;
    } catch (err) {
      notifyError(err, mensagemDeErro);
      return false;
    }
  }, []);

  /**
   * Preenche a próxima data prevista conforme a frequência DO LOTE.
   *
   * O formulário não tem como saber a frequência de cada lote — e na baixa em
   * lote são várias, possivelmente diferentes. O cálculo pertence aqui, onde a
   * lista de lotes está disponível.
   */
  const comProximaData = useCallback(
    (lotId: string, p: Omit<Preservation, "id">): Omit<Preservation, "id"> => {
      const lote = lots.find((l) => l.id === lotId);
      if (!lote || !p.date) return p;
      return { ...p, nextDate: proximaDataPrevista(p.date, getLotFrequencyDays(lote)) };
    },
    [lots],
  );

  const valor: LotContextType = {
    lots,
    loading,
    refresh,

    addLot: (lot) => executar(() => services.lots.criar(lot), "Não foi possível criar o lote."),

    updateLot: (id, data) =>
      executar(() => services.lots.atualizar(id, data), "Não foi possível atualizar o lote."),

    deleteLot: async (id) => {
      await executar(() => services.lots.excluir(id), "Não foi possível excluir o lote.");
    },

    deleteLots: async (ids) => {
      await executar(
        () => services.lots.excluirVarios(ids),
        "Não foi possível excluir os lotes selecionados.",
      );
    },

    addPreservation: (lotId, p) =>
      executar(
        () => services.lots.registrarPreservacao(lotId, comProximaData(lotId, p)),
        "Não foi possível registrar a preservação.",
      ),

    addPreservationToMany: async (lotIds, p) => {
      // Cada lote recebe a SUA próxima data: uma baixa em lote pode misturar
      // itens de 15 e de 30 dias, e uma data única estaria errada para metade.
      const ok = await executar(async () => {
        for (const id of lotIds) {
          await services.lots.registrarPreservacao(id, comProximaData(id, p));
        }
      }, "Não foi possível registrar as preservações.");
      // Quem chama espera a exceção para não exibir o toast de sucesso.
      if (!ok) throw new Error("falha ao registrar preservações");
    },

    clearPreservations: (lotId) =>
      executar(() => services.lots.limparHistorico(lotId), "Não foi possível limpar o histórico."),

    getLot: (id) => lots.find((l) => l.id === id),
  };

  return <LotContext.Provider value={valor}>{children}</LotContext.Provider>;
}

export function useLots() {
  const ctx = useContext(LotContext);
  if (!ctx) throw new Error("useLots deve ser usado dentro de LotProvider");
  return ctx;
}
