import { useCallback, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useTasks } from "@/context/TaskContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { ParsedTaskRow, validateTaskRow, downloadTaskImportTemplate, TASK_TEMPLATE_HEADERS } from "@/lib/exportTasksTemplate";
import { TaskStatus, TaskPriority, TaskModulo } from "@/types/task";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

export function TaskImportDialog({ open, onOpenChange }: Props) {
  const { bulkCreateTasks, boards, createBoard } = useTasks();
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [rows, setRows] = useState<ParsedTaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [createMissingBoards, setCreateMissingBoards] = useState(true);
  const [result, setResult] = useState({ imported: 0, failed: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setStep("upload"); setRows([]); setLoading(false); setResult({ imported: 0, failed: 0 }); };
  const handleClose = (o: boolean) => { if (!o) reset(); onOpenChange(o); };

  const processFile = useCallback((file: File) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "", raw: true });
        if (!json.length) { toast.error("Planilha vazia", { description: "O arquivo não contém linhas de dados para importar." }); setLoading(false); return; }
        const normalized = json.map((row) => {
          const o: Record<string, any> = {};
          for (const [k, v] of Object.entries(row)) o[String(k).toLowerCase().trim()] = v;
          return o;
        });
        setRows(normalized.map((r, i) => validateTaskRow(r, i)));
        setStep("preview");
      } catch {
        toast.error("Não foi possível ler o arquivo", { description: "Verifique se a planilha está no formato correto e tente novamente." });
      }
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    e.target.value = "";
  };

  const doImport = async () => {
    const valid = rows.filter((r) => r.valid);
    if (valid.length === 0) return;
    setLoading(true);

    // 1. resolve responsavel_email -> user_id
    const emails = Array.from(new Set(valid.map((r) => r.responsavel_email).filter(Boolean)));
    const userMap = new Map<string, string>();
    if (emails.length) {
      const { data } = await supabase.rpc("match_user_ids_by_emails", { _emails: emails });
      ((data ?? []) as { id: string; email: string }[]).forEach((u) => userMap.set(u.email.toLowerCase(), u.id));
    }

    // 2. resolve quadro -> board_id (cria se autorizado)
    const boardNames = Array.from(new Set(valid.map((r) => r.quadro).filter(Boolean)));
    const boardMap = new Map<string, string>();
    boards.forEach((b) => boardMap.set(b.nome.toLowerCase(), b.id));
    if (createMissingBoards) {
      for (const name of boardNames) {
        if (!boardMap.has(name.toLowerCase())) {
          const created = await createBoard({ nome: name });
          if (created) boardMap.set(name.toLowerCase(), created.id);
        }
      }
    }

    const payload = valid.map((r) => ({
      titulo: r.titulo,
      descricao: r.descricao,
      status: r.status as TaskStatus,
      prioridade: r.prioridade as TaskPriority,
      modulo_relacionado: r.modulo_relacionado as TaskModulo,
      prazo: r.prazo || null,
      responsavel_id: r.responsavel_email ? userMap.get(r.responsavel_email) ?? null : null,
      observacoes: r.observacoes,
      board_id: r.quadro ? boardMap.get(r.quadro.toLowerCase()) ?? null : null,
      item_relacionado_descricao: r.doc_de_referencia || null,
    }));

    const n = await bulkCreateTasks(payload);
    setResult({ imported: n, failed: rows.length - n });
    setStep("done");
    setLoading(false);
    toast.success(`${n} tarefa(s) importada(s)`);
  };

  const validCount = rows.filter((r) => r.valid).length;
  const errorCount = rows.length - validCount;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> Importar tarefas
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Envie um <strong>.xlsx</strong> ou <strong>.csv</strong>. Colunas: {TASK_TEMPLATE_HEADERS.map((h) => (
                <code key={h} className="text-xs bg-muted px-1 rounded mx-0.5">{h}</code>
              ))}.
              Apenas <code className="text-xs bg-muted px-1 rounded">titulo</code> é obrigatório.
            </p>
            <Card className="border-2 border-dashed cursor-pointer hover:border-primary/50" onClick={() => fileRef.current?.click()}>
              <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
                {loading ? <Loader2 className="h-10 w-10 text-primary animate-spin" /> : <Upload className="h-10 w-10 text-muted-foreground" />}
                <p className="text-sm font-medium">{loading ? "Processando…" : "Clique para selecionar a planilha"}</p>
              </CardContent>
            </Card>
            <input ref={fileRef} type="file" accept=".xlsx,.csv,.xls" className="hidden" onChange={onFile} />
            <Button variant="outline" onClick={downloadTaskImportTemplate} className="w-full">
              <Download className="mr-2 h-4 w-4" /> Baixar modelo Excel
            </Button>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 flex-1 min-h-0 flex flex-col">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge variant="secondary">Total: {rows.length}</Badge>
              <Badge className="bg-success/15 text-success border-success/30 gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Válidos: {validCount}</Badge>
              {errorCount > 0 && <Badge variant="destructive" className="gap-1.5"><XCircle className="h-3.5 w-3.5" /> Erros: {errorCount}</Badge>}
              <label className="flex items-center gap-2 ml-auto text-xs">
                <Checkbox checked={createMissingBoards} onCheckedChange={(v) => setCreateMissingBoards(!!v)} />
                <span>Criar quadros que não existirem</span>
              </label>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Quadro</TableHead>
                    <TableHead className="min-w-[260px]">Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} className={!r.valid ? "bg-destructive/5" : r.warnings.length ? "bg-warning/5" : ""}>
                      <TableCell className="text-xs text-muted-foreground align-top">{r.rowNum}</TableCell>
                      <TableCell className="text-sm align-top">{r.titulo || "—"}</TableCell>
                      <TableCell className="text-xs align-top">{r.status}</TableCell>
                      <TableCell className="text-xs align-top">{r.prioridade}</TableCell>
                      <TableCell className="text-xs align-top">{r.quadro || "—"}</TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          {r.valid && r.warnings.length === 0 && (
                            <Badge className="bg-success/15 text-success border-success/30 text-xs">Válido</Badge>
                          )}
                          {r.errors.map((e, j) => (
                            <p key={`e-${j}`} className="text-xs text-destructive leading-snug">
                              <span className="font-medium">Erro:</span> {e}
                            </p>
                          ))}
                          {r.warnings.map((w, j) => (
                            <p key={`w-${j}`} className="text-xs text-muted-foreground leading-snug">
                              <span className="font-medium text-warning">Aviso:</span> {w}
                            </p>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={reset} className="flex-1">Voltar</Button>
              <Button onClick={doImport} disabled={validCount === 0 || loading} className="flex-1">
                {loading ? "Importando..." : `Importar ${validCount} tarefa(s)`}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
            <p className="text-lg font-semibold">{result.imported} tarefa(s) importada(s)</p>
            {result.failed > 0 && <p className="text-sm text-muted-foreground">{result.failed} ignorada(s) por erro</p>}
            <Button onClick={() => handleClose(false)}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
