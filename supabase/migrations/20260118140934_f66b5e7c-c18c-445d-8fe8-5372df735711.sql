-- Tighten RLS for profiles and store_settings

-- PROFILES
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow admins to list profiles (e.g. user management)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- STORE SETTINGS
DROP POLICY IF EXISTS "Anyone can view store settings" ON public.store_settings;

CREATE POLICY "Authenticated can view store settings"
ON public.store_settings
FOR SELECT
TO authenticated
USING (true);
