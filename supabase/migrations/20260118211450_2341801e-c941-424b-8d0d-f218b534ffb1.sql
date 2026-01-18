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
