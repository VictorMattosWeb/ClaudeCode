
DROP VIEW IF EXISTS public.profiles_public;

CREATE OR REPLACE FUNCTION public.list_public_profiles()
RETURNS TABLE(id uuid, nome text, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.nome, p.status::text
  FROM public.profiles p
  ORDER BY p.nome;
$$;

REVOKE ALL ON FUNCTION public.list_public_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_public_profiles() TO authenticated;
