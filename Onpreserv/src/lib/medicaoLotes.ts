// Helpers puros (sem React) para cálculo de lotes/preservações por medição.
// Mantidos isolados para serem testáveis e garantirem o invariante:
//   lotesPreservadosNoPeriodo <= lotesCadastradosNoPeriodo
// para qualquer medição e qualquer configuração de período.

export interface MedicaoLite {
  id: string;
  dataReferencia: string | null;
}

export interface PreservationLite {
  date: string | null;
}

export interface LotLite {
  id: string;
  createdAt: string; // ISO
  preservations: PreservationLite[];
}

export interface Periodo {
  inicio: string; // YYYY-MM-DD inclusivo
  fim: string;    // YYYY-MM-DD inclusivo
}

/**
 * Calcula o período DISJUNTO de uma medição, baseado nas dataReferencia das
 * medições ordenadas. Cada medição cobre [dataRef, próxima.dataRef - 1 dia].
 * A primeira estende para -infinito; a última para +infinito.
 */
export function computeMedicaoPeriodo(
  medicaoId: string,
  medicoes: MedicaoLite[],
): Periodo | null {
  const atual = medicoes.find((m) => m.id === medicaoId);
  if (!atual || !atual.dataReferencia) return null;

  const ordenadas = [...medicoes]
    .filter((m) => !!m.dataReferencia)
    .sort((a, b) => (a.dataReferencia ?? "").localeCompare(b.dataReferencia ?? ""));
  const idx = ordenadas.findIndex((m) => m.id === atual.id);
  if (idx === -1) return null;

  const isFirst = idx === 0;
  const isLast = idx === ordenadas.length - 1;
  const inicio = isFirst ? "0000-01-01" : (ordenadas[idx].dataReferencia as string);
  let fim = "9999-12-31";
  if (!isLast) {
    const proxima = ordenadas[idx + 1].dataReferencia as string;
    const d = new Date(proxima + "T00:00:00");
    d.setDate(d.getDate() - 1);
    fim = d.toISOString().slice(0, 10);
  }
  return { inicio, fim };
}

const isoDate = (s: string | null | undefined) => (s ?? "").slice(0, 10);

export function lotesNoPeriodo<T extends LotLite>(lots: T[], periodo: Periodo): T[] {
  return lots.filter((l) => {
    const d = isoDate(l.createdAt);
    return d && d >= periodo.inicio && d <= periodo.fim;
  });
}

/**
 * Lotes DISTINTOS preservados no período. Restringido ao conjunto cadastrado
 * no mesmo período — garante o invariante de nunca ultrapassar
 * `lotesNoPeriodo`.
 */
export function lotesPreservadosNoPeriodo<T extends LotLite>(
  lots: T[],
  periodo: Periodo,
): number {
  const cadastrados = new Set(lotesNoPeriodo(lots, periodo).map((l) => l.id));
  const preservados = new Set<string>();
  for (const l of lots) {
    if (!cadastrados.has(l.id)) continue;
    const tem = l.preservations.some((p) => {
      const d = isoDate(p.date);
      return d >= periodo.inicio && d <= periodo.fim;
    });
    if (tem) preservados.add(l.id);
  }
  return preservados.size;
}
