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