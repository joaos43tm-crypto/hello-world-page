-- Fix: restrict store_settings access to admin/atendente only, while exposing a minimal public view for app feature flags.

-- 1) STORE SETTINGS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Remove old overly-broad policies if they exist
DROP POLICY IF EXISTS "Anyone can view store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Authenticated can view store settings" ON public.store_settings;

-- Only admin/atendente can read full store settings (contains sensitive business contact/config)
CREATE POLICY "Admin/atendente can view store settings"
ON public.store_settings
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'atendente'::public.app_role)
);

-- Keep existing update policy if present; otherwise ensure only admins can update
DROP POLICY IF EXISTS "Admins can update store settings" ON public.store_settings;
CREATE POLICY "Admins can update store settings"
ON public.store_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Minimal view for non-sensitive flags / display name
DROP VIEW IF EXISTS public.store_settings_public;
CREATE VIEW public.store_settings_public
WITH (security_invoker=on) AS
  SELECT id, store_name, plans_enabled
  FROM public.store_settings;

-- 2) MEDICAL CONSULTATIONS
-- Goal: receptionists (atendente) may need to list/schedule but should not read medical notes.
ALTER TABLE public.medical_consultations ENABLE ROW LEVEL SECURITY;

-- Drop potentially broad legacy policies (safe even if they don't exist)
DROP POLICY IF EXISTS "Authenticated can view medical consultations" ON public.medical_consultations;
DROP POLICY IF EXISTS "Atendente can view medical consultations" ON public.medical_consultations;
DROP POLICY IF EXISTS "Admins can view medical consultations" ON public.medical_consultations;
DROP POLICY IF EXISTS "Medico can view own consultations" ON public.medical_consultations;

-- Admin: can read all consultations
CREATE POLICY "Admin can view medical consultations"
ON public.medical_consultations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Medico: can read only consultations they created
CREATE POLICY "Medico can view own medical consultations"
ON public.medical_consultations
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'medico'::public.app_role)
  AND created_by = auth.uid()
);

-- Writes: keep strict - admin can do anything; medico can insert/update their own
DROP POLICY IF EXISTS "Admin can manage medical consultations" ON public.medical_consultations;
CREATE POLICY "Admin can manage medical consultations"
ON public.medical_consultations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Medico can insert own medical consultations" ON public.medical_consultations;
CREATE POLICY "Medico can insert own medical consultations"
ON public.medical_consultations
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'medico'::public.app_role)
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Medico can update own medical consultations" ON public.medical_consultations;
CREATE POLICY "Medico can update own medical consultations"
ON public.medical_consultations
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'medico'::public.app_role)
  AND created_by = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'medico'::public.app_role)
  AND created_by = auth.uid()
);

-- Provide a safe view without notes for atendente (and optionally others)
DROP VIEW IF EXISTS public.medical_consultations_safe;
CREATE VIEW public.medical_consultations_safe
WITH (security_invoker=on) AS
  SELECT id, started_at, ended_at, office_id, created_by, created_at, updated_at, appointment_id, pet_id
  FROM public.medical_consultations;
