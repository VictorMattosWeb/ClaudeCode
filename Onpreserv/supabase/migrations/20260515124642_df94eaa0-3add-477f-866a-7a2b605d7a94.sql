
CREATE TABLE public.solicitacoes_edicao_preservacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preservation_id UUID NOT NULL,
  lot_id UUID NOT NULL,
  dados_atuais JSONB NOT NULL,
  dados_propostos JSONB NOT NULL,
  justificativa TEXT NOT NULL,
  status public.solicitacao_status NOT NULL DEFAULT 'pendente',
  solicitante_id UUID NOT NULL,
  analisado_por UUID,
  resposta TEXT,
  data_solicitacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_resposta TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitacoes_edicao_preservacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário cria próprias solicitações edição"
  ON public.solicitacoes_edicao_preservacao FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = solicitante_id AND NOT has_role(auth.uid(), 'viewer'::app_role));

CREATE POLICY "Usuário vê próprias solicitações edição"
  ON public.solicitacoes_edicao_preservacao FOR SELECT TO authenticated
  USING (auth.uid() = solicitante_id);

CREATE POLICY "Admin vê todas solicitações edição"
  ON public.solicitacoes_edicao_preservacao FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin atualiza solicitações edição"
  ON public.solicitacoes_edicao_preservacao FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin deleta solicitações edição"
  ON public.solicitacoes_edicao_preservacao FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_sep_updated_at
  BEFORE UPDATE ON public.solicitacoes_edicao_preservacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Notify admins on new request
CREATE OR REPLACE FUNCTION public.notify_admins_on_edicao_preservacao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  admin_user RECORD;
  solicitante_nome TEXT;
BEGIN
  SELECT nome INTO solicitante_nome FROM public.profiles WHERE id = NEW.solicitante_id;
  FOR admin_user IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, referencia_id, referencia_tipo)
    VALUES (
      admin_user.user_id,
      'solicitacao_criada',
      'Nova solicitação de edição de preservação',
      COALESCE(solicitante_nome, 'Um usuário') || ' solicitou alterar uma preservação.',
      NEW.id::text,
      'solicitacao_edicao_preservacao'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admins_edicao_preservacao
  AFTER INSERT ON public.solicitacoes_edicao_preservacao
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_edicao_preservacao();

-- Apply changes when approved + notify solicitante
CREATE OR REPLACE FUNCTION public.aplicar_edicao_preservacao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  notif_tipo public.notificacao_tipo;
  notif_titulo TEXT;
  novos JSONB;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'aprovado' THEN
    notif_tipo := 'solicitacao_aprovada';
    notif_titulo := 'Solicitação de edição aprovada';
    novos := NEW.dados_propostos;
    UPDATE public.preservations
       SET data         = COALESCE((novos->>'data')::date, data),
           tipo         = COALESCE(novos->>'tipo', tipo),
           responsavel  = COALESCE(novos->>'responsavel', responsavel),
           observacoes  = COALESCE(novos->>'observacoes', observacoes)
     WHERE id = NEW.preservation_id;
  ELSIF NEW.status = 'recusado' THEN
    notif_tipo := 'solicitacao_recusada';
    notif_titulo := 'Solicitação de edição recusada';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, referencia_id, referencia_tipo)
  VALUES (
    NEW.solicitante_id,
    notif_tipo,
    notif_titulo,
    'Sua solicitação de edição de preservação foi ' || NEW.status::text || '.',
    NEW.id::text,
    'solicitacao_edicao_preservacao'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_aplicar_edicao_preservacao
  AFTER UPDATE ON public.solicitacoes_edicao_preservacao
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_edicao_preservacao();

ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitacoes_edicao_preservacao;
