/**
 * Executa um arquivo SQL no Postgres.
 *
 * Existe porque esta máquina não tem `psql` nem Docker — e instalar o cliente
 * do Postgres só para rodar um arquivo é atrito desnecessário quando o Node já
 * está aqui.
 *
 * Uso:
 *   node db/run.mjs db/001_schema.sql     aplica o arquivo
 *   node db/run.mjs --check               só testa a conexão e lista as tabelas
 *   node db/run.mjs --reset db/001.sql    APAGA tudo e reaplica
 *
 * A URL do banco vem de DATABASE_URL, do ambiente ou do server/.env.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raizServer = path.resolve(aqui, "..");

// ---------------------------------------------------------------- ambiente
function carregarEnv() {
  const arquivo = path.join(raizServer, ".env");
  if (!fs.existsSync(arquivo)) return;
  for (const linha of fs.readFileSync(arquivo, "utf8").split("\n")) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith("#")) continue;
    const igual = limpa.indexOf("=");
    if (igual === -1) continue;
    const chave = limpa.slice(0, igual).trim();
    // Remove aspas em volta do valor, se houver.
    const valor = limpa.slice(igual + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[chave]) process.env[chave] = valor;
  }
}
carregarEnv();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(`
Falta a variável DATABASE_URL.

Crie o arquivo  server/.env  com a linha:

  DATABASE_URL=postgresql://usuario:senha@host/banco?sslmode=require

No Neon: painel do projeto → Connection string → copie a URL "pooled".
`);
  process.exit(1);
}

const args = process.argv.slice(2);
const soChecar = args.includes("--check");
const resetar = args.includes("--reset");
const arquivoSql = args.find((a) => !a.startsWith("--"));

// O Neon e a maioria dos gerenciados exigem TLS. `rejectUnauthorized: false`
// aceita a cadeia deles sem precisar do certificado raiz instalado.
const client = new pg.Client({
  connectionString: url,
  ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
});

const servidor = (() => {
  try {
    return new URL(url).host;
  } catch {
    return "(url ilegível)";
  }
})();

async function listarTabelas() {
  const { rows } = await client.query(`
    SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name
  `);
  return rows.map((r) => r.table_name);
}

try {
  console.log(`Conectando em ${servidor}…`);
  await client.connect();

  const { rows: [versao] } = await client.query("SELECT version()");
  console.log("OK:", versao.version.split(",")[0]);

  if (soChecar) {
    const tabelas = await listarTabelas();
    console.log(`\n${tabelas.length} tabela(s) no schema public:`);
    for (const t of tabelas) console.log("  " + t);
    if (tabelas.length === 0) console.log("  (banco vazio)");
    process.exit(0);
  }

  if (!arquivoSql) {
    console.error("Informe o arquivo SQL. Ex.: node db/run.mjs db/001_schema.sql");
    process.exit(1);
  }

  const caminho = path.resolve(raizServer, arquivoSql);
  if (!fs.existsSync(caminho)) {
    console.error("Arquivo não encontrado:", caminho);
    process.exit(1);
  }

  if (resetar) {
    // Apaga o schema inteiro. Só faz sentido num banco de desenvolvimento —
    // por isso exige a confirmação explícita abaixo.
    if (process.env.CONFIRMO_APAGAR_TUDO !== "sim") {
      console.error(`
--reset APAGA TODAS as tabelas do schema public, sem volta.

Se é isso mesmo, rode com a confirmação:

  CONFIRMO_APAGAR_TUDO=sim npm run db:reset
`);
      process.exit(1);
    }
    console.log("Apagando o schema public…");
    await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  }

  const existentes = await listarTabelas();
  if (existentes.length > 0 && !resetar) {
    console.log(`\nO banco já tem ${existentes.length} tabela(s).`);
    console.log("Aplicar o schema de novo vai falhar em 'already exists'.");
    console.log("Use --reset para recriar do zero, ou aponte para um banco vazio.\n");
  }

  const sql = fs.readFileSync(caminho, "utf8");
  console.log(`Aplicando ${path.basename(caminho)} (${(sql.length / 1024).toFixed(1)} kB)…`);

  // O arquivo já traz BEGIN/COMMIT: uma falha no meio desfaz tudo, e o banco
  // não fica pela metade.
  await client.query(sql);

  const tabelas = await listarTabelas();
  console.log(`\nPronto. ${tabelas.length} tabelas criadas:\n`);
  for (const t of tabelas) console.log("  " + t);
} catch (erro) {
  console.error("\nFALHOU:", erro.message);
  if (erro.position) {
    const sql = fs.readFileSync(path.resolve(raizServer, arquivoSql), "utf8");
    const pos = Number(erro.position);
    const linha = sql.slice(0, pos).split("\n").length;
    console.error(`  linha ~${linha} do arquivo`);
    console.error("  " + sql.slice(Math.max(0, pos - 100), pos + 60).replace(/\n/g, " "));
  }
  if (erro.detail) console.error("  detalhe:", erro.detail);
  if (erro.hint) console.error("  dica:", erro.hint);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
