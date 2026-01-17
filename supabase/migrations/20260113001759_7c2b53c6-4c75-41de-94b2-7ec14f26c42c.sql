-- Add CNPJ and company name fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT;