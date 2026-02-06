-- Security hardening: restrict all RLS policies that currently apply to PUBLIC/anon
-- to authenticated users only. This prevents unauthenticated access even if auth-related
-- helper functions change behavior and aligns with principle of least privilege.

-- appointments
ALTER POLICY "Appointments: admin delete same company" ON public.appointments TO authenticated;
ALTER POLICY "Appointments: admin/atendente insert same company" ON public.appointments TO authenticated;
ALTER POLICY "Appointments: staff read same company" ON public.appointments TO authenticated;
ALTER POLICY "Appointments: staff update same company" ON public.appointments TO authenticated;

-- cash register
ALTER POLICY "Administradores/atendentes podem criar movimentações de caixa" ON public.cash_register_movements TO authenticated;
ALTER POLICY "Administradores/atendentes podem ver movimentações de caixa" ON public.cash_register_movements TO authenticated;

ALTER POLICY "Administradores/atendentes podem abrir sessão de caixa" ON public.cash_register_sessions TO authenticated;
ALTER POLICY "Administradores/atendentes podem fechar sessão de caixa" ON public.cash_register_sessions TO authenticated;
ALTER POLICY "Administradores/atendentes podem ver sessões de caixa" ON public.cash_register_sessions TO authenticated;

-- client plans
ALTER POLICY "Administradores podem gerenciar planos de clientes" ON public.client_plans TO authenticated;
ALTER POLICY "Administradores podem ver planos de clientes" ON public.client_plans TO authenticated;

-- medical
ALTER POLICY "Medical: admin manage same company" ON public.medical_consultations TO authenticated;
ALTER POLICY "Medical: admin read same company" ON public.medical_consultations TO authenticated;
ALTER POLICY "Medical: medico insert own same company" ON public.medical_consultations TO authenticated;
ALTER POLICY "Medical: medico update own same company" ON public.medical_consultations TO authenticated;
ALTER POLICY "Medical: medico view own same company" ON public.medical_consultations TO authenticated;

ALTER POLICY "Administradores podem gerenciar consultórios" ON public.medical_offices TO authenticated;
ALTER POLICY "Staff pode ver consultórios" ON public.medical_offices TO authenticated;

-- catalog/admin-managed tables
ALTER POLICY "Administradores podem gerenciar pacotes" ON public.packages TO authenticated;
ALTER POLICY "Administradores podem ver pacotes" ON public.packages TO authenticated;

ALTER POLICY "Administradores podem gerenciar planos" ON public.plans TO authenticated;
ALTER POLICY "Administradores podem ver planos" ON public.plans TO authenticated;

ALTER POLICY "Administradores e atendentes podem ver produtos" ON public.products TO authenticated;
ALTER POLICY "Administradores podem gerenciar produtos" ON public.products TO authenticated;

ALTER POLICY "Administradores podem gerenciar profissionais" ON public.professionals TO authenticated;
ALTER POLICY "Staff pode ver profissionais" ON public.professionals TO authenticated;

ALTER POLICY "Administradores podem gerenciar serviços" ON public.services TO authenticated;
ALTER POLICY "Staff pode ver serviços" ON public.services TO authenticated;
ALTER POLICY "Medicos can view services" ON public.services TO authenticated;

-- profiles (admin-wide company visibility should still require auth)
ALTER POLICY "Administradores podem atualizar perfis da empresa" ON public.profiles TO authenticated;
ALTER POLICY "Administradores podem ver perfis da empresa" ON public.profiles TO authenticated;

-- registration codes
ALTER POLICY "Administradores podem gerenciar códigos de cadastro" ON public.registration_codes TO authenticated;

-- sales
ALTER POLICY "Sales: admin/atendente delete same company" ON public.sales TO authenticated;
ALTER POLICY "Sales: admin/atendente insert same company" ON public.sales TO authenticated;
ALTER POLICY "Sales: admin/atendente read same company" ON public.sales TO authenticated;
ALTER POLICY "Sales: admin/atendente update same company" ON public.sales TO authenticated;

ALTER POLICY "Sale items: admin/atendente delete same company" ON public.sale_items TO authenticated;
ALTER POLICY "Sale items: admin/atendente insert same company" ON public.sale_items TO authenticated;
ALTER POLICY "Sale items: admin/atendente read same company" ON public.sale_items TO authenticated;
ALTER POLICY "Sale items: admin/atendente update same company" ON public.sale_items TO authenticated;

-- store settings
ALTER POLICY "Administradores e atendentes podem ver configurações" ON public.store_settings TO authenticated;
ALTER POLICY "Administradores podem atualizar configurações" ON public.store_settings TO authenticated;

-- pets/tutors
ALTER POLICY "Pets: admin delete same company" ON public.pets TO authenticated;
ALTER POLICY "Pets: admin/atendente insert same company" ON public.pets TO authenticated;
ALTER POLICY "Pets: admin/atendente update same company" ON public.pets TO authenticated;
ALTER POLICY "Pets: staff read same company" ON public.pets TO authenticated;

ALTER POLICY "Tutores: admin delete same company" ON public.tutors TO authenticated;
ALTER POLICY "Tutores: admin/atendente insert same company" ON public.tutors TO authenticated;
ALTER POLICY "Tutores: admin/atendente update same company" ON public.tutors TO authenticated;
ALTER POLICY "Tutores: staff read same company" ON public.tutors TO authenticated;

-- user roles
ALTER POLICY "User roles: administrador delete same company" ON public.user_roles TO authenticated;
ALTER POLICY "User roles: administrador insert same company" ON public.user_roles TO authenticated;
ALTER POLICY "User roles: administrador read same company" ON public.user_roles TO authenticated;
ALTER POLICY "User roles: administrador update same company" ON public.user_roles TO authenticated;
ALTER POLICY "User roles: read self" ON public.user_roles TO authenticated;
