-- 1) Add new appointment status 'pago'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'appointment_status'
      AND e.enumlabel = 'pago'
  ) THEN
    ALTER TYPE public.appointment_status ADD VALUE 'pago';
  END IF;
END $$;