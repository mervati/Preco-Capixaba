-- Origem do item na despensa: 'nfce' | 'barcode' | 'manual'
ALTER TABLE pantry ADD COLUMN IF NOT EXISTS source text;

-- Data real da compra vinda da NFC-e (diferente do created_at que é quando foi escaneada)
ALTER TABLE shopping_trips ADD COLUMN IF NOT EXISTS purchased_at timestamptz;
