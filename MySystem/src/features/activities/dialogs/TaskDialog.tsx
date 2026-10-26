import { useEffect, useState } from "react";
import { Check, FileText, ListChecks, MessageSquare, Plus, Send, Trash2, X } from "lucide-react";
import type { Board, ChecklistItem, Comment, Priority, Task } from "@/types/activities";
import { ConfirmDialog, Modal } from "@/components/ui/overlays";
import { Field, Select, TextArea, TextInput } from "@/components/ui/fields";
import { PrimaryButton, ProgressBar, SecondaryButton } from "@/components/ui/primitives";
import { cx } from "@/lib/cx";
import { formatDateTime, timeAgo } from "@/lib/dates";
import { HUES, PRIORITIES } from "@/lib/hues";
import { uid } from "@/lib/id";
import { useDispatch } from "@/store/StoreProvider";
import { useAuth } from "@/auth/AuthProvider";
import { assigneesOf } from "../filters";
import { Avatar } from "../TaskBits";

type Draft = Omit<Task, "id" | "createdAt" | "completedAt">;

function emptyDraft(columnId: string): Draft {
  return { title: "", docCode: "", description: "", columnId, tagIds: [], priority: "media", assignee: "", dueDate: "", checklist: [], comments: [] };
}

const AUTHOR_KEY = "mysystem.comment.author";

function loadAuthor(): string {
  try {
    return localStorage.getItem(AUTHOR_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * Criar/editar atividade. `task` = "new" abre em branco na primeira etapa (ou em `defaultColumnId`).
 */
export function TaskDialog({
  board,
  task,
  defaultColumnId,
  onClose,
}: {
  board: Board;
  task: Task | "new" | null;
  defaultColumnId?: string;
  onClose: () => void;
}) {
  const dispatch = useDispatch();
  const isNew = task === "new";
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(board.columns[0]?.id ?? ""));
  const [newItem, setNewItem] = useState("");
  const [newTag, setNewTag] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState<"checklist" | "comentarios">("checklist");
  const [commentText, setCommentText] = useState("");
  const { profile } = useAuth();
  const [author, setAuthor] = useState(() => (profile?.full_name ? profile.full_name : loadAuthor()));

  // O rascunho só reinicia quando outra atividade é aberta, não a cada atualização dela
  // (comentários são gravados na hora e não podem apagar edições em andamento).
  const taskKey = task === "new" ? "new" : (task?.id ?? null);

  useEffect(() => {
    if (!task) return;
    if (task === "new") setDraft(emptyDraft(defaultColumnId ?? board.columns[0]?.id ?? ""));
    else {
      const { id: _id, createdAt: _c, completedAt: _d, ...rest } = task;
      setDraft(rest);
    }
    setNewItem("");
    setNewTag("");
    setCommentText("");
    setTab("checklist");
  }, [taskKey, defaultColumnId]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    if (!draft.title.trim() || !task) return;
    const clean = { ...draft, title: draft.title.trim(), assignee: draft.assignee.trim() };
    if (isNew) dispatch({ type: "task/create", boardId: board.id, task: clean });
    else dispatch({ type: "task/update", boardId: board.id, taskId: task.id, patch: clean });
    onClose();
  };

  const toggleTag = (id: string) =>
    set("tagIds", draft.tagIds.includes(id) ? draft.tagIds.filter((t) => t !== id) : [...draft.tagIds, id]);

  const addChecklist = () => {
    const t = newItem.trim();
    if (!t) return;
    set("checklist", [...draft.checklist, { id: uid(), text: t, done: false }]);
    setNewItem("");
  };
  const patchItem = (id: string, patch: Partial<ChecklistItem>) =>
    set("checklist", draft.checklist.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const createTag = () => {
    const n = newTag.trim();
    if (!n) return;
    // A etiqueta nova entra no quadro e já fica marcada nesta atividade.
    const id = uid();
    dispatch({ type: "tag/add", boardId: board.id, name: n, hue: "stone", id });
    set("tagIds", [...draft.tagIds, id]);
    setNewTag("");
  };

  const existingTask = task && task !== "new" ? task : null;

  // Em atividade já existente o comentário é persistido na hora; numa nova, vai junto ao criar.
  const writeComments = (comments: Comment[]) => {
    set("comments", comments);
    if (existingTask) dispatch({ type: "task/update", boardId: board.id, taskId: existingTask.id, patch: { comments } });
  };

  const addComment = () => {
    const text = commentText.trim();
    if (!text) return;
    const name = author.trim();
    try {
      localStorage.setItem(AUTHOR_KEY, name);
    } catch {
      /* sem armazenamento */
    }
    writeComments([...draft.comments, { id: uid(), author: name, text, createdAt: new Date().toISOString() }]);
    setCommentText("");
  };

  const assignees = assigneesOf(board);
  const doneItems = draft.checklist.filter((c) => c.done).length;
  const existing = existingTask;

  return (
    <>
      <Modal
        open={!!task}
        onClose={onClose}
        title={isNew ? "Nova atividade" : "Editar atividade"}
        subtitle={
          existing
            ? `Criada em ${formatDateTime(existing.createdAt)}${existing.completedAt ? ` · concluída em ${formatDateTime(existing.completedAt)}` : ""}`
            : board.name
        }
        width="max-w-2xl"
        footer={
          <>
            {existing && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="mr-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </button>
            )}
            <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
            <PrimaryButton onClick={save} disabled={!draft.title.trim()}>
              {isNew ? "Criar atividade" : "Salvar"}
            </PrimaryButton>
          </>
        }
      >
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field label="Título">
                <TextInput autoFocus value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="O que precisa ser feito?" />
              </Field>
            </div>
            <Field label="Código do documento">
              <div className="relative">
                <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <TextInput
                  value={draft.docCode}
                  onChange={(e) => set("docCode", e.target.value)}
                  placeholder="Ex.: PRC-ELE-0012"
                  className="pl-9 font-mono text-[13px]"
                />
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Etapa">
              <Select value={draft.columnId} onChange={(e) => set("columnId", e.target.value)}>
                {board.columns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Prazo">
              <TextInput type="date" value={draft.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
            </Field>
            <Field label="Responsável">
              <TextInput list="assignees" value={draft.assignee} onChange={(e) => set("assignee", e.target.value)} placeholder="Nome" />
              <datalist id="assignees">
                {assignees.map((a) => <option key={a} value={a} />)}
              </datalist>
            </Field>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-stone-500">Prioridade</span>
              <div className="flex gap-2 text-xs font-medium text-stone-600">
                {(Object.keys(PRIORITIES) as Priority[]).map((p) => {
                  const on = draft.priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => set("priority", p)}
                      className={cx(
                        "flex-1 rounded-xl px-3 py-2 transition-colors",
                        on ? "bg-stone-900 text-stone-100" : "ring-1 bg-stone-50 ring-stone-200 hover:text-stone-900",
                      )}
                    >
                      {PRIORITIES[p].label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-stone-500">Etiquetas</span>
            <div className="flex flex-wrap items-center gap-2">
              {board.tags.map((tag) => {
                const on = draft.tagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleTag(tag.id)}
                    className={cx(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition",
                      on ? HUES[tag.hue].pill : "text-stone-500 ring-1 ring-stone-200 bg-white hover:bg-stone-50",
                    )}
                  >
                    {on && <Check className="h-3 w-3" />}
                    {tag.name}
                  </button>
                );
              })}
              <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-stone-300 pl-2.5 pr-1 py-0.5">
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      createTag();
                    }
                  }}
                  placeholder="Nova etiqueta"
                  className="w-24 bg-transparent text-xs outline-none placeholder:text-stone-400"
                />
                <button type="button" aria-label="Criar etiqueta" onClick={createTag} className="rounded-full p-0.5 text-stone-500 hover:bg-stone-100">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          </div>

          <Field label="Descrição">
            <TextArea value={draft.description} onChange={(e) => set("description", e.target.value)} placeholder="Detalhes, referências de documentos, observações…" />
          </Field>

          <div>
            {/* Abas no estilo das pílulas do week strip */}
            <div className="mb-3 flex gap-2 text-xs font-medium text-stone-600" role="tablist">
              {([
                ["checklist", "Checklist", ListChecks, draft.checklist.length ? `${doneItems}/${draft.checklist.length}` : null],
                ["comentarios", "Comentários", MessageSquare, draft.comments.length ? String(draft.comments.length) : null],
              ] as const).map(([key, label, Icon, badge]) => {
                const on = tab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setTab(key)}
                    className={cx(
                      "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 transition-colors",
                      on ? "bg-stone-900 text-stone-100" : "ring-1 bg-stone-50 ring-stone-200 hover:text-stone-900",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                    {badge && (
                      <span className={cx("rounded-full px-1.5 text-[10px] tabular-nums", on ? "bg-stone-700" : "bg-stone-200")}>{badge}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {tab === "checklist" && (
            <>
            {draft.checklist.length > 0 && <ProgressBar value={(doneItems / draft.checklist.length) * 100} hue="emerald" className="mb-3" />}
            <div className="space-y-2">
              {draft.checklist.map((item) => (
                <div key={item.id} className="group flex items-center gap-3 rounded-xl px-3 py-2 ring-1 bg-stone-50 ring-stone-200">
                  <button
                    type="button"
                    aria-label={item.done ? "Desmarcar" : "Marcar"}
                    onClick={() => patchItem(item.id, { done: !item.done })}
                    className={cx(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition",
                      item.done ? "bg-emerald-500 text-white" : "ring-1 ring-stone-300 bg-white",
                    )}
                  >
                    {item.done && <Check className="h-3.5 w-3.5" />}
                  </button>
                  <input
                    value={item.text}
                    onChange={(e) => patchItem(item.id, { text: e.target.value })}
                    className={cx("min-w-0 flex-1 bg-transparent text-sm outline-none", item.done && "text-stone-400 line-through")}
                  />
                  <button
                    type="button"
                    aria-label="Remover item"
                    onClick={() => set("checklist", draft.checklist.filter((c) => c.id !== item.id))}
                    className="rounded-lg p-1 text-stone-400 opacity-0 hover:bg-stone-100 hover:text-stone-700 group-hover:opacity-100 focus:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <TextInput
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addChecklist();
                    }
                  }}
                  placeholder="Adicionar item ao checklist"
                />
                <SecondaryButton icon={Plus} onClick={addChecklist} className="shrink-0">
                  Item
                </SecondaryButton>
              </div>
            </div>
            </>
            )}

            {tab === "comentarios" && (
              <div className="space-y-4">
                {draft.comments.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-400">
                    Nenhum comentário ainda. Registre andamentos, decisões e pendências.
                  </p>
                )}
                <div className="space-y-3">
                  {draft.comments.map((c) => (
                    <div key={c.id} className="group flex gap-3">
                      <Avatar name={c.author || "?"} size={8} />
                      <div className="min-w-0 flex-1 rounded-2xl p-3 ring-1 bg-stone-50 ring-stone-200">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{c.author || "Sem nome"}</p>
                          <span className="text-xs text-stone-400" title={formatDateTime(c.createdAt)}>{timeAgo(c.createdAt)}</span>
                          <button
                            type="button"
                            aria-label="Excluir comentário"
                            onClick={() => writeComments(draft.comments.filter((x) => x.id !== c.id))}
                            className="ml-auto rounded-lg p-1 text-stone-400 opacity-0 hover:bg-stone-100 hover:text-stone-700 group-hover:opacity-100 focus:opacity-100"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-700">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl p-3 ring-1 bg-white ring-stone-200 focus-within:ring-2 focus-within:ring-stone-900">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        addComment();
                      }
                    }}
                    rows={3}
                    placeholder="Escreva um comentário…"
                    className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-stone-400"
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <input
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      list="assignees"
                      placeholder="Seu nome"
                      aria-label="Autor do comentário"
                      className="w-36 rounded-lg px-2 py-1 text-xs ring-1 bg-stone-50 ring-stone-200 outline-none focus:ring-stone-900"
                    />
                    <div className="flex items-center gap-2">
                      <span className="hidden text-xs text-stone-400 sm:inline">Ctrl+Enter</span>
                      <PrimaryButton icon={Send} onClick={addComment} disabled={!commentText.trim()}>
                        Comentar
                      </PrimaryButton>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button type="submit" className="hidden" />
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir atividade"
        message={<>A atividade <span className="font-medium text-stone-900">“{draft.title}”</span> será excluída permanentemente.</>}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (existing) dispatch({ type: "task/delete", boardId: board.id, taskId: existing.id });
          onClose();
        }}
      />
    </>
  );
}
