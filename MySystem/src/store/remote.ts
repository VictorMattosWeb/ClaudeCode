import type { SupabaseClient } from "@supabase/supabase-js";
import type { Board } from "@/types/activities";
import { fromRows, type BoardRow, type Changes, type TaskRow } from "./sync";

/** O PostgREST limita linhas por requisição; carrega em páginas. */
async function selectAll<T>(client: SupabaseClient, table: string, columns: string): Promise<T[]> {
  const page = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await client.from(table).select(columns).range(from, from + page - 1);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < page) return out;
  }
}

export async function loadRemote(client: SupabaseClient): Promise<Board[]> {
  const [boards, tasks] = await Promise.all([
    selectAll<BoardRow>(client, "boards", "id,name,description,columns,tags,position,created_at"),
    selectAll<TaskRow>(client, "tasks", "id,board_id,position,data"),
  ]);
  return fromRows(boards, tasks);
}

/** Grava as mudanças na ordem que respeita as chaves estrangeiras. */
export async function pushChanges(client: SupabaseClient, c: Changes): Promise<void> {
  const chunk = <T,>(rows: T[], size = 500) => Array.from({ length: Math.ceil(rows.length / size) }, (_, i) => rows.slice(i * size, (i + 1) * size));
  for (const rows of chunk(c.boardsUpsert)) {
    const { error } = await client.from("boards").upsert(rows);
    if (error) throw error;
  }
  for (const rows of chunk(c.tasksUpsert)) {
    const { error } = await client.from("tasks").upsert(rows);
    if (error) throw error;
  }
  for (const ids of chunk(c.tasksDelete)) {
    const { error } = await client.from("tasks").delete().in("id", ids);
    if (error) throw error;
  }
  for (const ids of chunk(c.boardsDelete)) {
    const { error } = await client.from("boards").delete().in("id", ids);
    if (error) throw error;
  }
}

export interface RemoteHandlers {
  board: (row: BoardRow) => void;
  boardDeleted: (id: string) => void;
  task: (row: TaskRow) => void;
  taskDeleted: (id: string) => void;
}

/**
 * Mudanças feitas por OUTROS usuários. O eco das próprias gravações é ignorado pelo updated_by
 * (a mesma pessoa em duas abas não vê uma aba atualizar a outra ao vivo; recarregar resolve).
 */
export function subscribe(client: SupabaseClient, myId: string, h: RemoteHandlers): () => void {
  const channel = client
    .channel("mysystem-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "boards" }, (p) => {
      if (p.eventType === "DELETE") return h.boardDeleted((p.old as { id: string }).id);
      const row = p.new as BoardRow;
      if (row.updated_by !== myId) h.board(row);
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (p) => {
      if (p.eventType === "DELETE") return h.taskDeleted((p.old as { id: string }).id);
      const row = p.new as TaskRow;
      if (row.updated_by !== myId) h.task(row);
    })
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
