
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cargo TEXT;

CREATE TABLE IF NOT EXISTS public.cargos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  categoria TEXT NOT NULL DEFAULT 'MOD' CHECK (categoria IN ('MOD','MOI')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cargos TO authenticated;
GRANT ALL ON public.cargos TO service_role;
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos autenticados podem ver cargos" ON public.cargos;
DROP POLICY IF EXISTS "Admins gerenciam cargos" ON public.cargos;
CREATE POLICY "Todos autenticados podem ver cargos"
  ON public.cargos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam cargos"
  ON public.cargos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.cargos (nome, categoria) VALUES
  ('Técnico de Automação','MOD'),
  ('Analista de Automação','MOD'),
  ('Engenheiro','MOI'),
  ('Supervisor','MOI'),
  ('Coordenador','MOI')
ON CONFLICT (nome) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.rdo_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  cliente TEXT NOT NULL DEFAULT 'PETROBRAS / SRGE/SI-IV/RNEST-T2/COMIS',
  icj TEXT NOT NULL DEFAULT '5900.0132104.25.2',
  referencia TEXT NOT NULL DEFAULT 'PR-5290.00-22000-970-ST5-503- PROCEDIMENTO TAC',
  jornada_inicio TEXT NOT NULL DEFAULT '07:00',
  jornada_fim TEXT NOT NULL DEFAULT '17:00',
  numero_rdo TEXT NOT NULL DEFAULT 'RDO TAC-001',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rdo_config TO authenticated;
GRANT ALL ON public.rdo_config TO service_role;
ALTER TABLE public.rdo_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos autenticados leem config" ON public.rdo_config;
DROP POLICY IF EXISTS "Admins alteram config" ON public.rdo_config;
CREATE POLICY "Todos autenticados leem config"
  ON public.rdo_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins alteram config"
  ON public.rdo_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.rdo_config (id) VALUES (1) ON CONFLICT DO NOTHING;

DROP FUNCTION IF EXISTS public.list_public_profiles();
CREATE FUNCTION public.list_public_profiles()
RETURNS TABLE(id uuid, nome text, status text, cargo text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.nome, p.status::text, p.cargo FROM public.profiles p ORDER BY p.nome;
$$;
