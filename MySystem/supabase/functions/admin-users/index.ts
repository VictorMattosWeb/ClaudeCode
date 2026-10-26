// Gestão de contas do MySystem: só um admin logado pode criar, excluir, trocar papel ou redefinir senha.
// Roda no servidor com a service role (nunca exposta ao navegador).
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Body =
  | { action: "create"; email: string; password: string; fullName: string; role?: "admin" | "member" }
  | { action: "delete"; userId: string }
  | { action: "set-role"; userId: string; role: "admin" | "member" }
  | { action: "reset-password"; userId: string; password: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Quem está chamando? (JWT do usuário logado)
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: who } = await caller.auth.getUser();
  if (!who.user) return json({ error: "Sessão inválida" }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: me } = await admin.from("profiles").select("role").eq("id", who.user.id).single();
  if (me?.role !== "admin") return json({ error: "Apenas administradores podem gerenciar contas" }, 403);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Corpo inválido" }, 400);
  }

  switch (body.action) {
    case "create": {
      const email = String(body.email ?? "").trim().toLowerCase();
      const fullName = String(body.fullName ?? "").trim();
      const password = String(body.password ?? "");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "E-mail inválido" }, 400);
      if (!fullName) return json({ error: "Informe o nome" }, 400);
      if (password.length < 8) return json({ error: "A senha precisa ter ao menos 8 caracteres" }, 400);

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (error) return json({ error: error.message }, 400);
      // O trigger cria o perfil como member; promove se pedido.
      if (body.role === "admin") await admin.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
      return json({ id: data.user.id });
    }

    case "delete": {
      if (body.userId === who.user.id) return json({ error: "Você não pode excluir a própria conta" }, 400);
      const { error } = await admin.auth.admin.deleteUser(body.userId);
      return error ? json({ error: error.message }, 400) : json({ ok: true });
    }

    case "set-role": {
      if (body.role !== "admin" && body.role !== "member") return json({ error: "Papel inválido" }, 400);
      // Evita o sistema ficar sem admin.
      if (body.userId === who.user.id && body.role !== "admin") return json({ error: "Você não pode remover o seu próprio acesso de admin" }, 400);
      const { error } = await admin.from("profiles").update({ role: body.role }).eq("id", body.userId);
      return error ? json({ error: error.message }, 400) : json({ ok: true });
    }

    case "reset-password": {
      if (String(body.password ?? "").length < 8) return json({ error: "A senha precisa ter ao menos 8 caracteres" }, 400);
      const { error } = await admin.auth.admin.updateUserById(body.userId, { password: body.password });
      return error ? json({ error: error.message }, 400) : json({ ok: true });
    }

    default:
      return json({ error: "Ação desconhecida" }, 400);
  }
});
