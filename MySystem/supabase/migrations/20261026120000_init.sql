-- MySystem · esquema inicial
-- Perfis com papel (admin/member), quadros e atividades compartilhados entre os usuários logados.
-- Cadastro público fica desligado (config.toml); contas são criadas pelo admin via Edge Function `admin-users`.

-- ------------------------------------------------------------------ perfis
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

-- security definer: consulta profiles sem passar pela RLS (evita recursão nas políticas).
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Todo usuário novo ganha um perfil. O PRIMEIRO usuário do projeto vira admin; os demais, member.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when exists (select 1 from public.profiles where role = 'admin') then 'member' else 'admin' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "perfis visíveis para usuários logados"
  on public.profiles for select to authenticated using (true);

-- Cada um edita o próprio nome, mas não o próprio papel.
create policy "usuário edita o próprio perfil"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

create policy "admin edita qualquer perfil"
  on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------ quadros e atividades
-- Ids em texto: os quadros importados da LD têm ids legíveis (import-ld-504-rev-e-u-12).
create table public.boards (
  id text primary key,
  name text not null,
  description text not null default '',
  columns jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

-- Uma linha por atividade: edições simultâneas em atividades diferentes não se sobrescrevem.
-- `data` guarda os campos da atividade (título, etapa, etiquetas, checklist, comentários...).
create table public.tasks (
  id text primary key,
  board_id text not null references public.boards (id) on delete cascade,
  position integer not null default 0,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create index tasks_board_position_idx on public.tasks (board_id, position);

-- Carimba quem e quando alterou (o app usa updated_by para ignorar o eco das próprias mudanças no realtime).
create function public.touch_row()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

create trigger boards_touch before insert or update on public.boards
  for each row execute function public.touch_row();
create trigger tasks_touch before insert or update on public.tasks
  for each row execute function public.touch_row();

alter table public.boards enable row level security;
alter table public.tasks enable row level security;

-- Time inteiro trabalha nos mesmos quadros: qualquer usuário logado lê e edita.
create policy "usuários logados leem quadros" on public.boards for select to authenticated using (true);
create policy "usuários logados criam quadros" on public.boards for insert to authenticated with check (true);
create policy "usuários logados editam quadros" on public.boards for update to authenticated using (true) with check (true);
create policy "usuários logados excluem quadros" on public.boards for delete to authenticated using (true);

create policy "usuários logados leem atividades" on public.tasks for select to authenticated using (true);
create policy "usuários logados criam atividades" on public.tasks for insert to authenticated with check (true);
create policy "usuários logados editam atividades" on public.tasks for update to authenticated using (true) with check (true);
create policy "usuários logados excluem atividades" on public.tasks for delete to authenticated using (true);

-- ------------------------------------------------------------------ tempo real
alter publication supabase_realtime add table public.boards, public.tasks;
