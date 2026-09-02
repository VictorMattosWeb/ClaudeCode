-- Task boards
CREATE TABLE public.task_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text DEFAULT ''::text,
  cor text NOT NULL DEFAULT '#3b82f6',
  posicao integer NOT NULL DEFAULT 0,
  arquivado boolean NOT NULL DEFAULT false,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticado vê quadros" ON public.task_boards
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticado cria quadros" ON public.task_boards
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'viewer'::app_role));

CREATE POLICY "Autenticado edita quadros" ON public.task_boards
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'viewer'::app_role));

CREATE POLICY "Admin deleta quadros" ON public.task_boards
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_task_boards_updated_at
  BEFORE UPDATE ON public.task_boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Adiciona board_id em tasks
ALTER TABLE public.tasks
  ADD COLUMN board_id uuid REFERENCES public.task_boards(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_board_id ON public.tasks(board_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_boards;
ALTER TABLE public.task_boards REPLICA IDENTITY FULL;