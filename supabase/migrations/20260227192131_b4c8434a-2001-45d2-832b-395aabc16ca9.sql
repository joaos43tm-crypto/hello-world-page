-- Harden multi-tenant isolation for catalog/config tables by adding cnpj + trigger + RLS policies

BEGIN;

-- 1) Add cnpj columns (nullable to avoid breaking existing rows immediately)
ALTER TABLE public.services       ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.products       ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.professionals  ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.medical_offices ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.plans          ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.packages       ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.client_plans   ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS cnpj text;

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_services_cnpj        ON public.services(cnpj);
CREATE INDEX IF NOT EXISTS idx_products_cnpj        ON public.products(cnpj);
CREATE INDEX IF NOT EXISTS idx_professionals_cnpj   ON public.professionals(cnpj);
CREATE INDEX IF NOT EXISTS idx_medical_offices_cnpj ON public.medical_offices(cnpj);
CREATE INDEX IF NOT EXISTS idx_plans_cnpj           ON public.plans(cnpj);
CREATE INDEX IF NOT EXISTS idx_packages_cnpj        ON public.packages(cnpj);
CREATE INDEX IF NOT EXISTS idx_client_plans_cnpj    ON public.client_plans(cnpj);
CREATE INDEX IF NOT EXISTS idx_store_settings_cnpj  ON public.store_settings(cnpj);

-- 3) Triggers to auto-populate and prevent tenant changes (uses existing SECURITY DEFINER function set_row_cnpj())
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_services_set_cnpj') THEN
    CREATE TRIGGER trg_services_set_cnpj
    BEFORE INSERT OR UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION public.set_row_cnpj();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_products_set_cnpj') THEN
    CREATE TRIGGER trg_products_set_cnpj
    BEFORE INSERT OR UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.set_row_cnpj();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_professionals_set_cnpj') THEN
    CREATE TRIGGER trg_professionals_set_cnpj
    BEFORE INSERT OR UPDATE ON public.professionals
    FOR EACH ROW EXECUTE FUNCTION public.set_row_cnpj();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_medical_offices_set_cnpj') THEN
    CREATE TRIGGER trg_medical_offices_set_cnpj
    BEFORE INSERT OR UPDATE ON public.medical_offices
    FOR EACH ROW EXECUTE FUNCTION public.set_row_cnpj();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_plans_set_cnpj') THEN
    CREATE TRIGGER trg_plans_set_cnpj
    BEFORE INSERT OR UPDATE ON public.plans
    FOR EACH ROW EXECUTE FUNCTION public.set_row_cnpj();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_packages_set_cnpj') THEN
    CREATE TRIGGER trg_packages_set_cnpj
    BEFORE INSERT OR UPDATE ON public.packages
    FOR EACH ROW EXECUTE FUNCTION public.set_row_cnpj();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_client_plans_set_cnpj') THEN
    CREATE TRIGGER trg_client_plans_set_cnpj
    BEFORE INSERT OR UPDATE ON public.client_plans
    FOR EACH ROW EXECUTE FUNCTION public.set_row_cnpj();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_store_settings_set_cnpj') THEN
    CREATE TRIGGER trg_store_settings_set_cnpj
    BEFORE INSERT OR UPDATE ON public.store_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_row_cnpj();
  END IF;
END $$;

-- 4) Replace policies with CNPJ-scoped ones.
-- Note: allow legacy rows with cnpj IS NULL to be visible only to MASTER admin (admin with no cnpj).

-- SERVICES
DROP POLICY IF EXISTS "Staff pode ver serviços" ON public.services;
DROP POLICY IF EXISTS "Medicos can view services" ON public.services;
DROP POLICY IF EXISTS "Administradores podem gerenciar serviços" ON public.services;

CREATE POLICY "Services: staff read same company"
ON public.services
FOR SELECT
TO authenticated
USING (
  (
    (public.has_role(auth.uid(), 'administrador'::public.app_role)
     OR public.has_role(auth.uid(), 'atendente'::public.app_role)
     OR public.has_role(auth.uid(), 'tosador'::public.app_role)
     OR public.has_role(auth.uid(), 'medico'::public.app_role))
    AND cnpj = public.current_user_cnpj(auth.uid())
  )
  OR (
    public.has_role(auth.uid(), 'administrador'::public.app_role)
    AND (public.current_user_cnpj(auth.uid()) IS NULL OR public.current_user_cnpj(auth.uid()) = '')
    AND cnpj IS NULL
  )
);

CREATE POLICY "Services: admin manage same company"
ON public.services
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  AND cnpj = public.current_user_cnpj(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  AND cnpj = public.current_user_cnpj(auth.uid())
);

-- PRODUCTS
DROP POLICY IF EXISTS "Administradores e atendentes podem ver produtos" ON public.products;
DROP POLICY IF EXISTS "Administradores podem gerenciar produtos" ON public.products;

CREATE POLICY "Products: staff read same company"
ON public.products
FOR SELECT
TO authenticated
USING (
  (
    (public.has_role(auth.uid(), 'administrador'::public.app_role)
     OR public.has_role(auth.uid(), 'atendente'::public.app_role))
    AND cnpj = public.current_user_cnpj(auth.uid())
  )
  OR (
    public.has_role(auth.uid(), 'administrador'::public.app_role)
    AND (public.current_user_cnpj(auth.uid()) IS NULL OR public.current_user_cnpj(auth.uid()) = '')
    AND cnpj IS NULL
  )
);

CREATE POLICY "Products: admin manage same company"
ON public.products
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  AND cnpj = public.current_user_cnpj(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  AND cnpj = public.current_user_cnpj(auth.uid())
);

-- PROFESSIONALS
DROP POLICY IF EXISTS "Staff pode ver profissionais" ON public.professionals;
DROP POLICY IF EXISTS "Administradores podem gerenciar profissionais" ON public.professionals;

CREATE POLICY "Professionals: staff read same company"
ON public.professionals
FOR SELECT
TO authenticated
USING (
  (
    (public.has_role(auth.uid(), 'administrador'::public.app_role)
     OR public.has_role(auth.uid(), 'atendente'::public.app_role)
     OR public.has_role(auth.uid(), 'tosador'::public.app_role))
    AND cnpj = public.current_user_cnpj(auth.uid())
  )
  OR (
    public.has_role(auth.uid(), 'administrador'::public.app_role)
    AND (public.current_user_cnpj(auth.uid()) IS NULL OR public.current_user_cnpj(auth.uid()) = '')
    AND cnpj IS NULL
  )
);

CREATE POLICY "Professionals: admin manage same company"
ON public.professionals
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  AND cnpj = public.current_user_cnpj(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  AND cnpj = public.current_user_cnpj(auth.uid())
);

-- MEDICAL OFFICES
DROP POLICY IF EXISTS "Staff pode ver consultórios" ON public.medical_offices;
DROP POLICY IF EXISTS "Administradores podem gerenciar consultórios" ON public.medical_offices;

CREATE POLICY "Medical offices: staff read same company"
ON public.medical_offices
FOR SELECT
TO authenticated
USING (
  (
    (public.has_role(auth.uid(), 'administrador'::public.app_role)
     OR public.has_role(auth.uid(), 'atendente'::public.app_role)
     OR public.has_role(auth.uid(), 'medico'::public.app_role))
    AND cnpj = public.current_user_cnpj(auth.uid())
  )
  OR (
    public.has_role(auth.uid(), 'administrador'::public.app_role)
    AND (public.current_user_cnpj(auth.uid()) IS NULL OR public.current_user_cnpj(auth.uid()) = '')
    AND cnpj IS NULL
  )
);

CREATE POLICY "Medical offices: admin manage same company"
ON public.medical_offices
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  AND cnpj = public.current_user_cnpj(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  AND cnpj = public.current_user_cnpj(auth.uid())
);

-- PLANS (business plans, not subscription plans)
DROP POLICY IF EXISTS "Administradores podem gerenciar planos" ON public.plans;
DROP POLICY IF EXISTS "Administradores podem ver planos" ON public.plans;

CREATE POLICY "Plans: staff read same company"
ON public.plans
FOR SELECT
TO authenticated
USING (
  (
    public.has_role(auth.uid(), 'administrador'::public.app_role)
    AND cnpj = public.current_user_cnpj(auth.uid())
  )
  OR (
    public.has_role(auth.uid(), 'administrador'::public.app_role)
    AND (public.current_user_cnpj(auth.uid()) IS NULL OR public.current_user_cnpj(auth.uid()) = '')
    AND cnpj IS NULL
  )
);

CREATE POLICY "Plans: admin manage same company"
ON public.plans
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  AND cnpj = public.current_user_cnpj(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  AND cnpj = public.current_user_cnpj(auth.uid())
);

-- PACKAGES
DROP POLICY IF EXISTS "Administradores podem gerenciar pacotes" ON public.packages;
DROP POLICY IF EXISTS "Administradores podem ver pacotes" ON public.packages;

CREATE POLICY "Packages: staff read same company"
ON public.packages
FOR SELECT
TO authenticated
USING (
  (
    public.has_role(auth.uid(), 'administrador'::public.app_role)
    AND cnpj = public.current_user_cnpj(auth.uid())
  )
  OR (
    public.has_role(auth.uid(), 'administrador'::public.app_role)
    AND (public.current_user_cnpj(auth.uid()) IS NULL OR public.current_user_cnpj(auth.uid()) = '')
    AND cnpj IS NULL
  )
);

CREATE POLICY "Packages: admin manage same company"
ON public.packages
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  AND cnpj = public.current_user_cnpj(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  AND cnpj = public.current_user_cnpj(auth.uid())
);

-- CLIENT_PLANS
DROP POLICY IF EXISTS "Administradores podem gerenciar planos de clientes" ON public.client_plans;
DROP POLICY IF EXISTS "Administradores podem ver planos de clientes" ON public.client_plans;

CREATE POLICY "Client plans: admin read same company"
ON public.client_plans
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  AND cnpj = public.current_user_cnpj(auth.uid())
);

CREATE POLICY "Client plans: admin manage same company"
ON public.client_plans
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  AND cnpj = public.current_user_cnpj(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  AND cnpj = public.current_user_cnpj(auth.uid())
);

-- STORE_SETTINGS
DROP POLICY IF EXISTS "Administradores e atendentes podem ver configurações" ON public.store_settings;
DROP POLICY IF EXISTS "Administradores podem atualizar configurações" ON public.store_settings;

CREATE POLICY "Store settings: staff read same company"
ON public.store_settings
FOR SELECT
TO authenticated
USING (
  (
    (public.has_role(auth.uid(), 'administrador'::public.app_role)
     OR public.has_role(auth.uid(), 'atendente'::public.app_role))
    AND cnpj = public.current_user_cnpj(auth.uid())
  )
  OR (
    public.has_role(auth.uid(), 'administrador'::public.app_role)
    AND (public.current_user_cnpj(auth.uid()) IS NULL OR public.current_user_cnpj(auth.uid()) = '')
    AND cnpj IS NULL
  )
);

CREATE POLICY "Store settings: admin update same company"
ON public.store_settings
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  AND cnpj = public.current_user_cnpj(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  AND cnpj = public.current_user_cnpj(auth.uid())
);

COMMIT;