-- RDO dias
DROP POLICY IF EXISTS "Autenticados podem inserir RDO" ON public.rdo_dias;
DROP POLICY IF EXISTS "Autenticados podem atualizar RDO" ON public.rdo_dias;
DROP POLICY IF EXISTS "Autenticados podem excluir RDO" ON public.rdo_dias;
CREATE POLICY "Nao-viewer insere RDO" ON public.rdo_dias FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'viewer'));
CREATE POLICY "Nao-viewer atualiza RDO" ON public.rdo_dias FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'viewer'))
  WITH CHECK (auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'viewer'));
CREATE POLICY "Admin exclui RDO" ON public.rdo_dias FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RDO grupos
DROP POLICY IF EXISTS "Autenticados podem inserir grupos RDO" ON public.rdo_grupos;
DROP POLICY IF EXISTS "Autenticados podem atualizar grupos RDO" ON public.rdo_grupos;
DROP POLICY IF EXISTS "Autenticados podem excluir grupos RDO" ON public.rdo_grupos;
CREATE POLICY "Admin insere grupos RDO" ON public.rdo_grupos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin atualiza grupos RDO" ON public.rdo_grupos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin exclui grupos RDO" ON public.rdo_grupos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- task_history
DROP POLICY IF EXISTS "Sistema cria historico" ON public.task_history;
CREATE POLICY "Historico apenas de tarefas acessiveis" ON public.task_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND public.user_can_access_task(task_id));

-- task_mentions
DROP POLICY IF EXISTS "Autenticado cria mencoes" ON public.task_mentions;
CREATE POLICY "Mencoes apenas de tarefas acessiveis" ON public.task_mentions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND public.user_can_access_task(task_id));

-- SECURITY DEFINER functions: revoke public execution
REVOKE EXECUTE ON FUNCTION public.aplicar_edicao_preservacao() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.atualizar_cronograma_por_preservacao() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.gerar_identificador_estoque(public.stock_item_tipo) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.gerar_identificador_lote(public.lot_tipo) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_admins_on_edicao_preservacao() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_admins_on_solicitacao() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_solicitante_on_resposta() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.prevent_last_admin_deactivation() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.prevent_last_admin_removal() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_identificador_estoque() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_identificador_lote() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.task_assignees_notify() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.task_comments_notify() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.task_mentions_notify() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.tasks_history_and_notify() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.list_public_profiles() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.match_user_ids_by_emails(text[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_can_access_task(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.list_public_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_user_ids_by_emails(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_task(uuid) TO authenticated;