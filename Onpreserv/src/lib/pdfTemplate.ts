import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "@/assets/schneider-logo.png";

const SCHNEIDER_GREEN: [number, number, number] = [61, 205, 88];
const SCHNEIDER_DARK: [number, number, number] = [15, 23, 42];
const TEXT: [number, number, number] = [31, 41, 55];
const MUTED: [number, number, number] = [100, 116, 139];
const BORDER: [number, number, number] = [203, 213, 225];
const SURFACE: [number, number, number] = [248, 250, 252];
const STRIPE: [number, number, number] = [246, 253, 248];

const PAGE_MARGIN_X = 12;
const PAGE_MARGIN_TOP = 14;
const PAGE_MARGIN_BOTTOM = 12;
const HEADER_HEIGHT = 38;
const FOOTER_HEIGHT = 8;
const CONTENT_TOP = PAGE_MARGIN_TOP + HEADER_HEIGHT;

export type PdfCell = string | number | null | undefined;

export interface PdfTableBlock {
  kind: "table";
  headers: string[];
  rows: PdfCell[][];
}

export interface PdfKpiBlock {
  kind: "kpis";
  items: { label: string; value: string | number }[];
}

export type PdfBlock = PdfTableBlock | PdfKpiBlock;

export interface PdfSection {
  title?: string;
  html: PdfBlock;
}

export interface PdfDocOptions {
  title: string;
  subtitle?: string;
  orientation?: "portrait" | "landscape";
  sections: PdfSection[];
  fileName: string;
  meta?: string[];
}

interface LogoAsset {
  dataUrl: string;
  width: number;
  height: number;
}

let logoPromise: Promise<LogoAsset | null> | null = null;

const asText = (value: PdfCell) => {
  if (value === null || value === undefined || value === "") return "—";
  return String(value).replace(/\s+/g, " ").trim() || "—";
};

const getLogo = (): Promise<LogoAsset | null> => {
  if (!logoPromise) {
    logoPromise = fetch(logoUrl)
      .then(async (response) => {
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result ?? ""));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => reject(new Error("logo load failed"));
          img.src = dataUrl;
        });
        return { dataUrl, width: dims.width, height: dims.height };
      })
      .catch(() => null);
  }

  return logoPromise;
};

const getPageMetrics = (doc: jsPDF) => ({
  width: doc.internal.pageSize.getWidth(),
  height: doc.internal.pageSize.getHeight(),
  contentWidth: doc.internal.pageSize.getWidth() - PAGE_MARGIN_X * 2,
  contentBottom: doc.internal.pageSize.getHeight() - PAGE_MARGIN_BOTTOM - FOOTER_HEIGHT,
});

const drawHeaderFooter = (
  doc: jsPDF,
  opts: Pick<PdfDocOptions, "title" | "subtitle" | "meta">,
  pageNumber: number,
  totalPages: number,
  logo: LogoAsset | null,
) => {
  const { width, height, contentWidth } = getPageMetrics(doc);
  const headerBottom = PAGE_MARGIN_TOP + HEADER_HEIGHT - 4;

  doc.setDrawColor(...SCHNEIDER_GREEN);
  doc.setLineWidth(0.6);
  doc.line(PAGE_MARGIN_X, headerBottom, width - PAGE_MARGIN_X, headerBottom);

  let logoBoxWidth = 0;
  if (logo) {
    const maxH = 34;
    const maxW = 34;
    const ratio = logo.width / logo.height;
    let h = maxH;
    let w = h * ratio;
    if (w > maxW) {
      w = maxW;
      h = w / ratio;
    }
    try {
      doc.addImage(logo.dataUrl, "PNG", PAGE_MARGIN_X, PAGE_MARGIN_TOP, w, h);
      logoBoxWidth = w;
    } catch {
      // ignore logo rendering failures to avoid breaking export
    }
  }

  const titleX = logoBoxWidth > 0 ? PAGE_MARGIN_X + logoBoxWidth + 5 : PAGE_MARGIN_X;
  doc.setTextColor(...SCHNEIDER_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(opts.title, titleX, PAGE_MARGIN_TOP + 15, { baseline: "middle" });

  if (opts.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text(opts.subtitle, titleX, PAGE_MARGIN_TOP + 21, { baseline: "middle" });
  }

  const metaLines = [`Gerado em ${new Date().toLocaleString("pt-BR")}`, ...(opts.meta ?? [])];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  let metaY = PAGE_MARGIN_TOP + 4;
  metaLines.slice(0, 3).forEach((line) => {
    doc.text(asText(line), PAGE_MARGIN_X + contentWidth, metaY, { align: "right" });
    metaY += 4;
  });

  const footerY = height - PAGE_MARGIN_BOTTOM + 1;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(PAGE_MARGIN_X, footerY - 4, width - PAGE_MARGIN_X, footerY - 4);
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("onPreserv • Schneider Electric", PAGE_MARGIN_X, footerY, { baseline: "middle" });
  doc.text(`Página ${pageNumber} de ${totalPages}`, width - PAGE_MARGIN_X, footerY, {
    align: "right",
    baseline: "middle",
  });
};

const ensurePageBreak = (doc: jsPDF, cursorY: number, requiredHeight: number) => {
  const { contentBottom } = getPageMetrics(doc);
  if (cursorY + requiredHeight <= contentBottom) return cursorY;
  doc.addPage();
  return CONTENT_TOP;
};

const drawSectionTitle = (doc: jsPDF, title: string, startY: number) => {
  const { width } = getPageMetrics(doc);
  const y = ensurePageBreak(doc, startY, 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...SCHNEIDER_GREEN);
  doc.text(title.toUpperCase(), PAGE_MARGIN_X, y);

  doc.setDrawColor(...SCHNEIDER_GREEN);
  doc.setLineWidth(0.25);
  doc.line(PAGE_MARGIN_X, y + 1.8, width - PAGE_MARGIN_X, y + 1.8);

  return y + 6;
};

const drawKpis = (doc: jsPDF, items: PdfKpiBlock["items"], startY: number) => {
  const { contentWidth, contentBottom } = getPageMetrics(doc);
  const gap = 4;
  const columns = 4;
  const boxWidth = (contentWidth - gap * (columns - 1)) / columns;
  const boxHeight = 16;
  let y = startY;

  items.forEach((item, index) => {
    if (index > 0 && index % columns === 0) y += boxHeight + gap;
  });

  const totalRows = Math.max(1, Math.ceil(items.length / columns));
  const requiredHeight = totalRows * boxHeight + (totalRows - 1) * gap;
  let cursorY = ensurePageBreak(doc, startY, requiredHeight);

  items.forEach((item, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    const x = PAGE_MARGIN_X + col * (boxWidth + gap);
    const boxY = cursorY + row * (boxHeight + gap);

    if (boxY + boxHeight > contentBottom) {
      doc.addPage();
      cursorY = CONTENT_TOP;
    }

    doc.setDrawColor(...BORDER);
    doc.setFillColor(...SURFACE);
    doc.roundedRect(x, boxY, boxWidth, boxHeight, 1.2, 1.2, "FD");

    doc.setFillColor(...SCHNEIDER_GREEN);
    doc.rect(x, boxY, 1.8, boxHeight, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(...MUTED);
    const labelLines = doc.splitTextToSize(asText(item.label).toUpperCase(), boxWidth - 5);
    doc.text(labelLines.slice(0, 2), x + 4, boxY + 5.2, { baseline: "middle" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...SCHNEIDER_DARK);
    doc.text(asText(item.value), x + 4, boxY + 11.8, { baseline: "middle" });
  });

  return cursorY + requiredHeight + 4;
};

const drawTable = (doc: jsPDF, table: PdfTableBlock, startY: number) => {
  autoTable(doc, {
    startY,
    head: [table.headers.map(asText)],
    body: table.rows.map((row) => row.map(asText)),
    margin: {
      top: CONTENT_TOP,
      right: PAGE_MARGIN_X,
      bottom: PAGE_MARGIN_BOTTOM + FOOTER_HEIGHT,
      left: PAGE_MARGIN_X,
    },
    theme: "grid",
    tableWidth: "auto",
    styles: {
      font: "helvetica",
      fontSize: 8,
      textColor: TEXT,
      lineColor: BORDER,
      lineWidth: 0.15,
      cellPadding: 2.2,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: SCHNEIDER_GREEN,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
      fontSize: 8,
      minCellHeight: 7,
    },
    alternateRowStyles: {
      fillColor: STRIPE,
    },
    bodyStyles: {
      minCellHeight: 6,
    },
    showHead: "everyPage",
    rowPageBreak: "avoid",
    pageBreak: "auto",
  });

  return ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? startY) + 4;
};

export function buildTable(headers: string[], rows: PdfCell[][]): PdfTableBlock {
  return {
    kind: "table",
    headers,
    rows,
  };
}

export function buildKpis(items: { label: string; value: string | number }[]): PdfKpiBlock {
  return {
    kind: "kpis",
    items,
  };
}

export async function renderPdf(opts: PdfDocOptions) {
  const doc = new jsPDF({
    orientation: opts.orientation ?? "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });

  const logo = await getLogo();
  let cursorY = CONTENT_TOP;

  for (const section of opts.sections) {
    if (section.title) cursorY = drawSectionTitle(doc, section.title, cursorY);

    if (section.html.kind === "kpis") {
      cursorY = drawKpis(doc, section.html.items, cursorY);
      continue;
    }

    cursorY = drawTable(doc, section.html, cursorY);
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawHeaderFooter(doc, opts, page, totalPages, logo);
  }

  doc.save(opts.fileName);
}
