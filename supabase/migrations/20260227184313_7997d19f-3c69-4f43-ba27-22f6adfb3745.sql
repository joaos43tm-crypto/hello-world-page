-- Adiciona custo atual do produto para cálculo de lucro/margem em relatórios
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS cost_price numeric NOT NULL DEFAULT 0;

-- Postgres não suporta "ADD CONSTRAINT IF NOT EXISTS" em todas as versões;
-- então fazemos de forma idempotente via catalog.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_cost_price_non_negative'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_cost_price_non_negative
      CHECK (cost_price >= 0);
  END IF;
END $$;