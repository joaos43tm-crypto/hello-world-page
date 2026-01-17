-- Fix linter: RLS enabled but no policies on registration_codes
ALTER TABLE public.registration_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage registration codes"
ON public.registration_codes
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));