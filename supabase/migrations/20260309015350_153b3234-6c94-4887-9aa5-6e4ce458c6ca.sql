-- Harden profiles UPDATE policies to prevent cross-company escalation via cnpj changes

-- Remove duplicated/weak self-update policies
DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recreate secure self-update policy: user can update own profile, but cannot change tenant binding (cnpj)
CREATE POLICY "Profiles: update own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND cnpj IS NOT DISTINCT FROM public.current_user_cnpj(auth.uid())
);

-- Keep admin policy behavior, but ensure explicit authenticated scope
DROP POLICY IF EXISTS "Administradores podem atualizar perfis da empresa" ON public.profiles;
CREATE POLICY "Administradores podem atualizar perfis da empresa"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  AND cnpj IS NOT NULL
  AND cnpj = public.current_user_cnpj(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  AND cnpj IS NOT NULL
  AND cnpj = public.current_user_cnpj(auth.uid())
);