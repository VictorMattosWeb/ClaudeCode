DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_aprovacao') THEN
    CREATE TYPE public.task_aprovacao AS ENUM ('pendente','aprovado','reprovado');
  END IF;
END $$;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS aprovacao public.task_aprovacao NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS aprovado_por uuid,
  ADD COLUMN IF NOT EXISTS aprovado_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS aprovacao_observacao text;