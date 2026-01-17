-- Allow administrators to update other users' profiles (e.g., change display name)
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
USING (is_admin(auth.uid()));