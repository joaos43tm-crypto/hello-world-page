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
