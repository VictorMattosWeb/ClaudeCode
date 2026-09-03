import { supabase } from "@/services/adapters/supabase/client";
import { ALL_MODULES, type AppModule, type AppRole } from "@/context/AuthContext";

/**
 * Aplica as permissões globais do perfil (role_permissions, ação "view") aos
 * usuários informados, sobrescrevendo seus user_permissions — exceto aqueles
 * marcados como `is_override = true`.
 *
 * Use após:
 * - salvar a matriz global por perfil;
 * - mover usuário entre colunas (mudança de role);
 * - desativar a flag "permissão personalizada" no formulário do usuário.
 */
export async function applyRolePermissionsToUsers(role: AppRole, userIds: string[]) {
  if (!userIds.length) return;

  // 1) Carrega permissões globais "view" daquele perfil
  const { data: rolePerms } = await supabase
    .from("role_permissions")
    .select("module, allowed")
    .eq("role", role)
    .eq("action", "view");

  const moduleAllowed: Record<AppModule, boolean> = ALL_MODULES.reduce(
    (acc, m) => ({ ...acc, [m]: role === "admin" }), // admin sempre vê tudo
    {} as Record<AppModule, boolean>,
  );
  (rolePerms ?? []).forEach((r: any) => {
    if (r.module in moduleAllowed) moduleAllowed[r.module as AppModule] = !!r.allowed;
  });

  // 2) Filtra usuários sem override
  const { data: overrideRows } = await supabase
    .from("user_permissions")
    .select("user_id")
    .in("user_id", userIds)
    .eq("is_override", true);

  const overrideSet = new Set((overrideRows ?? []).map((r: any) => r.user_id));
  const targets = userIds.filter((id) => !overrideSet.has(id));
  if (!targets.length) return;

  // 3) Reescreve as permissões herdadas
  await supabase
    .from("user_permissions")
    .delete()
    .in("user_id", targets)
    .eq("is_override", false);

  const rows = targets.flatMap((uid) =>
    ALL_MODULES.map((m) => ({
      user_id: uid,
      module: m,
      allowed: moduleAllowed[m],
      is_override: false,
    })),
  );
  if (rows.length) await supabase.from("user_permissions").insert(rows);
}
