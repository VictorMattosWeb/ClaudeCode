-- 1. Adiciona o novo papel 'viewer' ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';