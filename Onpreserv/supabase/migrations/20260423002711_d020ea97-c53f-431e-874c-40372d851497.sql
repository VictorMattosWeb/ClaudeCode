-- Tabela de medições
CREATE TABLE public.cronograma_medicoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  data_referencia DATE,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cronograma_medicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticado vê medições" ON public.cronograma_medicoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin cria medições" ON public.cronograma_medicoes
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin edita medições" ON public.cronograma_medicoes
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin deleta medições" ON public.cronograma_medicoes
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_cronograma_medicoes_updated
  BEFORE UPDATE ON public.cronograma_medicoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Tabela de itens do cronograma
CREATE TABLE public.cronograma_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicao_id UUID NOT NULL REFERENCES public.cronograma_medicoes(id) ON DELETE CASCADE,
  semana TEXT DEFAULT '',
  preservacao TEXT DEFAULT '',
  tag TEXT NOT NULL,
  unidade TEXT NOT NULL,
  gabinete TEXT NOT NULL,
  tipo TEXT DEFAULT '',
  data_prevista DATE,
  data_realizada DATE,
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  observacoes TEXT DEFAULT '',
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cronograma_itens_medicao ON public.cronograma_itens(medicao_id);
CREATE INDEX idx_cronograma_itens_tag ON public.cronograma_itens(tag);

ALTER TABLE public.cronograma_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticado vê itens cronograma" ON public.cronograma_itens
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticado cria itens cronograma" ON public.cronograma_itens
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticado edita itens cronograma" ON public.cronograma_itens
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin deleta itens cronograma" ON public.cronograma_itens
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_cronograma_itens_updated
  BEFORE UPDATE ON public.cronograma_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Liberar permissão de cronograma para todos os usuários existentes
INSERT INTO public.user_permissions (user_id, module, allowed)
SELECT DISTINCT user_id, 'cronograma'::app_module, true
FROM public.user_permissions
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_permissions up2
  WHERE up2.user_id = user_permissions.user_id
    AND up2.module = 'cronograma'::app_module
);

-- Atualizar handle_new_user para incluir cronograma automaticamente
-- (já está coberto pelo loop de enum_range, então só precisa do enum estar atualizado)

-- Trigger de integração automática
CREATE OR REPLACE FUNCTION public.atualizar_cronograma_por_preservacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lote_descricao TEXT;
BEGIN
  SELECT descricao INTO lote_descricao FROM public.lots WHERE id = NEW.lot_id;

  UPDATE public.cronograma_itens
  SET
    data_realizada = NEW.data,
    status = 'PRESERVADO',
    updated_at = now()
  WHERE data_realizada IS NULL
    AND lote_descricao IS NOT NULL
    AND lote_descricao ILIKE '%' || tag || '%'
    AND (tipo = '' OR LOWER(tipo) = LOWER(NEW.tipo));

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_atualizar_cronograma_preservacao
  AFTER INSERT ON public.preservations
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_cronograma_por_preservacao();