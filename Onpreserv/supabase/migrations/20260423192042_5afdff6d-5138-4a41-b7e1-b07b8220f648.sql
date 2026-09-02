-- Add lot type enum and identifier counter
CREATE TYPE public.lot_tipo AS ENUM ('novo', 'retirado_campo');

ALTER TABLE public.lots
  ADD COLUMN IF NOT EXISTS tipo_lote public.lot_tipo NOT NULL DEFAULT 'novo',
  ADD COLUMN IF NOT EXISTS identificador_interno text;

-- Counter table for lot identifiers
CREATE TABLE IF NOT EXISTS public.lot_identifier_counters (
  tipo public.lot_tipo PRIMARY KEY,
  ultimo_numero integer NOT NULL DEFAULT 0
);

ALTER TABLE public.lot_identifier_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticado vê contadores lotes"
  ON public.lot_identifier_counters FOR SELECT
  TO authenticated USING (true);

INSERT INTO public.lot_identifier_counters (tipo, ultimo_numero) VALUES
  ('novo', 0), ('retirado_campo', 0)
ON CONFLICT (tipo) DO NOTHING;

-- Function to generate lot identifier
CREATE OR REPLACE FUNCTION public.gerar_identificador_lote(_tipo public.lot_tipo)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  novo_numero INTEGER;
  prefixo TEXT;
BEGIN
  UPDATE public.lot_identifier_counters
    SET ultimo_numero = ultimo_numero + 1
    WHERE tipo = _tipo
    RETURNING ultimo_numero INTO novo_numero;

  prefixo := CASE _tipo
    WHEN 'novo' THEN 'NOV'
    WHEN 'retirado_campo' THEN 'RTC'
  END;

  RETURN prefixo || '-' || LPAD(novo_numero::TEXT, 4, '0');
END;
$$;

-- Trigger to auto-set identificador_interno on insert
CREATE OR REPLACE FUNCTION public.set_identificador_lote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.identificador_interno IS NULL OR NEW.identificador_interno = '' THEN
    NEW.identificador_interno := public.gerar_identificador_lote(NEW.tipo_lote);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_identificador_lote ON public.lots;
CREATE TRIGGER trg_set_identificador_lote
  BEFORE INSERT ON public.lots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_identificador_lote();

-- Backfill identifiers for existing rows
DO $$
DECLARE
  r RECORD;
  novo_id TEXT;
BEGIN
  FOR r IN SELECT id, tipo_lote FROM public.lots WHERE identificador_interno IS NULL OR identificador_interno = '' ORDER BY created_at LOOP
    novo_id := public.gerar_identificador_lote(r.tipo_lote);
    UPDATE public.lots SET identificador_interno = novo_id WHERE id = r.id;
  END LOOP;
END $$;