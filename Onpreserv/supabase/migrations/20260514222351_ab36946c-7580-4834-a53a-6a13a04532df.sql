
-- ========== ENUMS ==========
CREATE TYPE public.task_status AS ENUM ('a_fazer','em_andamento','em_revisao','concluido','bloqueado');
CREATE TYPE public.task_priority AS ENUM ('baixa','media','alta','critica');
CREATE TYPE public.task_modulo AS ENUM ('lote','cronograma','preservacao','estoque','atividade','solicitacao','geral');

ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'tarefas';
ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'tarefa_atribuida';
ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'tarefa_mencionada';
ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'tarefa_comentario';
ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'tarefa_prazo';
ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'tarefa_vencida';
ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'tarefa_concluida';

-- ========== TABLES ==========
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text DEFAULT '',
  status public.task_status NOT NULL DEFAULT 'a_fazer',
  prioridade public.task_priority NOT NULL DEFAULT 'media',
  responsavel_id uuid,
  criado_por uuid,
  modulo_relacionado public.task_modulo NOT NULL DEFAULT 'geral',
  item_relacionado_id text,
  item_relacionado_descricao text DEFAULT '',
  prazo date,
  concluido_em timestamptz,
  posicao integer NOT NULL DEFAULT 0,
  observacoes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_responsavel ON public.tasks(responsavel_id);

CREATE TABLE public.task_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  cor text NOT NULL DEFAULT '#3b82f6',
  descricao text DEFAULT '',
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.task_label_assignments (
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.task_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  mensagem text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_comments_task ON public.task_comments(task_id);

CREATE TABLE public.task_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.task_comments(id) ON DELETE CASCADE,
  user_id_mencionado uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_mentions_user ON public.task_mentions(user_id_mencionado);

CREATE TABLE public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  nome text NOT NULL,
  path text NOT NULL,
  mime text,
  tamanho bigint,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid,
  acao text NOT NULL,
  de text,
  para text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_history_task ON public.task_history(task_id);

-- ========== RLS ==========
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_label_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

-- tasks
CREATE POLICY "Autenticado vê tarefas" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticado cria tarefas" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'viewer'));
CREATE POLICY "Autenticado edita tarefas" ON public.tasks FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'viewer'));
CREATE POLICY "Admin deleta tarefas" ON public.tasks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- labels
CREATE POLICY "Autenticado vê etiquetas" ON public.task_labels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticado cria etiquetas" ON public.task_labels FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'viewer'));
CREATE POLICY "Autenticado edita etiquetas" ON public.task_labels FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'viewer'));
CREATE POLICY "Admin deleta etiquetas" ON public.task_labels FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- label assignments
CREATE POLICY "Autenticado vê vinculo etiquetas" ON public.task_label_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticado vincula etiquetas" ON public.task_label_assignments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'viewer'));
CREATE POLICY "Autenticado desvincula etiquetas" ON public.task_label_assignments FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'viewer'));

-- comments
CREATE POLICY "Autenticado vê comentarios" ON public.task_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticado cria comentarios" ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.has_role(auth.uid(), 'viewer'));
CREATE POLICY "Usuario edita proprios comentarios" ON public.task_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Usuario deleta proprios comentarios" ON public.task_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- mentions
CREATE POLICY "Autenticado vê mencoes" ON public.task_mentions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticado cria mencoes" ON public.task_mentions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- attachments
CREATE POLICY "Autenticado vê anexos" ON public.task_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticado cria anexos" ON public.task_attachments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = criado_por AND NOT public.has_role(auth.uid(), 'viewer'));
CREATE POLICY "Usuario deleta proprios anexos" ON public.task_attachments FOR DELETE TO authenticated
  USING (auth.uid() = criado_por OR public.has_role(auth.uid(), 'admin'));

-- history
CREATE POLICY "Autenticado vê historico" ON public.task_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sistema cria historico" ON public.task_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ========== TRIGGERS ==========
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- history + notify on task changes
CREATE OR REPLACE FUNCTION public.tasks_history_and_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor uuid := auth.uid();
  resp_nome text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_history (task_id, user_id, acao, de, para)
    VALUES (NEW.id, actor, 'criada', NULL, NEW.titulo);

    IF NEW.responsavel_id IS NOT NULL AND NEW.responsavel_id <> COALESCE(actor, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      EXECUTE format(
        'INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, referencia_id, referencia_tipo) VALUES (%L, %L::public.notificacao_tipo, %L, %L, %L, %L)',
        NEW.responsavel_id, 'tarefa_atribuida',
        'Você foi atribuído a uma tarefa',
        'Tarefa: ' || NEW.titulo,
        NEW.id::text, 'tarefa'
      );
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.task_history (task_id, user_id, acao, de, para)
      VALUES (NEW.id, actor, 'status', OLD.status::text, NEW.status::text);

      IF NEW.status = 'concluido' AND OLD.status <> 'concluido' THEN
        NEW.concluido_em := COALESCE(NEW.concluido_em, now());
        IF NEW.criado_por IS NOT NULL AND NEW.criado_por <> COALESCE(actor, '00000000-0000-0000-0000-000000000000'::uuid) THEN
          EXECUTE format(
            'INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, referencia_id, referencia_tipo) VALUES (%L, %L::public.notificacao_tipo, %L, %L, %L, %L)',
            NEW.criado_por, 'tarefa_concluida',
            'Tarefa concluída',
            'Tarefa concluída: ' || NEW.titulo,
            NEW.id::text, 'tarefa'
          );
        END IF;
      END IF;
    END IF;

    IF NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id THEN
      INSERT INTO public.task_history (task_id, user_id, acao, de, para)
      VALUES (NEW.id, actor, 'responsavel', OLD.responsavel_id::text, NEW.responsavel_id::text);

      IF NEW.responsavel_id IS NOT NULL AND NEW.responsavel_id <> COALESCE(actor, '00000000-0000-0000-0000-000000000000'::uuid) THEN
        EXECUTE format(
          'INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, referencia_id, referencia_tipo) VALUES (%L, %L::public.notificacao_tipo, %L, %L, %L, %L)',
          NEW.responsavel_id, 'tarefa_atribuida',
          'Você foi atribuído a uma tarefa',
          'Tarefa: ' || NEW.titulo,
          NEW.id::text, 'tarefa'
        );
      END IF;
    END IF;

    IF NEW.prioridade IS DISTINCT FROM OLD.prioridade THEN
      INSERT INTO public.task_history (task_id, user_id, acao, de, para)
      VALUES (NEW.id, actor, 'prioridade', OLD.prioridade::text, NEW.prioridade::text);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tasks_history_notify
AFTER INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.tasks_history_and_notify();

-- comments → notify
CREATE OR REPLACE FUNCTION public.task_comments_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  resp uuid;
  ttitulo text;
BEGIN
  SELECT responsavel_id, titulo INTO resp, ttitulo FROM public.tasks WHERE id = NEW.task_id;
  INSERT INTO public.task_history (task_id, user_id, acao, de, para)
  VALUES (NEW.task_id, NEW.user_id, 'comentario', NULL, left(NEW.mensagem, 80));

  IF resp IS NOT NULL AND resp <> NEW.user_id THEN
    EXECUTE format(
      'INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, referencia_id, referencia_tipo) VALUES (%L, %L::public.notificacao_tipo, %L, %L, %L, %L)',
      resp, 'tarefa_comentario',
      'Novo comentário em tarefa',
      'Tarefa: ' || ttitulo,
      NEW.task_id::text, 'tarefa'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_task_comments_notify
AFTER INSERT ON public.task_comments
FOR EACH ROW EXECUTE FUNCTION public.task_comments_notify();

-- mentions → notify
CREATE OR REPLACE FUNCTION public.task_mentions_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ttitulo text;
BEGIN
  SELECT titulo INTO ttitulo FROM public.tasks WHERE id = NEW.task_id;
  IF NEW.user_id_mencionado <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) THEN
    EXECUTE format(
      'INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, referencia_id, referencia_tipo) VALUES (%L, %L::public.notificacao_tipo, %L, %L, %L, %L)',
      NEW.user_id_mencionado, 'tarefa_mencionada',
      'Você foi mencionado em uma tarefa',
      'Tarefa: ' || ttitulo,
      NEW.task_id::text, 'tarefa'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_task_mentions_notify
AFTER INSERT ON public.task_mentions
FOR EACH ROW EXECUTE FUNCTION public.task_mentions_notify();

-- ========== STORAGE ==========
INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Autenticado vê anexos tarefas" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'task-attachments');
CREATE POLICY "Autenticado envia anexos tarefas" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-attachments');
CREATE POLICY "Autenticado deleta anexos tarefas" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'task-attachments');

-- ========== REALTIME ==========
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.task_comments REPLICA IDENTITY FULL;
ALTER TABLE public.task_label_assignments REPLICA IDENTITY FULL;
ALTER TABLE public.task_history REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_label_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_history;

-- ========== DEFAULT LABELS ==========
INSERT INTO public.task_labels (nome, cor, descricao) VALUES
  ('Campo', '#10b981', 'Atividades de campo'),
  ('Almoxarifado', '#f59e0b', 'Atividades de almoxarifado'),
  ('Urgente', '#ef4444', 'Tarefas urgentes'),
  ('Documentação', '#6366f1', 'Documentação técnica'),
  ('Estoque', '#0ea5e9', 'Relacionado ao estoque'),
  ('Cronograma', '#8b5cf6', 'Relacionado ao cronograma'),
  ('Preservação', '#14b8a6', 'Atividades de preservação'),
  ('Evidência', '#ec4899', 'Coleta de evidências')
ON CONFLICT (nome) DO NOTHING;
