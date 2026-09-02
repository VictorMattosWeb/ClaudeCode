-- =============================================================================
-- Frequência de preservação por lote
-- =============================================================================
-- Substitui a lista de identificadores fixa no código (PN-32, PN-34, PN-36) por
-- um campo do próprio lote. Renomear um lote deixa de mudar, sem querer, a
-- regra de preservação dele.
--
-- NULL  = ciclo semanal (padrão)
-- N > 0 = ciclo de N dias corridos, com vencimento rolado para o próximo dia
--         útil quando cai em fim de semana
--
-- Aditivo: nenhuma coluna existente é alterada, e todos os lotes atuais ficam
-- com NULL, ou seja, o comportamento semanal de hoje.
-- =============================================================================

ALTER TABLE public.lots
  ADD COLUMN IF NOT EXISTS frequencia_dias INTEGER;

-- Um ciclo de zero ou negativo não existe; o teto evita erro de digitação
-- transformar "30" em "300" e sumir com o lote do radar por um ano.
ALTER TABLE public.lots
  DROP CONSTRAINT IF EXISTS lots_frequencia_dias_check;
ALTER TABLE public.lots
  ADD CONSTRAINT lots_frequencia_dias_check
  CHECK (frequencia_dias IS NULL OR (frequencia_dias >= 1 AND frequencia_dias <= 365));

COMMENT ON COLUMN public.lots.frequencia_dias IS
  'Ciclo de preservação em dias corridos. NULL = ciclo semanal (segunda a domingo).';

-- -----------------------------------------------------------------------------
-- Migração dos lotes que hoje têm ciclo de 30 dias por regra fixa no código.
-- Casa PN-32, PN-34 e PN-36 com separador opcional, sem pegar PN-320/PN-345.
-- -----------------------------------------------------------------------------
UPDATE public.lots
   SET frequencia_dias = 30
 WHERE frequencia_dias IS NULL
   AND (
     name ~* '\ypn[-_ ]?3[246]\y'
     OR code ~* '\ypn[-_ ]?3[246]\y'
     OR identificador_interno ~* '\ypn[-_ ]?3[246]\y'
   );

-- -----------------------------------------------------------------------------
-- Só administrador altera a frequência.
-- -----------------------------------------------------------------------------
-- As policies de UPDATE de `lots` liberam qualquer usuário não-viewer a editar
-- o lote. Um gatilho é o que garante a restrição em nível de coluna: mesmo
-- alguém montando a chamada à API na mão não consegue trocar o ciclo.
CREATE OR REPLACE FUNCTION public.enforce_frequencia_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.frequencia_dias IS DISTINCT FROM OLD.frequencia_dias
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar a frequência de preservação.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lots_frequencia_admin ON public.lots;
CREATE TRIGGER trg_lots_frequencia_admin
  BEFORE UPDATE ON public.lots
  FOR EACH ROW EXECUTE FUNCTION public.enforce_frequencia_admin();
