// Integration tests — Notificações de tarefas (rastreabilidade + sem duplicidade).
//
// Garante que, em uma operação relevante (criar tarefa, mudar status), cada admin
// recebe EXATAMENTE 1 notificação, com o nome do autor da ação visível na mensagem
// (rastreabilidade). O usuário que executou a ação NÃO deve receber notificação
// para si mesmo, mesmo que ele também seja admin.
//
// Requer as variáveis de ambiente:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   SUPABASE_PUBLISHABLE_KEY  (ou SUPABASE_ANON_KEY)
//
// Execute via: supabase--test_edge_functions { functions: ["notifications-integration"] }

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY =
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY")!;

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function asUser(jwt: string): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

interface EphemeralUser {
  id: string;
  email: string;
  password: string;
  nome: string;
  jwt?: string;
}

const PWD = "Test#Pass1234!";

async function createEphemeralUser(
  sb: SupabaseClient,
  nome: string,
): Promise<EphemeralUser> {
  const email = `notif-it-${crypto.randomUUID()}@example.test`;
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: PWD,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  // handle_new_user trigger já criou profiles + user_roles('user').
  return { id: data.user.id, email, password: PWD, nome };
}

async function promoteToAdmin(sb: SupabaseClient, userId: string) {
  // Substitui o papel 'user' por 'admin'.
  await sb.from("user_roles").delete().eq("user_id", userId);
  const { error } = await sb
    .from("user_roles")
    .insert({ user_id: userId, role: "admin" });
  if (error) throw error;
}

async function signIn(u: EphemeralUser): Promise<string> {
  const sb = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.signInWithPassword({
    email: u.email,
    password: u.password,
  });
  if (error || !data.session) throw error ?? new Error("signIn failed");
  return data.session.access_token;
}

async function cleanup(sb: SupabaseClient, ctx: TestContext) {
  if (ctx.taskId) {
    await sb.from("notificacoes").delete().eq("referencia_id", ctx.taskId);
    await sb.from("task_history").delete().eq("task_id", ctx.taskId);
    await sb.from("tasks").delete().eq("id", ctx.taskId);
  }
  for (const u of [ctx.actor, ctx.admin1, ctx.admin2].filter(Boolean) as EphemeralUser[]) {
    await sb.auth.admin.deleteUser(u.id).catch(() => {});
  }
}

interface TestContext {
  actor?: EphemeralUser;
  admin1?: EphemeralUser;
  admin2?: EphemeralUser;
  taskId?: string;
}

Deno.test("notifications: 1 por admin na criação + rastreabilidade do autor", async () => {
  const sb = admin();
  const ctx: TestContext = {};
  try {
    ctx.actor = await createEphemeralUser(sb, "Autor Teste");
    ctx.admin1 = await createEphemeralUser(sb, "Admin Um");
    ctx.admin2 = await createEphemeralUser(sb, "Admin Dois");
    await promoteToAdmin(sb, ctx.admin1.id);
    await promoteToAdmin(sb, ctx.admin2.id);

    const actorJwt = await signIn(ctx.actor);
    const actorClient = asUser(actorJwt);

    const titulo = `Tarefa IT ${crypto.randomUUID().slice(0, 8)}`;
    const { data: task, error: insErr } = await actorClient
      .from("tasks")
      .insert({ titulo, status: "a_fazer", prioridade: "media" })
      .select("id")
      .single();
    if (insErr || !task) throw insErr ?? new Error("task insert failed");
    ctx.taskId = task.id;

    // Aguarda triggers (síncronos, mas damos um respiro para a propagação do
    // PostgREST/replicação em ambientes lentos).
    await new Promise((r) => setTimeout(r, 250));

    const { data: notifs } = await sb
      .from("notificacoes")
      .select("user_id, mensagem, tipo")
      .eq("referencia_id", task.id)
      .eq("referencia_tipo", "tarefa");

    const byUser = new Map<string, typeof notifs>();
    for (const n of notifs ?? []) {
      const arr = byUser.get(n.user_id) ?? [];
      arr.push(n);
      byUser.set(n.user_id, arr);
    }

    // Autor NÃO recebe notificação para si mesmo
    assertEquals(byUser.get(ctx.actor.id)?.length ?? 0, 0, "actor não deve ser notificado");
    // Cada admin recebe EXATAMENTE 1
    assertEquals(byUser.get(ctx.admin1.id)?.length ?? 0, 1, "admin1 deve receber 1");
    assertEquals(byUser.get(ctx.admin2.id)?.length ?? 0, 1, "admin2 deve receber 1");

    // Rastreabilidade: nome do autor presente na mensagem
    const msg = byUser.get(ctx.admin1.id)![0].mensagem;
    assert(msg.includes(ctx.actor.nome), `mensagem deve citar autor: ${msg}`);
    assert(msg.includes(titulo), `mensagem deve citar título: ${msg}`);
  } finally {
    await cleanup(sb, ctx);
  }
});

Deno.test("notifications: 1 por admin a cada mudança de status (sem duplicidade)", async () => {
  const sb = admin();
  const ctx: TestContext = {};
  try {
    ctx.actor = await createEphemeralUser(sb, "Autor Status");
    ctx.admin1 = await createEphemeralUser(sb, "Admin A");
    ctx.admin2 = await createEphemeralUser(sb, "Admin B");
    await promoteToAdmin(sb, ctx.admin1.id);
    await promoteToAdmin(sb, ctx.admin2.id);

    const actorJwt = await signIn(ctx.actor);
    const actorClient = asUser(actorJwt);

    const { data: task, error: insErr } = await actorClient
      .from("tasks")
      .insert({ titulo: "Tarefa Status IT", status: "a_fazer", prioridade: "media" })
      .select("id")
      .single();
    if (insErr || !task) throw insErr ?? new Error("task insert failed");
    ctx.taskId = task.id;

    await new Promise((r) => setTimeout(r, 250));

    // Conta notificações antes da atualização
    const before = await sb
      .from("notificacoes")
      .select("id, user_id")
      .eq("referencia_id", task.id);
    const beforeByUser = new Map<string, number>();
    for (const n of before.data ?? []) {
      beforeByUser.set(n.user_id, (beforeByUser.get(n.user_id) ?? 0) + 1);
    }

    // Atualiza status (mesma ação, mesmo autor)
    const { error: updErr } = await actorClient
      .from("tasks")
      .update({ status: "em_andamento" })
      .eq("id", task.id);
    if (updErr) throw updErr;

    await new Promise((r) => setTimeout(r, 250));

    const after = await sb
      .from("notificacoes")
      .select("id, user_id, mensagem")
      .eq("referencia_id", task.id);
    const afterByUser = new Map<string, { count: number; msgs: string[] }>();
    for (const n of after.data ?? []) {
      const cur = afterByUser.get(n.user_id) ?? { count: 0, msgs: [] };
      cur.count++;
      cur.msgs.push(n.mensagem);
      afterByUser.set(n.user_id, cur);
    }

    // Cada admin deve ter recebido EXATAMENTE 1 nova notificação.
    for (const a of [ctx.admin1, ctx.admin2]) {
      const delta =
        (afterByUser.get(a.id)?.count ?? 0) - (beforeByUser.get(a.id) ?? 0);
      assertEquals(delta, 1, `${a.nome} deveria receber +1 notificação na mudança de status`);
    }

    // Autor NÃO recebe notificação da própria mudança.
    const actorDelta =
      (afterByUser.get(ctx.actor.id)?.count ?? 0) -
      (beforeByUser.get(ctx.actor.id) ?? 0);
    assertEquals(actorDelta, 0, "autor não deve ser notificado da própria mudança");

    // Rastreabilidade: alguma mensagem do admin cita o autor e a transição.
    const msgs = afterByUser.get(ctx.admin1.id)?.msgs ?? [];
    const hasTrace = msgs.some(
      (m) => m.includes(ctx.actor!.nome) && m.includes("em_andamento"),
    );
    assert(hasTrace, `mensagem de status deve citar autor e novo status: ${msgs.join(" | ")}`);
  } finally {
    await cleanup(sb, ctx);
  }
});

Deno.test("notifications: admin que também é autor não recebe a própria notificação", async () => {
  const sb = admin();
  const ctx: TestContext = {};
  try {
    // Aqui o "actor" também é admin — não pode se autonotificar.
    ctx.actor = await createEphemeralUser(sb, "Admin Autor");
    ctx.admin1 = await createEphemeralUser(sb, "Outro Admin");
    await promoteToAdmin(sb, ctx.actor.id);
    await promoteToAdmin(sb, ctx.admin1.id);

    const actorJwt = await signIn(ctx.actor);
    const actorClient = asUser(actorJwt);

    const { data: task } = await actorClient
      .from("tasks")
      .insert({ titulo: "Self notify check", status: "a_fazer", prioridade: "media" })
      .select("id")
      .single();
    ctx.taskId = task!.id;

    await new Promise((r) => setTimeout(r, 250));

    const { data: notifs } = await sb
      .from("notificacoes")
      .select("user_id")
      .eq("referencia_id", ctx.taskId);

    const counts = new Map<string, number>();
    for (const n of notifs ?? []) counts.set(n.user_id, (counts.get(n.user_id) ?? 0) + 1);

    assertEquals(counts.get(ctx.actor.id) ?? 0, 0, "autor admin não deve se autonotificar");
    assertEquals(counts.get(ctx.admin1.id) ?? 0, 1, "outro admin recebe exatamente 1");
  } finally {
    await cleanup(sb, ctx);
  }
});
