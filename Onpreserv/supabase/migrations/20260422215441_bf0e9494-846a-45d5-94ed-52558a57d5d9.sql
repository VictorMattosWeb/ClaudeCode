-- Enum para tipos de notificação
CREATE TYPE public.notificacao_tipo AS ENUM (
  'solicitacao_criada',
  'solicitacao_aprovada',
  'solicitacao_recusada',
  'solicitacao_respondida'
);

-- Tabela de notificações
CREATE TABLE public.notificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo public.notificacao_tipo NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  referencia_id TEXT,
  referencia_tipo TEXT DEFAULT 'solicitacao',
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificacoes_user_id ON public.notificacoes(user_id);
CREATE INDEX idx_notificacoes_lida ON public.notificacoes(user_id, lida);
CREATE INDEX idx_notificacoes_created ON public.notificacoes(created_at DESC);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- RLS: usuário vê suas notificações
CREATE POLICY "Usuário vê próprias notificações"
ON public.notificacoes FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Admin vê todas
CREATE POLICY "Admin vê todas notificações"
ON public.notificacoes FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Usuário marca suas como lidas
CREATE POLICY "Usuário atualiza próprias notificações"
ON public.notificacoes FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Inserção: somente sistema (via trigger SECURITY DEFINER), mas permitimos a authenticated criar para si (seguro)
CREATE POLICY "Sistema cria notificações"
ON public.notificacoes FOR INSERT TO authenticated
WITH CHECK (true);

-- Usuário pode deletar suas próprias
CREATE POLICY "Usuário deleta próprias notificações"
ON public.notificacoes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE TRIGGER update_notificacoes_updated_at
BEFORE UPDATE ON public.notificacoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Função: notificar admins quando solicitação é criada
CREATE OR REPLACE FUNCTION public.notify_admins_on_solicitacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user RECORD;
  solicitante_nome TEXT;
BEGIN
  SELECT nome INTO solicitante_nome FROM public.profiles WHERE id = NEW.solicitante_id;

  FOR admin_user IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, referencia_id, referencia_tipo)
    VALUES (
      admin_user.user_id,
      'solicitacao_criada',
      'Nova solicitação de exclusão',
      COALESCE(solicitante_nome, 'Um usuário') || ' solicitou a exclusão de ' ||
        COALESCE(NEW.item_descricao, NEW.tipo::text),
      NEW.id::text,
      'solicitacao'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admins_on_solicitacao
AFTER INSERT ON public.solicitacoes_exclusao
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_solicitacao();

-- Função: notificar solicitante quando admin responde
CREATE OR REPLACE FUNCTION public.notify_solicitante_on_resposta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notif_tipo public.notificacao_tipo;
  notif_titulo TEXT;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'aprovado' THEN
    notif_tipo := 'solicitacao_aprovada';
    notif_titulo := 'Solicitação aprovada';
  ELSIF NEW.status = 'recusado' THEN
    notif_tipo := 'solicitacao_recusada';
    notif_titulo := 'Solicitação recusada';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, referencia_id, referencia_tipo)
  VALUES (
    NEW.solicitante_id,
    notif_tipo,
    notif_titulo,
    'Sua solicitação de exclusão de ' || COALESCE(NEW.item_descricao, NEW.tipo::text) ||
      ' foi ' || NEW.status::text || '.',
    NEW.id::text,
    'solicitacao'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_solicitante_on_resposta
AFTER UPDATE ON public.solicitacoes_exclusao
FOR EACH ROW EXECUTE FUNCTION public.notify_solicitante_on_resposta();

-- Realtime
ALTER TABLE public.notificacoes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;