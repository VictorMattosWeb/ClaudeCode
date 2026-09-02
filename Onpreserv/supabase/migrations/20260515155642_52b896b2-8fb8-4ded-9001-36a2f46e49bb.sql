
-- 1. role_permissions table
CREATE TABLE public.role_permissions (
  role app_role NOT NULL,
  module app_module NOT NULL,
  action text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role, module, action)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticado vê role_permissions"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin insere role_permissions"
  ON public.role_permissions FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin edita role_permissions"
  ON public.role_permissions FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin deleta role_permissions"
  ON public.role_permissions FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. user_audit_log
CREATE TABLE public.user_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_id uuid,
  acao text NOT NULL,
  detalhes jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_audit_user ON public.user_audit_log(user_id);

ALTER TABLE public.user_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin vê auditoria"
  ON public.user_audit_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin cria auditoria"
  ON public.user_audit_log FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. trigger to prevent removing the last active admin
CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining int;
BEGIN
  IF TG_OP = 'DELETE' AND OLD.role = 'admin' THEN
    SELECT count(*) INTO remaining
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.role = 'admin' AND p.status = 'ativo' AND ur.user_id <> OLD.user_id;
    IF remaining = 0 THEN
      RAISE EXCEPTION 'Não é possível remover o último administrador ativo';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_prevent_last_admin_removal
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_admin_removal();

-- Same protection on profile inactivation
CREATE OR REPLACE FUNCTION public.prevent_last_admin_deactivation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  remaining int;
BEGIN
  IF NEW.status = 'inativo' AND OLD.status = 'ativo' THEN
    SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = 'admin') INTO is_admin;
    IF is_admin THEN
      SELECT count(*) INTO remaining
      FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.role = 'admin' AND p.status = 'ativo' AND ur.user_id <> NEW.id;
      IF remaining = 0 THEN
        RAISE EXCEPTION 'Não é possível inativar o último administrador ativo';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_last_admin_deactivation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_admin_deactivation();

-- 4. Seed default matrix
-- Admin: tudo true
INSERT INTO public.role_permissions (role, module, action, allowed)
SELECT 'admin'::app_role, m, a, true
FROM unnest(enum_range(NULL::app_module)) m
CROSS JOIN unnest(ARRAY['view','create','edit','delete','import','export','approve','request_delete']) a;

-- User: view+create+edit+import+export+request_delete em todos; sem delete/approve
INSERT INTO public.role_permissions (role, module, action, allowed)
SELECT 'user'::app_role, m, a,
  CASE WHEN a IN ('view','create','edit','import','export','request_delete') THEN true ELSE false END
FROM unnest(enum_range(NULL::app_module)) m
CROSS JOIN unnest(ARRAY['view','create','edit','delete','import','export','approve','request_delete']) a;

-- Viewer: apenas view
INSERT INTO public.role_permissions (role, module, action, allowed)
SELECT 'viewer'::app_role, m, a,
  CASE WHEN a = 'view' THEN true ELSE false END
FROM unnest(enum_range(NULL::app_module)) m
CROSS JOIN unnest(ARRAY['view','create','edit','delete','import','export','approve','request_delete']) a;
