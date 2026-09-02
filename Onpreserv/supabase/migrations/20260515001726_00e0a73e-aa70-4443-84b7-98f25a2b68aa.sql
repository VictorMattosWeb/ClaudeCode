
-- Recreate tasks_history_and_notify to:
--  * NOT emit tarefa_atribuida (handled exclusively by task_assignees_notify)
--  * Notify ALL admins (except actor) on every task progress (insert + status/priority/prazo/board changes), with rastreabilidade
--  * Record extra history entries for prazo and board changes
CREATE OR REPLACE FUNCTION public.tasks_history_and_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  actor uuid := auth.uid();
  actor_nome text;
  admin_user RECORD;
BEGIN
  SELECT nome INTO actor_nome FROM public.profiles WHERE id = actor;
  actor_nome := COALESCE(actor_nome, 'Sistema');

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_history (task_id, user_id, acao, de, para)
    VALUES (NEW.id, actor, 'criada', NULL, NEW.titulo);

    -- Notifica admins sobre nova tarefa (rastreabilidade)
    FOR admin_user IN
      SELECT user_id FROM public.user_roles WHERE role = 'admin'
    LOOP
      IF admin_user.user_id <> COALESCE(actor, '00000000-0000-0000-0000-000000000000'::uuid) THEN
        INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, referencia_id, referencia_tipo)
        VALUES (
          admin_user.user_id,
          'tarefa_atribuida',
          'Nova tarefa criada',
          actor_nome || ' criou a tarefa: ' || NEW.titulo,
          NEW.id::text,
          'tarefa'
        );
      END IF;
    END LOOP;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.task_history (task_id, user_id, acao, de, para)
      VALUES (NEW.id, actor, 'status', OLD.status::text, NEW.status::text);

      IF NEW.status = 'concluido' AND OLD.status <> 'concluido' THEN
        NEW.concluido_em := COALESCE(NEW.concluido_em, now());
        IF NEW.criado_por IS NOT NULL AND NEW.criado_por <> COALESCE(actor, '00000000-0000-0000-0000-000000000000'::uuid) THEN
          INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, referencia_id, referencia_tipo)
          VALUES (
            NEW.criado_por, 'tarefa_concluida',
            'Tarefa concluída',
            actor_nome || ' concluiu: ' || NEW.titulo,
            NEW.id::text, 'tarefa'
          );
        END IF;
      END IF;

      -- Notifica admins (exceto o autor) sobre mudança de status
      FOR admin_user IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
        IF admin_user.user_id <> COALESCE(actor, '00000000-0000-0000-0000-000000000000'::uuid)
           AND admin_user.user_id <> COALESCE(NEW.criado_por, '00000000-0000-0000-0000-000000000000'::uuid) THEN
          INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, referencia_id, referencia_tipo)
          VALUES (
            admin_user.user_id, 'tarefa_atribuida',
            'Status atualizado',
            actor_nome || ' moveu "' || NEW.titulo || '" de ' || OLD.status::text || ' para ' || NEW.status::text,
            NEW.id::text, 'tarefa'
          );
        END IF;
      END LOOP;
    END IF;

    IF NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id THEN
      INSERT INTO public.task_history (task_id, user_id, acao, de, para)
      VALUES (NEW.id, actor, 'responsavel', OLD.responsavel_id::text, NEW.responsavel_id::text);
      -- Notificação de atribuição é tratada por task_assignees_notify (evita duplicidade)
    END IF;

    IF NEW.prioridade IS DISTINCT FROM OLD.prioridade THEN
      INSERT INTO public.task_history (task_id, user_id, acao, de, para)
      VALUES (NEW.id, actor, 'prioridade', OLD.prioridade::text, NEW.prioridade::text);
    END IF;

    IF NEW.prazo IS DISTINCT FROM OLD.prazo THEN
      INSERT INTO public.task_history (task_id, user_id, acao, de, para)
      VALUES (NEW.id, actor, 'prazo', OLD.prazo::text, NEW.prazo::text);
    END IF;

    IF NEW.board_id IS DISTINCT FROM OLD.board_id THEN
      INSERT INTO public.task_history (task_id, user_id, acao, de, para)
      VALUES (NEW.id, actor, 'quadro', OLD.board_id::text, NEW.board_id::text);
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

-- Garante que a notificação de atribuição não dispara quando o próprio usuário se atribui
CREATE OR REPLACE FUNCTION public.task_assignees_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ttitulo text;
  actor uuid := auth.uid();
  actor_nome text;
BEGIN
  SELECT titulo INTO ttitulo FROM public.tasks WHERE id = NEW.task_id;
  SELECT nome INTO actor_nome FROM public.profiles WHERE id = actor;

  IF NEW.user_id <> COALESCE(actor, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, referencia_id, referencia_tipo)
    VALUES (
      NEW.user_id, 'tarefa_atribuida',
      'Você foi atribuído a uma tarefa',
      COALESCE(actor_nome, 'Alguém') || ' atribuiu você à tarefa: ' || COALESCE(ttitulo, ''),
      NEW.task_id::text, 'tarefa'
    );
  END IF;

  INSERT INTO public.task_history (task_id, user_id, acao, de, para)
  VALUES (NEW.task_id, actor, 'responsavel_add', NULL, NEW.user_id::text);

  RETURN NEW;
END;
$function$;
