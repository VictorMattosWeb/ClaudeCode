import type { ItemCalculado } from "@/types/cronograma";

/**
 * Itens que ainda devem receber baixa em lote.
 * Regra:
 *  - exclui itens já com status PRESERVADO (case-insensitive) ou com dataRealizada preenchida;
 *  - exclui itens classificados como "nao_aplicavel" (N/A);
 *  - inclui pendentes, vencidos e "vence em breve" — vencidos NÃO podem ser bloqueados.
 *
 * Função pura para permitir testes de regressão garantindo que itens vencidos
 * sempre fiquem disponíveis para baixa.
 */
export function selecionarParaBaixa(itens: ItemCalculado[]): ItemCalculado[] {
  return itens.filter((i) => {
    const st = (i.status || "").toUpperCase();
    if (st === "PRESERVADO") return false;
    if (i.dataRealizada) return false;
    if (i.situacao === "nao_aplicavel") return false;
    return true;
  });
}
