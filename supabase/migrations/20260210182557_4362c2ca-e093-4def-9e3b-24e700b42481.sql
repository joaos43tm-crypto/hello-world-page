-- Restrict setting appointment status to 'pago' to administrators only
-- This replaces the existing permissive UPDATE policy that allows any staff to set any status.

DO $$
BEGIN
  -- Drop existing UPDATE policy if present
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'appointments'
      AND policyname = 'Appointments: staff update same company'
  ) THEN
    EXECUTE 'DROP POLICY "Appointments: staff update same company" ON public.appointments';
  END IF;
END $$;

-- Recreate UPDATE policy with a WITH CHECK that blocks non-admin users from saving status = pago
CREATE POLICY "Appointments: staff update same company"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  (has_role(auth.uid(), 'administrador'::app_role)
   OR has_role(auth.uid(), 'atendente'::app_role)
   OR has_role(auth.uid(), 'tosador'::app_role)
   OR has_role(auth.uid(), 'medico'::app_role))
  AND (cnpj = current_user_cnpj(auth.uid()))
)
WITH CHECK (
  (has_role(auth.uid(), 'administrador'::app_role)
   OR has_role(auth.uid(), 'atendente'::app_role)
   OR has_role(auth.uid(), 'tosador'::app_role)
   OR has_role(auth.uid(), 'medico'::app_role))
  AND (cnpj = current_user_cnpj(auth.uid()))
  AND (
    -- Only admin can set status to 'pago'
    status IS DISTINCT FROM 'pago'::appointment_status
    OR has_role(auth.uid(), 'administrador'::app_role)
  )
);