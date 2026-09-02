import * as XLSX from "xlsx";
import { ACTIVITY_LOCAL_LABEL, PreservationActivity } from "@/types/activity";

interface ActivityRow {
  codigo: string;
  descricao: string;
  local: string;
  frequencia: string;
}

const HEADERS: Array<[keyof ActivityRow, string]> = [
  ["codigo", "Código"],
  ["descricao", "Descrição"],
  ["local", "Local"],
  ["frequencia", "Frequência"],
];

const timestamp = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
};

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

const toRows = (activities: PreservationActivity[]): ActivityRow[] =>
  [...activities]
    .sort((a, b) => a.codigo.localeCompare(b.codigo))
    .map((activity) => ({
      codigo: activity.codigo,
      descricao: activity.descricao,
      local: ACTIVITY_LOCAL_LABEL[activity.local],
      frequencia: `${activity.frequencia} dias`,
    }));

export function exportActivitiesXlsx(activities: PreservationActivity[], baseName = "atividades") {
  const rows = toRows(activities);
  const data = rows.map((row) => Object.fromEntries(HEADERS.map(([key, label]) => [label, row[key]])));
  const ws = XLSX.utils.json_to_sheet(data, { header: HEADERS.map(([, label]) => label) });
  ws["!cols"] = HEADERS.map(([key]) => ({
    wch: Math.max(14, ...rows.map((row) => String(row[key]).length + 2)),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Atividades");
  XLSX.writeFile(wb, `${baseName}_${timestamp()}.xlsx`);
}

export function exportActivitiesCsv(activities: PreservationActivity[], baseName = "atividades") {
  const rows = toRows(activities);
  const headers = HEADERS.map(([, label]) => label);
  const escape = (value: string) => {
    const s = String(value ?? "");
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(";"),
    ...rows.map((row) => HEADERS.map(([key]) => escape(row[key])).join(";")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${baseName}_${timestamp()}.csv`);
}

export async function exportActivitiesPdf(activities: PreservationActivity[], baseName = "atividades") {
  const { renderPdf, buildKpis, buildTable } = await import("./pdfTemplate");
  const rows = toRows(activities);
  const headers = HEADERS.map(([, label]) => label);
  const body = rows.map((row) => HEADERS.map(([key]) => row[key]));
  const campo = activities.filter((activity) => activity.local === "campo").length;
  const almox = activities.filter((activity) => activity.local === "almoxarifado").length;

  await renderPdf({
    title: "Relatório de Atividades",
    subtitle: "onPreserv • Catálogo de preservação",
    fileName: `${baseName}_${timestamp()}.pdf`,
    orientation: "portrait",
    meta: [`${rows.length} atividade(s)`],
    sections: [
      {
        title: "Resumo",
        html: buildKpis([
          { label: "Total de atividades", value: rows.length },
          { label: "Campo", value: campo },
          { label: "Almoxarifado", value: almox },
        ]),
      },
      {
        title: "Atividades",
        html: buildTable(headers, body),
      },
    ],
  });
}
