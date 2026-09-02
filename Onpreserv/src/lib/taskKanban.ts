import { Task, TaskStatus, TASK_STATUS_ORDER } from "@/types/task";

/**
 * Ordenação do quadro.
 *
 * -----------------------------------------------------------------------------
 * INVARIANTE: `items` está sempre na ordem em que o quadro é lido — agrupado na
 * sequência de `TASK_STATUS_ORDER` e, dentro de cada coluna, na ordem visual.
 * -----------------------------------------------------------------------------
 *
 * Era exatamente isso que faltava. O arrasto reordenava o array, mas a
 * renderização reagrupava com `sort((a, b) => a.posicao - b.posicao)` — e
 * `posicao` só muda no fim do arrasto. Resultado: a tarefa voltava para o lugar
 * antigo durante o movimento e só "pulava" para o destino depois de soltar.
 *
 * Com o array em ordem canônica, a renderização apenas filtra por coluna,
 * preservando a ordem — o que se vê arrastando é o que fica.
 */

export interface PendingTaskMove {
  status: TaskStatus;
  posicao: number;
}

const listSignature = (values?: Array<string | null | undefined>) =>
  (values ?? []).filter(Boolean).join("|");

export function getTaskRenderSignature(task: Task): string {
  return [
    task.id,
    task.status,
    String(task.posicao),
    task.updated_at,
    task.titulo,
    task.descricao ?? "",
    task.prioridade,
    task.responsavel_id ?? "",
    task.modulo_relacionado,
    task.item_relacionado_id ?? "",
    task.item_relacionado_descricao ?? "",
    task.prazo ?? "",
    task.observacoes ?? "",
    task.board_id ?? "",
    listSignature(task.assignees),
    listSignature(task.labels?.map((label) => `${label.id}:${label.nome}:${label.cor}:${label.descricao ?? ""}`)),
  ].join("¦");
}

export function mergeKanbanItems(prev: Task[], incoming: Task[], pending: Map<string, PendingTaskMove>): Task[] {
  for (const task of incoming) {
    const pendingMove = pending.get(task.id);
    if (pendingMove && task.status === pendingMove.status && task.posicao === pendingMove.posicao) {
      pending.delete(task.id);
    }
  }

  // Reordena depois de aplicar as pendências: um movimento otimista muda
  // status/posição, e sem o re-sort a lista sairia da ordem canônica.
  return sortKanbanItems(
    incoming.map((task) => {
      const pendingMove = pending.get(task.id);
      return pendingMove ? { ...task, status: pendingMove.status, posicao: pendingMove.posicao } : task;
    }),
  );
}

export function shouldReuseKanbanItems(prev: Task[], next: Task[]): boolean {
  return (
    prev.length === next.length &&
    prev.every((task, index) => {
      const candidate = next[index];
      return candidate && getTaskRenderSignature(task) === getTaskRenderSignature(candidate);
    })
  );
}

const STATUS_RANK = new Map<TaskStatus, number>(
  TASK_STATUS_ORDER.map((status, index) => [status, index]),
);

/**
 * Coloca a lista na ordem canônica. Usado sempre que dados chegam do servidor,
 * onde a ordem do array não tem garantia nenhuma.
 *
 * O desempate por `id` evita que duas tarefas com a mesma `posicao` — situação
 * real depois de mover entre colunas — troquem de lugar sozinhas entre renders.
 */
export function sortKanbanItems(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const rank = (STATUS_RANK.get(a.status) ?? 0) - (STATUS_RANK.get(b.status) ?? 0);
    if (rank !== 0) return rank;
    if (a.posicao !== b.posicao) return a.posicao - b.posicao;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Agrupa por coluna **preservando a ordem do array**, sem reordenar por
 * `posicao`. É o que faz a pré-visualização do arrasto ser fiel.
 */
export function groupByStatus(items: Task[]): Map<TaskStatus, Task[]> {
  const map = new Map<TaskStatus, Task[]>();
  TASK_STATUS_ORDER.forEach((status) => map.set(status, []));
  items.forEach((task) => map.get(task.status)?.push(task));
  return map;
}

/**
 * Move uma tarefa para uma posição do quadro.
 *
 * `overId` é o id da tarefa sob o cursor ou `col-<status>` quando o alvo é a
 * área vazia de uma coluna. Toda a aritmética é feita em índices do array
 * canônico: inserir "antes do alvo" significa a mesma coisa dentro e entre
 * colunas, o que elimina o caso especial que antes empurrava tudo para o fim.
 */
export function moveTask(items: Task[], activeId: string, overId: string): Task[] {
  const from = items.findIndex((t) => t.id === activeId);
  if (from === -1) return items;

  const targetStatus: TaskStatus | null = overId.startsWith("col-")
    ? (overId.slice(4) as TaskStatus)
    : (items.find((t) => t.id === overId)?.status ?? null);
  if (!targetStatus) return items;

  const moved: Task = { ...items[from], status: targetStatus };
  const without = items.filter((_, i) => i !== from);

  // Alvo é a coluna (vazia ou abaixo do último card): entra no fim dela.
  if (overId.startsWith("col-")) {
    const lastOfColumn = without.reduce(
      (acc, task, i) => (task.status === targetStatus ? i : acc),
      -1,
    );
    if (lastOfColumn === -1) {
      // Coluna vazia: insere respeitando a ordem das colunas para manter o
      // invariante, sem depender de um re-sort posterior.
      const rank = STATUS_RANK.get(targetStatus) ?? 0;
      const at = without.findIndex((t) => (STATUS_RANK.get(t.status) ?? 0) > rank);
      const next = [...without];
      next.splice(at === -1 ? next.length : at, 0, moved);
      return next;
    }
    const next = [...without];
    next.splice(lastOfColumn + 1, 0, moved);
    return next;
  }

  // Alvo é um card. As duas situações têm semânticas diferentes:
  //
  //  - Mesma coluna: vale a regra do `arrayMove`. Arrastar para baixo faz a
  //    tarefa OCUPAR o lugar do alvo e empurrá-lo para cima; por isso o índice
  //    de inserção é medido no array original, não no array já sem a tarefa.
  //    Medir depois da remoção faria "a1 sobre a2" não sair do lugar.
  //
  //  - Entre colunas: a tarefa não deixa buraco na coluna de destino, então
  //    ela simplesmente entra ANTES do alvo, empurrando-o para baixo — que é o
  //    que a mão espera ao soltar em cima de um card.
  const originalTo = items.findIndex((t) => t.id === overId);
  if (originalTo === -1) return items;

  const mesmaColuna = items[from].status === targetStatus;
  const at = mesmaColuna ? originalTo : without.findIndex((t) => t.id === overId);

  const next = [...without];
  next.splice(at, 0, moved);
  return next;
}

export function normalizeKanbanPositions(tasks: Task[]): Task[] {
  const counters = new Map<TaskStatus, number>();
  return tasks.map((task) => {
    const posicao = (counters.get(task.status) ?? 0) + 1;
    counters.set(task.status, posicao);
    return { ...task, posicao };
  });
}

export function buildTaskReorderUpdates(next: Task[], original: Task[]) {
  const originalMap = new Map(original.map((task) => [task.id, task]));

  return next.reduce<{ id: string; status: TaskStatus; posicao: number }[]>((updates, task) => {
    const current = originalMap.get(task.id);
    if (!current) return updates;
    if (current.status !== task.status || current.posicao !== task.posicao) {
      updates.push({ id: task.id, status: task.status, posicao: task.posicao });
    }
    return updates;
  }, []);
}