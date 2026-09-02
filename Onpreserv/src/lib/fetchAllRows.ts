/** Tamanho da página. O PostgREST corta em 1000 por padrão. */
export const DB_PAGE_SIZE = 1000;

/**
 * Lê uma tabela inteira, em páginas.
 *
 * -----------------------------------------------------------------------------
 * A consulta PRECISA terminar com um `.order()` por coluna ÚNICA.
 * -----------------------------------------------------------------------------
 *
 * Dois motivos para esta função existir:
 *
 * 1. **Truncamento silencioso.** Um `select()` sem paginação devolve no máximo
 *    1000 linhas e não avisa que parou ali. Uma tabela com 1200 itens passa a
 *    alimentar a tela com 1000, e os indicadores contam um subconjunto sem que
 *    nada na interface indique o corte.
 *
 * 2. **Ordem instável entre páginas.** `range()` vira `OFFSET/LIMIT`, e o
 *    Postgres não garante ordem estável quando há empate na chave de
 *    ordenação: cada página é reordenada no servidor. Com empates cruzando a
 *    fronteira de uma página, uma linha aparece duas vezes e outra em nenhuma.
 *    Registros criados em lote — importação de planilha, baixa em massa —
 *    compartilham o `created_at` até o microssegundo, então o empate é a regra.
 *    O desempate por chave primária torna a ordem total e determinística.
 *
 * A guarda por `id` é o cinto de segurança: se uma consulta esquecer o
 * desempate, a falha vira linha faltando (visível) em vez de linha duplicada
 * (que corrompe contagens em silêncio).
 */
export async function fetchAllRows<T>(
  // O tipo do builder do supabase-js é encadeado e não se deixa nomear sem
  // arrastar meia biblioteca de tipos; a fábrica isola isso num ponto só.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryFactory: () => any,
): Promise<T[]> {
  const rows: T[] = [];
  const vistos = new Set<string>();

  for (let from = 0; ; from += DB_PAGE_SIZE) {
    const { data, error } = await queryFactory().range(from, from + DB_PAGE_SIZE - 1);
    if (error) throw error;

    const page = (data ?? []) as T[];

    for (const row of page) {
      const id = (row as { id?: string }).id;
      if (id !== undefined) {
        if (vistos.has(id)) continue;
        vistos.add(id);
      }
      rows.push(row);
    }

    if (page.length < DB_PAGE_SIZE) break;
  }

  return rows;
}
