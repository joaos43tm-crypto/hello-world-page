-- Combined execution of existing migrations in chronological order

-- 20260112013512_dcb403ff-bc3a-4033-8f2a-669295a48a95.sql
-- Enum para status de agendamentos
CREATE TYPE public.appointment_status AS ENUM ('agendado', 'em_atendimento', 'aguardando_busca', 'finalizado');

-- Enum para porte do pet
CREATE TYPE public.pet_size AS ENUM ('pequeno', 'medio', 'grande');

-- Enum para temperamento do pet
CREATE TYPE public.pet_temperament AS ENUM ('docil', 'agitado', 'agressivo', 'timido');

-- Tabela de tutores (clientes)
CREATE TABLE public.tutors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pets
CREATE TABLE public.pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID REFERENCES public.tutors(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    breed TEXT,
    size pet_size DEFAULT 'medio',
    birth_date DATE,
    temperament pet_temperament DEFAULT 'docil',
    is_aggressive BOOLEAN DEFAULT FALSE,
    allergies TEXT,
    notes TEXT,
    loyalty_points INTEGER DEFAULT 0,
    total_visits INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de profissionais
CREATE TABLE public.professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    specialty TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de serviços
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de agendamentos
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.services(id) NOT NULL,
    professional_id UUID REFERENCES public.professionals(id),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    status appointment_status DEFAULT 'agendado',
    notes TEXT,
    price DECIMAL(10,2),
    whatsapp_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de produtos
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    category TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pacotes mensais
CREATE TABLE public.packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    included_services TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de vendas
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID REFERENCES public.tutors(id),
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT DEFAULT 'dinheiro',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de itens da venda
CREATE TABLE public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id),
    service_id UUID REFERENCES public.services(id),
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para acesso (sistema interno de pet shop)
CREATE POLICY "Allow all access to tutors" ON public.tutors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to pets" ON public.pets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to professionals" ON public.professionals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to services" ON public.services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to appointments" ON public.appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to packages" ON public.packages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to sale_items" ON public.sale_items FOR ALL USING (true) WITH CHECK (true);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_tutors_updated_at BEFORE UPDATE ON public.tutors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pets_updated_at BEFORE UPDATE ON public.pets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime para agendamentos
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;


-- 20260112014855_5a4844d4-8590-4f64-b3c1-c1cde3e3453c.sql
-- Enum para roles de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'atendente', 'tosador');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de roles de usuário
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Tabela de configurações da loja
CREATE TABLE public.store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name TEXT NOT NULL DEFAULT 'Meu Pet Shop',
    phone TEXT,
    email TEXT,
    address TEXT,
    logo_url TEXT,
    opening_time TIME DEFAULT '08:00',
    closing_time TIME DEFAULT '18:00',
    working_days TEXT[] DEFAULT ARRAY['seg', 'ter', 'qua', 'qui', 'sex', 'sab'],
    printer_enabled BOOLEAN DEFAULT FALSE,
    printer_type TEXT DEFAULT 'bluetooth',
    printer_address TEXT,
    whatsapp_number TEXT,
    instagram TEXT,
    facebook TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Função para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Políticas para profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Políticas para user_roles
CREATE POLICY "Users can view roles" ON public.user_roles
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage roles" ON public.user_roles
FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Políticas para store_settings
CREATE POLICY "Anyone can view store settings" ON public.store_settings
FOR SELECT USING (true);

CREATE POLICY "Admins can update store settings" ON public.store_settings
FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Trigger para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'name', 'Usuário'));
  
  -- Primeiro usuário vira admin
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'atendente');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_settings_updated_at BEFORE UPDATE ON public.store_settings 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir configuração padrão da loja
INSERT INTO public.store_settings (store_name) VALUES ('PetControl Pet Shop');


-- 20260113001759_7c2b53c6-4c75-41de-94b2-7ec14f26c42c.sql
-- Add CNPJ and company name fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT;


-- 20260113001907_52392d37-e8a4-4589-a5c1-696d372d775d.sql
-- Update the handle_new_user function to include CNPJ and company_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, company_name, cnpj)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'Usuário'),
    NEW.raw_user_meta_data ->> 'company_name',
    NEW.raw_user_meta_data ->> 'cnpj'
  );
  
  -- Primeiro usuário vira admin
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'atendente');
  END IF;
  
  RETURN NEW;
END;
$$;


-- 20260113002449_9c33af70-8a52-4f8f-8ad4-f7cee2bb6767.sql
-- Create table for registration codes
CREATE TABLE public.registration_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  cnpj TEXT NOT NULL,
  company_name TEXT NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT DEFAULT 'admin'
);

-- Enable RLS
ALTER TABLE public.registration_codes ENABLE ROW LEVEL SECURITY;

-- Only allow select for everyone (to validate codes during signup)
CREATE POLICY "Anyone can validate registration codes"
ON public.registration_codes
FOR SELECT
USING (true);

-- Create function to validate and use a registration code
CREATE OR REPLACE FUNCTION public.validate_registration_code(
  _code TEXT,
  _cnpj TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_record registration_codes%ROWTYPE;
BEGIN
  SELECT * INTO code_record 
  FROM public.registration_codes 
  WHERE code = _code AND cnpj = _cnpj AND is_used = false;
  
  IF code_record.id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Create function to mark code as used
CREATE OR REPLACE FUNCTION public.use_registration_code(
  _code TEXT,
  _user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.registration_codes
  SET is_used = true, used_at = now(), used_by = _user_id
  WHERE code = _code AND is_used = false;
  
  RETURN FOUND;
END;
$$;


-- 20260114003344_860d4700-c8c7-4b64-9bc3-f3e0d204ff7f.sql
-- Create plans table
CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 1,
  included_services TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Create policy for plans
CREATE POLICY "Allow all access to plans" ON public.plans
  FOR ALL USING (true) WITH CHECK (true);

-- Create client_plans table to track which clients have which plans
CREATE TABLE public.client_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_plans ENABLE ROW LEVEL SECURITY;

-- Create policy for client_plans
CREATE POLICY "Allow all access to client_plans" ON public.client_plans
  FOR ALL USING (true) WITH CHECK (true);

-- Add plans_enabled to store_settings
ALTER TABLE public.store_settings
ADD COLUMN plans_enabled BOOLEAN DEFAULT false;

-- Create trigger for updated_at
CREATE TRIGGER update_client_plans_updated_at
BEFORE UPDATE ON public.client_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- 20260117020211_720efc93-a05a-42db-8be8-06ac62af12ef.sql
-- Fix RLS policies for tutors table (critical - contains sensitive customer data)
DROP POLICY IF EXISTS "Allow all access to tutors" ON public.tutors;

CREATE POLICY "Authenticated users can view tutors" 
ON public.tutors 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert tutors" 
ON public.tutors 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update tutors" 
ON public.tutors 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete tutors" 
ON public.tutors 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Fix RLS policies for pets table
DROP POLICY IF EXISTS "Allow all access to pets" ON public.pets;

CREATE POLICY "Authenticated users can view pets" 
ON public.pets 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert pets" 
ON public.pets 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update pets" 
ON public.pets 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete pets" 
ON public.pets 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Fix RLS policies for appointments table
DROP POLICY IF EXISTS "Allow all access to appointments" ON public.appointments;

CREATE POLICY "Authenticated users can view appointments" 
ON public.appointments 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update appointments" 
ON public.appointments 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete appointments" 
ON public.appointments 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Fix RLS policies for sales table
DROP POLICY IF EXISTS "Allow all access to sales" ON public.sales;

CREATE POLICY "Authenticated users can view sales" 
ON public.sales 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert sales" 
ON public.sales 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update sales" 
ON public.sales 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete sales" 
ON public.sales 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Fix RLS policies for sale_items table
DROP POLICY IF EXISTS "Allow all access to sale_items" ON public.sale_items;

CREATE POLICY "Authenticated users can view sale_items" 
ON public.sale_items 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert sale_items" 
ON public.sale_items 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update sale_items" 
ON public.sale_items 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete sale_items" 
ON public.sale_items 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Fix RLS policies for services table
DROP POLICY IF EXISTS "Allow all access to services" ON public.services;

CREATE POLICY "Authenticated users can view services" 
ON public.services 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage services" 
ON public.services 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Fix RLS policies for products table
DROP POLICY IF EXISTS "Allow all access to products" ON public.products;

CREATE POLICY "Authenticated users can view products" 
ON public.products 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage products" 
ON public.products 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Fix RLS policies for professionals table
DROP POLICY IF EXISTS "Allow all access to professionals" ON public.professionals;

CREATE POLICY "Authenticated users can view professionals" 
ON public.professionals 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage professionals" 
ON public.professionals 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Fix RLS policies for packages table
DROP POLICY IF EXISTS "Allow all access to packages" ON public.packages;

CREATE POLICY "Authenticated users can view packages" 
ON public.packages 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage packages" 
ON public.packages 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Fix RLS policies for plans table
DROP POLICY IF EXISTS "Allow all access to plans" ON public.plans;

CREATE POLICY "Authenticated users can view plans" 
ON public.plans 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage plans" 
ON public.plans 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Fix RLS policies for client_plans table
DROP POLICY IF EXISTS "Allow all access to client_plans" ON public.client_plans;

CREATE POLICY "Authenticated users can view client_plans" 
ON public.client_plans 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage client_plans" 
ON public.client_plans 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Fix RLS for user_roles - restrict to own role or admin
DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;

CREATE POLICY "Users can view own role or admin can view all" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Fix function search path for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;


-- 20260117020439_2a816b68-23c2-4f5f-bae5-89cea0064a14.sql
-- Fix RLS policies for tutors table - restrict to specific roles only
DROP POLICY IF EXISTS "Authenticated users can view tutors" ON public.tutors;
DROP POLICY IF EXISTS "Authenticated users can insert tutors" ON public.tutors;
DROP POLICY IF EXISTS "Authenticated users can update tutors" ON public.tutors;
DROP POLICY IF EXISTS "Authenticated users can delete tutors" ON public.tutors;

-- Only users with specific roles can access tutors
CREATE POLICY "Staff can view tutors" 
ON public.tutors 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'atendente') OR 
  has_role(auth.uid(), 'tosador')
);

CREATE POLICY "Staff can insert tutors" 
ON public.tutors 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'atendente')
);

CREATE POLICY "Staff can update tutors" 
ON public.tutors 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'atendente')
);

CREATE POLICY "Admins can delete tutors" 
ON public.tutors 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- Also fix pets table with same role-based access
DROP POLICY IF EXISTS "Authenticated users can view pets" ON public.pets;
DROP POLICY IF EXISTS "Authenticated users can insert pets" ON public.pets;
DROP POLICY IF EXISTS "Authenticated users can update pets" ON public.pets;
DROP POLICY IF EXISTS "Authenticated users can delete pets" ON public.pets;

CREATE POLICY "Staff can view pets" 
ON public.pets 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'atendente') OR 
  has_role(auth.uid(), 'tosador')
);

CREATE POLICY "Staff can insert pets" 
ON public.pets 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'atendente')
);

CREATE POLICY "Staff can update pets" 
ON public.pets 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'atendente')
);

CREATE POLICY "Admins can delete pets" 
ON public.pets 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));


-- 20260117020821_c9321101-3e54-43dc-bdd1-6ddd4909b33d.sql
-- Remove public access policy from registration_codes
DROP POLICY IF EXISTS "Anyone can validate registration codes" ON public.registration_codes;

-- Create secure RPC function for code validation (returns only necessary info)
CREATE OR REPLACE FUNCTION public.check_registration_code(_code text)
RETURNS TABLE (
  is_valid boolean,
  company_name text,
  cnpj text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true AS is_valid,
    rc.company_name,
    rc.cnpj
  FROM public.registration_codes rc
  WHERE rc.code = _code AND rc.is_used = false
  LIMIT 1;
  
  -- If no rows returned, return invalid
  IF NOT FOUND THEN
    RETURN QUERY SELECT false AS is_valid, NULL::text AS company_name, NULL::text AS cnpj;
  END IF;
END;
$$;


-- 20260117180809_b6241878-4601-4442-8915-8df40b6e986f.sql
-- Fix linter: RLS enabled but no policies on registration_codes
ALTER TABLE public.registration_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage registration codes"
ON public.registration_codes
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));


-- 20260117180854_44b6b853-2492-4698-b6bc-b5fb8afa3440.sql
-- Allow administrators to update other users' profiles (e.g., change display name)
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
USING (is_admin(auth.uid()));


-- 20260117181517_2d357bf6-0742-4782-b0d5-86027f631732.sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'medico'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'medico';
  END IF;
END$$;


-- 20260117183105_0e14cd63-8d49-49d0-b97a-505b0a6f0fc3.sql
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


-- 20260117185721_eb73d7b7-857f-42cf-a4c8-7d92b9ef95a7.sql
-- Medical offices (consultórios)
CREATE TABLE IF NOT EXISTS public.medical_offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Medical consultations (atendimentos)
CREATE TABLE IF NOT EXISTS public.medical_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES public.medical_offices(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medical_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_consultations ENABLE ROW LEVEL SECURITY;

-- updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_medical_offices_updated_at'
  ) THEN
    CREATE TRIGGER update_medical_offices_updated_at
    BEFORE UPDATE ON public.medical_offices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_medical_consultations_updated_at'
  ) THEN
    CREATE TRIGGER update_medical_consultations_updated_at
    BEFORE UPDATE ON public.medical_consultations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Policies: medical_offices
DROP POLICY IF EXISTS "Staff can view medical offices" ON public.medical_offices;
CREATE POLICY "Staff can view medical offices"
ON public.medical_offices
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'atendente'::app_role)
  OR has_role(auth.uid(), 'medico'::app_role)
);

DROP POLICY IF EXISTS "Admins can manage medical offices" ON public.medical_offices;
CREATE POLICY "Admins can manage medical offices"
ON public.medical_offices
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policies: medical_consultations
DROP POLICY IF EXISTS "Admins and atendente can view all medical consultations" ON public.medical_consultations;
CREATE POLICY "Admins and atendente can view all medical consultations"
ON public.medical_consultations
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'atendente'::app_role)
);

DROP POLICY IF EXISTS "Medicos can view own medical consultations" ON public.medical_consultations;
CREATE POLICY "Medicos can view own medical consultations"
ON public.medical_consultations
FOR SELECT
USING (
  has_role(auth.uid(), 'medico'::app_role)
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Staff can create medical consultations" ON public.medical_consultations;
CREATE POLICY "Staff can create medical consultations"
ON public.medical_consultations
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role) OR has_role(auth.uid(), 'medico'::app_role))
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Admins and atendente can update medical consultations" ON public.medical_consultations;
CREATE POLICY "Admins and atendente can update medical consultations"
ON public.medical_consultations
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'atendente'::app_role)
);

DROP POLICY IF EXISTS "Medicos can update own medical consultations" ON public.medical_consultations;
CREATE POLICY "Medicos can update own medical consultations"
ON public.medical_consultations
FOR UPDATE
USING (
  has_role(auth.uid(), 'medico'::app_role)
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Admins can delete medical consultations" ON public.medical_consultations;
CREATE POLICY "Admins can delete medical consultations"
ON public.medical_consultations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Extend appointments permissions to include medico for Agenda access
DROP POLICY IF EXISTS "Staff can view appointments" ON public.appointments;
CREATE POLICY "Staff can view appointments"
ON public.appointments
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'atendente'::app_role)
  OR has_role(auth.uid(), 'tosador'::app_role)
  OR has_role(auth.uid(), 'medico'::app_role)
);

DROP POLICY IF EXISTS "Staff can update appointments (validated by trigger)" ON public.appointments;
CREATE POLICY "Staff can update appointments (validated by trigger)"
ON public.appointments
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'atendente'::app_role)
  OR has_role(auth.uid(), 'tosador'::app_role)
  OR has_role(auth.uid(), 'medico'::app_role)
);

-- Seed 1 default office if none exists
INSERT INTO public.medical_offices (name)
SELECT 'Consultório 1'
WHERE NOT EXISTS (SELECT 1 FROM public.medical_offices);


-- 20260118015401_a17a4411-b8a0-4309-86ec-5ddafced93f6.sql
-- Link medical consultations to a specific appointment/pet (for prontuário)
ALTER TABLE public.medical_consultations
ADD COLUMN IF NOT EXISTS appointment_id uuid NULL,
ADD COLUMN IF NOT EXISTS pet_id uuid NULL;

-- Foreign keys (safe + explicit)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'medical_consultations_appointment_id_fkey'
  ) THEN
    ALTER TABLE public.medical_consultations
    ADD CONSTRAINT medical_consultations_appointment_id_fkey
    FOREIGN KEY (appointment_id) REFERENCES public.appointments(id)
    ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'medical_consultations_pet_id_fkey'
  ) THEN
    ALTER TABLE public.medical_consultations
    ADD CONSTRAINT medical_consultations_pet_id_fkey
    FOREIGN KEY (pet_id) REFERENCES public.pets(id)
    ON DELETE RESTRICT;
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_medical_consultations_pet_id_started_at
  ON public.medical_consultations (pet_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_medical_consultations_created_by_started_at
  ON public.medical_consultations (created_by, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_medical_consultations_appointment_id
  ON public.medical_consultations (appointment_id);


-- 20260118021325_c1cd2ec2-e482-4cfd-9ec1-c6c0ea631694.sql
-- Permitir que médicos vejam dados necessários para iniciar a consulta

-- PETS: médicos precisam visualizar o paciente
CREATE POLICY "Medicos can view pets"
ON public.pets
FOR SELECT
USING (has_role(auth.uid(), 'medico'::app_role));

-- TUTORS: médicos precisam visualizar o tutor/cliente
CREATE POLICY "Medicos can view tutors"
ON public.tutors
FOR SELECT
USING (has_role(auth.uid(), 'medico'::app_role));

-- SERVICES: médicos precisam listar/filtrar serviços de consulta
CREATE POLICY "Medicos can view services"
ON public.services
FOR SELECT
USING (has_role(auth.uid(), 'medico'::app_role));


-- 20260118135959_94f72009-e29f-4118-b4f9-0612e1888065.sql
-- Add CRMV to user profile
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS crmv text;

-- Optional index for search/admin filtering
CREATE INDEX IF NOT EXISTS idx_profiles_crmv ON public.profiles (crmv);


-- 20260118140934_f66b5e7c-c18c-445d-8fe8-5372df735711.sql
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


-- 20260118142433_53980e2f-3884-4705-9d29-cdcf8c7adcf4.sql
-- Fix: restrict store_settings access to admin/atendente only, while exposing a minimal public view for app feature flags.

-- 1) STORE SETTINGS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Remove old overly-broad policies if they exist
DROP POLICY IF EXISTS "Anyone can view store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Authenticated can view store settings" ON public.store_settings;

-- Only admin/atendente can read full store settings (contains sensitive business contact/config)
CREATE POLICY "Admin/atendente can view store settings"
ON public.store_settings
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'atendente'::public.app_role)
);

-- Keep existing update policy if present; otherwise ensure only admins can update
DROP POLICY IF EXISTS "Admins can update store settings" ON public.store_settings;
CREATE POLICY "Admins can update store settings"
ON public.store_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Minimal view for non-sensitive flags / display name
DROP VIEW IF EXISTS public.store_settings_public;
CREATE VIEW public.store_settings_public
WITH (security_invoker=on) AS
  SELECT id, store_name, plans_enabled
  FROM public.store_settings;

-- 2) MEDICAL CONSULTATIONS
-- Goal: receptionists (atendente) may need to list/schedule but should not read medical notes.
ALTER TABLE public.medical_consultations ENABLE ROW LEVEL SECURITY;

-- Drop potentially broad legacy policies (safe even if they don't exist)
DROP POLICY IF EXISTS "Authenticated can view medical consultations" ON public.medical_consultations;
DROP POLICY IF EXISTS "Atendente can view medical consultations" ON public.medical_consultations;
DROP POLICY IF EXISTS "Admins can view medical consultations" ON public.medical_consultations;
DROP POLICY IF EXISTS "Medico can view own consultations" ON public.medical_consultations;

-- Admin: can read all consultations
CREATE POLICY "Admin can view medical consultations"
ON public.medical_consultations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Medico: can read only consultations they created
CREATE POLICY "Medico can view own medical consultations"
ON public.medical_consultations
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'medico'::public.app_role)
  AND created_by = auth.uid()
);

-- Writes: keep strict - admin can do anything; medico can insert/update their own
DROP POLICY IF EXISTS "Admin can manage medical consultations" ON public.medical_consultations;
CREATE POLICY "Admin can manage medical consultations"
ON public.medical_consultations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Medico can insert own medical consultations" ON public.medical_consultations;
CREATE POLICY "Medico can insert own medical consultations"
ON public.medical_consultations
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'medico'::public.app_role)
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Medico can update own medical consultations" ON public.medical_consultations;
CREATE POLICY "Medico can update own medical consultations"
ON public.medical_consultations
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'medico'::public.app_role)
  AND created_by = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'medico'::public.app_role)
  AND created_by = auth.uid()
);

-- Provide a safe view without notes for atendente (and optionally others)
DROP VIEW IF EXISTS public.medical_consultations_safe;
CREATE VIEW public.medical_consultations_safe
WITH (security_invoker=on) AS
  SELECT id, started_at, ended_at, office_id, created_by, created_at, updated_at, appointment_id, pet_id
  FROM public.medical_consultations;


-- 20260118142535_2c46a4ae-e5c0-487e-8843-ef386d420c23.sql
-- Remove legacy broad policies on medical_consultations to prevent atendente from reading sensitive notes.

DROP POLICY IF EXISTS "Admins and atendente can view all medical consultations" ON public.medical_consultations;
DROP POLICY IF EXISTS "Admins and atendente can update medical consultations" ON public.medical_consultations;
DROP POLICY IF EXISTS "Admins can delete medical consultations" ON public.medical_consultations;
DROP POLICY IF EXISTS "Medicos can view own medical consultations" ON public.medical_consultations;
DROP POLICY IF EXISTS "Medicos can update own medical consultations" ON public.medical_consultations;
DROP POLICY IF EXISTS "Staff can create medical consultations" ON public.medical_consultations;

-- Also remove potential duplicate medico insert policy name variants
DROP POLICY IF EXISTS "Medico can insert own medical consultations" ON public.medical_consultations;

-- Recreate medico insert to keep behavior for the medical screen
CREATE POLICY "Medico can insert own medical consultations"
ON public.medical_consultations
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'medico'::public.app_role)
  AND created_by = auth.uid()
);


-- 20260118143012_f18f0b1a-2a05-4f5b-b230-e878e757b401.sql
-- When a medical consultation is finalized, automatically finalize the linked appointment.

CREATE OR REPLACE FUNCTION public.handle_medical_consultation_finalized()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only act on the transition from active -> ended
  IF NEW.ended_at IS NOT NULL AND (OLD.ended_at IS NULL OR OLD.ended_at <> NEW.ended_at) THEN
    IF NEW.appointment_id IS NOT NULL THEN
      UPDATE public.appointments
      SET status = 'finalizado'::public.appointment_status,
          updated_at = now()
      WHERE id = NEW.appointment_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_medical_consultation_finalized ON public.medical_consultations;
CREATE TRIGGER trg_medical_consultation_finalized
AFTER UPDATE OF ended_at ON public.medical_consultations
FOR EACH ROW
EXECUTE FUNCTION public.handle_medical_consultation_finalized();


-- 20260118143308_463f374a-372b-4a87-90c8-1d13f8048539.sql
-- When a medical consultation is started (inserted), automatically set the linked appointment to 'em_atendimento'.

CREATE OR REPLACE FUNCTION public.handle_medical_consultation_started()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.appointment_id IS NOT NULL THEN
    UPDATE public.appointments
    SET status = 'em_atendimento'::public.appointment_status,
        updated_at = now()
    WHERE id = NEW.appointment_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_medical_consultation_started ON public.medical_consultations;
CREATE TRIGGER trg_medical_consultation_started
AFTER INSERT ON public.medical_consultations
FOR EACH ROW
EXECUTE FUNCTION public.handle_medical_consultation_started();


-- 20260118144021_178d79a9-4c70-48d7-844c-027aa2f1810f.sql
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


-- 20260118144114_428934b1-5070-4975-aadd-86246cc0f3d0.sql
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


-- 20260118211450_2341801e-c941-424b-8d0d-f218b534ffb1.sql
-- PDV Caixa: sessões de caixa + movimentações (sangria/suprimento) + vínculo em vendas

-- 1) Enum para tipo de movimentação
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cash_movement_type') THEN
    CREATE TYPE public.cash_movement_type AS ENUM ('sangria', 'suprimento');
  END IF;
END $$;

-- 2) Tabela de sessões de caixa
CREATE TABLE IF NOT EXISTS public.cash_register_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj TEXT NOT NULL,
  opened_by UUID NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  closed_by UUID NULL,
  closed_at TIMESTAMPTZ NULL,
  closing_balance NUMERIC(12,2) NULL,
  closing_notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Apenas um caixa aberto por CNPJ
CREATE UNIQUE INDEX IF NOT EXISTS cash_register_one_open_per_cnpj
ON public.cash_register_sessions (cnpj)
WHERE closed_at IS NULL;

CREATE INDEX IF NOT EXISTS cash_register_sessions_cnpj_opened_at
ON public.cash_register_sessions (cnpj, opened_at DESC);

-- 3) Tabela de movimentações de caixa (sangria/suprimento)
CREATE TABLE IF NOT EXISTS public.cash_register_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.cash_register_sessions(id) ON DELETE CASCADE,
  cnpj TEXT NOT NULL,
  movement_type public.cash_movement_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  notes TEXT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cash_register_movements_session_created_at
ON public.cash_register_movements (session_id, created_at DESC);

-- 4) Vínculo opcional de venda -> sessão de caixa
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS cash_session_id UUID NULL REFERENCES public.cash_register_sessions(id);

CREATE INDEX IF NOT EXISTS sales_cash_session_id_idx
ON public.sales (cash_session_id);

-- 5) updated_at trigger para cash_register_sessions
DROP TRIGGER IF EXISTS update_cash_register_sessions_updated_at ON public.cash_register_sessions;
CREATE TRIGGER update_cash_register_sessions_updated_at
BEFORE UPDATE ON public.cash_register_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 6) RLS
ALTER TABLE public.cash_register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register_movements ENABLE ROW LEVEL SECURITY;

-- Limpa políticas antigas (se existirem)
DROP POLICY IF EXISTS "Admin/atendente can view cash sessions" ON public.cash_register_sessions;
DROP POLICY IF EXISTS "Admin/atendente can open cash session" ON public.cash_register_sessions;
DROP POLICY IF EXISTS "Admin/atendente can close cash session" ON public.cash_register_sessions;

DROP POLICY IF EXISTS "Admin/atendente can view cash movements" ON public.cash_register_movements;
DROP POLICY IF EXISTS "Admin/atendente can create cash movements" ON public.cash_register_movements;

-- Sessões: leitura
CREATE POLICY "Admin/atendente can view cash sessions"
ON public.cash_register_sessions
FOR SELECT
TO authenticated
USING (
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'atendente'::public.app_role))
  AND cnpj = public.current_user_cnpj(auth.uid())
);

-- Sessões: abrir (insert)
CREATE POLICY "Admin/atendente can open cash session"
ON public.cash_register_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'atendente'::public.app_role))
  AND cnpj = public.current_user_cnpj(auth.uid())
  AND opened_by = auth.uid()
  AND closed_at IS NULL
);

-- Sessões: fechar (update) - mesma empresa
CREATE POLICY "Admin/atendente can close cash session"
ON public.cash_register_sessions
FOR UPDATE
TO authenticated
USING (
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'atendente'::public.app_role))
  AND cnpj = public.current_user_cnpj(auth.uid())
)
WITH CHECK (
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'atendente'::public.app_role))
  AND cnpj = public.current_user_cnpj(auth.uid())
);

-- Movimentos: leitura
CREATE POLICY "Admin/atendente can view cash movements"
ON public.cash_register_movements
FOR SELECT
TO authenticated
USING (
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'atendente'::public.app_role))
  AND cnpj = public.current_user_cnpj(auth.uid())
);

-- Movimentos: criar
CREATE POLICY "Admin/atendente can create cash movements"
ON public.cash_register_movements
FOR INSERT
TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'atendente'::public.app_role))
  AND cnpj = public.current_user_cnpj(auth.uid())
  AND created_by = auth.uid()
  AND amount > 0
);


-- 20260128000000_fix_admin_by_cnpj.sql
-- Fix handle_new_user trigger to check admin by CNPJ instead of globally
-- This ensures the first user of each company (same CNPJ) becomes admin

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_cnpj TEXT;
  is_first_user_for_company BOOLEAN := true;
  company_user_ids UUID[];
BEGIN
  -- Extract CNPJ from user metadata
  user_cnpj := NEW.raw_user_meta_data ->> 'cnpj';

  -- Create profile first
  INSERT INTO public.profiles (user_id, name, company_name, cnpj)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'Usuário'),
    NEW.raw_user_meta_data ->> 'company_name',
    user_cnpj
  );

  -- Determine if this is the first user for this company (same CNPJ)
  IF user_cnpj IS NOT NULL AND user_cnpj != '' THEN
    -- Get all user_ids that have the same CNPJ
    SELECT ARRAY_AGG(user_id) INTO company_user_ids
    FROM public.profiles
    WHERE cnpj = user_cnpj AND user_id != NEW.id;

    -- Check if any of these users already have a role
    IF company_user_ids IS NOT NULL AND array_length(company_user_ids, 1) > 0 THEN
      SELECT NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = ANY(company_user_ids)
      ) INTO is_first_user_for_company;
    END IF;
  ELSE
    -- No CNPJ - fallback to global check (legacy behavior)
    SELECT (SELECT COUNT(*) FROM public.user_roles) = 0 INTO is_first_user_for_company;
  END IF;

  -- Assign role: admin if first user for company, atendente otherwise
  IF is_first_user_for_company THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'atendente');
  END IF;
  
  RETURN NEW;
END;
$$;