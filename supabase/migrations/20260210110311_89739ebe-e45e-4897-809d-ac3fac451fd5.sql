-- Add icon key to services so each service can have a small "logo" icon
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS icon_key text NOT NULL DEFAULT 'scissors';

-- Optional safety: restrict to allowed keys (fixed short list)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'services_icon_key_allowed'
  ) THEN
    ALTER TABLE public.services
      ADD CONSTRAINT services_icon_key_allowed
      CHECK (icon_key IN ('scissors','bath','stethoscope','paw','tag','sparkles'));
  END IF;
END $$;

-- Backfill any existing nulls (defensive)
UPDATE public.services
SET icon_key = 'scissors'
WHERE icon_key IS NULL;