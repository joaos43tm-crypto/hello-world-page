-- Subscription status enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE public.subscription_status AS ENUM ('ATIVO','A_VENCER','VENCIDA','BLOQUEADA');
  END IF;
END $$;

-- Per-company (CNPJ) subscription state
CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  cnpj text PRIMARY KEY,
  status public.subscription_status NOT NULL DEFAULT 'ATIVO',
  valid_until timestamptz NOT NULL,
  trial_started_at timestamptz NOT NULL DEFAULT now(),
  stripe_customer_id text NULL,
  stripe_subscription_id text NULL,
  current_plan_key text NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Payment history (for display/audit)
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj text NOT NULL,
  stripe_event_id text NULL,
  stripe_invoice_id text NULL,
  stripe_payment_intent_id text NULL,
  stripe_customer_id text NULL,
  stripe_subscription_id text NULL,
  amount numeric NULL,
  currency text NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  plan_key text NULL,
  period_start timestamptz NULL,
  period_end timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_subscriptions_valid_until ON public.company_subscriptions (valid_until);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_cnpj ON public.subscription_payments (cnpj, paid_at DESC);

-- Row Level Security
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- Staff can read their company's subscription state
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='company_subscriptions' AND policyname='Company subscriptions: staff read same company'
  ) THEN
    CREATE POLICY "Company subscriptions: staff read same company"
    ON public.company_subscriptions
    FOR SELECT
    TO authenticated
    USING (
      (cnpj = public.current_user_cnpj(auth.uid()))
      AND (
        public.has_role(auth.uid(), 'administrador'::public.app_role)
        OR public.has_role(auth.uid(), 'atendente'::public.app_role)
        OR public.has_role(auth.uid(), 'tosador'::public.app_role)
        OR public.has_role(auth.uid(), 'medico'::public.app_role)
      )
    );
  END IF;
END $$;

-- No direct writes from clients (edge functions with service role will manage)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='company_subscriptions' AND policyname='Company subscriptions: deny writes'
  ) THEN
    CREATE POLICY "Company subscriptions: deny writes"
    ON public.company_subscriptions
    FOR ALL
    TO authenticated
    USING (false)
    WITH CHECK (false);
  END IF;
END $$;

-- Staff can read payment history for their company
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscription_payments' AND policyname='Subscription payments: staff read same company'
  ) THEN
    CREATE POLICY "Subscription payments: staff read same company"
    ON public.subscription_payments
    FOR SELECT
    TO authenticated
    USING (
      (cnpj = public.current_user_cnpj(auth.uid()))
      AND (
        public.has_role(auth.uid(), 'administrador'::public.app_role)
        OR public.has_role(auth.uid(), 'atendente'::public.app_role)
        OR public.has_role(auth.uid(), 'tosador'::public.app_role)
        OR public.has_role(auth.uid(), 'medico'::public.app_role)
      )
    );
  END IF;
END $$;

-- Deny writes from clients
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscription_payments' AND policyname='Subscription payments: deny writes'
  ) THEN
    CREATE POLICY "Subscription payments: deny writes"
    ON public.subscription_payments
    FOR ALL
    TO authenticated
    USING (false)
    WITH CHECK (false);
  END IF;
END $$;

-- updated_at trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_company_subscriptions_updated_at'
  ) THEN
    CREATE TRIGGER trg_company_subscriptions_updated_at
    BEFORE UPDATE ON public.company_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;