-- Tighten access control according to app roles

-- APPOINTMENTS
DROP POLICY IF EXISTS "Authenticated users can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can delete appointments" ON public.appointments;

CREATE POLICY "Staff can view appointments"
ON public.appointments
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'atendente'::app_role)
  OR has_role(auth.uid(), 'tosador'::app_role)
);

CREATE POLICY "Admin and atendente can create appointments"
ON public.appointments
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'atendente'::app_role)
);

CREATE POLICY "Staff can update appointments (validated by trigger)"
ON public.appointments
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'atendente'::app_role)
  OR has_role(auth.uid(), 'tosador'::app_role)
);

CREATE POLICY "Admin and atendente can delete appointments"
ON public.appointments
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'atendente'::app_role)
);

-- Enforce that 'tosador' can ONLY change status (and updated_at)
CREATE OR REPLACE FUNCTION public.enforce_appointments_update_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_tosador boolean;
  is_admin_or_atendente boolean;
BEGIN
  -- Only restrict updates for tosador; admins/atendentes can update freely.
  is_tosador := has_role(auth.uid(), 'tosador'::app_role);
  is_admin_or_atendente := has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role);

  IF is_admin_or_atendente THEN
    RETURN NEW;
  END IF;

  IF is_tosador THEN
    -- Allow changing ONLY status. Also allow updated_at to change (it may be auto-set by app).
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

  -- No role found => block
  RAISE EXCEPTION 'not allowed to update appointment';
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_appointments_update_permissions ON public.appointments;
CREATE TRIGGER trg_enforce_appointments_update_permissions
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_appointments_update_permissions();


-- SALES
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can update sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can delete sales" ON public.sales;

CREATE POLICY "Admin and atendente can view sales"
ON public.sales
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

CREATE POLICY "Admin and atendente can create sales"
ON public.sales
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

CREATE POLICY "Admin and atendente can update sales"
ON public.sales
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

CREATE POLICY "Admin and atendente can delete sales"
ON public.sales
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));


-- SALE_ITEMS
DROP POLICY IF EXISTS "Authenticated users can view sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Authenticated users can insert sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Authenticated users can update sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Authenticated users can delete sale_items" ON public.sale_items;

CREATE POLICY "Admin and atendente can view sale_items"
ON public.sale_items
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

CREATE POLICY "Admin and atendente can create sale_items"
ON public.sale_items
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

CREATE POLICY "Admin and atendente can update sale_items"
ON public.sale_items
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

CREATE POLICY "Admin and atendente can delete sale_items"
ON public.sale_items
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));


-- SERVICES (everyone who works can view; only admin manages)
DROP POLICY IF EXISTS "Authenticated users can view services" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can manage services" ON public.services;

CREATE POLICY "Staff can view services"
ON public.services
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'atendente'::app_role)
  OR has_role(auth.uid(), 'tosador'::app_role)
);

CREATE POLICY "Admins can manage services"
ON public.services
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


-- PROFESSIONALS (everyone who works can view; only admin manages)
DROP POLICY IF EXISTS "Authenticated users can view professionals" ON public.professionals;
DROP POLICY IF EXISTS "Authenticated users can manage professionals" ON public.professionals;

CREATE POLICY "Staff can view professionals"
ON public.professionals
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'atendente'::app_role)
  OR has_role(auth.uid(), 'tosador'::app_role)
);

CREATE POLICY "Admins can manage professionals"
ON public.professionals
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


-- PRODUCTS (admin/atendente can view for PDV; only admin manages catalog)
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can manage products" ON public.products;

CREATE POLICY "Admin and atendente can view products"
ON public.products
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role));

CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


-- REPORTING TABLES: PLANS / PACKAGES / CLIENT_PLANS (admin only for now)
DROP POLICY IF EXISTS "Authenticated users can view plans" ON public.plans;
DROP POLICY IF EXISTS "Authenticated users can manage plans" ON public.plans;

CREATE POLICY "Admins can view plans"
ON public.plans
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage plans"
ON public.plans
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can view packages" ON public.packages;
DROP POLICY IF EXISTS "Authenticated users can manage packages" ON public.packages;

CREATE POLICY "Admins can view packages"
ON public.packages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage packages"
ON public.packages
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can view client_plans" ON public.client_plans;
DROP POLICY IF EXISTS "Authenticated users can manage client_plans" ON public.client_plans;

CREATE POLICY "Admins can view client_plans"
ON public.client_plans
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage client_plans"
ON public.client_plans
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
