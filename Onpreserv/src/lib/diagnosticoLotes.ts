import type { Lot } from "@/types/lot";
import { lotMatchesQuery, normalizarBusca, somenteAlfanumerico } from "@/lib/lotFilters";

/**
 * Diagnóstico da busca de lotes, para o console do navegador.
 *
 * Existe porque o defeito relatado — "sei que há vários lotes com este código e
 * só aparece um" — não se reproduz nos testes: a função de filtro encontra
 * todas as ocorrências, inclusive com variações de escrita. Isso deixa duas
 * possibilidades, e elas exigem olhar os dados reais:
 *
 *   a) os lotes não chegaram do banco (carga incompleta);
 *   b) chegaram, mas o código gravado é diferente do digitado de um jeito que
 *      nem a passada frouxa cobre.
 *
 * Só é registrado em desenvolvimento. Não vai para o build de produção.
 */

interface Relatorio {
  totalCarregado: number;
  consulta: string;
  encontrados: number;
  porTipoDeCasamento: {
    exato: number;
    normalizado: number;
    somenteAlfanumerico: number;
  };
  codigosParecidos: { codigo: string; identificador: string; casa: boolean }[];
}

export function diagnosticarBusca(lots: Lot[], consulta: string): Relatorio {
  const q = consulta.trim();
  const qNorm = normalizarBusca(q);
  const qAlfa = somenteAlfanumerico(q);

  let exato = 0;
  let normalizado = 0;
  let alfa = 0;

  for (const lot of lots) {
    const code = String(lot.code ?? "");
    if (code === q) exato++;
    if (normalizarBusca(code).includes(qNorm)) normalizado++;
    if (qAlfa.length >= 3 && somenteAlfanumerico(code).includes(qAlfa)) alfa++;
  }

  // Lotes cujo código "parece" o procurado — só os dígitos em comum. Revela o
  // caso em que o cadastro tem um sufixo, prefixo ou caractere invisível.
  const somenteDigitos = (s: string) => s.replace(/\D/g, "");
  const alvoDigitos = somenteDigitos(q);

  const codigosParecidos = lots
    .filter((l) => alvoDigitos.length >= 3 && somenteDigitos(String(l.code ?? "")).includes(alvoDigitos))
    .slice(0, 30)
    .map((l) => ({
      codigo: JSON.stringify(l.code), // JSON revela espaços e caracteres invisíveis
      identificador: l.identificadorInterno,
      casa: lotMatchesQuery(l, q),
    }));

  return {
    totalCarregado: lots.length,
    consulta: q,
    encontrados: lots.filter((l) => lotMatchesQuery(l, q)).length,
    porTipoDeCasamento: { exato, normalizado, somenteAlfanumerico: alfa },
    codigosParecidos,
  };
}

/** Publica o diagnóstico no console. Chamado pelo LotProvider em dev. */
export function registrarDiagnostico(getLots: () => Lot[]): void {
  if (!import.meta.env.DEV) return;

  (window as unknown as Record<string, unknown>).diagnosticarLotes = (consulta: string) => {
    const r = diagnosticarBusca(getLots(), consulta);
    console.log("=== DIAGNÓSTICO DA BUSCA DE LOTES ===");
    console.log("Lotes carregados do banco:", r.totalCarregado);
    console.log("Consulta:", JSON.stringify(r.consulta));
    console.log("Encontrados pelo filtro:", r.encontrados);
    console.table(r.porTipoDeCasamento);
    console.log("Códigos com os mesmos dígitos:");
    console.table(r.codigosParecidos);
    return r;
  };

  console.info(
    "%c[onPreserv] diagnóstico disponível: diagnosticarLotes(\"27568\")",
    "color:#00ffa3",
  );
}
