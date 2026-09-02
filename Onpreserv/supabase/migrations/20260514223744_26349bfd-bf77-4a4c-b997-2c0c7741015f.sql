-- Multi-assignees for tasks
CREATE TABLE public.task_assignees (
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticado vê assignees" ON public.task_assignees
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticado cria assignees" ON public.task_assignees
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'viewer'::app_role));

CREATE POLICY "Autenticado deleta assignees" ON public.task_assignees
  FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'viewer'::app_role));

CREATE INDEX idx_task_assignees_user ON public.task_assignees(user_id);

CREATE OR REPLACE FUNCTION public.task_assignees_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ttitulo text;
BEGIN
  SELECT titulo INTO ttitulo FROM public.tasks WHERE id = NEW.task_id;
  IF NEW.user_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, referencia_id, referencia_tipo)
    VALUES (NEW.user_id, 'tarefa_atribuida', 'Você foi atribuído a uma tarefa',
      'Tarefa: ' || COALESCE(ttitulo,''), NEW.task_id::text, 'tarefa');
  END IF;

  INSERT INTO public.task_history (task_id, user_id, acao, de, para)
  VALUES (NEW.task_id, auth.uid(), 'responsavel_add', NULL, NEW.user_id::text);

  RETURN NEW;
END $$;

CREATE TRIGGER task_assignees_after_insert
AFTER INSERT ON public.task_assignees
FOR EACH ROW EXECUTE FUNCTION public.task_assignees_notify();

ALTER PUBLICATION supabase_realtime ADD TABLE public.task_assignees;