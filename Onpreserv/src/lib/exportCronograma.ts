import * as XLSX from "xlsx";
import { ItemCalculado, MedicaoCronograma, SITUACAO_LABEL } from "@/types/cronograma";
import { computeCronogramaStats as calcularStats } from "@/lib/stats";

const fmtDate = (d: string | null) => (d ? d.split("T")[0] : "");
const fmtDateBR = (d: string | null) => {
  if (!d) return "—";
  const [y, m, day] = d.split("T")[0].split("-");
  return `${day}/${m}/${y}`;
};

export function exportItensXlsx(itens: ItemCalculado[], medicao: MedicaoCronograma | null, fileName?: string) {
  const rows = itens.map((i) => ({
    Medição: medicao?.nome ?? "",
    Semana: i.semana,
    Preservação: i.preservacao,
    TAG: i.tag,
    Unidade: i.unidade,
    Gabinete: i.gabinete,
    Tipo: i.tipo,
    "Data Prevista": fmtDate(i.dataPrevista),
    "Data Realizada": fmtDate(i.dataRealizada),
    Status: i.status,
    Situação: SITUACAO_LABEL[i.situacao],
    "Desvio (dias)": i.desvioDias ?? "",
    "Motivo da divergência": i.motivoDivergencia,
    Observações: i.observacoes,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = Object.keys(rows[0] ?? { a: "" }).map(() => ({ wch: 16 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cronograma");

  if (medicao) {
    const stats = calcularStats(itens);
    const statsWs = XLSX.utils.aoa_to_sheet([
      ["Indicador", "Valor"],
      ["Total de itens", stats.total],
      ["Total preservado", stats.preservados],
      ["Pendentes", stats.pendentes],
      ["Vencidos", stats.vencidos],
      ["Não aplicáveis", stats.naoAplicavel],
      ["No prazo", stats.noPrazo],
      ["Divergências", stats.divergencias],
      ["% Execução", stats.percentExecucao.toFixed(1) + "%"],
      ["% No prazo", stats.percentNoPrazo.toFixed(1) + "%"],
      ["% Com divergência", stats.percentDivergencia.toFixed(1) + "%"],
      ["Média divergência (dias)", stats.mediaDivergenciaDias.toFixed(1)],
      [],
      ["Prazo geral do cronograma", ""],
      ["Data inicial prevista", fmtDateBR(stats.dataInicialPrevista)],
      ["Data final prevista", fmtDateBR(stats.dataFinalPrevista)],
      ["Data inicial realizada", fmtDateBR(stats.dataInicialRealizada)],
      ["Data final realizada", fmtDateBR(stats.dataFinalRealizada)],
      [
        "Cumprido no prazo geral",
        stats.cumpridoNoPrazoGeral === null
          ? "Em andamento"
          : stats.cumpridoNoPrazoGeral
          ? "SIM"
          : "NÃO",
      ],
      ["Desvio prazo geral (dias)", stats.desvioPrazoGeralDias ?? "—"],
    ]);
    statsWs["!cols"] = [{ wch: 28 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, statsWs, "Indicadores");
  }

  XLSX.writeFile(wb, fileName ?? `cronograma_${medicao?.nome ?? "geral"}.xlsx`);
}

export function exportItensCsv(itens: ItemCalculado[], medicao: MedicaoCronograma | null) {
  const rows = itens.map((i) => ({
    Medição: medicao?.nome ?? "",
    Semana: i.semana,
    Preservação: i.preservacao,
    TAG: i.tag,
    Unidade: i.unidade,
    Gabinete: i.gabinete,
    Tipo: i.tipo,
    "Data Prevista": fmtDate(i.dataPrevista),
    "Data Realizada": fmtDate(i.dataRealizada),
    Status: i.status,
    Situação: SITUACAO_LABEL[i.situacao],
    "Desvio (dias)": i.desvioDias ?? "",
    "Motivo da divergência": i.motivoDivergencia,
    Observações: i.observacoes,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cronograma_${medicao?.nome ?? "geral"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportItensPdf(itens: ItemCalculado[], medicao: MedicaoCronograma | null) {
  const { renderPdf, buildTable, buildKpis } = await import("./pdfTemplate");
  const stats = calcularStats(itens);
  const titulo = `Cronograma de Preservação`;
  const subtitle = medicao?.nome ? `Medição: ${medicao.nome}` : "Visão geral";

  const prazoStatus =
    stats.cumpridoNoPrazoGeral === null
      ? "Em andamento"
      : stats.cumpridoNoPrazoGeral
      ? `Cumprido no prazo${stats.desvioPrazoGeralDias === 0 ? "" : ` (${Math.abs(stats.desvioPrazoGeralDias!)}d antes)`}`
      : `Divergência ${stats.desvioPrazoGeralDias}d`;

  const prazoTable = buildTable(
    ["Prazo geral", "Valor"],
    [
      ["Data inicial prevista", fmtDateBR(stats.dataInicialPrevista)],
      ["Data final prevista", fmtDateBR(stats.dataFinalPrevista)],
      ["Data inicial realizada", fmtDateBR(stats.dataInicialRealizada)],
      ["Data final realizada", fmtDateBR(stats.dataFinalRealizada)],
      ["Status", prazoStatus],
    ]
  );

  const itensTable = buildTable(
    ["Semana", "Preservação", "TAG", "Unidade", "Gabinete", "Tipo", "Prevista", "Realizada", "Status", "Situação", "Desvio (d)", "Motivo divergência", "Observações"],
    itens.map((i) => [
      i.semana, i.preservacao, i.tag, i.unidade, i.gabinete, i.tipo,
      fmtDateBR(i.dataPrevista), fmtDateBR(i.dataRealizada),
      i.status, SITUACAO_LABEL[i.situacao],
      i.desvioDias ?? "—",
      i.motivoDivergencia ?? "",
      i.observacoes ?? "",
    ])
  );

  await renderPdf({
    title: titulo,
    subtitle,
    fileName: `cronograma_${medicao?.nome ?? "geral"}.pdf`,
    orientation: "landscape",
    meta: [`${itens.length} item(ns)`],
    sections: [
      { title: "Indicadores", html: buildKpis([
        { label: "Total de itens", value: stats.total },
        { label: "Preservados", value: stats.preservados },
        { label: "Pendentes", value: stats.pendentes },
        { label: "Vencidos", value: stats.vencidos },
        { label: "% Execução", value: `${stats.percentExecucao.toFixed(1)}%` },
        { label: "% No prazo", value: `${stats.percentNoPrazo.toFixed(1)}%` },
        { label: "% Com divergência", value: `${stats.percentDivergencia.toFixed(1)}%` },
        { label: "Média divergência (d)", value: stats.mediaDivergenciaDias.toFixed(1) },
      ]) },
      { title: "Prazo geral", html: prazoTable },
      { title: "Itens", html: itensTable },
    ],
  });
}
