-- Fix RLS policies for tutors table - restrict to specific roles only
DROP POLICY IF EXISTS "Authenticated users can view tutors" ON public.tutors;
DROP POLICY IF EXISTS "Authenticated users can insert tutors" ON public.tutors;
DROP POLICY IF EXISTS "Authenticated users can update tutors" ON public.tutors;
DROP POLICY IF EXISTS "Authenticated users can delete tutors" ON public.tutors;

-- Only users with specific roles can access tutors
CREATE POLICY "Staff can view tutors" 
ON public.tutors 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'atendente') OR 
  has_role(auth.uid(), 'tosador')
);

CREATE POLICY "Staff can insert tutors" 
ON public.tutors 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'atendente')
);

CREATE POLICY "Staff can update tutors" 
ON public.tutors 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'atendente')
);

CREATE POLICY "Admins can delete tutors" 
ON public.tutors 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- Also fix pets table with same role-based access
DROP POLICY IF EXISTS "Authenticated users can view pets" ON public.pets;
DROP POLICY IF EXISTS "Authenticated users can insert pets" ON public.pets;
DROP POLICY IF EXISTS "Authenticated users can update pets" ON public.pets;
DROP POLICY IF EXISTS "Authenticated users can delete pets" ON public.pets;

CREATE POLICY "Staff can view pets" 
ON public.pets 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'atendente') OR 
  has_role(auth.uid(), 'tosador')
);

CREATE POLICY "Staff can insert pets" 
ON public.pets 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'atendente')
);

CREATE POLICY "Staff can update pets" 
ON public.pets 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'atendente')
);

CREATE POLICY "Admins can delete pets" 
ON public.pets 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));