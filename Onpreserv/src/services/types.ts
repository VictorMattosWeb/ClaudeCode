import type { Lot, Preservation } from "@/types/lot";

/**
 * Contratos de acesso a dados.
 *
 * -----------------------------------------------------------------------------
 * Esta é a fronteira entre o aplicativo e o banco.
 * -----------------------------------------------------------------------------
 *
 * Nada acima desta camada — contexto, página, componente — deve saber que
 * existe Supabase, HTTP ou SQL. Fala-se em `Lot` e `Preservation`, os modelos
 * de domínio, e as assinaturas abaixo são tudo o que se pode pedir.
 *
 * Antes, os contextos chamavam `supabase.from("lots")` direto, com o mapeamento
 * de colunas (`descricao` → `name`, `fornecedor` → `responsible`) espalhado
 * pelo caminho. Trocar de banco significaria reescrever 134 pontos de chamada.
 * Com o contrato no meio, significa escrever um adaptador novo.
 *
 * Regras destes tipos:
 *
 *   1. Nenhum tipo de biblioteca de banco aparece aqui.
 *   2. Nada de detalhe de transporte — sem `PostgrestError`, sem `Response`.
 *   3. Erro é lançado, não devolvido em campo. Quem chama decide o que exibir;
 *      o adaptador não conhece a interface.
 */

/** Dados para criar um lote. Id, identificador e datas são do servidor. */
export type NovoLote = Omit<Lot, "id" | "preservations" | "createdAt" | "identificadorInterno"> & {
  identificadorInterno?: string;
};

/** Alteração parcial de um lote. */
export type EdicaoLote = Partial<Omit<Lot, "id" | "preservations" | "createdAt">>;

/** Preservação a registrar. O id vem do servidor. */
export type NovaPreservacao = Omit<Preservation, "id">;

/**
 * Cancela uma inscrição em tempo real.
 * Devolvido por `observar`, para o chamador desfazer no cleanup do efeito.
 */
export type Cancelar = () => void;

export interface LotsService {
  /**
   * Todos os lotes, com o histórico de preservações já embutido.
   *
   * Devolve a lista completa de propósito: a tela filtra, ordena e pagina em
   * memória, e as contagens do topo precisam do conjunto inteiro para não
   * mentir. O adaptador é responsável por paginar a leitura no banco de forma
   * estável — ordem determinística, sem perder nem duplicar linha.
   */
  listar(): Promise<Lot[]>;

  criar(dados: NovoLote): Promise<void>;
  atualizar(id: string, dados: EdicaoLote): Promise<void>;
  excluir(id: string): Promise<void>;
  excluirVarios(ids: string[]): Promise<void>;

  registrarPreservacao(lotId: string, dados: NovaPreservacao): Promise<void>;
  registrarPreservacaoEmVarios(lotIds: string[], dados: NovaPreservacao): Promise<void>;
  limparHistorico(lotId: string): Promise<void>;

  /** Avisa quando lotes ou preservações mudam no servidor. */
  observar(aoMudar: () => void): Cancelar;
}

/**
 * Conjunto de serviços da aplicação.
 *
 * Cresce conforme os demais módulos migram: `tasks`, `cronograma`,
 * `atividades`, `usuarios`, `notificacoes`, `solicitacoes`.
 */
export interface Services {
  lots: LotsService;
}
