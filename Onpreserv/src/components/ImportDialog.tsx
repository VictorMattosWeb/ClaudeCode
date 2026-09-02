import { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLots } from "@/context/LotContext";
import { LotTipo, LOT_TIPO_LABEL } from "@/types/lot";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImportRow {
  rowNum: number;
  tipoLote: LotTipo;
  codigo: string;
  nome: string;
  local: string;
  rua: string;
  prateleira: string;
  responsavel: string;
  observacoes: string;
  status: string;
  valid: boolean;
  errors: string[];
}

const EXPECTED_HEADERS = ["tipoLote", "codigo", "nome", "local", "rua", "prateleira", "responsavel", "observacoes", "status"];
const ALPHANUM_HYPHEN = /^[A-Za-z0-9-]*$/;

const TIPO_ALIASES: Record<string, LotTipo> = {
  novo: "novo", nov: "novo", new: "novo",
  retirado_campo: "retirado_campo", "retirado de campo": "retirado_campo", rtc: "retirado_campo", campo: "retirado_campo",
};

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const { addLot } = useLots();
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; failed: number }>({ created: 0, failed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const reset = () => {
    setStep("upload");
    setRows([]);
    setLoading(false);
    setImportResult({ created: 0, failed: 0 });
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      EXPECTED_HEADERS,
      ["novo", "LT-001", "Lote A", "Área 1", "A-12", "P-03", "João", "Lote inicial", "ativo"],
      ["retirado_campo", "LT-002", "Lote B", "Área 2", "B-04", "P-01", "Maria", "", "ativo"],
    ]);
    ws["!cols"] = EXPECTED_HEADERS.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lotes");
    XLSX.writeFile(wb, "modelo_importacao_lotes.xlsx");
  };

  const validateRows = (rawRows: Record<string, string>[]): ImportRow[] => {
    return rawRows.map((raw, i) => {
      const tipoRaw = (raw.tipolote ?? raw.tipo ?? "").toString().trim().toLowerCase();
      const tipoLote: LotTipo = TIPO_ALIASES[tipoRaw] ?? "novo";
      const codigo = (raw.codigo ?? "").toString().trim();
      const nome = (raw.nome ?? "").toString().trim();
      const local = (raw.local ?? "").toString().trim();
      const rua = (raw.rua ?? "").toString().trim();
      const prateleira = (raw.prateleira ?? "").toString().trim();
      const responsavel = (raw.responsavel ?? "").toString().trim();
      const observacoes = (raw.observacoes ?? "").toString().trim();
      let status = (raw.status ?? "").toString().trim().toLowerCase();
      if (!status) status = "ativo";

      const errors: string[] = [];
      if (!codigo) errors.push("Código obrigatório");
      if (!nome) errors.push("Nome obrigatório");
      if (!local) errors.push("Local obrigatório");
      if (!responsavel) errors.push("Responsável obrigatório");
      if (status !== "ativo" && status !== "inativo") errors.push("Status deve ser 'ativo' ou 'inativo'");
      if (rua && !ALPHANUM_HYPHEN.test(rua)) errors.push("Rua: apenas letras, números e hífen");
      if (prateleira && !ALPHANUM_HYPHEN.test(prateleira)) errors.push("Prateleira: apenas letras, números e hífen");

      return {
        rowNum: i + 2,
        tipoLote,
        codigo,
        nome,
        local,
        rua,
        prateleira,
        responsavel,
        observacoes,
        status,
        valid: errors.length === 0,
        errors,
      };
    });
  };

  const processFile = useCallback((file: File) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });

        if (json.length === 0) {
          toast.error("Planilha sem dados válidos", { description: "Confira o conteúdo do arquivo e tente novamente." });
          setLoading(false);
          return;
        }

        const headers = Object.keys(json[0]).map((h) => h.toLowerCase().trim());
        const required = ["codigo", "nome"];
        const missing = required.filter((r) => !headers.includes(r));
        if (missing.length > 0) {
          toast.error(`Colunas obrigatórias ausentes: ${missing.join(", ")}`);
          setLoading(false);
          return;
        }

        const normalized = json.map((row) => {
          const obj: Record<string, string> = {};
          for (const [key, val] of Object.entries(row)) {
            obj[key.toLowerCase().trim()] = val == null ? "" : String(val);
          }
          return obj;
        });

        const validated = validateRows(normalized);
        setRows(validated);
        setStep("preview");
      } catch {
        toast.error("Não foi possível ler o arquivo", { description: "Verifique se a planilha está no formato correto e tente novamente." });
      }
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleImport = async () => {
    const validRows = rows.filter((r) => r.valid);
    let created = 0;
    for (const row of validRows) {
      await addLot({
        code: row.codigo,
        name: row.nome,
        location: row.local,
        rua: row.rua,
        prateleira: row.prateleira,
        responsible: row.responsavel,
        observations: row.observacoes,
        status: row.status as "ativo" | "inativo",
        tipoLote: row.tipoLote,
        identificadorInterno: "",
      });
      created++;
    }
    const failed = rows.length - validRows.length;
    setImportResult({ created, failed });
    setStep("done");
    toast.success(`${created} lote(s) importado(s)! Identificadores gerados automaticamente.`);
  };

  const validCount = rows.filter((r) => r.valid).length;
  const errorCount = rows.filter((r) => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar lotes por planilha
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-2" style={{ animation: "fade-up 0.3s ease-out" }}>
            <p className="text-sm text-muted-foreground">
              Arquivo <strong>.xlsx</strong> ou <strong>.csv</strong>. Colunas:{" "}
              {EXPECTED_HEADERS.map((h) => (
                <code key={h} className="text-xs bg-muted px-1 py-0.5 rounded mr-1">{h}</code>
              ))}
              .
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>Códigos podem repetir.</strong> O identificador interno (NOV-/RTC-) é gerado automaticamente. Tipo padrão: <code>novo</code>.
            </p>

            <Card
              className={`border-2 border-dashed transition-all duration-300 cursor-pointer ${
                dragOver
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/30"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
                {loading ? (
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                ) : (
                  <Upload className={`h-10 w-10 transition-colors duration-200 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
                )}
                <div className="text-center">
                  <p className="font-medium text-sm">
                    {loading ? "Processando..." : "Arraste sua planilha aqui"}
                  </p>
                  {!loading && (
                    <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv,.xls"
              className="hidden"
              onChange={handleFileChange}
            />

            <Button variant="outline" onClick={downloadTemplate} className="w-full transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]">
              <Download className="mr-2 h-4 w-4" /> Baixar modelo Excel
            </Button>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 flex-1 min-h-0 flex flex-col" style={{ animation: "fade-up 0.3s ease-out" }}>
            <div className="flex flex-wrap gap-3 text-sm">
              <Badge variant="secondary" className="gap-1.5">Total: {rows.length}</Badge>
              <Badge className="gap-1.5 bg-success/15 text-success border-success/30 hover:bg-success/20">
                <CheckCircle2 className="h-3.5 w-3.5" /> Válidos: {validCount}
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive" className="gap-1.5">
                  <XCircle className="h-3.5 w-3.5" /> Erros: {errorCount}
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 max-h-[50vh] rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden sm:table-cell">Rua</TableHead>
                    <TableHead className="hidden sm:table-cell">Prateleira</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow
                      key={i}
                      className={`transition-colors duration-200 ${!row.valid ? "bg-destructive/5" : ""}`}
                    >
                      <TableCell className="text-muted-foreground text-xs">{row.rowNum}</TableCell>
                      <TableCell className="text-xs">{LOT_TIPO_LABEL[row.tipoLote]}</TableCell>
                      <TableCell className="font-mono text-sm">{row.codigo || "—"}</TableCell>
                      <TableCell className="text-sm">{row.nome || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{row.rua || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{row.prateleira || "—"}</TableCell>
                      <TableCell>
                        {row.valid ? (
                          <Badge className="bg-success/15 text-success border-success/30 text-xs gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Válido
                          </Badge>
                        ) : (
                          <div className="space-y-1">
                            {row.errors.map((err, j) => (
                              <Badge key={j} variant="destructive" className="text-xs block w-fit">{err}</Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={reset} className="flex-1">Voltar</Button>
              <Button
                onClick={handleImport}
                disabled={validCount === 0}
                className="flex-1 shadow-sm hover:shadow-md"
              >
                Importar {validCount} linha(s) válida(s)
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="py-8 text-center space-y-4" style={{ animation: "fade-up 0.4s ease-out" }}>
            <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
            <div>
              <p className="text-lg font-semibold">{importResult.created} lote(s) importado(s)</p>
              {importResult.failed > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {importResult.failed} linha(s) ignorada(s) por erro
                </p>
              )}
            </div>
            <Button onClick={() => handleClose(false)}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
