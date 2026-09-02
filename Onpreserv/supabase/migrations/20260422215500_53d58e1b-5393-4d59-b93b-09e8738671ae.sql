DROP POLICY IF EXISTS "Sistema cria notificações" ON public.notificacoes;

CREATE POLICY "Cria notificações próprias ou admin"
ON public.notificacoes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));