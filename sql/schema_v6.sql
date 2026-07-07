-- Histórico de compras
CREATE TABLE IF NOT EXISTS shopping_trips (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  supermarket text,
  total       numeric(10,2) DEFAULT 0,
  items       jsonb DEFAULT '[]'::jsonb
);

ALTER TABLE shopping_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own trips"
  ON shopping_trips FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
