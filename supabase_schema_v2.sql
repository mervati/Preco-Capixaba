-- Execute no SQL Editor do Supabase (complementa o schema_v1)

-- Supermercados
create table if not exists supermarkets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  color text default '#2362a8',
  created_at timestamptz default now()
);

-- Vincular lista a supermercado
alter table lists add column if not exists supermarket_id uuid references supermarkets(id) on delete set null;
alter table lists add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Histórico de preços por produto/supermercado
create table if not exists price_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  product_name text not null,
  supermarket_id uuid references supermarkets(id) on delete cascade,
  price numeric not null,
  recorded_at timestamptz default now()
);

-- Despensa
create table if not exists pantry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  product_name text not null,
  unit text default 'UN',
  current_qty numeric default 1,
  min_qty numeric default 1,
  created_at timestamptz default now()
);

-- RLS
alter table supermarkets enable row level security;
alter table price_history enable row level security;
alter table pantry enable row level security;

do $$ begin
  create policy "own supermarkets" on supermarkets for all using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own price_history" on price_history for all using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own pantry" on pantry for all using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;
