-- Add CRMV to user profile
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS crmv text;

-- Optional index for search/admin filtering
CREATE INDEX IF NOT EXISTS idx_profiles_crmv ON public.profiles (crmv);