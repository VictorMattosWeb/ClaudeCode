-- Bloqueia escrita para 'viewer' em todas as tabelas de domínio.
-- Mantém a regra "autenticado" original e adiciona "NOT viewer".

-- LOTS
DROP POLICY IF EXISTS "Autenticado cria lotes" ON public.lots;
CREATE POLICY "Autenticado cria lotes" ON public.lots FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'viewer'::app_role));
DROP POLICY IF EXISTS "Autenticado edita lotes" ON public.lots;
CREATE POLICY "Autenticado edita lotes" ON public.lots FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'viewer'::app_role));

-- STOCK_ITEMS
DROP POLICY IF EXISTS "Autenticado cria estoque" ON public.stock_items;
CREATE POLICY "Autenticado cria estoque" ON public.stock_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'viewer'::app_role));
DROP POLICY IF EXISTS "Autenticado edita estoque" ON public.stock_items;
CREATE POLICY "Autenticado edita estoque" ON public.stock_items FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'viewer'::app_role));

-- STOCK_MOVEMENTS
DROP POLICY IF EXISTS "Autenticado cria movimentações" ON public.stock_movements;
CREATE POLICY "Autenticado cria movimentações" ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'viewer'::app_role));

-- ACTIVITIES
DROP POLICY IF EXISTS "Autenticado cria atividades" ON public.activities;
CREATE POLICY "Autenticado cria atividades" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'viewer'::app_role));
DROP POLICY IF EXISTS "Autenticado edita atividades" ON public.activities;
CREATE POLICY "Autenticado edita atividades" ON public.activities FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'viewer'::app_role));

-- PRESERVATIONS
DROP POLICY IF EXISTS "Autenticado cria preservações" ON public.preservations;
CREATE POLICY "Autenticado cria preservações" ON public.preservations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'viewer'::app_role));
DROP POLICY IF EXISTS "Autenticado edita preservações" ON public.preservations;
CREATE POLICY "Autenticado edita preservações" ON public.preservations FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'viewer'::app_role));

-- CRONOGRAMA_ITENS
DROP POLICY IF EXISTS "Autenticado cria itens cronograma" ON public.cronograma_itens;
CREATE POLICY "Autenticado cria itens cronograma" ON public.cronograma_itens FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'viewer'::app_role));
DROP POLICY IF EXISTS "Autenticado edita itens cronograma" ON public.cronograma_itens;
CREATE POLICY "Autenticado edita itens cronograma" ON public.cronograma_itens FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'viewer'::app_role));

-- SOLICITACOES_EXCLUSAO: viewer não pode nem solicitar exclusão
DROP POLICY IF EXISTS "Usuário cria próprias solicitações" ON public.solicitacoes_exclusao;
CREATE POLICY "Usuário cria próprias solicitações" ON public.solicitacoes_exclusao FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = solicitante_id AND NOT public.has_role(auth.uid(), 'viewer'::app_role));