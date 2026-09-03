import { supabase } from "@/services/adapters/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { runWithRetry } from "@/lib/runWithRetry";
import type { Lot, LotTipo, Preservation } from "@/types/lot";
import type { Cancelar, EdicaoLote, LotsService, NovaPreservacao, NovoLote } from "@/services/types";

/**
 * Implementação do `LotsService` sobre o Supabase.
 *
 * -----------------------------------------------------------------------------
 * Este é o ÚNICO arquivo do módulo de lotes que conhece o banco.
 * -----------------------------------------------------------------------------
 *
 * Todo o mapeamento entre o vocabulário do domínio e o das colunas mora aqui.
 * Ele não é óbvio — o esquema veio de outra modelagem e nunca foi renomeado:
 *
 *   descricao   → name          fornecedor  → responsible
 *   localizacao → location      tipo        → nextDate (!)
 *
 * O caso de `preservations.tipo` guardando a PRÓXIMA DATA é o mais traiçoeiro:
 * a coluna chama "tipo" e contém uma data. Estava replicado em vários pontos do
 * código; agora existe em um lugar só, documentado.
 *
 * Quando o backend próprio entrar, escreve-se um irmão deste arquivo e troca-se
 * a linha em `services/index.ts`. Nada acima muda.
 */

/** Linha da tabela `lots`. */
interface LotRow {
  id: string;
  codigo: string;
  descricao: string;
  localizacao: string | null;
  rua: string | null;
  prateleira: string | null;
  fornecedor: string | null;
  status: "ativo" | "inativo";
  observacoes: string | null;
  identificador_interno: string | null;
  tipo_lote: LotTipo | null;
  frequencia_dias: number | null;
  created_at: string;
}

/** Linha da tabela `preservations`. */
interface PresRow {
  id: string;
  lot_id: string;
  data: string;
  /** Apesar do nome, guarda a data da PRÓXIMA preservação. */
  tipo: string;
  responsavel: string;
  observacoes: string | null;
  created_at: string;
}

function paraDominio(r: LotRow, preservacoes: PresRow[]): Lot {
  return {
    id: r.id,
    identificadorInterno: r.identificador_interno ?? "",
    tipoLote: r.tipo_lote ?? "novo",
    code: r.codigo,
    name: r.descricao,
    location: r.localizacao ?? "",
    rua: r.rua ?? "",
    prateleira: r.prateleira ?? "",
    responsible: r.fornecedor ?? "",
    status: r.status,
    observations: semMarca(r.observacoes),
    // `undefined`, e não `null`, quando não há nada gravado: no domínio, `null`
    // significa "o administrador escolheu o padrão" e desliga a identificação
    // dos PN pelo nome. Como a coluna não existe (ou vem nula em todas as
    // linhas antigas), forçar `null` colocava os PN em 15 dias — era por isso
    // que a próxima preservação deles aparecia errada.
    frequenciaDias: r.frequencia_dias ?? lerFrequenciaDaObservacao(r.observacoes) ?? undefined,
    createdAt: r.created_at,
    preservations: preservacoes
      .filter((p) => p.lot_id === r.id)
      .map(
        (p): Preservation => ({
          id: p.id,
          date: p.data,
          nextDate: p.tipo,
          observation: p.observacoes ?? "",
          responsible: p.responsavel,
        }),
      )
      // Ordem cronológica. O desempate por `created_at` mantém estável a
      // sequência de preservações registradas no mesmo dia — de que dependem o
      // cálculo do ciclo e a linha do tempo do histórico.
      .sort((a, b) => {
        const porData = a.date.localeCompare(b.date);
        if (porData !== 0) return porData;
        const ca = preservacoes.find((p) => p.id === a.id)?.created_at ?? "";
        const cb = preservacoes.find((p) => p.id === b.id)?.created_at ?? "";
        return ca.localeCompare(cb);
      }),
  };
}

/**
 * A coluna `frequencia_dias` existe no banco?
 *
 * A migration que a cria pode não ter sido aplicada. Sem esta verificação, o
 * campo ia junto no UPDATE e o Postgres derrubava a operação inteira com
 * `42703` — o administrador não conseguia salvar NENHUMA alteração no lote,
 * nem as que nada tinham a ver com frequência.
 *
 * Descobre-se na primeira falha e guarda-se a resposta: as escritas seguintes
 * já saem sem o campo, e o resto da edição é salvo normalmente.
 */
let colunaFrequenciaAusente = false;

/** O erro é a coluna inexistente? */
function ehColunaInexistente(erro: unknown, coluna: string): boolean {
  const e = erro as { code?: string; message?: string };
  return e?.code === "42703" && (e.message ?? "").includes(coluna);
}

/**
 * Frequência guardada dentro de `observacoes`, quando a coluna não existe.
 *
 * -----------------------------------------------------------------------------
 * Solução de contorno, ativa SÓ enquanto `lots.frequencia_dias` não existir.
 * -----------------------------------------------------------------------------
 *
 * A migration que cria a coluna precisa de permissão de DDL, que a chave da
 * aplicação não tem. Sem ela, a frequência escolhida pelo administrador não
 * tinha onde ser gravada e a alteração simplesmente não pegava.
 *
 * A marca fica no fim do texto e nunca chega ao domínio: a leitura extrai o
 * número e devolve `observations` já limpo, então nem a tela nem a busca a
 * enxergam. Assim que a coluna existir, ela passa a mandar, e a marca é
 * descartada na primeira gravação do lote.
 */
const MARCA_FREQUENCIA = /\s*\[freq:(\d{1,3})\]\s*$/;

export function lerFrequenciaDaObservacao(obs: string | null | undefined): number | null {
  const m = MARCA_FREQUENCIA.exec(obs ?? "");
  if (!m) return null;
  const dias = Number(m[1]);
  return Number.isFinite(dias) && dias > 0 ? dias : null;
}

export function semMarca(obs: string | null | undefined): string {
  return (obs ?? "").replace(MARCA_FREQUENCIA, "");
}

export function comMarca(obs: string, dias: number | null | undefined): string {
  const limpo = semMarca(obs);
  if (dias == null) return limpo;
  return limpo ? `${limpo}\n[freq:${dias}]` : `[freq:${dias}]`;
}

/** Id da sessão, para as colunas de autoria. */
async function autorAtual(): Promise<string | undefined> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id;
}

/** Converte a preservação de domínio para a linha do banco. */
function preservacaoParaLinha(lotId: string, p: NovaPreservacao, autor?: string) {
  return {
    lot_id: lotId,
    data: p.date,
    tipo: p.nextDate, // ver comentário do cabeçalho
    responsavel: p.responsible,
    observacoes: p.observation ?? "",
    criado_por: autor,
  };
}

/**
 * Reescreve o patch para levar a frequência dentro de `observacoes`.
 *
 * Precisa ler a observação atual porque os dois dados dividem a mesma coluna:
 * salvar só a frequência não pode apagar o texto do usuário, e salvar só o
 * texto não pode apagar a frequência já escolhida.
 */
async function gravarFrequenciaNaObservacao(
  id: string,
  patch: Record<string, unknown>,
  dados: EdicaoLote,
): Promise<void> {
  delete patch.frequencia_dias;

  const mudouFrequencia = dados.frequenciaDias !== undefined;
  const mudouObservacao = dados.observations !== undefined;
  if (!mudouFrequencia && !mudouObservacao) return;

  const { data } = await supabase.from("lots").select("observacoes").eq("id", id).maybeSingle();
  const atual = (data as { observacoes: string | null } | null)?.observacoes ?? "";

  const texto = mudouObservacao ? (dados.observations ?? "") : semMarca(atual);
  const dias = mudouFrequencia ? dados.frequenciaDias : lerFrequenciaDaObservacao(atual);

  patch.observacoes = comMarca(texto, dias);
}

export const supabaseLotsService: LotsService = {
  async listar(): Promise<Lot[]> {
    const [lotes, preservacoes] = await Promise.all([
      fetchAllRows<LotRow>(() =>
        supabase
          .from("lots")
          .select("*")
          .order("created_at", { ascending: false })
          // Desempate obrigatório: `created_at` repete em importações em lote,
          // e sem ordem total a paginação perde linhas.
          .order("id", { ascending: true }),
      ),
      fetchAllRows<PresRow>(() =>
        supabase
          .from("preservations")
          .select("*")
          .order("data", { ascending: true })
          .order("created_at", { ascending: true })
          .order("id", { ascending: true }),
      ),
    ]);

    // Descobre aqui se a coluna existe. Sem isto, a ausência só apareceria na
    // primeira gravação, que iria e voltaria com erro antes de usar a marca.
    if (lotes.length > 0 && !("frequencia_dias" in lotes[0])) colunaFrequenciaAusente = true;

    return lotes.map((l) => paraDominio(l, preservacoes));
  },

  async criar(dados: NovoLote): Promise<void> {
    const { error } = await runWithRetry(async () =>
      supabase.from("lots").insert({
        codigo: dados.code,
        descricao: (dados.name ?? "").toUpperCase(),
        localizacao: dados.location ?? "",
        rua: dados.rua ?? "",
        prateleira: dados.prateleira ?? "",
        fornecedor: dados.responsible ?? "",
        status: dados.status ?? "ativo",
        observacoes: colunaFrequenciaAusente
          ? comMarca(dados.observations ?? "", dados.frequenciaDias)
          : (dados.observations ?? ""),
        tipo_lote: dados.tipoLote ?? "novo",
        // Só entra quando há valor: coluna inexistente derruba o INSERT inteiro.
        ...(dados.frequenciaDias != null && !colunaFrequenciaAusente
          ? { frequencia_dias: dados.frequenciaDias }
          : {}),
        criado_por: await autorAtual(),
      } as never),
    );
    if (error) throw error;
  },

  async atualizar(id: string, dados: EdicaoLote): Promise<void> {
    const patch: Record<string, unknown> = {};
    if (dados.code !== undefined) patch.codigo = dados.code;
    if (dados.name !== undefined) patch.descricao = (dados.name ?? "").toUpperCase();
    if (dados.location !== undefined) patch.localizacao = dados.location;
    if (dados.rua !== undefined) patch.rua = dados.rua;
    if (dados.prateleira !== undefined) patch.prateleira = dados.prateleira;
    if (dados.responsible !== undefined) patch.fornecedor = dados.responsible;
    if (dados.status !== undefined) patch.status = dados.status;
    if (dados.observations !== undefined) patch.observacoes = dados.observations;
    if (dados.tipoLote !== undefined) patch.tipo_lote = dados.tipoLote;
    // Só quando o formulário enviou: o gatilho no banco recusa a alteração de
    // frequência por quem não é administrador, então mandar o valor inalterado
    // a cada edição impediria o usuário comum de salvar qualquer coisa.
    if (dados.frequenciaDias !== undefined) patch.frequencia_dias = dados.frequenciaDias;

    if (colunaFrequenciaAusente) {
      await gravarFrequenciaNaObservacao(id, patch, dados);
    }

    if (Object.keys(patch).length === 0) return;

    const { error } = await runWithRetry(async () =>
      supabase.from("lots").update(patch as never).eq("id", id),
    );
    if (!error) return;

    if (!ehColunaInexistente(error, "frequencia_dias")) throw error;

    // Primeira vez que descobrimos a ausência: refaz a gravação usando a marca,
    // em vez de devolver erro ao usuário e perder a frequência escolhida.
    colunaFrequenciaAusente = true;
    await gravarFrequenciaNaObservacao(id, patch, dados);

    if (Object.keys(patch).length === 0) return;
    const { error: erroComMarca } = await runWithRetry(async () =>
      supabase.from("lots").update(patch as never).eq("id", id),
    );
    if (erroComMarca) throw erroComMarca;
  },

  async excluir(id: string): Promise<void> {
    const { error } = await supabase.from("lots").delete().eq("id", id);
    if (error) throw error;
  },

  async excluirVarios(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await supabase.from("lots").delete().in("id", ids);
    if (error) throw error;
  },

  async registrarPreservacao(lotId: string, dados: NovaPreservacao): Promise<void> {
    const { error } = await runWithRetry(async () =>
      supabase.from("preservations").insert(preservacaoParaLinha(lotId, dados, await autorAtual()) as never),
    );
    if (error) throw error;
  },

  async registrarPreservacaoEmVarios(lotIds: string[], dados: NovaPreservacao): Promise<void> {
    // Ids repetidos gerariam duas preservações no mesmo lote e no mesmo dia.
    const unicos = Array.from(new Set(lotIds)).filter(Boolean);
    if (unicos.length === 0) return;

    const autor = await autorAtual();
    const { error } = await runWithRetry(async () =>
      supabase
        .from("preservations")
        .insert(unicos.map((id) => preservacaoParaLinha(id, dados, autor)) as never),
    );
    if (error) throw error;
  },

  async limparHistorico(lotId: string): Promise<void> {
    const { error } = await supabase.from("preservations").delete().eq("lot_id", lotId);
    if (error) throw error;
  },

  observar(aoMudar: () => void): Cancelar {
    // Nome único por inscrição: dois provedores montados ao mesmo tempo (troca
    // de rota, StrictMode em desenvolvimento) brigariam pelo mesmo canal.
    const canal = supabase
      .channel(`lots:${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lots" }, aoMudar)
      .on("postgres_changes", { event: "*", schema: "public", table: "preservations" }, aoMudar)
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  },
};
