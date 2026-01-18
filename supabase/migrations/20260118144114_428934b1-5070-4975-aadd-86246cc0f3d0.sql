-- Fix public exposure by ensuring key table policies only apply to authenticated users.

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- APPOINTMENTS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view appointments" ON public.appointments;
CREATE POLICY "Staff can view appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'atendente'::public.app_role)
  OR public.has_role(auth.uid(), 'tosador'::public.app_role)
  OR public.has_role(auth.uid(), 'medico'::public.app_role)
);

DROP POLICY IF EXISTS "Admin and atendente can create appointments" ON public.appointments;
CREATE POLICY "Admin and atendente can create appointments"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'atendente'::public.app_role)
);

DROP POLICY IF EXISTS "Staff can update appointments (validated by trigger)" ON public.appointments;
CREATE POLICY "Staff can update appointments (validated by trigger)"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'atendente'::public.app_role)
  OR public.has_role(auth.uid(), 'tosador'::public.app_role)
  OR public.has_role(auth.uid(), 'medico'::public.app_role)
);

DROP POLICY IF EXISTS "Admin and atendente can delete appointments" ON public.appointments;
CREATE POLICY "Admin and atendente can delete appointments"
ON public.appointments
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'atendente'::public.app_role)
);

-- USER_ROLES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own role or admin can view all" ON public.user_roles;
CREATE POLICY "Users can view own role or admin can view all"
ON public.user_roles
FOR SELECT
TO authenticated
USING ((auth.uid() = user_id) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
