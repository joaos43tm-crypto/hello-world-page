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