-- Garante realtime para tabelas ainda não publicadas
ALTER TABLE public.task_labels REPLICA IDENTITY FULL;
ALTER TABLE public.task_attachments REPLICA IDENTITY FULL;
ALTER TABLE public.task_mentions REPLICA IDENTITY FULL;
ALTER TABLE public.cronograma_medicoes REPLICA IDENTITY FULL;
ALTER TABLE public.cronograma_itens REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='task_labels') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_labels;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='task_attachments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_attachments;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='task_mentions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_mentions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='cronograma_medicoes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cronograma_medicoes;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='cronograma_itens') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cronograma_itens;
  END IF;
END $$;

-- Garante REPLICA IDENTITY FULL nas tabelas que já estão publicadas para
-- entregar payloads completos (importante para DELETE / UPDATE no cliente).
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.task_boards REPLICA IDENTITY FULL;
ALTER TABLE public.task_assignees REPLICA IDENTITY FULL;
ALTER TABLE public.task_label_assignments REPLICA IDENTITY FULL;
ALTER TABLE public.task_subtasks REPLICA IDENTITY FULL;
ALTER TABLE public.task_comments REPLICA IDENTITY FULL;
ALTER TABLE public.task_history REPLICA IDENTITY FULL;