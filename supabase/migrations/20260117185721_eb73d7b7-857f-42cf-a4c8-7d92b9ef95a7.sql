-- Medical offices (consultórios)
CREATE TABLE IF NOT EXISTS public.medical_offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Medical consultations (atendimentos)
CREATE TABLE IF NOT EXISTS public.medical_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES public.medical_offices(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medical_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_consultations ENABLE ROW LEVEL SECURITY;

-- updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_medical_offices_updated_at'
  ) THEN
    CREATE TRIGGER update_medical_offices_updated_at
    BEFORE UPDATE ON public.medical_offices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_medical_consultations_updated_at'
  ) THEN
    CREATE TRIGGER update_medical_consultations_updated_at
    BEFORE UPDATE ON public.medical_consultations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Policies: medical_offices
DROP POLICY IF EXISTS "Staff can view medical offices" ON public.medical_offices;
CREATE POLICY "Staff can view medical offices"
ON public.medical_offices
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'atendente'::app_role)
  OR has_role(auth.uid(), 'medico'::app_role)
);

DROP POLICY IF EXISTS "Admins can manage medical offices" ON public.medical_offices;
CREATE POLICY "Admins can manage medical offices"
ON public.medical_offices
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policies: medical_consultations
DROP POLICY IF EXISTS "Admins and atendente can view all medical consultations" ON public.medical_consultations;
CREATE POLICY "Admins and atendente can view all medical consultations"
ON public.medical_consultations
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'atendente'::app_role)
);

DROP POLICY IF EXISTS "Medicos can view own medical consultations" ON public.medical_consultations;
CREATE POLICY "Medicos can view own medical consultations"
ON public.medical_consultations
FOR SELECT
USING (
  has_role(auth.uid(), 'medico'::app_role)
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Staff can create medical consultations" ON public.medical_consultations;
CREATE POLICY "Staff can create medical consultations"
ON public.medical_consultations
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role) OR has_role(auth.uid(), 'medico'::app_role))
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Admins and atendente can update medical consultations" ON public.medical_consultations;
CREATE POLICY "Admins and atendente can update medical consultations"
ON public.medical_consultations
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role)
);

DROP POLICY IF EXISTS "Medicos can update own medical consultations" ON public.medical_consultations;
CREATE POLICY "Medicos can update own medical consultations"
ON public.medical_consultations
FOR UPDATE
USING (
  has_role(auth.uid(), 'medico'::app_role)
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Admins can delete medical consultations" ON public.medical_consultations;
CREATE POLICY "Admins can delete medical consultations"
ON public.medical_consultations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Extend appointments permissions to include medico for Agenda access
DROP POLICY IF EXISTS "Staff can view appointments" ON public.appointments;
CREATE POLICY "Staff can view appointments"
ON public.appointments
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'atendente'::app_role)
  OR has_role(auth.uid(), 'tosador'::app_role)
  OR has_role(auth.uid(), 'medico'::app_role)
);

DROP POLICY IF EXISTS "Staff can update appointments (validated by trigger)" ON public.appointments;
CREATE POLICY "Staff can update appointments (validated by trigger)"
ON public.appointments
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'atendente'::app_role)
  OR has_role(auth.uid(), 'tosador'::app_role)
  OR has_role(auth.uid(), 'medico'::app_role)
);

-- Seed 1 default office if none exists
INSERT INTO public.medical_offices (name)
SELECT 'Consultório 1'
WHERE NOT EXISTS (SELECT 1 FROM public.medical_offices);
