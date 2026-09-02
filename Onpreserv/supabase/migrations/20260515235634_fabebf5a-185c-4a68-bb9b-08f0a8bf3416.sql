UPDATE public.lots
SET codigo = regexp_replace(codigo, '^N#0+', '')
WHERE tipo_lote = 'novo' AND codigo ~ '^N#0+';