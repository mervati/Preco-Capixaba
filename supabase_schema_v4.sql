-- Execute no SQL Editor do Supabase (complementa o schema_v3)

alter table pantry add column if not exists barcode text;
