-- Permite que usuários autenticados leiam a matriz global de permissões.
-- Isso é necessário para o app aplicar exatamente o que foi configurado por perfil.
DROP POLICY IF EXISTS "Admin vê role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Autenticados veem permissões globais" ON public.role_permissions;

CREATE POLICY "Autenticados veem permissões globais"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (true);

-- Garante que administradores continuem com acesso total independentemente da matriz salva.
UPDATE public.role_permissions
SET allowed = true, updated_at = now()
WHERE role = 'admin'::public.app_role;

-- Garante que novos usuários sem permissões herdadas dependam das permissões globais por perfil,
-- e não de registros individuais antigos criados como todos liberados.
UPDATE public.user_permissions
SET is_override = false
WHERE is_override IS NULL;