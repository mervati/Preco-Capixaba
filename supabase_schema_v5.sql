-- Execute no SQL Editor do Supabase (complementa o schema_v4)

-- Memoria de codigo de barras -> nome/marca, independente da despensa
-- (nao e apagada quando o item da despensa e excluido)
create table if not exists barcode_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  barcode text not null,
  product_name text not null,
  brand text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, barcode)
);

alter table barcode_products enable row level security;

do $$ begin
  create policy "own barcode_products" on barcode_products for all using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;
