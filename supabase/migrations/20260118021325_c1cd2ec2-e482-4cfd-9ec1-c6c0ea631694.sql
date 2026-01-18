-- Permitir que médicos vejam dados necessários para iniciar a consulta

-- PETS: médicos precisam visualizar o paciente
CREATE POLICY "Medicos can view pets"
ON public.pets
FOR SELECT
USING (has_role(auth.uid(), 'medico'::app_role));

-- TUTORS: médicos precisam visualizar o tutor/cliente
CREATE POLICY "Medicos can view tutors"
ON public.tutors
FOR SELECT
USING (has_role(auth.uid(), 'medico'::app_role));

-- SERVICES: médicos precisam listar/filtrar serviços de consulta
CREATE POLICY "Medicos can view services"
ON public.services
FOR SELECT
USING (has_role(auth.uid(), 'medico'::app_role));