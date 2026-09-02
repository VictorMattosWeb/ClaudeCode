import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Search, Plus, Check, X, FileEdit } from "lucide-react";
import { useActivities } from "@/context/ActivityContext";
import { useAuth } from "@/context/AuthContext";
import { ActivityLocal, PreservationActivity } from "@/types/activity";
import { ActivityFormDialog } from "./ActivityFormDialog";
import { DeleteRequestDialog } from "./DeleteRequestDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Props {
  local: ActivityLocal;
  emptyLabel?: string;
}

export function ActivityTable({ local, emptyLabel }: Props) {
  const { activities, deleteActivity, updateActivity } = useActivities();
  const { isAdmin, canWrite } = useAuth();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PreservationActivity | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [reqDel, setReqDel] = useState<PreservationActivity | null>(null);
  const [editingFreqId, setEditingFreqId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const filtered = useMemo(() => {
    const list = activities.filter((a) => a.local === local);
    const q = search.toLowerCase().trim();
    if (!q) return list;
    return list.filter((a) =>
      a.codigo.toLowerCase().includes(q) || a.descricao.toLowerCase().includes(q)
    );
  }, [activities, search, local]);

  const startInline = (a: PreservationActivity) => {
    setEditingFreqId(a.id);
    setEditValue(String(a.frequencia));
  };

  const saveInline = async () => {
    if (!editingFreqId) return;
    const v = Number(editValue);
    if (!Number.isFinite(v) || v <= 0) { toast.error("Informe uma frequência maior que zero."); return; }
    const res = await updateActivity(editingFreqId, { frequencia: v });
    if (!res.ok) { toast.error(res.error ?? "Não foi possível salvar a atividade."); return; }
    setEditingFreqId(null);
  };

  const renderFreqCell = (a: PreservationActivity) => {
    const isEditing = editingFreqId === a.id;
    const value = a.frequencia;
    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input
            autoFocus type="number" min={1} value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveInline(); if (e.key === "Escape") setEditingFreqId(null); }}
            className="h-7 w-20 text-xs"
          />
          <Button size="icon" variant="ghost" aria-label="Salvar frequência" title="Salvar" className="h-6 w-6" onClick={saveInline}><Check className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" aria-label="Cancelar edição" title="Cancelar" className="h-6 w-6" onClick={() => setEditingFreqId(null)}><X className="h-3.5 w-3.5" /></Button>
        </div>
      );
    }
    if (!canWrite) {
      return <Badge variant={value >= 90 ? "default" : "secondary"} className="text-[11px] py-0 px-2">{value}d</Badge>;
    }
    return (
      <button
        onClick={() => startInline(a)}
        className="inline-flex items-center hover:bg-muted/60 rounded px-1.5 py-0.5 transition-colors"
        title="Clique para editar"
      >
        <Badge variant={value >= 90 ? "default" : "secondary"} className="text-[11px] py-0 px-2">{value}d</Badge>
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {filtered.length} atividade{filtered.length === 1 ? "" : "s"}
          </span>
          {canWrite && (
            <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }} className="h-8">
              <Plus className="h-3.5 w-3.5" /> Nova
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-24 h-9 text-xs">Código</TableHead>
              <TableHead className="h-9 text-xs">Descrição</TableHead>
              <TableHead className="w-32 h-9 text-xs">Frequência</TableHead>
              <TableHead className="w-24 h-9 text-xs text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-6 text-sm">
                  {emptyLabel ?? "Nenhuma atividade cadastrada"}
                </TableCell>
              </TableRow>
            ) : filtered.map((a) => (
              <TableRow key={a.id} className="h-10">
                <TableCell className="py-1.5 font-mono text-xs font-medium">{a.codigo}</TableCell>
                <TableCell className="py-1.5 text-sm">{a.descricao}</TableCell>
                <TableCell className="py-1.5">{renderFreqCell(a)}</TableCell>
                <TableCell className="py-1.5 text-right">
                  {canWrite && (
                    <div className="inline-flex gap-0.5">
                      <Button size="icon" variant="ghost" aria-label="Editar atividade" title="Editar" className="h-7 w-7" onClick={() => { setEditing(a); setFormOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {isAdmin ? (
                        <Button size="icon" variant="ghost" aria-label="Excluir atividade" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setConfirmDel(a.id)} title="Excluir">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button size="icon" variant="ghost" aria-label="Solicitar exclusão da atividade" className="h-7 w-7 text-warning hover:text-warning" onClick={() => setReqDel(a)} title="Solicitar exclusão">
                          <FileEdit className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ActivityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        activity={editing}
        defaultLocal={local}
      />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (confirmDel) { deleteActivity(confirmDel); toast.success("Atividade excluída"); } setConfirmDel(null); }}
            >Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {reqDel && (
        <DeleteRequestDialog
          open={!!reqDel}
          onOpenChange={(o) => !o && setReqDel(null)}
          tipo="atividade"
          itemId={reqDel.id}
          itemDescricao={`${reqDel.codigo} — ${reqDel.descricao}`}
        />
      )}
    </div>
  );
}
