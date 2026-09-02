-- Enum para módulos do sistema
CREATE TYPE public.app_module AS ENUM ('dashboard', 'lotes', 'preservacoes', 'atividades', 'estoque');

-- Enum para tipo de item em solicitação de exclusão
CREATE TYPE public.delete_item_type AS ENUM ('lote', 'preservacao', 'atividade', 'estoque');

-- Enum para status da solicitação
CREATE TYPE public.solicitacao_status AS ENUM ('pendente', 'aprovado', 'recusado');

-- Tabela de permissões por módulo
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  module public.app_module NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, module)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê próprias permissões"
ON public.user_permissions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admin vê todas permissões"
ON public.user_permissions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin insere permissões"
ON public.user_permissions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin atualiza permissões"
ON public.user_permissions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin deleta permissões"
ON public.user_permissions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Tabela de solicitações de exclusão
CREATE TABLE public.solicitacoes_exclusao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.delete_item_type NOT NULL,
  item_id TEXT NOT NULL,
  item_descricao TEXT,
  solicitante_id UUID NOT NULL,
  justificativa TEXT NOT NULL,
  status public.solicitacao_status NOT NULL DEFAULT 'pendente',
  analisado_por UUID,
  resposta TEXT,
  data_solicitacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_resposta TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitacoes_exclusao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê próprias solicitações"
ON public.solicitacoes_exclusao FOR SELECT TO authenticated
USING (auth.uid() = solicitante_id);

CREATE POLICY "Usuário cria próprias solicitações"
ON public.solicitacoes_exclusao FOR INSERT TO authenticated
WITH CHECK (auth.uid() = solicitante_id);

CREATE POLICY "Admin vê todas solicitações"
ON public.solicitacoes_exclusao FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin atualiza solicitações"
ON public.solicitacoes_exclusao FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin deleta solicitações"
ON public.solicitacoes_exclusao FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_solicitacoes_exclusao_updated_at
BEFORE UPDATE ON public.solicitacoes_exclusao
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Atualiza handle_new_user para criar permissões padrão (todos liberados)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_count INT;
  assigned_role app_role;
  m app_module;
BEGIN
  INSERT INTO public.profiles (id, nome, email, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    'ativo'
  );

  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'user');
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);

  -- Cria permissões padrão (todos os módulos liberados)
  FOR m IN SELECT unnest(enum_range(NULL::app_module)) LOOP
    INSERT INTO public.user_permissions (user_id, module, allowed)
    VALUES (NEW.id, m, true);
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Backfill: cria permissões padrão para usuários existentes
INSERT INTO public.user_permissions (user_id, module, allowed)
SELECT p.id, m, true
FROM public.profiles p
CROSS JOIN unnest(enum_range(NULL::public.app_module)) AS m
ON CONFLICT (user_id, module) DO NOTHING;