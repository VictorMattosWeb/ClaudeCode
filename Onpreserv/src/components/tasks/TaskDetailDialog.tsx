import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Task, TaskComment, TaskHistoryEntry, TaskAttachment, TaskAprovacao, taskModuloLabel, TASK_APROVACAO_ORDER, TASK_APROVACAO_LABEL, getTaskAssignees, formatPrazo } from "@/types/task";
import { useTasks } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { Paperclip, Send, Trash2, Download, Pencil, Loader2, CheckCircle2, XCircle, Clock3 } from "lucide-react";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { ApprovalBadge } from "./ApprovalBadge";
import { LabelChip } from "./LabelChip";
import { SubtaskList } from "./SubtaskList";
import { MentionTextarea } from "./MentionTextarea";
import { MentionText } from "./MentionText";
import { TaskHistoryView } from "./TaskHistoryView";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  task: Task | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onEdit: (t: Task) => void;
  users: Map<string, string>;
}

export function TaskDetailDialog({ task, open, onOpenChange, onEdit, users }: Props) {
  const { fetchComments, addComment, fetchHistory, fetchAttachments, uploadAttachment, getAttachmentUrl, deleteAttachment, deleteTask, updateTask } = useTasks();
  const { user, isAdmin, isViewer } = useAuth();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [history, setHistory] = useState<TaskHistoryEntry[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [sendingComment, setSendingComment] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [savingAprovacao, setSavingAprovacao] = useState(false);
  const userOptions = useMemo(
    () => Array.from(users.entries()).map(([id, nome]) => ({ id, nome })),
    [users],
  );

  useEffect(() => {
    if (!task || !open) return;
    fetchComments(task.id).then(setComments);
    fetchHistory(task.id).then(setHistory);
    fetchAttachments(task.id).then(setAttachments);

    const ch = supabase
      .channel(`task-detail-${task.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_comments", filter: `task_id=eq.${task.id}` }, () =>
        fetchComments(task.id).then(setComments),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "task_history", filter: `task_id=eq.${task.id}` }, () =>
        fetchHistory(task.id).then(setHistory),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [task, open, fetchComments, fetchHistory, fetchAttachments]);

  if (!task) return null;

  const handleComment = async () => {
    if (!novoComentario.trim() || sendingComment) return;
    setSendingComment(true);
    try {
      const created = await addComment(task.id, novoComentario.trim(), mentions);
      if (created) {
        setNovoComentario("");
        setMentions([]);
        // Reload imediato (não esperar realtime)
        fetchComments(task.id).then(setComments);
      }
    } finally {
      setSendingComment(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0 || uploadingAttachments) return;
    setUploadingAttachments(true);
    let uploadedAny = false;
    for (const file of files) {
      uploadedAny = (await uploadAttachment(task.id, file)) || uploadedAny;
    }
    if (uploadedAny) setAttachments(await fetchAttachments(task.id));
    setUploadingAttachments(false);
    e.target.value = "";
  };

  const openAttachment = async (a: TaskAttachment) => {
    const url = await getAttachmentUrl(a.path);
    if (url) window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <DialogTitle>{task.titulo}</DialogTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <TaskStatusBadge status={task.status} />
                <PriorityBadge priority={task.prioridade} />
                <span className="text-xs text-muted-foreground">{taskModuloLabel(task.modulo_relacionado)}</span>
                {task.prazo && <span className="text-xs text-muted-foreground">Prazo: {formatPrazo(task.prazo)}</span>}
                {(task.labels ?? []).map((l) => <LabelChip key={l.id} label={l} />)}
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => onEdit(task)}>
                <Pencil className="h-4 w-4 mr-1" /> Editar
              </Button>
              {isAdmin && (
                <Button size="sm" variant="ghost" onClick={() => { deleteTask(task.id); onOpenChange(false); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {task.descricao && (
          <div className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-3">{task.descricao}</div>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground">Responsáveis:</span>{" "}
            {(() => {
              const ids = getTaskAssignees(task);
              if (ids.length === 0) return "—";
              return ids.map((id) => users.get(id) ?? "—").join(", ");
            })()}
          </div>
          <div><span className="text-muted-foreground">Criado por:</span> {task.criado_por ? users.get(task.criado_por) ?? "—" : "—"}</div>
          {task.item_relacionado_descricao && (
            <div className="col-span-2"><span className="text-muted-foreground">Item:</span> {task.item_relacionado_descricao}</div>
          )}
        </div>

        <Tabs defaultValue="comentarios">
          <TabsList>
            <TabsTrigger value="comentarios">Comentários ({comments.length})</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="anexos">Anexos ({attachments.length})</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="comentarios" className="space-y-3">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="border rounded-md p-2 bg-muted/30">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="font-medium">{users.get(c.user_id) ?? "Usuário"}</span>
                    <span>{format(new Date(c.created_at), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                  <MentionText text={c.mensagem} users={users} className="text-sm whitespace-pre-wrap block" />
                </div>
              ))}
              {comments.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum comentário</p>}
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <MentionTextarea
                  value={novoComentario}
                  onChange={setNovoComentario}
                  onMentionsChange={setMentions}
                  users={userOptions}
                  placeholder="Comentar... use @ para mencionar"
                />
              </div>
              <Button onClick={handleComment} disabled={!novoComentario.trim() || sendingComment}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="checklist">
            <SubtaskList taskId={task.id} />
          </TabsContent>

          <TabsContent value="anexos" className="space-y-2">
            <div className="relative">
              <Input
                type="file"
                multiple
                onChange={handleUpload}
                disabled={uploadingAttachments}
                className="cursor-pointer pr-10"
                aria-label="Selecionar arquivos para anexar"
              />
              {uploadingAttachments && (
                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1">
              {attachments.map((a) => (
                <div key={a.id} className="flex items-center justify-between border rounded-md p-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{a.nome}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openAttachment(a)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    {(a.criado_por === user?.id || isAdmin) && (
                      <Button size="icon" variant="ghost" onClick={async () => { await deleteAttachment(a); fetchAttachments(task.id).then(setAttachments); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {attachments.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum anexo</p>}
            </div>
          </TabsContent>

          <TabsContent value="historico">
            <TaskHistoryView entries={history} users={users} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
