import * as XLSX from "xlsx";
import { Lot, getLotPreservationStatus, LotStatus } from "@/types/lot";

const formatDate = (iso?: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const SITUATION_LABEL: Record<LotStatus, string> = {
  preserved: "Semana cumprida",
  upcoming: "Semana aberta",
  overdue: "Semana vencida",
  none: "Sem preservação",
};

export interface ExportRow {
  codigo: string;
  nome: string;
  local: string;
  rua: string;
  prateleira: string;
  responsavel: string;
  observacoes: string;
  status: string;
  ultimaPreservacao: string;
  proximaPreservacao: string;
  situacaoPreservacao: string;
}

export const COLUMN_HEADERS: Array<[keyof ExportRow, string]> = [
  ["codigo", "Código"],
  ["nome", "Nome"],
  ["local", "Local"],
  ["rua", "Rua"],
  ["prateleira", "Prateleira"],
  ["responsavel", "Responsável"],
  ["observacoes", "Observações"],
  ["status", "Status"],
  ["ultimaPreservacao", "Última preservação"],
  ["proximaPreservacao", "Próxima preservação"],
  ["situacaoPreservacao", "Situação"],
];

export function lotsToRows(lots: Lot[]): ExportRow[] {
  return lots.map((lot) => {
    const last = lot.preservations[lot.preservations.length - 1];
    return {
      codigo: lot.code,
      nome: lot.name,
      local: lot.location,
      rua: lot.rua || "",
      prateleira: lot.prateleira || "",
      responsavel: lot.responsible,
      observacoes: lot.observations || "",
      status: lot.status,
      ultimaPreservacao: formatDate(last?.date),
      proximaPreservacao: formatDate(last?.nextDate),
      situacaoPreservacao: SITUATION_LABEL[getLotPreservationStatus(lot)],
    };
  });
}

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const timestamp = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
};

export function exportLotsXlsx(lots: Lot[], baseName = "lotes") {
  const rows = lotsToRows(lots);
  const data = rows.map((r) => Object.fromEntries(COLUMN_HEADERS.map(([k, label]) => [label, r[k]])));
  const ws = XLSX.utils.json_to_sheet(data, { header: COLUMN_HEADERS.map(([, l]) => l) });
  ws["!cols"] = COLUMN_HEADERS.map(([k]) => ({
    wch: Math.max(12, ...rows.map((r) => String(r[k] ?? "").length + 2)),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Lotes");
  XLSX.writeFile(wb, `${baseName}_${timestamp()}.xlsx`);
}

export function exportLotsCsv(lots: Lot[], baseName = "lotes") {
  const rows = lotsToRows(lots);
  const headers = COLUMN_HEADERS.map(([, l]) => l);
  const escape = (v: string) => {
    const s = String(v ?? "");
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(";"),
    ...rows.map((r) => COLUMN_HEADERS.map(([k]) => escape(r[k])).join(";")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${baseName}_${timestamp()}.csv`);
}

export async function exportLotsPdf(lots: Lot[], baseName = "lotes") {
  const { renderPdf, buildTable, buildKpis } = await import("./pdfTemplate");
  const rows = lotsToRows(lots);
  const headers = COLUMN_HEADERS.map(([, l]) => l);
  const body = rows.map((r) => COLUMN_HEADERS.map(([k]) => r[k]));
  const emDia = rows.filter((r) => r.situacaoPreservacao === "Semana cumprida").length;
  const proximos = rows.filter((r) => r.situacaoPreservacao === "Próxima do vencimento").length;
  const vencidos = rows.filter((r) => r.situacaoPreservacao === "Semana vencida").length;
  await renderPdf({
    title: "Relatório de Lotes",
    subtitle: "onPreserv • Inventário de lotes",
    fileName: `${baseName}_${timestamp()}.pdf`,
    orientation: "landscape",
    meta: [`${rows.length} lote(s)`],
    sections: [
      { title: "Resumo", html: buildKpis([
        { label: "Total de lotes", value: rows.length },
        { label: "Semana cumprida", value: emDia },
        { label: "Próximos do vencimento", value: proximos },
        { label: "Vencidos", value: vencidos },
      ]) },
      { title: "Lotes", html: buildTable(headers, body) },
    ],
  });
}
