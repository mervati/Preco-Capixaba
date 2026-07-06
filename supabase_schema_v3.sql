-- Execute no SQL Editor do Supabase (complementa o schema_v2)

-- image_url já existia na despensa (adicionada direto pelo dashboard) — documentando aqui
alter table pantry add column if not exists image_url text;

-- Marca do produto e supermercado de referência (para itens cadastrados manualmente)
alter table pantry add column if not exists brand text;
alter table pantry add column if not exists supermarket_id uuid references supermarkets(id) on delete set null;
