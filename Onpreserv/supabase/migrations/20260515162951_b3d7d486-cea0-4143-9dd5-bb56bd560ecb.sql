ALTER TABLE public.user_permissions
  ADD COLUMN IF NOT EXISTS is_override boolean NOT NULL DEFAULT false;