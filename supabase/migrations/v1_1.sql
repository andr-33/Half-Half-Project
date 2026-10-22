-- ==============================================================================
-- Migración v1.1: Identidad de Miembros, Tag NFC y Autoría Visual
-- Archivo: supabase/migrations/v1_1.sql
-- Idempotente y no destructivo
-- ==============================================================================

-- 1. TABLA: members
-- Cada persona tiene un perfil propio asociado a su user_id de Supabase Auth
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  alias text not null check (alias ~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]{1,10}$'),
  color text not null unique check (color in ('orange', 'pink', 'sky', 'green', 'yellow', 'brown', 'red', 'purple', 'blue', 'mauve')),
  created_at timestamptz default now() not null
);

-- Índices en members
create index if not exists idx_members_user_id on public.members(user_id);

-- 2. TABLA: member_keys (clave para acceso rápido por tag NFC)
-- Solo guarda el hash SHA-256 de la clave. RLS sin políticas para clientes (solo service role)
create table if not exists public.member_keys (
  member_id uuid primary key references public.members(id) on delete cascade,
  key_hash text not null,
  created_at timestamptz default now() not null
);

-- 3. MODIFICACIÓN: list_items (añadir added_by)
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'list_items' and column_name = 'added_by'
  ) then
    alter table public.list_items add column added_by uuid references public.members(id) on delete set null;
  end if;
end $$;

create index if not exists idx_list_items_added_by on public.list_items(added_by);

-- 4. TABLA: list_meta (registro único de última edición de la lista)
create table if not exists public.list_meta (
  id boolean primary key default true check (id = true),
  updated_by uuid references public.members(id) on delete set null,
  updated_at timestamptz default now() not null
);

-- Insertar la fila única inicial si no existe
insert into public.list_meta (id, updated_by, updated_at)
values (true, null, now())
on conflict (id) do nothing;

-- Trigger para actualizar list_meta ante cualquier cambio en list_items
create or replace function public.handle_list_items_meta_update()
returns trigger
language plpgsql
security definer
as $$
declare
  v_member_id uuid;
begin
  -- Identificar el miembro asociado a la sesión de auth.uid()
  select id into v_member_id
  from public.members
  where user_id = auth.uid()
  limit 1;

  update public.list_meta
  set updated_by = v_member_id,
      updated_at = now()
  where id = true;

  return null;
end;
$$;

drop trigger if exists trg_list_items_meta_update on public.list_items;
create trigger trg_list_items_meta_update
  after insert or update or delete on public.list_items
  for each statement
  execute function public.handle_list_items_meta_update();

-- 5. RLS (Row Level Security)
alter table public.members enable row level security;
alter table public.member_keys enable row level security;
alter table public.list_meta enable row level security;

-- Políticas para members:
-- - Lectura permitida a cualquier usuario autenticado
drop policy if exists "Authenticated users read members" on public.members;
create policy "Authenticated users read members"
  on public.members
  for select
  to authenticated
  using (true);

-- - Inserción permitida SOLO para su propio user_id
drop policy if exists "Authenticated users insert own member" on public.members;
create policy "Authenticated users insert own member"
  on public.members
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- - Actualización permitida SOLO para su propia fila
drop policy if exists "Authenticated users update own member" on public.members;
create policy "Authenticated users update own member"
  on public.members
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Políticas para list_meta:
-- - Lectura permitida a usuarios autenticados
drop policy if exists "Authenticated users read list_meta" on public.list_meta;
create policy "Authenticated users read list_meta"
  on public.list_meta
  for select
  to authenticated
  using (true);

-- Nota de seguridad para member_keys:
-- Sin políticas para authenticated ni anon. Solo accesible mediante Service Role en Edge Function.

-- 6. PUBLICACIÓN REALTIME
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'list_meta'
  ) then
    alter publication supabase_realtime add table public.list_meta;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'members'
  ) then
    alter publication supabase_realtime add table public.members;
  end if;
end $$;

-- 7. REEMPLAZO DE RPC: add_to_list con soporte para p_force, autoría y estados
-- Eliminar firmas anteriores si existían
drop function if exists public.add_to_list(uuid, integer);
drop function if exists public.add_to_list(uuid, integer, boolean);

create or replace function public.add_to_list(
  p_article_id uuid,
  p_quantity integer default 1,
  p_force boolean default false
)
returns text
language plpgsql
security definer
as $$
declare
  v_item public.list_items;
  v_member_id uuid;
begin
  if p_quantity < 1 then
    raise exception 'La cantidad debe ser mayor o igual a 1';
  end if;

  -- Obtener el miembro actual para registrar la autoría
  select id into v_member_id
  from public.members
  where user_id = auth.uid()
  limit 1;

  -- Buscar si el artículo ya existe en la lista continua
  select * into v_item
  from public.list_items
  where article_id = p_article_id
  for update;

  if not found then
    -- No existe en la lista: se inserta con la cantidad indicada y autoría del miembro actual
    insert into public.list_items (article_id, quantity, purchased, added_by, updated_at)
    values (p_article_id, p_quantity, false, v_member_id, now());
    return 'added';
  else
    if v_item.purchased = false then
      -- Existe y está pendiente
      if p_force = false then
        return 'exists_pending';
      else
        -- Con p_force=true se suma la cantidad y NO se modifica el autor original
        update public.list_items
        set quantity = quantity + p_quantity,
            updated_at = now()
        where id = v_item.id;
        return 'added';
      end if;
    else
      -- Existe y está comprado
      if p_force = false then
        return 'exists_purchased';
      else
        -- Con p_force=true pasa a pendiente con la nueva cantidad (NO suma) y NO se modifica el autor original
        update public.list_items
        set quantity = p_quantity,
            purchased = false,
            updated_at = now()
        where id = v_item.id;
        return 'added';
      end if;
    end if;
  end if;
end;
$$;
