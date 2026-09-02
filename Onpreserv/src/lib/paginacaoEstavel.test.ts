import { describe, it, expect } from "vitest";

/**
 * Por que a listagem de lotes perdia linhas.
 *
 * `fetchAllRows` lê a tabela em páginas com `range()`, que vira `OFFSET/LIMIT`.
 * O Postgres não garante ordem estável entre consultas quando há empate na
 * chave de ordenação — cada página é reordenada no servidor. Com empates
 * cruzando a fronteira de uma página, uma linha aparece duas vezes e outra
 * some.
 *
 * Lotes importados por planilha entram no mesmo `INSERT` e compartilham o
 * `created_at` até o microssegundo, então o empate é a regra, não a exceção.
 *
 * Este teste simula um servidor com esse comportamento para mostrar a falha e
 * comprovar que o desempate por chave única a elimina.
 */

interface Row {
  id: string;
  created_at: string;
  codigo: string;
}

/** Linhas com o mesmo `created_at` — o cenário de uma importação em lote. */
const TABELA: Row[] = [
  { id: "a", created_at: "2026-08-24T10:00:00Z", codigo: "NF-882" },
  { id: "b", created_at: "2026-08-24T10:00:00Z", codigo: "NF-882" },
  { id: "c", created_at: "2026-08-24T10:00:00Z", codigo: "NF-882" },
  { id: "d", created_at: "2026-08-24T10:00:00Z", codigo: "NF-999" },
];

const PAGE_SIZE = 2;

/**
 * Servidor que ordena só por `created_at` e embaralha os empates a cada
 * consulta — comportamento legítimo do Postgres sem `ORDER BY` determinístico.
 */
function consultaInstavel(from: number, to: number, embaralhar: (r: Row[]) => Row[]): Row[] {
  const ordenado = embaralhar([...TABELA]);
  return ordenado.slice(from, to + 1);
}

/** Servidor com desempate por chave única: ordem total, sempre igual. */
function consultaEstavel(from: number, to: number): Row[] {
  const ordenado = [...TABELA].sort(
    (x, y) => x.created_at.localeCompare(y.created_at) || x.id.localeCompare(y.id),
  );
  return ordenado.slice(from, to + 1);
}

function paginar(buscar: (from: number, to: number) => Row[]): Row[] {
  const linhas: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const pagina = buscar(from, from + PAGE_SIZE - 1);
    linhas.push(...pagina);
    if (pagina.length < PAGE_SIZE) break;
  }
  return linhas;
}

describe("paginação com chave de ordenação não única", () => {
  it("PERDE linhas quando o servidor reordena os empates entre páginas", () => {
    // Página 1 devolve [a, b]; antes da página 2 o servidor reordena e passa a
    // considerar [c, d, a, b], então a página 2 devolve [a, b] de novo — e c,
    // que existia, nunca é lido.
    let chamada = 0;
    const embaralhar = (r: Row[]) => (chamada++ === 0 ? r : [r[2], r[3], r[0], r[1]]);

    const lidas = paginar((from, to) => consultaInstavel(from, to, embaralhar));
    const ids = lidas.map((r) => r.id);

    expect(ids).not.toContain("c");
    // E "a" veio duplicado, o outro lado da mesma moeda.
    expect(ids.filter((i) => i === "a")).toHaveLength(2);
  });

  it("com desempate por chave única, lê a tabela inteira, uma vez cada", () => {
    const ids = paginar(consultaEstavel).map((r) => r.id);
    expect(ids).toEqual(["a", "b", "c", "d"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("é o que faz a busca por um código repetido devolver todas as ocorrências", () => {
    const encontrados = paginar(consultaEstavel).filter((r) => r.codigo === "NF-882");
    expect(encontrados).toHaveLength(3);
  });
});

describe("descarte de duplicatas no cliente", () => {
  /** A guarda por `id` que `fetchAllRows` passou a aplicar. */
  function paginarComGuarda(buscar: (from: number, to: number) => Row[]): Row[] {
    const linhas: Row[] = [];
    const vistos = new Set<string>();
    for (let from = 0; ; from += PAGE_SIZE) {
      const pagina = buscar(from, from + PAGE_SIZE - 1);
      for (const row of pagina) {
        if (vistos.has(row.id)) continue;
        vistos.add(row.id);
        linhas.push(row);
      }
      if (pagina.length < PAGE_SIZE) break;
    }
    return linhas;
  }

  it("evita a linha repetida mesmo se uma consulta esquecer o desempate", () => {
    let chamada = 0;
    const embaralhar = (r: Row[]) => (chamada++ === 0 ? r : [r[2], r[3], r[0], r[1]]);
    const ids = paginarComGuarda((from, to) => consultaInstavel(from, to, embaralhar)).map((r) => r.id);

    expect(new Set(ids).size).toBe(ids.length);
    // A guarda não recupera a linha perdida — só o desempate no servidor faz
    // isso. Ela existe para o erro não virar linha duplicada na tela.
    expect(ids).not.toContain("c");
  });
});
