import { useCallback, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCronograma, NewItem } from "@/context/CronogramaContext";
import { CronogramaItem } from "@/types/cronograma";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { notifyError } from "@/lib/errorMessages";

const HEADERS = ["semana", "preservacao", "tag", "unidade", "gabinete", "tipo", "dataPrevista", "dataRealizada", "status", "observacoes"];

const VALID_STATUS = new Set(["PRESERVADO", "PENDENTE", "N/A"]);

const normalizeStatus = (raw: string): string => {
  const s = (raw ?? "").trim().toUpperCase();
  if (!s) return "PENDENTE";
  if (s === "PRESERVADO" || s === "PRESERVADA" || s === "OK" || s === "CONCLUIDO" || s === "CONCLUÍDO") return "PRESERVADO";
  if (s === "PENDENTE") return "PENDENTE";
  if (s === "N/A" || s === "NA" || s === "N.A.") return "N/A";
  return s;
};

interface Row {
  rowNum: number;
  semana: string; preservacao: string; tag: string; unidade: string; gabinete: string; tipo: string;
  dataPrevista: string | null; dataRealizada: string | null;
  status: string; observacoes: string;
  valid: boolean; errors: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  medicaoId: string;
}

const parseDate = (v: any): string | null => {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim();
  if (!s || s.toUpperCase() === "N/A" || s.toUpperCase() === "NA") return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // dd/mm/yyyy
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    let y = m[3];
    if (y.length === 2) y = "20" + y;
    return `${y}-${mo}-${d}`;
  }
  // Excel serial
  if (typeof v === "number" || /^\d+(\.\d+)?$/.test(s)) {
    const n = typeof v === "number" ? v : Number(s);
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + n * 86400000);
    return d.toISOString().slice(0, 10);
  }
  return null;
};

export function CronogramaImportDialog({ open, onOpenChange, medicaoId }: Props) {
  const { addItemsBulk, updateItem, itens } = useCronograma();
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState({ imported: 0, updated: 0, failed: 0 });
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setStep("upload"); setRows([]); setLoading(false); setResult({ imported: 0, updated: 0, failed: 0 }); };
  const handleClose = (o: boolean) => { if (!o) reset(); onOpenChange(o); };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      HEADERS,
      ["S1", "Inspeção visual", "TAG-001", "U-22", "G-01", "SDCD", "2025-01-15", "", "PENDENTE", ""],
      ["S1", "Lubrificação", "TAG-002", "U-22", "G-02", "Triconex", "2025-01-15", "2025-01-14", "PRESERVADO", ""],
      ["S2", "Inspeção", "TAG-003", "U-32", "G-05", "Switch", "N/A", "N/A", "N/A", "Não aplicável"],
    ]);
    ws["!cols"] = HEADERS.map(() => ({ wch: 16 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cronograma");
    XLSX.writeFile(wb, "modelo_importacao_cronograma.xlsx");
  };

  const validate = (raw: Record<string, any>[]): Row[] => {
    return raw.map((r, i) => {
      const get = (k: string) => {
        const found = Object.keys(r).find((x) => x.toLowerCase().trim() === k.toLowerCase());
        return found ? String(r[found] ?? "").trim() : "";
      };
      const getRaw = (k: string) => {
        const found = Object.keys(r).find((x) => x.toLowerCase().trim() === k.toLowerCase());
        return found ? r[found] : "";
      };
      const errors: string[] = [];
      const tag = get("tag");
      const unidade = get("unidade");
      const gabinete = get("gabinete");
      let status = normalizeStatus(get("status"));
      if (!tag) errors.push("TAG obrigatória");
      if (!unidade) errors.push("Unidade obrigatória");
      if (!gabinete) errors.push("Gabinete obrigatório");
      if (status && !VALID_STATUS.has(status)) {
        errors.push(`Status inválido (use PRESERVADO/PENDENTE/N/A)`);
      }
      return {
        rowNum: i + 2,
        semana: get("semana"),
        preservacao: get("preservacao"),
        tag, unidade, gabinete,
        tipo: get("tipo"),
        dataPrevista: parseDate(getRaw("dataPrevista") || getRaw("data prevista")),
        dataRealizada: parseDate(getRaw("dataRealizada") || getRaw("data realizada")),
        status,
        observacoes: get("observacoes"),
        valid: errors.length === 0,
        errors,
      };
    });
  };

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
      const validated = validate(json);
      setRows(validated);
      setStep("preview");
    } catch (e: any) {
      notifyError(e, "Não foi possível ler o arquivo selecionado.");
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const confirmImport = async () => {
    const validRows = rows.filter((r) => r.valid);
    if (!validRows.length) { toast.error("Nenhuma linha válida encontrada", { description: "Revise a planilha e tente importar novamente." }); return; }
    setLoading(true);

    const keyOf = (tag: string, tipo: string, dataPrevista: string | null) =>
      `${(tag ?? "").trim().toLowerCase()}|${(tipo ?? "").trim().toLowerCase()}|${dataPrevista ?? ""}`;

    const existing = new Map<string, CronogramaItem>();
    itens.filter((i) => i.medicaoId === medicaoId).forEach((i) => {
      existing.set(keyOf(i.tag, i.tipo, i.dataPrevista), i);
    });

    const toCreate: NewItem[] = [];
    const toUpdate: { id: string; data: Partial<CronogramaItem> }[] = [];

    for (const r of validRows) {
      const found = existing.get(keyOf(r.tag, r.tipo, r.dataPrevista));
      if (found) {
        // Merge: only overwrite fields when planilha trouxe valor (status sempre, default PENDENTE)
        const data: Partial<CronogramaItem> = { status: r.status };
        if (r.semana) data.semana = r.semana;
        if (r.preservacao) data.preservacao = r.preservacao;
        if (r.unidade) data.unidade = r.unidade;
        if (r.gabinete) data.gabinete = r.gabinete;
        if (r.tipo) data.tipo = r.tipo;
        if (r.dataPrevista) data.dataPrevista = r.dataPrevista;
        if (r.dataRealizada) data.dataRealizada = r.dataRealizada;
        if (r.observacoes) data.observacoes = r.observacoes;
        toUpdate.push({ id: found.id, data });
      } else {
        toCreate.push({
          medicaoId,
          semana: r.semana, preservacao: r.preservacao,
          tag: r.tag, unidade: r.unidade, gabinete: r.gabinete, tipo: r.tipo,
          dataPrevista: r.dataPrevista, dataRealizada: r.dataRealizada,
          status: r.status, observacoes: r.observacoes,
        });
      }
    }

    let imported = 0;
    if (toCreate.length) imported = await addItemsBulk(toCreate);

    let updated = 0;
    for (const u of toUpdate) {
      try { await updateItem(u.id, u.data); updated++; } catch { /* noop */ }
    }

    setResult({ imported, updated, failed: validRows.length - imported - updated });
    setStep("done");
    setLoading(false);
  };

  const validCount = rows.filter((r) => r.valid).length;
  const errorCount = rows.length - validCount;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar cronograma</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <Card
              className={`border-2 border-dashed transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border"}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <CardContent className="p-8 flex flex-col items-center text-center gap-3">
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="font-medium">Arraste o arquivo aqui ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground mt-1">Formatos aceitos: .xlsx, .csv</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <Button onClick={() => fileRef.current?.click()} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Selecionar arquivo
                </Button>
              </CardContent>
            </Card>
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                Colunas: {HEADERS.join(", ")}. Obrigatórias: tag, unidade, gabinete.
              </p>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4" /> Baixar modelo
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                <CheckCircle2 className="h-3 w-3" /> {validCount} válidas
              </Badge>
              {errorCount > 0 && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                  <XCircle className="h-3 w-3" /> {errorCount} com erro
                </Badge>
              )}
            </div>
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Linha</TableHead>
                    <TableHead>TAG</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Gabinete</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erros</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.rowNum} className={!r.valid ? "bg-destructive/5" : ""}>
                      <TableCell className="text-xs">{r.rowNum}</TableCell>
                      <TableCell className="font-mono text-xs">{r.tag}</TableCell>
                      <TableCell className="text-xs">{r.unidade}</TableCell>
                      <TableCell className="text-xs">{r.gabinete}</TableCell>
                      <TableCell className="text-xs">{r.status}</TableCell>
                      <TableCell className="text-xs text-destructive">{r.errors.join(", ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>Voltar</Button>
              <Button onClick={confirmImport} disabled={loading || validCount === 0}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Importar {validCount} linha(s)
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="text-center space-y-4 py-8">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
            <div>
              <p className="text-lg font-semibold">Importação concluída</p>
              <p className="text-sm text-muted-foreground">
                {result.imported} criadas, {result.updated} atualizadas, {result.failed} ignoradas
              </p>
            </div>
            <Button onClick={() => handleClose(false)}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
