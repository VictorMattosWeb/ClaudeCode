import * as XLSX from "xlsx";
import { Lot } from "@/types/lot";

const formatDate = (iso?: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
};

const HEADERS: Array<[string, string]> = [
  ["data", "Realização"],
  ["nextDate", "Próxima"],
  ["responsible", "Responsável"],
  ["observation", "Observação"],
];

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

const buildRows = (lot: Lot) =>
  [...lot.preservations]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((p) => ({
      "Realização": formatDate(p.date),
      "Próxima": formatDate(p.nextDate),
      "Responsável": p.responsible || "",
      "Observação": p.observation || "",
    }));

type PreservationExportRow = ReturnType<typeof buildRows>[number];

const baseFile = (lot: Lot) =>
  `historico_preservacoes_${lot.code}_${timestamp()}`.replace(/[^\w.-]+/g, "_");

export function exportPreservationsXlsx(lot: Lot) {
  const rows = buildRows(lot);
  const ws = XLSX.utils.json_to_sheet(rows, { header: HEADERS.map(([, l]) => l) });
  ws["!cols"] = HEADERS.map(([, l]) => ({
    wch: Math.max(14, ...rows.map((r) => String(r[l as keyof PreservationExportRow] ?? "").length + 2)),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Preservações");
  XLSX.writeFile(wb, `${baseFile(lot)}.xlsx`);
}

export function exportPreservationsCsv(lot: Lot) {
  const rows = buildRows(lot);
  const headers = HEADERS.map(([, l]) => l);
  const escape = (v: string) => {
    const s = String(v ?? "");
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(";"),
    ...rows.map((r) => headers.map((h) => escape(String(r[h as keyof PreservationExportRow] ?? ""))).join(";")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${baseFile(lot)}.csv`);
}

export async function exportPreservationsPdf(lot: Lot) {
  const { renderPdf, buildTable } = await import("./pdfTemplate");
  const rows = buildRows(lot);
  const headers = HEADERS.map(([, l]) => l);
  const body = rows.map((r) => headers.map((h) => r[h as keyof PreservationExportRow]));
  await renderPdf({
    title: `Histórico de Preservações`,
    subtitle: `${lot.code} — ${lot.name}`,
    fileName: `${baseFile(lot)}.pdf`,
    orientation: "landscape",
    meta: [`${rows.length} registro(s)`],
    sections: [{ title: "Preservações", html: buildTable(headers, body) }],
  });
}
