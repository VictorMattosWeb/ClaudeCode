export type CronogramaStatus = "PRESERVADO" | "PENDENTE" | "N/A";

export const CRONOGRAMA_STATUS_VALUES: CronogramaStatus[] = ["PRESERVADO", "PENDENTE", "N/A"];

export type SituacaoCalculada = "no_prazo" | "divergencia" | "pendente" | "vence_em_breve" | "vencido" | "nao_aplicavel";

// Limite (em dias) para classificar um item como "Vence em breve" (igual à página de Lotes)
export const VENCE_EM_BREVE_DIAS = 3;

export const SITUACAO_LABEL: Record<SituacaoCalculada, string> = {
  no_prazo: "No prazo",
  divergencia: "Divergência",
  pendente: "Pendente",
  vence_em_breve: "Vence em breve",
  vencido: "Vencido",
  nao_aplicavel: "N/A",
};

export interface MedicaoCronograma {
  id: string;
  nome: string;
  descricao: string;
  dataReferencia: string | null;
  ordem: number;
  createdAt: string;
  updatedAt: string;
}

export interface CronogramaItem {
  id: string;
  medicaoId: string;
  semana: string;
  preservacao: string;
  tag: string;
  unidade: string;
  gabinete: string;
  tipo: string;
  dataPrevista: string | null;
  dataRealizada: string | null;
  status: CronogramaStatus | string;
  observacoes: string;
  motivoDivergencia: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItemCalculado extends CronogramaItem {
  situacao: SituacaoCalculada;
  desvioDias: number | null;
}

// Parse "YYYY-MM-DD" (ou ISO completo) como data LOCAL — evita off-by-one por timezone
function parseDateLocal(value: string | null | undefined): Date | null {
  if (!value) return null;
  const s = value.slice(0, 10);
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function calcularSituacao(item: CronogramaItem): { situacao: SituacaoCalculada; desvioDias: number | null } {
  const status = (item.status || "").toUpperCase();
  if (status === "N/A" || status === "NA" || status === "NÃO APLICÁVEL") {
    return { situacao: "nao_aplicavel", desvioDias: null };
  }

  const prevista = parseDateLocal(item.dataPrevista);
  const realizada = parseDateLocal(item.dataRealizada);

  // REGRA AUTORITATIVA: se o status é PRESERVADO, NUNCA mostrar como vencido.
  // Garante que toda baixa registrada se reflita imediatamente na situação,
  // mesmo se dataRealizada estiver ausente por algum motivo (import, edição parcial, etc).
  if (status === "PRESERVADO") {
    if (realizada && prevista) {
      const diff = Math.round((realizada.getTime() - prevista.getTime()) / (1000 * 60 * 60 * 24));
      return { situacao: diff <= 0 ? "no_prazo" : "divergencia", desvioDias: diff };
    }
    return { situacao: "no_prazo", desvioDias: null };
  }

  if (realizada && prevista) {
    const diff = Math.round((realizada.getTime() - prevista.getTime()) / (1000 * 60 * 60 * 24));
    return { situacao: diff <= 0 ? "no_prazo" : "divergencia", desvioDias: diff };
  }

  if (!realizada && prevista) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diasParaVencer = Math.ceil((prevista.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    if (diasParaVencer < 0) return { situacao: "vencido", desvioDias: null };
    if (diasParaVencer <= VENCE_EM_BREVE_DIAS) return { situacao: "vence_em_breve", desvioDias: null };
    return { situacao: "pendente", desvioDias: null };
  }

  return { situacao: "pendente", desvioDias: null };
}

export interface CronogramaStats {
  total: number;
  preservados: number;
  pendentes: number;
  vencidos: number;
  naoAplicavel: number;
  noPrazo: number;
  divergencias: number;
  totalValidos: number;
  percentExecucao: number;
  percentNoPrazo: number;
  percentDivergencia: number;
  mediaDivergenciaDias: number;
  // Prazo geral (data inicial → data final do cronograma)
  dataInicialPrevista: string | null;
  dataFinalPrevista: string | null;
  dataInicialRealizada: string | null;
  dataFinalRealizada: string | null;
  cumpridoNoPrazoGeral: boolean | null;
  desvioPrazoGeralDias: number | null;
  percentExecucaoPrazoGeral: number;
}

export function calcularStats(itens: ItemCalculado[]): CronogramaStats {
  const total = itens.length;
  const naoAplicavel = itens.filter((i) => i.situacao === "nao_aplicavel").length;
  const totalValidos = total - naoAplicavel;
  const noPrazo = itens.filter((i) => i.situacao === "no_prazo").length;
  const divergencias = itens.filter((i) => i.situacao === "divergencia").length;
  const preservados = noPrazo + divergencias;
  const pendentes = itens.filter((i) => i.situacao === "pendente").length;
  const vencidos = itens.filter((i) => i.situacao === "vencido").length;

  const divDias = itens
    .filter((i) => i.situacao === "divergencia" && i.desvioDias !== null)
    .map((i) => i.desvioDias as number);
  const mediaDivergenciaDias = divDias.length ? divDias.reduce((a, b) => a + b, 0) / divDias.length : 0;

  // Prazo geral: considerar apenas itens válidos (excluir N/A)
  const validos = itens.filter((i) => i.situacao !== "nao_aplicavel");
  const previstas = validos.map((i) => i.dataPrevista).filter(Boolean) as string[];
  const realizadas = validos.map((i) => i.dataRealizada).filter(Boolean) as string[];

  const min = (arr: string[]) => (arr.length ? arr.reduce((a, b) => (a < b ? a : b)) : null);
  const max = (arr: string[]) => (arr.length ? arr.reduce((a, b) => (a > b ? a : b)) : null);

  const dataInicialPrevista = min(previstas);
  const dataFinalPrevista = max(previstas);
  const dataInicialRealizada = min(realizadas);
  const dataFinalRealizada = max(realizadas);

  let cumpridoNoPrazoGeral: boolean | null = null;
  let desvioPrazoGeralDias: number | null = null;
  if (dataFinalPrevista && dataFinalRealizada) {
    const diff = Math.round(
      (new Date(dataFinalRealizada).getTime() - new Date(dataFinalPrevista).getTime()) / (1000 * 60 * 60 * 24)
    );
    desvioPrazoGeralDias = diff;
    cumpridoNoPrazoGeral = diff <= 0;
  }

  const percentExecucaoPrazoGeral = totalValidos > 0 ? (preservados / totalValidos) * 100 : 0;

  return {
    total,
    preservados,
    pendentes,
    vencidos,
    naoAplicavel,
    noPrazo,
    divergencias,
    totalValidos,
    percentExecucao: totalValidos > 0 ? (preservados / totalValidos) * 100 : 0,
    percentNoPrazo: preservados > 0 ? (noPrazo / preservados) * 100 : 0,
    percentDivergencia: preservados > 0 ? (divergencias / preservados) * 100 : 0,
    mediaDivergenciaDias,
    dataInicialPrevista,
    dataFinalPrevista,
    dataInicialRealizada,
    dataFinalRealizada,
    cumpridoNoPrazoGeral,
    desvioPrazoGeralDias,
    percentExecucaoPrazoGeral,
  };
}
