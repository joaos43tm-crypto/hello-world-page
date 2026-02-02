-- Rename role value from 'admin' to 'administrador'
DO $$
BEGIN
  -- Postgres supports renaming enum values (PG 10+). If it was already renamed, ignore.
  BEGIN
    ALTER TYPE public.app_role RENAME VALUE 'admin' TO 'administrador';
  EXCEPTION WHEN undefined_object OR invalid_parameter_value THEN
    -- If enum/type/value doesn't exist or already renamed, do nothing
    NULL;
  END;
END $$;

-- Update helper functions to use the new enum value
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'administrador'::public.app_role
  )
$$;

-- Update permissions trigger helper to treat 'administrador' as full access
CREATE OR REPLACE FUNCTION public.enforce_appointments_update_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_tosador boolean;
  is_admin_or_atendente boolean;
BEGIN
  -- Only restrict updates for tosador; administradores/atendentes can update freely.
  is_tosador := has_role(auth.uid(), 'tosador'::app_role);
  is_admin_or_atendente := has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role);

  IF is_admin_or_atendente THEN
    RETURN NEW;
  END IF;

  IF is_tosador THEN
    -- Allow changing ONLY status. Also allow updated_at to change.
    IF (NEW.status IS DISTINCT FROM OLD.status)
       AND (NEW.pet_id = OLD.pet_id)
       AND (NEW.service_id = OLD.service_id)
       AND (NEW.professional_id IS NOT DISTINCT FROM OLD.professional_id)
       AND (NEW.scheduled_date = OLD.scheduled_date)
       AND (NEW.scheduled_time = OLD.scheduled_time)
       AND (NEW.price IS NOT DISTINCT FROM OLD.price)
       AND (NEW.notes IS NOT DISTINCT FROM OLD.notes)
       AND (NEW.whatsapp_sent IS NOT DISTINCT FROM OLD.whatsapp_sent)
       AND (NEW.created_at IS NOT DISTINCT FROM OLD.created_at)
    THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'tosador can only update appointment status';
  END IF;

  RAISE EXCEPTION 'not allowed to update appointment';
END;
$$;

-- Update handle_new_user() so first account becomes 'administrador'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_cnpj TEXT;
  is_first_user_for_company BOOLEAN := true;
  company_user_ids UUID[];
BEGIN
  user_cnpj := NEW.raw_user_meta_data ->> 'cnpj';

  INSERT INTO public.profiles (user_id, name, company_name, cnpj)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'Usuário'),
    NEW.raw_user_meta_data ->> 'company_name',
    user_cnpj
  );

  IF user_cnpj IS NOT NULL AND user_cnpj != '' THEN
    SELECT ARRAY_AGG(user_id) INTO company_user_ids
    FROM public.profiles
    WHERE cnpj = user_cnpj AND user_id != NEW.id;

    IF company_user_ids IS NOT NULL AND array_length(company_user_ids, 1) > 0 THEN
      SELECT NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = ANY(company_user_ids)
      ) INTO is_first_user_for_company;
    END IF;
  ELSE
    SELECT (SELECT COUNT(*) FROM public.user_roles) = 0 INTO is_first_user_for_company;
  END IF;

  IF is_first_user_for_company THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'administrador'::public.app_role);
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'atendente'::public.app_role);
  END IF;

  RETURN NEW;
END;
$$;

-- registration_codes.created_by default currently uses a text 'admin'; update to 'administrador'
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.registration_codes ALTER COLUMN created_by SET DEFAULT 'administrador'::text;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
END $$;

-- Recreate policies that referenced 'admin'
-- PROFILES
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: admin update same company" ON public.profiles;

CREATE POLICY "Administradores podem ver perfis da empresa"
ON public.profiles
FOR SELECT
USING (
  (user_id = auth.uid())
  OR ((cnpj IS NOT NULL) AND (cnpj = current_user_cnpj(auth.uid())))
);

CREATE POLICY "Administradores podem atualizar perfis da empresa"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  AND (cnpj IS NOT NULL)
  AND (cnpj = current_user_cnpj(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'administrador'::app_role)
  AND (cnpj IS NOT NULL)
  AND (cnpj = current_user_cnpj(auth.uid()))
);

-- USER_ROLES
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: admin delete same company" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: admin insert same company" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: admin read same company" ON public.user_roles;
DROP POLICY IF EXISTS "User roles: admin update same company" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role or admin can view all" ON public.user_roles;

CREATE POLICY "User roles: administrador read same company"
ON public.user_roles
FOR SELECT
USING (
  (user_id = auth.uid())
  OR (
    has_role(auth.uid(), 'administrador'::app_role)
    AND EXISTS (
      SELECT 1
      FROM public.profiles p_target
      WHERE p_target.user_id = user_roles.user_id
        AND p_target.cnpj IS NOT NULL
        AND p_target.cnpj = current_user_cnpj(auth.uid())
    )
  )
);

CREATE POLICY "User roles: administrador insert same company"
ON public.user_roles
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'administrador'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p_target
    WHERE p_target.user_id = user_roles.user_id
      AND p_target.cnpj IS NOT NULL
      AND p_target.cnpj = current_user_cnpj(auth.uid())
  )
);

CREATE POLICY "User roles: administrador update same company"
ON public.user_roles
FOR UPDATE
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p_target
    WHERE p_target.user_id = user_roles.user_id
      AND p_target.cnpj IS NOT NULL
      AND p_target.cnpj = current_user_cnpj(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'administrador'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p_target
    WHERE p_target.user_id = user_roles.user_id
      AND p_target.cnpj IS NOT NULL
      AND p_target.cnpj = current_user_cnpj(auth.uid())
  )
);

CREATE POLICY "User roles: administrador delete same company"
ON public.user_roles
FOR DELETE
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p_target
    WHERE p_target.user_id = user_roles.user_id
      AND p_target.cnpj IS NOT NULL
      AND p_target.cnpj = current_user_cnpj(auth.uid())
  )
);

-- APPOINTMENTS policies referencing admin
DROP POLICY IF EXISTS "Admin and atendente can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admin and atendente can delete appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can update appointments (validated by trigger)" ON public.appointments;
DROP POLICY IF EXISTS "Staff can view appointments" ON public.appointments;

CREATE POLICY "Administradores e atendentes podem criar agendamentos"
ON public.appointments
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

CREATE POLICY "Administradores e atendentes podem deletar agendamentos"
ON public.appointments
FOR DELETE
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

CREATE POLICY "Staff pode ver agendamentos"
ON public.appointments
FOR SELECT
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'atendente'::app_role)
  OR has_role(auth.uid(), 'tosador'::app_role)
  OR has_role(auth.uid(), 'medico'::app_role)
);

CREATE POLICY "Staff pode atualizar agendamentos (validado por trigger)"
ON public.appointments
FOR UPDATE
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'atendente'::app_role)
  OR has_role(auth.uid(), 'tosador'::app_role)
  OR has_role(auth.uid(), 'medico'::app_role)
);

-- PRODUCTS
DROP POLICY IF EXISTS "Admin and atendente can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

CREATE POLICY "Administradores e atendentes podem ver produtos"
ON public.products
FOR SELECT
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

CREATE POLICY "Administradores podem gerenciar produtos"
ON public.products
FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- STORE SETTINGS
DROP POLICY IF EXISTS "Admin/atendente can view store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admins can update store settings" ON public.store_settings;

CREATE POLICY "Administradores e atendentes podem ver configurações"
ON public.store_settings
FOR SELECT
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

CREATE POLICY "Administradores podem atualizar configurações"
ON public.store_settings
FOR UPDATE
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- SERVICES
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
DROP POLICY IF EXISTS "Staff can view services" ON public.services;

CREATE POLICY "Administradores podem gerenciar serviços"
ON public.services
FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Staff pode ver serviços"
ON public.services
FOR SELECT
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'atendente'::app_role)
  OR has_role(auth.uid(), 'tosador'::app_role)
);

-- PROFESSIONALS
DROP POLICY IF EXISTS "Admins can manage professionals" ON public.professionals;
DROP POLICY IF EXISTS "Staff can view professionals" ON public.professionals;

CREATE POLICY "Administradores podem gerenciar profissionais"
ON public.professionals
FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Staff pode ver profissionais"
ON public.professionals
FOR SELECT
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'atendente'::app_role)
  OR has_role(auth.uid(), 'tosador'::app_role)
);

-- PETS
DROP POLICY IF EXISTS "Admins can delete pets" ON public.pets;
DROP POLICY IF EXISTS "Staff can insert pets" ON public.pets;
DROP POLICY IF EXISTS "Staff can update pets" ON public.pets;
DROP POLICY IF EXISTS "Staff can view pets" ON public.pets;

CREATE POLICY "Administradores podem deletar pets"
ON public.pets
FOR DELETE
USING (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Administradores/atendentes podem inserir pets"
ON public.pets
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

CREATE POLICY "Administradores/atendentes podem atualizar pets"
ON public.pets
FOR UPDATE
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

CREATE POLICY "Staff pode ver pets"
ON public.pets
FOR SELECT
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'atendente'::app_role)
  OR has_role(auth.uid(), 'tosador'::app_role)
);

-- TUTORS
DROP POLICY IF EXISTS "Admins can delete tutors" ON public.tutors;
DROP POLICY IF EXISTS "Staff can insert tutors" ON public.tutors;
DROP POLICY IF EXISTS "Staff can update tutors" ON public.tutors;
DROP POLICY IF EXISTS "Staff can view tutors" ON public.tutors;

CREATE POLICY "Administradores podem deletar tutores"
ON public.tutors
FOR DELETE
USING (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Administradores/atendentes podem inserir tutores"
ON public.tutors
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

CREATE POLICY "Administradores/atendentes podem atualizar tutores"
ON public.tutors
FOR UPDATE
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

CREATE POLICY "Staff pode ver tutores"
ON public.tutors
FOR SELECT
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'atendente'::app_role)
  OR has_role(auth.uid(), 'tosador'::app_role)
);

-- SALES
DROP POLICY IF EXISTS "Admin and atendente can create sales" ON public.sales;
DROP POLICY IF EXISTS "Admin and atendente can delete sales" ON public.sales;
DROP POLICY IF EXISTS "Admin and atendente can update sales" ON public.sales;
DROP POLICY IF EXISTS "Admin and atendente can view sales" ON public.sales;

CREATE POLICY "Administradores e atendentes podem criar vendas"
ON public.sales
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

CREATE POLICY "Administradores e atendentes podem deletar vendas"
ON public.sales
FOR DELETE
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

CREATE POLICY "Administradores e atendentes podem atualizar vendas"
ON public.sales
FOR UPDATE
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

CREATE POLICY "Administradores e atendentes podem ver vendas"
ON public.sales
FOR SELECT
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

-- SALE ITEMS
DROP POLICY IF EXISTS "Admin and atendente can create sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Admin and atendente can delete sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Admin and atendente can update sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Admin and atendente can view sale_items" ON public.sale_items;

CREATE POLICY "Administradores e atendentes podem criar itens de venda"
ON public.sale_items
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

CREATE POLICY "Administradores e atendentes podem deletar itens de venda"
ON public.sale_items
FOR DELETE
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

CREATE POLICY "Administradores e atendentes podem atualizar itens de venda"
ON public.sale_items
FOR UPDATE
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

CREATE POLICY "Administradores e atendentes podem ver itens de venda"
ON public.sale_items
FOR SELECT
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

-- CASH REGISTER
DROP POLICY IF EXISTS "Admin/atendente can open cash session" ON public.cash_register_sessions;
DROP POLICY IF EXISTS "Admin/atendente can close cash session" ON public.cash_register_sessions;
DROP POLICY IF EXISTS "Admin/atendente can view cash sessions" ON public.cash_register_sessions;

CREATE POLICY "Administradores/atendentes podem abrir sessão de caixa"
ON public.cash_register_sessions
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND (cnpj = current_user_cnpj(auth.uid()))
  AND (opened_by = auth.uid())
  AND (closed_at IS NULL)
);

CREATE POLICY "Administradores/atendentes podem fechar sessão de caixa"
ON public.cash_register_sessions
FOR UPDATE
USING (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND (cnpj = current_user_cnpj(auth.uid()))
)
WITH CHECK (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND (cnpj = current_user_cnpj(auth.uid()))
);

CREATE POLICY "Administradores/atendentes podem ver sessões de caixa"
ON public.cash_register_sessions
FOR SELECT
USING (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND (cnpj = current_user_cnpj(auth.uid()))
);

DROP POLICY IF EXISTS "Admin/atendente can create cash movements" ON public.cash_register_movements;
DROP POLICY IF EXISTS "Admin/atendente can view cash movements" ON public.cash_register_movements;

CREATE POLICY "Administradores/atendentes podem criar movimentações de caixa"
ON public.cash_register_movements
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND (cnpj = current_user_cnpj(auth.uid()))
  AND (created_by = auth.uid())
  AND (amount > (0)::numeric)
);

CREATE POLICY "Administradores/atendentes podem ver movimentações de caixa"
ON public.cash_register_movements
FOR SELECT
USING (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND (cnpj = current_user_cnpj(auth.uid()))
);

-- MEDICAL
DROP POLICY IF EXISTS "Admin can manage medical consultations" ON public.medical_consultations;
DROP POLICY IF EXISTS "Admin can view medical consultations" ON public.medical_consultations;

CREATE POLICY "Administradores podem gerenciar consultas médicas"
ON public.medical_consultations
FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Administradores podem ver consultas médicas"
ON public.medical_consultations
FOR SELECT
USING (has_role(auth.uid(), 'administrador'::app_role));

DROP POLICY IF EXISTS "Admins can manage medical offices" ON public.medical_offices;
DROP POLICY IF EXISTS "Staff can view medical offices" ON public.medical_offices;

CREATE POLICY "Administradores podem gerenciar consultórios"
ON public.medical_offices
FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Staff pode ver consultórios"
ON public.medical_offices
FOR SELECT
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'atendente'::app_role)
  OR has_role(auth.uid(), 'medico'::app_role)
);

-- PACKAGES / PLANS / CLIENT_PLANS
DROP POLICY IF EXISTS "Admins can manage packages" ON public.packages;
DROP POLICY IF EXISTS "Admins can view packages" ON public.packages;

CREATE POLICY "Administradores podem gerenciar pacotes"
ON public.packages
FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Administradores podem ver pacotes"
ON public.packages
FOR SELECT
USING (has_role(auth.uid(), 'administrador'::app_role));

DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;
DROP POLICY IF EXISTS "Admins can view plans" ON public.plans;

CREATE POLICY "Administradores podem gerenciar planos"
ON public.plans
FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Administradores podem ver planos"
ON public.plans
FOR SELECT
USING (has_role(auth.uid(), 'administrador'::app_role));

DROP POLICY IF EXISTS "Admins can manage client_plans" ON public.client_plans;
DROP POLICY IF EXISTS "Admins can view client_plans" ON public.client_plans;

CREATE POLICY "Administradores podem gerenciar planos de clientes"
ON public.client_plans
FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Administradores podem ver planos de clientes"
ON public.client_plans
FOR SELECT
USING (has_role(auth.uid(), 'administrador'::app_role));

-- REGISTRATION CODES
DROP POLICY IF EXISTS "Admins can manage registration codes" ON public.registration_codes;

CREATE POLICY "Administradores podem gerenciar códigos de cadastro"
ON public.registration_codes
FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));
