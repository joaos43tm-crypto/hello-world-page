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