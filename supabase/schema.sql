-- Esquema de base de datos para App Lista de la Compra
-- Ejecutar en el SQL Editor de Supabase

-- Extensión para generación de UUIDs (por defecto disponible en Postgres)
create extension if not exists "pgcrypto";

-- 1. TABLA: categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  name_normalized text unique not null check (char_length(trim(name_normalized)) > 0),
  created_at timestamptz default now() not null
);

-- 2. TABLA: articles
-- name_normalized es único en todo el catálogo (global)
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  name_normalized text unique not null check (char_length(trim(name_normalized)) > 0),
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamptz default now() not null
);

-- 3. TABLA: list_items
-- article_id es único: un artículo solo puede estar una vez en la lista continua
create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  article_id uuid unique not null references public.articles(id) on delete cascade,
  quantity integer not null default 1 check (quantity >= 1),
  purchased boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Índices de consulta frecuente
create index if not exists idx_articles_category_id on public.articles(category_id);
create index if not exists idx_list_items_article_id on public.list_items(article_id);
create index if not exists idx_list_items_purchased on public.list_items(purchased);

-- RLS (Row Level Security)
alter table public.categories enable row level security;
alter table public.articles enable row level security;
alter table public.list_items enable row level security;

-- Políticas: Permitir todo SOLO a usuarios autenticados (rol 'authenticated').
-- Nada accesible para rol 'anon'.
drop policy if exists "Authenticated users full access on categories" on public.categories;
create policy "Authenticated users full access on categories"
  on public.categories
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users full access on articles" on public.articles;
create policy "Authenticated users full access on articles"
  on public.articles
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users full access on list_items" on public.list_items;
create policy "Authenticated users full access on list_items"
  on public.list_items
  for all
  to authenticated
  using (true)
  with check (true);

-- Habilitar Supabase Realtime en list_items
alter publication supabase_realtime add table public.list_items;

-- FUNCIONES RPC ATÓMICAS

-- add_to_list(p_article_id uuid, p_quantity int)
-- Reglas:
-- - Si no existe en la lista -> inserta con esa cantidad, purchased = false
-- - Si existe y purchased = false -> suma la cantidad
-- - Si existe y purchased = true -> pone purchased = false y quantity = p_quantity (NO suma)
create or replace function public.add_to_list(
  p_article_id uuid,
  p_quantity integer default 1
)
returns public.list_items
language plpgsql
security definer
as $$
declare
  v_item public.list_items;
begin
  if p_quantity < 1 then
    raise exception 'La cantidad debe ser mayor o igual a 1';
  end if;

  select * into v_item
  from public.list_items
  where article_id = p_article_id
  for update;

  if not found then
    insert into public.list_items (article_id, quantity, purchased, updated_at)
    values (p_article_id, p_quantity, false, now())
    returning * into v_item;
  else
    if v_item.purchased = false then
      update public.list_items
      set quantity = quantity + p_quantity,
          updated_at = now()
      where id = v_item.id
      returning * into v_item;
    else
      update public.list_items
      set quantity = p_quantity,
          purchased = false,
          updated_at = now()
      where id = v_item.id
      returning * into v_item;
    end if;
  end if;

  return v_item;
end;
$$;

-- close_purchase()
-- Elimina de list_items todos los elementos con purchased = true.
-- Devuelve cuántos eliminó.
create or replace function public.close_purchase()
returns integer
language plpgsql
security definer
as $$
declare
  v_deleted_count integer;
begin
  with deleted as (
    delete from public.list_items
    where purchased = true
    returning id
  )
  select count(*) into v_deleted_count from deleted;

  return coalesce(v_deleted_count, 0);
end;
$$;
