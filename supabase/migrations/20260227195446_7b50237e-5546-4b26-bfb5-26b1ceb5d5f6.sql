-- Backfill + hardening with temporary trigger disable (set_row_cnpj blocks UPDATE)
-- Target CNPJ: 15219072000100

BEGIN;

-- Temporarily disable tenant-enforcement triggers to allow one-time legacy backfill
ALTER TABLE public.services DISABLE TRIGGER trg_services_set_cnpj;
ALTER TABLE public.products DISABLE TRIGGER trg_products_set_cnpj;
ALTER TABLE public.plans DISABLE TRIGGER trg_plans_set_cnpj;
ALTER TABLE public.packages DISABLE TRIGGER trg_packages_set_cnpj;
ALTER TABLE public.medical_offices DISABLE TRIGGER trg_medical_offices_set_cnpj;
ALTER TABLE public.client_plans DISABLE TRIGGER trg_client_plans_set_cnpj;
ALTER TABLE public.store_settings DISABLE TRIGGER trg_store_settings_set_cnpj;

-- 1) Backfill legacy rows (cnpj NULL or empty)
UPDATE public.services
SET cnpj = '15219072000100'
WHERE cnpj IS NULL OR cnpj = '';

UPDATE public.products
SET cnpj = '15219072000100'
WHERE cnpj IS NULL OR cnpj = '';

UPDATE public.plans
SET cnpj = '15219072000100'
WHERE cnpj IS NULL OR cnpj = '';

UPDATE public.packages
SET cnpj = '15219072000100'
WHERE cnpj IS NULL OR cnpj = '';

UPDATE public.medical_offices
SET cnpj = '15219072000100'
WHERE cnpj IS NULL OR cnpj = '';

UPDATE public.client_plans
SET cnpj = '15219072000100'
WHERE cnpj IS NULL OR cnpj = '';

UPDATE public.store_settings
SET cnpj = '15219072000100'
WHERE cnpj IS NULL OR cnpj = '';

-- 2) Harden schema (cnpj must always exist)
ALTER TABLE public.services ALTER COLUMN cnpj SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN cnpj SET NOT NULL;
ALTER TABLE public.plans ALTER COLUMN cnpj SET NOT NULL;
ALTER TABLE public.packages ALTER COLUMN cnpj SET NOT NULL;
ALTER TABLE public.medical_offices ALTER COLUMN cnpj SET NOT NULL;
ALTER TABLE public.client_plans ALTER COLUMN cnpj SET NOT NULL;
ALTER TABLE public.store_settings ALTER COLUMN cnpj SET NOT NULL;

-- Re-enable triggers
ALTER TABLE public.services ENABLE TRIGGER trg_services_set_cnpj;
ALTER TABLE public.products ENABLE TRIGGER trg_products_set_cnpj;
ALTER TABLE public.plans ENABLE TRIGGER trg_plans_set_cnpj;
ALTER TABLE public.packages ENABLE TRIGGER trg_packages_set_cnpj;
ALTER TABLE public.medical_offices ENABLE TRIGGER trg_medical_offices_set_cnpj;
ALTER TABLE public.client_plans ENABLE TRIGGER trg_client_plans_set_cnpj;
ALTER TABLE public.store_settings ENABLE TRIGGER trg_store_settings_set_cnpj;

COMMIT;