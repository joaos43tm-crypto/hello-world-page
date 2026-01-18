-- Remove legacy broad policies on medical_consultations to prevent atendente from reading sensitive notes.

DROP POLICY IF EXISTS "Admins and atendente can view all medical consultations" ON public.medical_consultations;
DROP POLICY IF EXISTS "Admins and atendente can update medical consultations" ON public.medical_consultations;
DROP POLICY IF EXISTS "Admins can delete medical consultations" ON public.medical_consultations;
DROP POLICY IF EXISTS "Medicos can view own medical consultations" ON public.medical_consultations;
DROP POLICY IF EXISTS "Medicos can update own medical consultations" ON public.medical_consultations;
DROP POLICY IF EXISTS "Staff can create medical consultations" ON public.medical_consultations;

-- Also remove potential duplicate medico insert policy name variants
DROP POLICY IF EXISTS "Medico can insert own medical consultations" ON public.medical_consultations;

-- Recreate medico insert to keep behavior for the medical screen
CREATE POLICY "Medico can insert own medical consultations"
ON public.medical_consultations
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'medico'::public.app_role)
  AND created_by = auth.uid()
);
