-- Multi-tenant by CNPJ: add tenant column + enforce via RLS + helper triggers

BEGIN;

-- 1) Add cnpj columns (nullable for legacy rows)
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.medical_consultations ADD COLUMN IF NOT EXISTS cnpj text;

-- 2) Indexes to keep tenant filtering fast
CREATE INDEX IF NOT EXISTS idx_tutors_cnpj ON public.tutors (cnpj);
CREATE INDEX IF NOT EXISTS idx_pets_cnpj ON public.pets (cnpj);
CREATE INDEX IF NOT EXISTS idx_appointments_cnpj ON public.appointments (cnpj);
CREATE INDEX IF NOT EXISTS idx_sales_cnpj ON public.sales (cnpj);
CREATE INDEX IF NOT EXISTS idx_sale_items_cnpj ON public.sale_items (cnpj);
CREATE INDEX IF NOT EXISTS idx_medical_consultations_cnpj ON public.medical_consultations (cnpj);

-- 3) Trigger function: set cnpj automatically on insert and prevent changes
CREATE OR REPLACE FUNCTION public.set_row_cnpj()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cnpj text;
BEGIN
  v_cnpj := public.current_user_cnpj(auth.uid());

  IF TG_OP = 'INSERT' THEN
    IF NEW.cnpj IS NULL OR NEW.cnpj = '' THEN
      NEW.cnpj := v_cnpj;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: do not allow changing tenant
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.cnpj IS DISTINCT FROM OLD.cnpj) THEN
      RAISE EXCEPTION 'cnpj cannot be changed';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- 4) Attach triggers
DROP TRIGGER IF EXISTS trg_tutors_set_cnpj ON public.tutors;
CREATE TRIGGER trg_tutors_set_cnpj
BEFORE INSERT OR UPDATE ON public.tutors
FOR EACH ROW
EXECUTE FUNCTION public.set_row_cnpj();

DROP TRIGGER IF EXISTS trg_pets_set_cnpj ON public.pets;
CREATE TRIGGER trg_pets_set_cnpj
BEFORE INSERT OR UPDATE ON public.pets
FOR EACH ROW
EXECUTE FUNCTION public.set_row_cnpj();

DROP TRIGGER IF EXISTS trg_appointments_set_cnpj ON public.appointments;
CREATE TRIGGER trg_appointments_set_cnpj
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.set_row_cnpj();

DROP TRIGGER IF EXISTS trg_sales_set_cnpj ON public.sales;
CREATE TRIGGER trg_sales_set_cnpj
BEFORE INSERT OR UPDATE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.set_row_cnpj();

DROP TRIGGER IF EXISTS trg_sale_items_set_cnpj ON public.sale_items;
CREATE TRIGGER trg_sale_items_set_cnpj
BEFORE INSERT OR UPDATE ON public.sale_items
FOR EACH ROW
EXECUTE FUNCTION public.set_row_cnpj();

DROP TRIGGER IF EXISTS trg_medical_consultations_set_cnpj ON public.medical_consultations;
CREATE TRIGGER trg_medical_consultations_set_cnpj
BEFORE INSERT OR UPDATE ON public.medical_consultations
FOR EACH ROW
EXECUTE FUNCTION public.set_row_cnpj();

-- 5) RLS: replace policies to enforce tenant isolation

-- tutors
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Administradores podem deletar tutores" ON public.tutors;
DROP POLICY IF EXISTS "Administradores/atendentes podem atualizar tutores" ON public.tutors;
DROP POLICY IF EXISTS "Administradores/atendentes podem inserir tutores" ON public.tutors;
DROP POLICY IF EXISTS "Medicos can view tutors" ON public.tutors;
DROP POLICY IF EXISTS "Staff pode ver tutores" ON public.tutors;

CREATE POLICY "Tutores: staff read same company"
ON public.tutors
FOR SELECT
USING (
  (
    (has_role(auth.uid(), 'administrador'::app_role)
     OR has_role(auth.uid(), 'atendente'::app_role)
     OR has_role(auth.uid(), 'tosador'::app_role)
     OR has_role(auth.uid(), 'medico'::app_role)
    )
    AND cnpj = current_user_cnpj(auth.uid())
  )
  OR (has_role(auth.uid(), 'administrador'::app_role) AND cnpj IS NULL)
);

CREATE POLICY "Tutores: admin/atendente insert same company"
ON public.tutors
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND (cnpj = current_user_cnpj(auth.uid()) OR cnpj IS NULL)
);

CREATE POLICY "Tutores: admin/atendente update same company"
ON public.tutors
FOR UPDATE
USING (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND cnpj = current_user_cnpj(auth.uid())
)
WITH CHECK (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND cnpj = current_user_cnpj(auth.uid())
);

CREATE POLICY "Tutores: admin delete same company"
ON public.tutors
FOR DELETE
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  AND cnpj = current_user_cnpj(auth.uid())
);

-- pets
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Administradores podem deletar pets" ON public.pets;
DROP POLICY IF EXISTS "Administradores/atendentes podem atualizar pets" ON public.pets;
DROP POLICY IF EXISTS "Administradores/atendentes podem inserir pets" ON public.pets;
DROP POLICY IF EXISTS "Medicos can view pets" ON public.pets;
DROP POLICY IF EXISTS "Staff pode ver pets" ON public.pets;

CREATE POLICY "Pets: staff read same company"
ON public.pets
FOR SELECT
USING (
  (
    (has_role(auth.uid(), 'administrador'::app_role)
     OR has_role(auth.uid(), 'atendente'::app_role)
     OR has_role(auth.uid(), 'tosador'::app_role)
     OR has_role(auth.uid(), 'medico'::app_role)
    )
    AND cnpj = current_user_cnpj(auth.uid())
  )
  OR (has_role(auth.uid(), 'administrador'::app_role) AND cnpj IS NULL)
);

CREATE POLICY "Pets: admin/atendente insert same company"
ON public.pets
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND (cnpj = current_user_cnpj(auth.uid()) OR cnpj IS NULL)
);

CREATE POLICY "Pets: admin/atendente update same company"
ON public.pets
FOR UPDATE
USING (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND cnpj = current_user_cnpj(auth.uid())
)
WITH CHECK (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND cnpj = current_user_cnpj(auth.uid())
);

CREATE POLICY "Pets: admin delete same company"
ON public.pets
FOR DELETE
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  AND cnpj = current_user_cnpj(auth.uid())
);

-- appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Administradores e atendentes podem criar agendamentos" ON public.appointments;
DROP POLICY IF EXISTS "Administradores e atendentes podem deletar agendamentos" ON public.appointments;
DROP POLICY IF EXISTS "Appointments: authenticated delete" ON public.appointments;
DROP POLICY IF EXISTS "Appointments: authenticated insert" ON public.appointments;
DROP POLICY IF EXISTS "Appointments: authenticated read" ON public.appointments;
DROP POLICY IF EXISTS "Appointments: authenticated update" ON public.appointments;
DROP POLICY IF EXISTS "Staff pode atualizar agendamentos (validado por trigger)" ON public.appointments;
DROP POLICY IF EXISTS "Staff pode ver agendamentos" ON public.appointments;

CREATE POLICY "Appointments: staff read same company"
ON public.appointments
FOR SELECT
USING (
  (
    (has_role(auth.uid(), 'administrador'::app_role)
     OR has_role(auth.uid(), 'atendente'::app_role)
     OR has_role(auth.uid(), 'tosador'::app_role)
     OR has_role(auth.uid(), 'medico'::app_role)
    )
    AND cnpj = current_user_cnpj(auth.uid())
  )
  OR (has_role(auth.uid(), 'administrador'::app_role) AND cnpj IS NULL)
);

CREATE POLICY "Appointments: admin/atendente insert same company"
ON public.appointments
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND (cnpj = current_user_cnpj(auth.uid()) OR cnpj IS NULL)
);

CREATE POLICY "Appointments: staff update same company"
ON public.appointments
FOR UPDATE
USING (
  (has_role(auth.uid(), 'administrador'::app_role)
   OR has_role(auth.uid(), 'atendente'::app_role)
   OR has_role(auth.uid(), 'tosador'::app_role)
   OR has_role(auth.uid(), 'medico'::app_role)
  )
  AND cnpj = current_user_cnpj(auth.uid())
)
WITH CHECK (
  (has_role(auth.uid(), 'administrador'::app_role)
   OR has_role(auth.uid(), 'atendente'::app_role)
   OR has_role(auth.uid(), 'tosador'::app_role)
   OR has_role(auth.uid(), 'medico'::app_role)
  )
  AND cnpj = current_user_cnpj(auth.uid())
);

CREATE POLICY "Appointments: admin delete same company"
ON public.appointments
FOR DELETE
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  AND cnpj = current_user_cnpj(auth.uid())
);

-- sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Administradores e atendentes podem atualizar vendas" ON public.sales;
DROP POLICY IF EXISTS "Administradores e atendentes podem criar vendas" ON public.sales;
DROP POLICY IF EXISTS "Administradores e atendentes podem deletar vendas" ON public.sales;
DROP POLICY IF EXISTS "Administradores e atendentes podem ver vendas" ON public.sales;

CREATE POLICY "Sales: admin/atendente read same company"
ON public.sales
FOR SELECT
USING (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND cnpj = current_user_cnpj(auth.uid())
);

CREATE POLICY "Sales: admin/atendente insert same company"
ON public.sales
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND (cnpj = current_user_cnpj(auth.uid()) OR cnpj IS NULL)
);

CREATE POLICY "Sales: admin/atendente update same company"
ON public.sales
FOR UPDATE
USING (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND cnpj = current_user_cnpj(auth.uid())
)
WITH CHECK (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND cnpj = current_user_cnpj(auth.uid())
);

CREATE POLICY "Sales: admin/atendente delete same company"
ON public.sales
FOR DELETE
USING (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND cnpj = current_user_cnpj(auth.uid())
);

-- sale_items
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Administradores e atendentes podem atualizar itens de venda" ON public.sale_items;
DROP POLICY IF EXISTS "Administradores e atendentes podem criar itens de venda" ON public.sale_items;
DROP POLICY IF EXISTS "Administradores e atendentes podem deletar itens de venda" ON public.sale_items;
DROP POLICY IF EXISTS "Administradores e atendentes podem ver itens de venda" ON public.sale_items;

CREATE POLICY "Sale items: admin/atendente read same company"
ON public.sale_items
FOR SELECT
USING (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND cnpj = current_user_cnpj(auth.uid())
);

CREATE POLICY "Sale items: admin/atendente insert same company"
ON public.sale_items
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND (cnpj = current_user_cnpj(auth.uid()) OR cnpj IS NULL)
);

CREATE POLICY "Sale items: admin/atendente update same company"
ON public.sale_items
FOR UPDATE
USING (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND cnpj = current_user_cnpj(auth.uid())
)
WITH CHECK (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND cnpj = current_user_cnpj(auth.uid())
);

CREATE POLICY "Sale items: admin/atendente delete same company"
ON public.sale_items
FOR DELETE
USING (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'atendente'::app_role))
  AND cnpj = current_user_cnpj(auth.uid())
);

-- medical_consultations
ALTER TABLE public.medical_consultations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Administradores podem gerenciar consultas médicas" ON public.medical_consultations;
DROP POLICY IF EXISTS "Administradores podem ver consultas médicas" ON public.medical_consultations;
DROP POLICY IF EXISTS "Medico can insert own medical consultations" ON public.medical_consultations;
DROP POLICY IF EXISTS "Medico can update own medical consultations" ON public.medical_consultations;
DROP POLICY IF EXISTS "Medico can view own medical consultations" ON public.medical_consultations;

CREATE POLICY "Medical: admin read same company"
ON public.medical_consultations
FOR SELECT
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  AND cnpj = current_user_cnpj(auth.uid())
);

CREATE POLICY "Medical: admin manage same company"
ON public.medical_consultations
FOR ALL
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  AND cnpj = current_user_cnpj(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'administrador'::app_role)
  AND cnpj = current_user_cnpj(auth.uid())
);

CREATE POLICY "Medical: medico insert own same company"
ON public.medical_consultations
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'medico'::app_role)
  AND created_by = auth.uid()
  AND (cnpj = current_user_cnpj(auth.uid()) OR cnpj IS NULL)
);

CREATE POLICY "Medical: medico update own same company"
ON public.medical_consultations
FOR UPDATE
USING (
  has_role(auth.uid(), 'medico'::app_role)
  AND created_by = auth.uid()
  AND cnpj = current_user_cnpj(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'medico'::app_role)
  AND created_by = auth.uid()
  AND cnpj = current_user_cnpj(auth.uid())
);

CREATE POLICY "Medical: medico view own same company"
ON public.medical_consultations
FOR SELECT
USING (
  has_role(auth.uid(), 'medico'::app_role)
  AND created_by = auth.uid()
  AND cnpj = current_user_cnpj(auth.uid())
);

COMMIT;