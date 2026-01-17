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