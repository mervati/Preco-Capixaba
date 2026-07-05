-- Cole isso no SQL Editor do seu projeto Supabase

create table lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references lists(id) on delete cascade,
  nome text not null,
  quantidade numeric default 1,
  valor_unitario numeric default 0,
  valor_total numeric default 0,
  checked boolean default false,
  created_at timestamptz default now()
);

-- Permite acesso público (sem autenticação por enquanto)
alter table lists enable row level security;
alter table items enable row level security;

create policy "allow all" on lists for all using (true) with check (true);
create policy "allow all" on items for all using (true) with check (true);
