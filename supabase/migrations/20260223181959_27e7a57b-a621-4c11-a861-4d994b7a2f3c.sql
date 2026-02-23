-- Add per-weekday store hours configuration
ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS store_hours jsonb NULL;