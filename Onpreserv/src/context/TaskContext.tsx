import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/services/adapters/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Task, TaskLabel, TaskComment, TaskHistoryEntry, TaskAttachment, TaskStatus, TaskSubtask, TaskBoard } from "@/types/task";
import { toast } from "sonner";
import { runWithRetry } from "@/lib/runWithRetry";
import { notifyError } from "@/lib/errorMessages";


interface BulkTaskInput {
  titulo: string;
  descricao?: string;
  status?: TaskStatus;
  prioridade?: Task["prioridade"];
  modulo_relacionado?: Task["modulo_relacionado"];
  prazo?: string | null;
  responsavel_id?: string | null;
  observacoes?: string;
  board_id?: string | null;
  item_relacionado_descricao?: string | null;
}

interface Ctx {
  tasks: Task[];
  labels: TaskLabel[];
  boards: TaskBoard[];
  loading: boolean;
  /** IDs de tarefas atualizadas há poucos segundos via realtime (para destaque visual). */
  recentlyUpdatedIds: Set<string>;
  refresh: () => Promise<void>;
  createTask: (t: Partial<Task> & { titulo: string }, labelIds?: string[], assigneeIds?: string[]) => Promise<Task | null>;
  updateTask: (id: string, patch: Partial<Task>, labelIds?: string[], assigneeIds?: string[]) => Promise<boolean>;
  deleteTask: (id: string) => Promise<void>;
  bulkDeleteTasks: (ids: string[]) => Promise<number>;
  bulkUpdateStatus: (ids: string[], status: TaskStatus) => Promise<number>;
  bulkAssignTasks: (ids: string[], assigneeIds: string[]) => Promise<number>;
  moveTask: (id: string, status: TaskStatus, posicao: number) => Promise<void>;
  reorderTasks: (updates: { id: string; status: TaskStatus; posicao: number }[]) => Promise<boolean>;
  bulkCreateTasks: (rows: BulkTaskInput[]) => Promise<number>;
  // boards
  createBoard: (b: Pick<TaskBoard, "nome"> & Partial<TaskBoard>) => Promise<TaskBoard | null>;
  updateBoard: (id: string, patch: Partial<TaskBoard>) => Promise<boolean>;
  deleteBoard: (id: string, opts?: { force?: boolean; deleteTasks?: boolean }) => Promise<boolean>;
  // labels
  createLabel: (l: Omit<TaskLabel, "id">) => Promise<TaskLabel | null>;
  updateLabel: (id: string, patch: Partial<TaskLabel>) => Promise<void>;
  deleteLabel: (id: string) => Promise<void>;
  // detail data
  fetchComments: (taskId: string) => Promise<TaskComment[]>;
  addComment: (taskId: string, mensagem: string, mentions?: string[]) => Promise<TaskComment | null>;
  fetchHistory: (taskId: string) => Promise<TaskHistoryEntry[]>;
  fetchAttachments: (taskId: string) => Promise<TaskAttachment[]>;
  uploadAttachment: (taskId: string, file: File) => Promise<boolean>;
  getAttachmentUrl: (path: string) => Promise<string | null>;
  deleteAttachment: (a: TaskAttachment) => Promise<void>;
  // subtasks
  fetchSubtasks: (taskId: string) => Promise<TaskSubtask[]>;
  addSubtask: (taskId: string, titulo: string) => Promise<void>;
  toggleSubtask: (id: string, concluido: boolean) => Promise<void>;
  updateSubtask: (id: string, patch: Partial<Pick<TaskSubtask, "titulo" | "posicao">>) => Promise<void>;
  deleteSubtask: (id: string) => Promise<void>;
}

const TaskContext = createContext<Ctx | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [labels, setLabels] = useState<TaskLabel[]>([]);
  const [boards, setBoards] = useState<TaskBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentlyUpdatedIds, setRecentlyUpdatedIds] = useState<Set<string>>(() => new Set());
  const recentTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  /** IDs alterados localmente — usados para ignorar o eco do realtime e evitar jank em drag-and-drop. */
  const selfWritesRef = useRef<Map<string, number>>(new Map());
  const markSelfWrite = useCallback((ids: (string | null | undefined)[]) => {
    const expireAt = Date.now() + 4000;
    ids.forEach((id) => { if (id) selfWritesRef.current.set(id, expireAt); });
  }, []);
  const isSelfWrite = useCallback((id?: string | null) => {
    if (!id) return false;
    const exp = selfWritesRef.current.get(id);
    if (!exp) return false;
    if (exp < Date.now()) { selfWritesRef.current.delete(id); return false; }
    return true;
  }, []);

  const markRecentlyUpdated = useCallback((id?: string | null) => {
    if (!id) return;
    setRecentlyUpdatedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    const timers = recentTimersRef.current;
    const existing = timers.get(id);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      setRecentlyUpdatedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      timers.delete(id);
    }, 2200);
    timers.set(id, t);
  }, []);

  const initialLoadRef = useRef(true);
  const refresh = useCallback(async () => {
    if (initialLoadRef.current) setLoading(true);
    const [{ data: ts }, { data: ls }, { data: links }, { data: assigns }, { data: bs }] = await Promise.all([
      supabase.from("tasks").select("*").order("posicao", { ascending: true }),
      supabase.from("task_labels").select("*").order("nome"),
      supabase.from("task_label_assignments").select("task_id, label_id"),
      supabase.from("task_assignees").select("task_id, user_id"),
      supabase.from("task_boards" as any).select("*").order("posicao", { ascending: true }),
    ]);
    const labelsArr = (ls ?? []) as TaskLabel[];
    const labelMap = new Map(labelsArr.map((l) => [l.id, l]));
    const linksArr = (links ?? []) as { task_id: string; label_id: string }[];
    const taskLabels = new Map<string, TaskLabel[]>();
    linksArr.forEach((ln) => {
      const lbl = labelMap.get(ln.label_id);
      if (!lbl) return;
      const arr = taskLabels.get(ln.task_id) ?? [];
      arr.push(lbl);
      taskLabels.set(ln.task_id, arr);
    });
    const assigneesMap = new Map<string, string[]>();
    ((assigns ?? []) as { task_id: string; user_id: string }[]).forEach((a) => {
      const arr = assigneesMap.get(a.task_id) ?? [];
      arr.push(a.user_id);
      assigneesMap.set(a.task_id, arr);
    });
    const tasksArr = ((ts ?? []) as any[]).map((t) => ({
      ...t,
      board_id: t.board_id ?? null,
      labels: taskLabels.get(t.id) ?? [],
      assignees: assigneesMap.get(t.id) ?? [],
    })) as Task[];
    setTasks(tasksArr);
    setLabels(labelsArr);
    setBoards(((bs ?? []) as unknown) as TaskBoard[]);
    if (initialLoadRef.current) {
      setLoading(false);
      initialLoadRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setTasks([]);
      setLabels([]);
      setBoards([]);
      setLoading(false);
      return;
    }
    refresh();
    // Debounce para coalescer múltiplos eventos (ex.: drag-and-drop em massa)
    let t: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefresh = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        t = null;
        refresh();
      }, 250);
    };
    const ch = supabase
      .channel(`tasks-realtime:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        const id = (payload.new as any)?.id ?? (payload.old as any)?.id;
        if (isSelfWrite(id)) return;
        markRecentlyUpdated(id);
        debouncedRefresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "task_label_assignments" }, (payload) => {
        const id = (payload.new as any)?.task_id ?? (payload.old as any)?.task_id;
        if (isSelfWrite(id)) return;
        markRecentlyUpdated(id);
        debouncedRefresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "task_labels" }, debouncedRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_assignees" }, (payload) => {
        const id = (payload.new as any)?.task_id ?? (payload.old as any)?.task_id;
        if (isSelfWrite(id)) return;
        markRecentlyUpdated(id);
        debouncedRefresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "task_boards" }, debouncedRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_subtasks" }, (payload) => {
        const id = (payload.new as any)?.task_id ?? (payload.old as any)?.task_id;
        if (isSelfWrite(id)) return;
        markRecentlyUpdated(id);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "task_comments" }, (payload) => {
        const id = (payload.new as any)?.task_id ?? (payload.old as any)?.task_id;
        if (isSelfWrite(id)) return;
        markRecentlyUpdated(id);
      })
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      supabase.removeChannel(ch);
      recentTimersRef.current.forEach((tm) => clearTimeout(tm));
      recentTimersRef.current.clear();
    };
  }, [authReady, user, refresh, markRecentlyUpdated]);

  const syncLabels = async (taskId: string, labelIds: string[]) => {
    await supabase.from("task_label_assignments").delete().eq("task_id", taskId);
    if (labelIds.length) {
      await supabase
        .from("task_label_assignments")
        .insert(labelIds.map((label_id) => ({ task_id: taskId, label_id })));
    }
  };

  const syncAssignees = async (taskId: string, assigneeIds: string[]) => {
    const unique = Array.from(new Set(assigneeIds.filter(Boolean)));
    await supabase.from("task_assignees").delete().eq("task_id", taskId);
    if (unique.length) {
      await supabase
        .from("task_assignees")
        .insert(unique.map((user_id) => ({ task_id: taskId, user_id })));
    }
  };

  const createTask: Ctx["createTask"] = async (t, labelIds = [], assigneeIds) => {
    const titulo = (t.titulo ?? "").trim();
    if (titulo.length < 3) {
      toast.error("Informe um título com pelo menos 3 caracteres.");
      return null;
    }
    // Bloqueia duplicata exata dentro do mesmo quadro (case-insensitive).
    const boardId = (t as any).board_id ?? null;
    const dupe = tasks.find(
      (x) => (x.board_id ?? null) === boardId && x.titulo.trim().toLowerCase() === titulo.toLowerCase(),
    );
    if (dupe) {
      toast.error("Já existe uma tarefa com esse título neste quadro.");
      return null;
    }
    if (t.prazo && t.prazo < new Date().toISOString().slice(0, 10)) {
      toast.warning("Prazo informado já está vencido");
    }
    const maxPos = Math.max(0, ...tasks.filter((x) => x.status === (t.status ?? "a_fazer")).map((x) => x.posicao));
    const finalAssignees = assigneeIds ?? (t.responsavel_id ? [t.responsavel_id] : []);
    const payload: any = {
      titulo,
      descricao: t.descricao ?? "",
      status: t.status ?? "a_fazer",
      prioridade: t.prioridade ?? "media",
      responsavel_id: finalAssignees[0] ?? null,
      criado_por: user?.id ?? null,
      modulo_relacionado: t.modulo_relacionado ?? "geral",
      item_relacionado_id: t.item_relacionado_id ?? null,
      item_relacionado_descricao: t.item_relacionado_descricao ?? "",
      prazo: t.prazo ?? null,
      observacoes: t.observacoes ?? "",
      board_id: boardId,
      posicao: maxPos + 1,
    };
    const { data, error } = await runWithRetry(async () => await supabase.from("tasks").insert(payload).select("*").single());
    if (error) {
      notifyError(error, "Não foi possível criar a tarefa.");
      return null;
    }
    if (labelIds.length) await syncLabels(data.id, labelIds);
    if (finalAssignees.length) await syncAssignees(data.id, finalAssignees);
    await refresh();
    toast.success("Tarefa criada");
    return data as Task;
  };

  const updateTask: Ctx["updateTask"] = async (id, patch, labelIds, assigneeIds) => {
    const { labels: _omit, assignees: _omit2, ...clean } = patch as any;
    if (assigneeIds !== undefined) {
      clean.responsavel_id = assigneeIds[0] ?? null;
    }
    const { error } = await runWithRetry(async () => await supabase.from("tasks").update(clean).eq("id", id));
    if (error) {
      notifyError(error, "Não foi possível salvar as alterações.");
      return false;
    }
    if (labelIds) await syncLabels(id, labelIds);
    if (assigneeIds) await syncAssignees(id, assigneeIds);
    await refresh();
    toast.success("Tarefa atualizada");
    return true;
  };

  const deleteTask: Ctx["deleteTask"] = async (id) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) notifyError(error, "Não foi possível excluir a tarefa.");
    else {
      toast.success("Tarefa excluída");
      await refresh();
    }
  };

  const bulkDeleteTasks: Ctx["bulkDeleteTasks"] = async (ids) => {
    if (!ids.length) return 0;
    const { error } = await supabase.from("tasks").delete().in("id", ids);
    if (error) {
      notifyError(error, "Não foi possível excluir o registro.");
      return 0;
    }
    toast.success(`${ids.length} tarefa(s) excluída(s)`);
    await refresh();
    return ids.length;
  };

  const bulkUpdateStatus: Ctx["bulkUpdateStatus"] = async (ids, status) => {
    if (!ids.length) return 0;
    markSelfWrite(ids);
    const { error } = await supabase.from("tasks").update({ status }).in("id", ids);
    if (error) {
      notifyError(error, "Não foi possível atualizar o status.");
      return 0;
    }
    toast.success(`${ids.length} tarefa(s) atualizada(s)`);
    await refresh();
    return ids.length;
  };

  const bulkAssignTasks: Ctx["bulkAssignTasks"] = async (ids, assigneeIds) => {
    if (!ids.length) return 0;
    const unique = Array.from(new Set(assigneeIds.filter(Boolean)));
    markSelfWrite(ids);
    const { error: delErr } = await supabase.from("task_assignees").delete().in("task_id", ids);
    if (delErr) {
      notifyError(delErr, "Não foi possível atualizar os responsáveis.");
      return 0;
    }
    if (unique.length) {
      const rows = ids.flatMap((task_id) => unique.map((user_id) => ({ task_id, user_id })));
      const { error: insErr } = await supabase.from("task_assignees").insert(rows);
      if (insErr) {
        notifyError(insErr, "Não foi possível atualizar os responsáveis.");
        return 0;
      }
    }
    const { error: upErr } = await supabase
      .from("tasks")
      .update({ responsavel_id: unique[0] ?? null })
      .in("id", ids);
    if (upErr) {
      notifyError(upErr, "Não foi possível atualizar os responsáveis.");
      return 0;
    }
    toast.success(`${ids.length} tarefa(s) atribuída(s)`);
    await refresh();
    return ids.length;
  };

  const moveTask: Ctx["moveTask"] = async (id, status, posicao) => {
    markSelfWrite([id]);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status, posicao } : t)));
    const { error } = await supabase.from("tasks").update({ status, posicao }).eq("id", id);
    if (error) {
      notifyError(error, "Não foi possível mover a tarefa.");
      await refresh();
    }
  };

  const reorderTasks: Ctx["reorderTasks"] = async (updates) => {
    if (!updates.length) return true;
    const byId = new Map(updates.map((u) => [u.id, u]));
    markSelfWrite(updates.map((u) => u.id));
    setTasks((prev) =>
      prev.map((t) => {
        const u = byId.get(t.id);
        return u ? { ...t, status: u.status, posicao: u.posicao } : t;
      }),
    );

    // Persiste todas as posições em paralelo para garantir que a ordem
    // sobreviva a recarregamentos mesmo se a aba fechar logo após o drop.
    const results = await Promise.allSettled(
      updates.map((u) =>
        runWithRetry(async () =>
          await supabase.from("tasks").update({ status: u.status, posicao: u.posicao }).eq("id", u.id),
        ),
      ),
    );

    const failed = results.find((r) => r.status === "rejected" || (r.status === "fulfilled" && (r.value as any)?.error));
    if (failed) {
      const cause = failed.status === "rejected" ? failed.reason : (failed.value as any).error;
      notifyError(cause, "Não foi possível reordenar as tarefas.");
      await refresh();
      return false;
    }

    return true;
  };


  const createLabel: Ctx["createLabel"] = async (l) => {
    const { data, error } = await runWithRetry(async () => await supabase
      .from("task_labels")
      .insert({ ...l, criado_por: user?.id ?? null })
      .select("*")
      .single());
    if (error) {
      notifyError(error, "Não foi possível criar a etiqueta.");
      return null;
    }
    await refresh();
    return data as TaskLabel;
  };

  const updateLabel: Ctx["updateLabel"] = async (id, patch) => {
    const { error } = await runWithRetry(async () => await supabase.from("task_labels").update(patch).eq("id", id));
    if (error) notifyError(error, "Não foi possível atualizar a etiqueta.");
    else await refresh();
  };

  const deleteLabel: Ctx["deleteLabel"] = async (id) => {
    const { error } = await supabase.from("task_labels").delete().eq("id", id);
    if (error) notifyError(error, "Não foi possível excluir a etiqueta.");
    else await refresh();
  };

  const fetchComments: Ctx["fetchComments"] = async (taskId) => {
    const { data } = await supabase
      .from("task_comments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });
    return (data ?? []) as TaskComment[];
  };

  const addComment: Ctx["addComment"] = async (taskId, mensagem, mentions = []) => {
    if (!user) {
      toast.error("Sessão encerrada", { description: "Entre novamente para comentar." });
      return null;
    }
    const texto = mensagem.trim();
    if (!texto) return null;
    const { data, error } = await runWithRetry(async () => await supabase
      .from("task_comments")
      .insert({ task_id: taskId, user_id: user.id, mensagem: texto })
      .select("*")
      .single());
    if (error) {
      notifyError(error, "Não foi possível publicar o comentário.");
      return null;
    }
    if (mentions.length) {
      const uniqueMentions = Array.from(new Set(mentions.filter(Boolean)));
      if (uniqueMentions.length) {
        await supabase
          .from("task_mentions")
          .insert(uniqueMentions.map((uid) => ({ task_id: taskId, comment_id: data.id, user_id_mencionado: uid })));
      }
    }
    return data as TaskComment;
  };

  const fetchHistory: Ctx["fetchHistory"] = async (taskId) => {
    const { data } = await supabase
      .from("task_history")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });
    return (data ?? []) as TaskHistoryEntry[];
  };

  const fetchAttachments: Ctx["fetchAttachments"] = async (taskId) => {
    const { data } = await supabase
      .from("task_attachments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });
    return (data ?? []) as TaskAttachment[];
  };

  const uploadAttachment: Ctx["uploadAttachment"] = async (taskId, file) => {
    if (!user) {
      toast.error("Sessão expirada", { description: "Entre novamente para continuar." });
      return false;
    }
    // Nome sanitizado: o Storage rejeita acentos/espaços/caracteres especiais.
    const safeName = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-80);
    const path = `${taskId}/${Date.now()}-${safeName}`;
    const { error: upErr } = await runWithRetry(async () =>
      await supabase.storage.from("task-attachments").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      }),
    );
    if (upErr) {
      notifyError(upErr, "Não foi possível enviar o arquivo.");
      return false;
    }
    const { error } = await runWithRetry(async () =>
      await supabase.from("task_attachments").insert({
        task_id: taskId,
        nome: file.name,
        path,
        mime: file.type,
        tamanho: file.size,
        criado_por: user.id,
      }),
    );
    if (error) {
      // rollback do arquivo órfão
      await supabase.storage.from("task-attachments").remove([path]);
      notifyError(error, "Não foi possível registrar o anexo.");
      return false;
    } else {
      toast.success("Arquivo anexado");
      return true;
    }
  };

  const getAttachmentUrl: Ctx["getAttachmentUrl"] = async (path) => {
    const { data } = await runWithRetry(async () =>
      await supabase.storage.from("task-attachments").createSignedUrl(path, 3600),
    );
    return data?.signedUrl ?? null;
  };

  const deleteAttachment: Ctx["deleteAttachment"] = async (a) => {
    await runWithRetry(async () => await supabase.storage.from("task-attachments").remove([a.path]));
    const { error } = await runWithRetry(async () =>
      await supabase.from("task_attachments").delete().eq("id", a.id),
    );
    if (error) notifyError(error, "Não foi possível remover o anexo.");
    else toast.success("Anexo removido");
  };

  const fetchSubtasks: Ctx["fetchSubtasks"] = async (taskId) => {
    const { data } = await supabase
      .from("task_subtasks" as any)
      .select("*")
      .eq("task_id", taskId)
      .order("posicao", { ascending: true })
      .order("created_at", { ascending: true });
    return ((data ?? []) as unknown) as TaskSubtask[];
  };

  const addSubtask: Ctx["addSubtask"] = async (taskId, titulo) => {
    const t = titulo.trim();
    if (!t) return;
    const { error } = await supabase.from("task_subtasks" as any).insert({
      task_id: taskId,
      titulo: t,
      criado_por: user?.id ?? null,
    });
    if (error) notifyError(error, "Não foi possível adicionar a subtarefa.");
  };

  const toggleSubtask: Ctx["toggleSubtask"] = async (id, concluido) => {
    const { error } = await supabase
      .from("task_subtasks" as any)
      .update({ concluido, concluido_em: concluido ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) notifyError(error, "Não foi possível atualizar a subtarefa.");
  };

  const updateSubtask: Ctx["updateSubtask"] = async (id, patch) => {
    const { error } = await supabase.from("task_subtasks" as any).update(patch).eq("id", id);
    if (error) notifyError(error, "Não foi possível atualizar a subtarefa.");
  };

  const deleteSubtask: Ctx["deleteSubtask"] = async (id) => {
    const { error } = await supabase.from("task_subtasks" as any).delete().eq("id", id);
    if (error) notifyError(error, "Não foi possível excluir a subtarefa.");
  };

  const createBoard: Ctx["createBoard"] = async (b) => {
    const nome = (b.nome ?? "").trim();
    if (nome.length < 2) {
      toast.error("Informe um nome com pelo menos 2 caracteres.");
      return null;
    }
    const dupe = boards.find(
      (x) => !x.arquivado && x.nome.trim().toLowerCase() === nome.toLowerCase(),
    );
    if (dupe) {
      toast.error("Já existe um quadro ativo com esse nome.");
      return null;
    }
    const maxPos = Math.max(0, ...boards.map((x) => x.posicao));
    const payload: any = {
      nome,
      descricao: b.descricao ?? "",
      cor: b.cor ?? "#3b82f6",
      equipe: b.equipe ?? "",
      posicao: maxPos + 1,
      arquivado: false,
      criado_por: user?.id ?? null,
    };
    const { data, error } = await runWithRetry(async () => await supabase.from("task_boards" as any).insert(payload).select("*").single());
    if (error) {
      notifyError(error, "Não foi possível criar o quadro.");
      return null;
    }
    toast.success("Quadro criado");
    await refresh();
    return (data as unknown) as TaskBoard;
  };

  const updateBoard: Ctx["updateBoard"] = async (id, patch) => {
    const clean: any = { ...patch };
    if (typeof clean.nome === "string") {
      const nome = clean.nome.trim();
      if (nome.length < 2) {
        toast.error("Informe um nome com pelo menos 2 caracteres.");
        return false;
      }
      const dupe = boards.find(
        (x) => x.id !== id && !x.arquivado && x.nome.trim().toLowerCase() === nome.toLowerCase(),
      );
      if (dupe) {
        toast.error("Já existe outro quadro ativo com esse nome.");
        return false;
      }
      clean.nome = nome;
    }
    const { error } = await runWithRetry(async () => await supabase.from("task_boards" as any).update(clean).eq("id", id));
    if (error) {
      notifyError(error, "Não foi possível salvar o quadro.");
      return false;
    }
    toast.success("Quadro atualizado");
    await refresh();
    return true;
  };

  const deleteBoard: Ctx["deleteBoard"] = async (id, opts) => {
    const board = boards.find((b) => b.id === id);
    if (!board) {
      toast.error("Quadro não encontrado.");
      return false;
    }
    if (board.arquivado) {
      toast.error("Quadro arquivado", {
        description: "Desarquive o quadro antes de excluí-lo para evitar perda acidental.",
      });
      return false;
    }
    const dependentes = tasks.filter((t) => t.board_id === id).length;
    if (dependentes > 0 && !opts?.force) {
      toast.warning(`O quadro "${board.nome}" possui ${dependentes} tarefa(s) vinculada(s)`, {
        description: "Confirme novamente para excluir.",
      });
      return false;
    }
    // Se solicitado, exclui as tarefas vinculadas antes do quadro
    if (opts?.deleteTasks && dependentes > 0) {
      const { error: delTasksErr } = await supabase.from("tasks").delete().eq("board_id", id);
      if (delTasksErr) {
        notifyError(delTasksErr, "Não foi possível excluir as tarefas deste quadro.");
        return false;
      }
    }
    const { error } = await supabase.from("task_boards" as any).delete().eq("id", id);
    if (error) {
      notifyError(error, "Não foi possível excluir o registro.");
      return false;
    }
    toast.success(
      opts?.deleteTasks && dependentes > 0
        ? `Quadro "${board.nome}" e ${dependentes} tarefa(s) excluídos`
        : `Quadro "${board.nome}" excluído`
    );
    await refresh();
    return true;
  };

  const bulkCreateTasks: Ctx["bulkCreateTasks"] = async (rows) => {
    if (!rows.length) return 0;
    const baseStatus: TaskStatus = "a_fazer";
    const startPos = Math.max(0, ...tasks.filter((x) => x.status === baseStatus).map((x) => x.posicao));
    const payload: any[] = rows.map((r, i) => ({
      titulo: r.titulo,
      descricao: r.descricao ?? "",
      status: r.status ?? baseStatus,
      prioridade: r.prioridade ?? "media",
      modulo_relacionado: r.modulo_relacionado ?? "geral",
      prazo: r.prazo ?? null,
      responsavel_id: r.responsavel_id ?? null,
      observacoes: r.observacoes ?? "",
      board_id: r.board_id ?? null,
      item_relacionado_descricao: r.item_relacionado_descricao ?? null,
      criado_por: user?.id ?? null,
      posicao: startPos + i + 1,
    }));
    const { data, error } = await supabase.from("tasks").insert(payload).select("id, responsavel_id");
    if (error) {
      notifyError(error, "Não foi possível importar os dados.");
      return 0;
    }
    // sincroniza assignees para os que tem responsavel
    const inserted = (data ?? []) as { id: string; responsavel_id: string | null }[];
    const assignRows = inserted
      .filter((x) => x.responsavel_id)
      .map((x) => ({ task_id: x.id, user_id: x.responsavel_id as string }));
    if (assignRows.length) {
      await supabase.from("task_assignees").insert(assignRows);
    }
    await refresh();
    return inserted.length;
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        labels,
        boards,
        loading,
        recentlyUpdatedIds,
        refresh,
        createTask,
        updateTask,
        deleteTask,
        bulkDeleteTasks,
        bulkUpdateStatus,
        bulkAssignTasks,
        moveTask,
        reorderTasks,
        bulkCreateTasks,
        createBoard,
        updateBoard,
        deleteBoard,
        createLabel,
        updateLabel,
        deleteLabel,
        fetchComments,
        addComment,
        fetchHistory,
        fetchAttachments,
        uploadAttachment,
        getAttachmentUrl,
        deleteAttachment,
        fetchSubtasks,
        addSubtask,
        toggleSubtask,
        updateSubtask,
        deleteSubtask,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTasks deve ser usado dentro de TaskProvider");
  return ctx;
}
