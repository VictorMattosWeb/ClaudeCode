-- Coluna local: separa atividades de Campo e Almoxarifado
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS local text NOT NULL DEFAULT 'campo';

-- Garante valores válidos
ALTER TABLE public.activities
  DROP CONSTRAINT IF EXISTS activities_local_check;
ALTER TABLE public.activities
  ADD CONSTRAINT activities_local_check CHECK (local IN ('campo','almoxarifado'));

-- Índice para filtragem por local
CREATE INDEX IF NOT EXISTS idx_activities_local ON public.activities(local);

-- Marca todas as atividades já existentes como "campo"
UPDATE public.activities SET local = 'campo' WHERE local IS NULL OR local = '';