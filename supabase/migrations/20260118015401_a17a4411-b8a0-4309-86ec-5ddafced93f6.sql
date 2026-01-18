-- Link medical consultations to a specific appointment/pet (for prontuário)
ALTER TABLE public.medical_consultations
ADD COLUMN IF NOT EXISTS appointment_id uuid NULL,
ADD COLUMN IF NOT EXISTS pet_id uuid NULL;

-- Foreign keys (safe + explicit)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'medical_consultations_appointment_id_fkey'
  ) THEN
    ALTER TABLE public.medical_consultations
    ADD CONSTRAINT medical_consultations_appointment_id_fkey
    FOREIGN KEY (appointment_id) REFERENCES public.appointments(id)
    ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'medical_consultations_pet_id_fkey'
  ) THEN
    ALTER TABLE public.medical_consultations
    ADD CONSTRAINT medical_consultations_pet_id_fkey
    FOREIGN KEY (pet_id) REFERENCES public.pets(id)
    ON DELETE RESTRICT;
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_medical_consultations_pet_id_started_at
  ON public.medical_consultations (pet_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_medical_consultations_created_by_started_at
  ON public.medical_consultations (created_by, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_medical_consultations_appointment_id
  ON public.medical_consultations (appointment_id);
