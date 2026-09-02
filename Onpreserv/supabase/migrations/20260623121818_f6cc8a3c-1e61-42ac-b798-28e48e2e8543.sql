
-- =========================================================================
-- 1) profiles: remover policy permissiva que expõe e-mail a todos
-- =========================================================================
DROP POLICY IF EXISTS "Autenticado vê perfis básicos" ON public.profiles;

-- View pública apenas com campos não-sensíveis (id, nome, status).
-- security_invoker = false (padrão) para que a view ignore a RLS da tabela
-- subjacente e funcione para listagens cross-user. Não expõe email.
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
  WITH (security_invoker = false, security_barrier = true)
  AS
  SELECT id, nome, status, created_at
  FROM public.profiles;

REVOKE ALL ON public.profiles_public FROM PUBLIC, anon;
GRANT SELECT ON public.profiles_public TO authenticated;

-- RPC para resolver emails -> user_id durante importação (somente authenticated).
-- Retorna apenas pares solicitados, sem permitir enumerar o diretório completo.
CREATE OR REPLACE FUNCTION public.match_user_ids_by_emails(_emails text[])
RETURNS TABLE(id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.email
  FROM public.profiles p
  WHERE p.email = ANY (_emails);
$$;

REVOKE ALL ON FUNCTION public.match_user_ids_by_emails(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_user_ids_by_emails(text[]) TO authenticated;

-- =========================================================================
-- 2) role_permissions: visível apenas para admin
-- =========================================================================
DROP POLICY IF EXISTS "Autenticado vê role_permissions" ON public.role_permissions;
CREATE POLICY "Admin vê role_permissions"
  ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- 3) storage.objects: políticas de task-attachments com verificação de posse
-- =========================================================================
DROP POLICY IF EXISTS "Autenticado vê anexos tarefas" ON storage.objects;
DROP POLICY IF EXISTS "Autenticado envia anexos tarefas" ON storage.objects;
DROP POLICY IF EXISTS "Autenticado deleta anexos tarefas" ON storage.objects;

-- Helper: usuário tem acesso à tarefa referenciada por um path
CREATE OR REPLACE FUNCTION public.user_can_access_task(_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.tasks t
                WHERE t.id = _task_id
                  AND (t.criado_por = auth.uid() OR t.responsavel_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.task_assignees ta
                WHERE ta.task_id = _task_id AND ta.user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.user_can_access_task(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_can_access_task(uuid) TO authenticated;

-- O path é "<task_id>/<arquivo>" (ver TaskContext.uploadAttachment)
CREATE POLICY "Anexos: SELECT por acesso à tarefa"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND public.user_can_access_task(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Anexos: INSERT por acesso à tarefa"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND owner = auth.uid()
    AND public.user_can_access_task(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Anexos: DELETE por autoria/admin"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND (
      owner = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.task_attachments ta
        WHERE ta.path = storage.objects.name
          AND ta.criado_por = auth.uid()
      )
    )
  );

-- =========================================================================
-- 4) realtime.messages: nega broadcast/presence (app usa só postgres_changes)
-- =========================================================================
DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Deny broadcast/presence" ON realtime.messages';
  EXECUTE 'CREATE POLICY "Deny broadcast/presence" ON realtime.messages FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)';
EXCEPTION WHEN insufficient_privilege THEN
  -- Sem privilégio nesta sessão; RLS já está habilitada sem políticas (deny default).
  NULL;
END $$;

-- =========================================================================
-- 5) has_role: SECURITY INVOKER + revogação de EXECUTE em funções definer
-- =========================================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Revoga EXECUTE de todas as outras funções SECURITY DEFINER no schema public
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname <> 'has_role'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
                   r.nspname, r.proname, r.args);
  END LOOP;
END $$;
