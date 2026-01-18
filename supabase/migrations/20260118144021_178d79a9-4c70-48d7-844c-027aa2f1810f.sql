-- Harden access: block anonymous reads and add company-aware policies where possible.

-- 1) Helper to get current user's company (CNPJ) without RLS recursion.
CREATE OR REPLACE FUNCTION public.current_user_cnpj(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.cnpj
  FROM public.profiles p
  WHERE p.user_id = _user_id
  LIMIT 1;
$$;

-- 2) PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles: select own or same company" ON public.profiles;
CREATE POLICY "Profiles: select own or same company"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (cnpj IS NOT NULL AND cnpj = public.current_user_cnpj(auth.uid()))
);

DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;
CREATE POLICY "Profiles: update own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Profiles: admin update same company" ON public.profiles;
CREATE POLICY "Profiles: admin update same company"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND cnpj IS NOT NULL
  AND cnpj = public.current_user_cnpj(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND cnpj IS NOT NULL
  AND cnpj = public.current_user_cnpj(auth.uid())
);

DROP POLICY IF EXISTS "Profiles: insert self" ON public.profiles;
CREATE POLICY "Profiles: insert self"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 3) APPOINTMENTS (minimum: authenticated only)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Appointments: authenticated read" ON public.appointments;
CREATE POLICY "Appointments: authenticated read"
ON public.appointments
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Appointments: authenticated insert" ON public.appointments;
CREATE POLICY "Appointments: authenticated insert"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Appointments: authenticated update" ON public.appointments;
CREATE POLICY "Appointments: authenticated update"
ON public.appointments
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Appointments: authenticated delete" ON public.appointments;
CREATE POLICY "Appointments: authenticated delete"
ON public.appointments
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 4) USER_ROLES (hide from anonymous; allow self read; allow admin manage within same company)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User roles: read self" ON public.user_roles;
CREATE POLICY "User roles: read self"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "User roles: admin read same company" ON public.user_roles;
CREATE POLICY "User roles: admin read same company"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p_target
    WHERE p_target.user_id = public.user_roles.user_id
      AND p_target.cnpj IS NOT NULL
      AND p_target.cnpj = public.current_user_cnpj(auth.uid())
  )
);

DROP POLICY IF EXISTS "User roles: admin update same company" ON public.user_roles;
CREATE POLICY "User roles: admin update same company"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p_target
    WHERE p_target.user_id = public.user_roles.user_id
      AND p_target.cnpj IS NOT NULL
      AND p_target.cnpj = public.current_user_cnpj(auth.uid())
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p_target
    WHERE p_target.user_id = public.user_roles.user_id
      AND p_target.cnpj IS NOT NULL
      AND p_target.cnpj = public.current_user_cnpj(auth.uid())
  )
);

DROP POLICY IF EXISTS "User roles: admin insert same company" ON public.user_roles;
CREATE POLICY "User roles: admin insert same company"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p_target
    WHERE p_target.user_id = public.user_roles.user_id
      AND p_target.cnpj IS NOT NULL
      AND p_target.cnpj = public.current_user_cnpj(auth.uid())
  )
);

DROP POLICY IF EXISTS "User roles: admin delete same company" ON public.user_roles;
CREATE POLICY "User roles: admin delete same company"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p_target
    WHERE p_target.user_id = public.user_roles.user_id
      AND p_target.cnpj IS NOT NULL
      AND p_target.cnpj = public.current_user_cnpj(auth.uid())
  )
);
