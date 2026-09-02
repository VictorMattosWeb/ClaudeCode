
-- ============================================================
-- TABELAS: lots, preservations, activities, stock_items, stock_movements
-- ============================================================

-- LOTES
CREATE TABLE public.lots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  nota_fiscal TEXT DEFAULT '',
  fornecedor TEXT DEFAULT '',
  quantidade NUMERIC NOT NULL DEFAULT 0,
  unidade TEXT DEFAULT 'un',
  localizacao TEXT DEFAULT '',
  data_recebimento DATE,
  status TEXT NOT NULL DEFAULT 'ativo',
  observacoes TEXT DEFAULT '',
  criado_por UUID,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticado vê lotes" ON public.lots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticado cria lotes" ON public.lots FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticado edita lotes" ON public.lots FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin deleta lotes" ON public.lots FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_lots_updated_at BEFORE UPDATE ON public.lots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- PRESERVAÇÕES (vinculadas a lotes)
CREATE TABLE public.preservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lot_id UUID NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  observacoes TEXT DEFAULT '',
  criado_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.preservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticado vê preservações" ON public.preservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticado cria preservações" ON public.preservations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticado edita preservações" ON public.preservations FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin deleta preservações" ON public.preservations FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_preservations_updated_at BEFORE UPDATE ON public.preservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_preservations_lot ON public.preservations(lot_id);

-- ATIVIDADES DE PRESERVAÇÃO
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'preservacao',
  frequencia_almoxarifado INTEGER NOT NULL DEFAULT 30,
  frequencia_campo INTEGER NOT NULL DEFAULT 30,
  observacoes TEXT DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticado vê atividades" ON public.activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticado cria atividades" ON public.activities FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticado edita atividades" ON public.activities FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin deleta atividades" ON public.activities FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_activities_updated_at BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ITENS DE ESTOQUE
CREATE TABLE public.stock_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT DEFAULT '',
  nota_fiscal TEXT DEFAULT '',
  fornecedor TEXT DEFAULT '',
  quantidade NUMERIC NOT NULL DEFAULT 0,
  unidade TEXT DEFAULT 'un',
  localizacao TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ativo',
  observacoes TEXT DEFAULT '',
  estoque_minimo NUMERIC DEFAULT 0,
  criado_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticado vê estoque" ON public.stock_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticado cria estoque" ON public.stock_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticado edita estoque" ON public.stock_items FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin deleta estoque" ON public.stock_items FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_stock_items_updated_at BEFORE UPDATE ON public.stock_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- MOVIMENTAÇÕES DE ESTOQUE
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- entrada | saida | ajuste
  quantidade NUMERIC NOT NULL,
  data DATE NOT NULL,
  responsavel TEXT NOT NULL,
  observacoes TEXT DEFAULT '',
  referencia TEXT,
  quantidade_resultante NUMERIC NOT NULL,
  criado_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticado vê movimentações" ON public.stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticado cria movimentações" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin deleta movimentações" ON public.stock_movements FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_stock_movements_item ON public.stock_movements(item_id);

-- ============================================================
-- REALTIME: habilitar replicação para todas as tabelas relevantes
-- ============================================================
ALTER TABLE public.lots REPLICA IDENTITY FULL;
ALTER TABLE public.preservations REPLICA IDENTITY FULL;
ALTER TABLE public.activities REPLICA IDENTITY FULL;
ALTER TABLE public.stock_items REPLICA IDENTITY FULL;
ALTER TABLE public.stock_movements REPLICA IDENTITY FULL;
ALTER TABLE public.solicitacoes_exclusao REPLICA IDENTITY FULL;
ALTER TABLE public.user_permissions REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.lots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.preservations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitacoes_exclusao;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_permissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
