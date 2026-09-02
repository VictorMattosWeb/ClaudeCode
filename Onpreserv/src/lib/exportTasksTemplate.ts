import * as XLSX from "xlsx";

export const TASK_TEMPLATE_HEADERS = [
  "titulo",
  "descricao",
  "status",
  "prioridade",
  "modulo_relacionado",
  "prazo",
  "responsavel_email",
  "quadro",
  "doc_de_referencia",
  "observacoes",
];

export function downloadTaskImportTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    TASK_TEMPLATE_HEADERS,
    [
      "Inspecionar gabinete G-12",
      "Verificar lacres e umidade",
      "a_fazer",
      "alta",
      "preservacao",
      "01/06/2026",
      "operador@empresa.com",
      "Preservação Junho",
      "Lote NOV-1234",
      "Levar checklist",
    ],
    [
      "Atualizar planilha de medição",
      "",
      "em_andamento",
      "media",
      "cronograma",
      "25/05/2026",
      "",
      "Cronograma Semana 21",
      "Cronograma S21 - Linha 14",
      "",
    ],
    [
      "Conferir nota fiscal NF-882",
      "",
      "a_fazer",
      "baixa",
      "lote",
      "",
      "",
      "",
      "NF 882 / Fornecedor X",
      "",
    ],
  ]);
  ws["!cols"] = TASK_TEMPLATE_HEADERS.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tarefas");
  XLSX.writeFile(wb, "modelo_importacao_tarefas.xlsx");
}

const VALID_STATUS = new Set(["a_fazer", "em_andamento", "em_revisao", "concluido", "bloqueado"]);
const VALID_PRIORIDADE = new Set(["baixa", "media", "alta", "critica"]);
const VALID_MODULO = new Set(["lote", "cronograma", "preservacao", "atividade", "solicitacao", "geral"]);

export interface ParsedTaskRow {
  rowNum: number;
  titulo: string;
  descricao: string;
  status: string;
  prioridade: string;
  modulo_relacionado: string;
  prazo: string;
  responsavel_email: string;
  quadro: string;
  doc_de_referencia: string;
  observacoes: string;
  errors: string[];
  warnings: string[];
  valid: boolean;
}

/** Aceita dd/mm/aaaa, dd-mm-aaaa, aaaa-mm-dd, Date e número de série Excel. Retorna "YYYY-MM-DD", "" se vazio, ou null se inválido. */
function parsePrazo(raw: any): string | null {
  if (raw === null || raw === undefined || raw === "") return "";
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const ms = Math.round((raw - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw.toISOString().slice(0, 10);
  }
  const s = String(raw).trim();
  if (!s) return "";
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/.exec(s);
  if (m) {
    const dia = m[1].padStart(2, "0");
    const mes = m[2].padStart(2, "0");
    let ano = m[3];
    if (ano.length === 2) ano = (Number(ano) > 50 ? "19" : "20") + ano;
    const d = Number(dia), mo = Number(mes);
    if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
    return `${ano}-${mes}-${dia}`;
  }
  return null;
}

export function validateTaskRow(raw: Record<string, any>, idx: number): ParsedTaskRow {
  const get = (k: string) => String(raw[k] ?? "").trim();
  const titulo = get("titulo");
  let status = get("status").toLowerCase() || "a_fazer";
  let prioridade = get("prioridade").toLowerCase() || "media";
  const moduloRaw = get("modulo_relacionado").toLowerCase();
  let modulo = moduloRaw || "geral";
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!titulo) errors.push("Título é obrigatório");
  if (!VALID_STATUS.has(status)) {
    warnings.push(`Status "${status}" não reconhecido — usando "a_fazer"`);
    status = "a_fazer";
  }
  if (!VALID_PRIORIDADE.has(prioridade)) {
    warnings.push(`Prioridade "${prioridade}" não reconhecida — usando "media"`);
    prioridade = "media";
  }
  if (!VALID_MODULO.has(modulo)) {
    warnings.push(`Módulo "${moduloRaw}" não existe — usando "geral"`);
    modulo = "geral";
  }

  const prazoParsed = parsePrazo(raw["prazo"]);
  let prazo = "";
  if (prazoParsed === null) {
    errors.push(`Data inválida no campo "prazo" — use dd/mm/aaaa (ex.: 25/05/2026)`);
  } else {
    prazo = prazoParsed;
  }

  return {
    rowNum: idx + 2,
    titulo,
    descricao: get("descricao"),
    status,
    prioridade,
    modulo_relacionado: modulo,
    prazo,
    responsavel_email: get("responsavel_email").toLowerCase(),
    quadro: get("quadro"),
    doc_de_referencia: get("doc_de_referencia"),
    observacoes: get("observacoes"),
    errors,
    warnings,
    valid: errors.length === 0,
  };
}
