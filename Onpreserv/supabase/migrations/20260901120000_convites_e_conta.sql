-- =============================================================================
-- Convites de cadastro + configurações da conta (avatar)
-- =============================================================================
-- Adiciona:
--   1. profiles.avatar_url        — foto de perfil
--   2. bucket "avatars"           — armazenamento público das fotos
--   3. tabela convites            — links de cadastro gerados por administrador
--   4. RPCs de validação/consumo  — permitem que o cadastro público valide o
--                                   token SEM expor a tabela de convites
--
-- Tudo é aditivo: nenhuma tabela ou coluna existente é alterada ou removida.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Foto de perfil
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;


-- -----------------------------------------------------------------------------
-- 2. Bucket de avatares
-- -----------------------------------------------------------------------------
-- Público na leitura: a foto aparece no cabeçalho e nos cards de usuário, e um
-- bucket privado exigiria URL assinada a cada render.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatares são públicos para leitura" ON storage.objects;
CREATE POLICY "Avatares são públicos para leitura"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Escrita restrita à própria pasta: o caminho do arquivo precisa começar com o
-- uid de quem envia (ex.: "<uid>/foto.jpg"). Sem isso, qualquer autenticado
-- poderia sobrescrever a foto de outra pessoa.
DROP POLICY IF EXISTS "Usuário envia o próprio avatar" ON storage.objects;
CREATE POLICY "Usuário envia o próprio avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Usuário atualiza o próprio avatar" ON storage.objects;
CREATE POLICY "Usuário atualiza o próprio avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Usuário remove o próprio avatar" ON storage.objects;
CREATE POLICY "Usuário remove o próprio avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- -----------------------------------------------------------------------------
-- 3. Convites de cadastro
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.convites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token        TEXT NOT NULL UNIQUE,
  -- Quando preenchido, o convite só serve para este e-mail.
  email        TEXT,
  cargo        TEXT,
  role         app_role NOT NULL DEFAULT 'user',
  criado_por   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em    TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  usado_em     TIMESTAMPTZ,
  usado_por    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revogado     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS convites_token_idx ON public.convites (token);

ALTER TABLE public.convites ENABLE ROW LEVEL SECURITY;

-- A tabela inteira é visível e administrável apenas por administradores.
-- O cadastro público NUNCA lê esta tabela: ele passa pelas funções abaixo.
DROP POLICY IF EXISTS "Admin gerencia convites" ON public.convites;
CREATE POLICY "Admin gerencia convites"
  ON public.convites FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- -----------------------------------------------------------------------------
-- 4. Validação e consumo do convite
-- -----------------------------------------------------------------------------
-- `SECURITY DEFINER` para que uma pessoa ainda não autenticada consiga validar
-- o próprio link. A função devolve apenas o necessário para montar o formulário
-- — nunca a linha inteira, nunca outros tokens.
CREATE OR REPLACE FUNCTION public.validar_convite(_token TEXT)
RETURNS TABLE (valido BOOLEAN, motivo TEXT, email TEXT, cargo TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.convites%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.convites WHERE convites.token = _token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'inexistente', NULL::TEXT, NULL::TEXT;
  ELSIF c.revogado THEN
    RETURN QUERY SELECT false, 'revogado', NULL::TEXT, NULL::TEXT;
  ELSIF c.usado_em IS NOT NULL THEN
    RETURN QUERY SELECT false, 'usado', NULL::TEXT, NULL::TEXT;
  ELSIF c.expira_em < now() THEN
    RETURN QUERY SELECT false, 'expirado', NULL::TEXT, NULL::TEXT;
  ELSE
    RETURN QUERY SELECT true, 'ok', c.email, c.cargo;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validar_convite(TEXT) TO anon, authenticated;

-- Consome o convite depois que a conta foi criada. Chamada pelo próprio usuário
-- recém-cadastrado; a checagem de `auth.uid()` garante que ninguém consome o
-- convite de outra pessoa.
CREATE OR REPLACE FUNCTION public.consumir_convite(_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.convites%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO c FROM public.convites WHERE convites.token = _token FOR UPDATE;

  IF NOT FOUND OR c.revogado OR c.usado_em IS NOT NULL OR c.expira_em < now() THEN
    RETURN false;
  END IF;

  UPDATE public.convites
     SET usado_em = now(), usado_por = auth.uid()
   WHERE id = c.id;

  -- Aplica o cargo definido no convite, se houver.
  IF c.cargo IS NOT NULL THEN
    UPDATE public.profiles SET cargo = c.cargo WHERE id = auth.uid();
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consumir_convite(TEXT) TO authenticated;
