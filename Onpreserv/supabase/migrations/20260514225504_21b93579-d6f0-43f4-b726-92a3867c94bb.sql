
CREATE TABLE public.task_subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  concluido boolean NOT NULL DEFAULT false,
  posicao integer NOT NULL DEFAULT 0,
  criado_por uuid,
  concluido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_subtasks_task ON public.task_subtasks(task_id, posicao);

ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticado vê subtarefas" ON public.task_subtasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticado cria subtarefas" ON public.task_subtasks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'viewer'::app_role));

CREATE POLICY "Autenticado edita subtarefas" ON public.task_subtasks
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'viewer'::app_role));

CREATE POLICY "Autenticado exclui subtarefas" ON public.task_subtasks
  FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'viewer'::app_role));

CREATE TRIGGER trg_task_subtasks_updated
  BEFORE UPDATE ON public.task_subtasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.task_subtasks;
