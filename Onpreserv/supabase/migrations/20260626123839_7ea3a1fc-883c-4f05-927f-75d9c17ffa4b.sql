
CREATE TABLE public.rdo_dias (
  data DATE PRIMARY KEY,
  atividades JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rdo_dias TO authenticated;
GRANT ALL ON public.rdo_dias TO service_role;
ALTER TABLE public.rdo_dias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados podem ver RDO" ON public.rdo_dias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem inserir RDO" ON public.rdo_dias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem atualizar RDO" ON public.rdo_dias FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Autenticados podem excluir RDO" ON public.rdo_dias FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_rdo_dias_updated BEFORE UPDATE ON public.rdo_dias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.rdo_grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rdo_grupos TO authenticated;
GRANT ALL ON public.rdo_grupos TO service_role;
ALTER TABLE public.rdo_grupos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados podem ver grupos RDO" ON public.rdo_grupos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados podem inserir grupos RDO" ON public.rdo_grupos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados podem atualizar grupos RDO" ON public.rdo_grupos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Autenticados podem excluir grupos RDO" ON public.rdo_grupos FOR DELETE TO authenticated USING (true);

INSERT INTO public.rdo_grupos (nome) VALUES
  ('Reuniões'), ('Desenvolvimento'), ('Planejamento'), ('Atendimento')
ON CONFLICT (nome) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.rdo_dias;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rdo_grupos;
