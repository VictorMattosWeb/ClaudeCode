
-- 1) Limpar dados existentes
TRUNCATE TABLE public.stock_movements, public.stock_items RESTART IDENTITY CASCADE;

-- 2) Enum para tipo do item
DO $$ BEGIN
  CREATE TYPE public.stock_item_tipo AS ENUM ('petrobras', 'generico', 'retirado_campo', 'schneider');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Tabela de contadores por tipo (para gerar identificador sequencial)
CREATE TABLE IF NOT EXISTS public.stock_identifier_counters (
  tipo public.stock_item_tipo PRIMARY KEY,
  ultimo_numero INTEGER NOT NULL DEFAULT 0
);

INSERT INTO public.stock_identifier_counters (tipo, ultimo_numero) VALUES
  ('petrobras', 0), ('generico', 0), ('retirado_campo', 0), ('schneider', 0)
ON CONFLICT (tipo) DO NOTHING;

ALTER TABLE public.stock_identifier_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticado vê contadores" ON public.stock_identifier_counters
  FOR SELECT TO authenticated USING (true);

-- 4) Novas colunas em stock_items
ALTER TABLE public.stock_items
  ADD COLUMN IF NOT EXISTS identificador_interno TEXT,
  ADD COLUMN IF NOT EXISTS tipo_item public.stock_item_tipo NOT NULL DEFAULT 'generico',
  ADD COLUMN IF NOT EXISTS rua TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS prateleira TEXT DEFAULT '';

-- 5) Função para gerar próximo identificador por tipo
CREATE OR REPLACE FUNCTION public.gerar_identificador_estoque(_tipo public.stock_item_tipo)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  novo_numero INTEGER;
  prefixo TEXT;
BEGIN
  UPDATE public.stock_identifier_counters
    SET ultimo_numero = ultimo_numero + 1
    WHERE tipo = _tipo
    RETURNING ultimo_numero INTO novo_numero;

  prefixo := CASE _tipo
    WHEN 'petrobras' THEN 'PTB'
    WHEN 'generico' THEN 'GEN'
    WHEN 'retirado_campo' THEN 'RTC'
    WHEN 'schneider' THEN 'SCH'
  END;

  RETURN prefixo || '-' || LPAD(novo_numero::TEXT, 4, '0');
END;
$$;

-- 6) Trigger para preencher identificador automaticamente ao inserir
CREATE OR REPLACE FUNCTION public.set_identificador_estoque()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.identificador_interno IS NULL OR NEW.identificador_interno = '' THEN
    NEW.identificador_interno := public.gerar_identificador_estoque(NEW.tipo_item);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_identificador_estoque ON public.stock_items;
CREATE TRIGGER trg_set_identificador_estoque
  BEFORE INSERT ON public.stock_items
  FOR EACH ROW EXECUTE FUNCTION public.set_identificador_estoque();

-- 7) Tornar identificador NOT NULL e único após o trigger estar pronto
ALTER TABLE public.stock_items
  ALTER COLUMN identificador_interno SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS stock_items_identificador_interno_key
  ON public.stock_items(identificador_interno);

-- 8) Remover unicidade de codigo e nota_fiscal (se existirem)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.stock_items'::regclass
       AND contype = 'u'
       AND conname IN ('stock_items_codigo_key','stock_items_nota_fiscal_key')
  LOOP
    EXECUTE 'ALTER TABLE public.stock_items DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

DROP INDEX IF EXISTS public.stock_items_codigo_key;
DROP INDEX IF EXISTS public.stock_items_nota_fiscal_key;

-- 9) Novos campos em stock_movements para saída controlada
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS destino TEXT,
  ADD COLUMN IF NOT EXISTS justificativa TEXT,
  ADD COLUMN IF NOT EXISTS ppu TEXT,
  ADD COLUMN IF NOT EXISTS unidade_destino TEXT,
  ADD COLUMN IF NOT EXISTS op_petrobras TEXT;
