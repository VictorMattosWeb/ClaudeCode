
-- Revoke EXECUTE from PUBLIC and anon for all SECURITY DEFINER functions in public schema.
-- Trigger functions do not require EXECUTE permission on the calling role; the trigger
-- system invokes them directly. Only functions used by application code/RLS need EXECUTE.

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.set_identificador_estoque() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_identificador_lote() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gerar_identificador_estoque(public.stock_item_tipo) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.gerar_identificador_lote(public.lot_tipo) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.notify_admins_on_solicitacao() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_solicitante_on_resposta() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.atualizar_cronograma_por_preservacao() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.task_assignees_notify() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.task_mentions_notify() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.task_comments_notify() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tasks_history_and_notify() FROM PUBLIC, anon, authenticated;

-- Grant EXECUTE to authenticated for functions that are legitimately called by app code / RLS:
-- has_role is used inside RLS policies and must be callable by authenticated users.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Identifier generators are called by triggers (set_identificador_*) but the underlying
-- generators themselves are not directly invoked by clients; keep them restricted.
-- (No GRANT for gerar_identificador_* — only the trigger functions call them, and those
--  run as SECURITY DEFINER owned by the same role.)
