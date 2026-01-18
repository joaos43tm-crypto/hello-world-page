import { supabase } from "@/integrations/supabase/client";

// ============================================
// SECURITY HELPERS
// ============================================

const MAX_SEARCH_LEN = 80;

function sanitizeIlikeQuery(raw: string) {
  // Prevent pattern injection / wildcard abuse in ILIKE queries
  const trimmed = (raw ?? "").trim().slice(0, MAX_SEARCH_LEN);
  // Escape %, _ and backslash which have special meaning in LIKE/ILIKE patterns
  return trimmed.replace(/[%_\\]/g, "\\$&");
}

// ============================================
// TYPES
// ============================================

export type AppointmentStatus = 'agendado' | 'em_atendimento' | 'aguardando_busca' | 'finalizado';
export type PetSize = 'pequeno' | 'medio' | 'grande';
export type PetTemperament = 'docil' | 'agitado' | 'agressivo' | 'timido';

export interface Tutor {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Pet {
  id: string;
  tutor_id: string;
  name: string;
  breed?: string | null;
  size?: PetSize | null;
  birth_date?: string | null;
  temperament?: PetTemperament | null;
  is_aggressive?: boolean;
  allergies?: string | null;
  notes?: string | null;
  loyalty_points?: number;
  total_visits?: number;
  created_at?: string;
  updated_at?: string;
  tutor?: Tutor;
}

export interface Professional {
  id: string;
  name: string;
  phone?: string | null;
  specialty?: string | null;
  is_active?: boolean;
  created_at?: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  duration_minutes?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface Appointment {
  id: string;
  pet_id: string;
  service_id: string;
  professional_id?: string | null;
  scheduled_date: string;
  scheduled_time: string;
  status?: AppointmentStatus;
  notes?: string | null;
  price?: number | null;
  whatsapp_sent?: boolean;
  created_at?: string;
  updated_at?: string;
  pet?: Pet;
  service?: Service;
  professional?: Professional;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  stock_quantity?: number;
  category?: string | null;
  is_active?: boolean;
  created_at?: string;
}

export interface Package {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  included_services?: string[];
  is_active?: boolean;
  created_at?: string;
}

export interface Plan {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  duration_months?: number;
  included_services?: string[];
  is_active?: boolean;
  created_at?: string;
}

export interface ClientPlan {
  id: string;
  tutor_id: string;
  plan_id: string;
  start_date: string;
  due_date: string;
  is_paid?: boolean;
  paid_at?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  plan?: Plan;
  tutor?: Tutor;
}

export interface Sale {
  id: string;
  tutor_id?: string | null;
  total_amount: number;
  payment_method?: string;
  notes?: string | null;
  cash_session_id?: string | null;
  created_at?: string;
  tutor?: Tutor;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id?: string | null;
  service_id?: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at?: string;
  product?: Product;
  service?: Service;
}

export type CashMovementType = "sangria" | "suprimento";

export interface CashRegisterSession {
  id: string;
  cnpj: string;
  opened_by: string;
  opened_at: string;
  opening_balance: number;
  closed_by?: string | null;
  closed_at?: string | null;
  closing_balance?: number | null;
  closing_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CashRegisterMovement {
  id: string;
  session_id: string;
  cnpj: string;
  movement_type: CashMovementType;
  amount: number;
  notes?: string | null;
  created_by: string;
  created_at: string;
}

// ============================================
// TUTORES (CLIENTES)
// ============================================

export const tutorsApi = {
  async getAll(): Promise<Tutor[]> {
    const { data, error } = await supabase
      .from('tutors')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Tutor | null> {
    const { data, error } = await supabase
      .from('tutors')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(tutor: Omit<Tutor, 'id' | 'created_at' | 'updated_at'>): Promise<Tutor> {
    const { data, error } = await supabase
      .from('tutors')
      .insert(tutor)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, tutor: Partial<Tutor>): Promise<Tutor> {
    const { data, error } = await supabase
      .from('tutors')
      .update(tutor)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tutors')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async search(query: string): Promise<Tutor[]> {
    const q = sanitizeIlikeQuery(query);
    if (!q) return this.getAll();

    const { data, error } = await supabase
      .from("tutors")
      .select("*")
      // Note: Supabase `or()` expects a PostgREST filter string
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
      .order("name");

    if (error) throw error;
    return data || [];
  },
};

// ============================================
// PETS
// ============================================

export const petsApi = {
  async getAll(): Promise<Pet[]> {
    const { data, error } = await supabase
      .from('pets')
      .select('*, tutor:tutors(*)')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getByTutor(tutorId: string): Promise<Pet[]> {
    const { data, error } = await supabase
      .from('pets')
      .select('*, tutor:tutors(*)')
      .eq('tutor_id', tutorId)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Pet | null> {
    const { data, error } = await supabase
      .from('pets')
      .select('*, tutor:tutors(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(pet: Omit<Pet, 'id' | 'created_at' | 'updated_at'>): Promise<Pet> {
    const { data, error } = await supabase
      .from('pets')
      .insert(pet)
      .select('*, tutor:tutors(*)')
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, pet: Partial<Pet>): Promise<Pet> {
    const { data, error } = await supabase
      .from('pets')
      .update(pet)
      .eq('id', id)
      .select('*, tutor:tutors(*)')
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('pets')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async addLoyaltyPoints(id: string, points: number): Promise<Pet> {
    const pet = await this.getById(id);
    if (!pet) throw new Error('Pet não encontrado');
    
    const { data, error } = await supabase
      .from('pets')
      .update({
        loyalty_points: (pet.loyalty_points || 0) + points,
        total_visits: (pet.total_visits || 0) + 1,
      })
      .eq('id', id)
      .select('*, tutor:tutors(*)')
      .single();
    if (error) throw error;
    return data;
  },

  async search(query: string): Promise<Pet[]> {
    const q = sanitizeIlikeQuery(query);
    if (!q) return this.getAll();

    const { data, error } = await supabase
      .from("pets")
      .select("*, tutor:tutors(*)")
      .or(`name.ilike.%${q}%,breed.ilike.%${q}%`)
      .order("name");

    if (error) throw error;
    return data || [];
  },
};

// ============================================
// PROFISSIONAIS
// ============================================

export const professionalsApi = {
  async getAll(): Promise<Professional[]> {
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getActive(): Promise<Professional[]> {
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async create(professional: Omit<Professional, 'id' | 'created_at'>): Promise<Professional> {
    const { data, error } = await supabase
      .from('professionals')
      .insert(professional)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, professional: Partial<Professional>): Promise<Professional> {
    const { data, error } = await supabase
      .from('professionals')
      .update(professional)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('professionals')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// SERVIÇOS
// ============================================

export const servicesApi = {
  async getAll(): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getActive(): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async create(service: Omit<Service, 'id' | 'created_at'>): Promise<Service> {
    const { data, error } = await supabase
      .from('services')
      .insert(service)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, service: Partial<Service>): Promise<Service> {
    const { data, error } = await supabase
      .from('services')
      .update(service)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// AGENDAMENTOS
// ============================================

export const appointmentsApi = {
  async getAll(): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, pet:pets(*, tutor:tutors(*)), service:services(*), professional:professionals(*)')
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getByDate(date: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, pet:pets(*, tutor:tutors(*)), service:services(*), professional:professionals(*)')
      .eq('scheduled_date', date)
      .order('scheduled_time', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getToday(): Promise<Appointment[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getByDate(today);
  },

  async getByStatus(status: AppointmentStatus): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, pet:pets(*, tutor:tutors(*)), service:services(*), professional:professionals(*)')
      .eq('status', status)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async create(appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .insert(appointment)
      .select('*, pet:pets(*, tutor:tutors(*)), service:services(*), professional:professionals(*)')
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, appointment: Partial<Appointment>): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .update(appointment)
      .eq('id', id)
      .select('*, pet:pets(*, tutor:tutors(*)), service:services(*), professional:professionals(*)')
      .single();
    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select('*, pet:pets(*, tutor:tutors(*)), service:services(*), professional:professionals(*)')
      .single();
    if (error) throw error;
    
    // Se finalizado, adicionar pontos de fidelidade
    if (status === 'finalizado' && data.pet) {
      await petsApi.addLoyaltyPoints(data.pet.id, 10);
    }
    
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async markWhatsAppSent(id: string): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .update({ whatsapp_sent: true })
      .eq('id', id)
      .select('*, pet:pets(*, tutor:tutors(*)), service:services(*), professional:professionals(*)')
      .single();
    if (error) throw error;
    return data;
  },
};

// ============================================
// PRODUTOS
// ============================================

export const productsApi = {
  async getAll(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getActive(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async create(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, product: Partial<Product>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update(product)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStock(id: string, quantity: number): Promise<Product> {
    const product = await this.getById(id);
    if (!product) throw new Error('Produto não encontrado');
    
    const { data, error } = await supabase
      .from('products')
      .update({ stock_quantity: (product.stock_quantity || 0) + quantity })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// PACOTES
// ============================================

export const packagesApi = {
  async getAll(): Promise<Package[]> {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getActive(): Promise<Package[]> {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async create(pkg: Omit<Package, 'id' | 'created_at'>): Promise<Package> {
    const { data, error } = await supabase
      .from('packages')
      .insert(pkg)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, pkg: Partial<Package>): Promise<Package> {
    const { data, error } = await supabase
      .from('packages')
      .update(pkg)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// PLANOS (PLANS)
// ============================================

export const plansApi = {
  async getAll(): Promise<Plan[]> {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getActive(): Promise<Plan[]> {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Plan | null> {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(plan: Omit<Plan, 'id' | 'created_at'>): Promise<Plan> {
    const { data, error } = await supabase
      .from('plans')
      .insert(plan)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, plan: Partial<Plan>): Promise<Plan> {
    const { data, error } = await supabase
      .from('plans')
      .update(plan)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// CLIENT PLANS (PLANOS DE CLIENTES)
// ============================================

export const clientPlansApi = {
  async getAll(): Promise<ClientPlan[]> {
    const { data, error } = await supabase
      .from('client_plans')
      .select('*, plan:plans(*), tutor:tutors(*)')
      .order('due_date', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getByTutor(tutorId: string): Promise<ClientPlan[]> {
    const { data, error } = await supabase
      .from('client_plans')
      .select('*, plan:plans(*)')
      .eq('tutor_id', tutorId)
      .eq('is_active', true)
      .order('due_date', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getExpiring(days: number = 7): Promise<ClientPlan[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const { data, error } = await supabase
      .from('client_plans')
      .select('*, plan:plans(*), tutor:tutors(*)')
      .eq('is_active', true)
      .eq('is_paid', false)
      .lte('due_date', futureDate.toISOString().split('T')[0])
      .order('due_date', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getOverdue(): Promise<ClientPlan[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('client_plans')
      .select('*, plan:plans(*), tutor:tutors(*)')
      .eq('is_active', true)
      .eq('is_paid', false)
      .lt('due_date', today)
      .order('due_date', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async create(clientPlan: Omit<ClientPlan, 'id' | 'created_at' | 'updated_at'>): Promise<ClientPlan> {
    const { data, error } = await supabase
      .from('client_plans')
      .insert(clientPlan)
      .select('*, plan:plans(*)')
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, clientPlan: Partial<ClientPlan>): Promise<ClientPlan> {
    const { data, error } = await supabase
      .from('client_plans')
      .update(clientPlan)
      .eq('id', id)
      .select('*, plan:plans(*)')
      .single();
    if (error) throw error;
    return data;
  },

  async markAsPaid(id: string, paymentMethod: string): Promise<ClientPlan> {
    const { data, error } = await supabase
      .from('client_plans')
      .update({
        is_paid: true,
        paid_at: new Date().toISOString(),
        payment_method: paymentMethod,
      })
      .eq('id', id)
      .select('*, plan:plans(*)')
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('client_plans')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// CAIXA (PDV)
// ============================================

export const cashRegisterApi = {
  async getOpenSession(): Promise<CashRegisterSession | null> {
    const { data, error } = await supabase
      .from("cash_register_sessions")
      .select("*")
      .is("closed_at", null)
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getSessionsByDateRange(startDate: string, endDate: string): Promise<CashRegisterSession[]> {
    const { data, error } = await supabase
      .from("cash_register_sessions")
      .select("*")
      .gte("opened_at", `${startDate}T00:00:00`)
      .lte("opened_at", `${endDate}T23:59:59`)
      .order("opened_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<CashRegisterSession | null> {
    const { data, error } = await supabase
      .from("cash_register_sessions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async openSession(input: { opening_balance?: number }): Promise<CashRegisterSession> {
    const { data: profileData, error: profileErr } = await supabase
      .from("profiles")
      .select("cnpj")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .maybeSingle();

    if (profileErr) throw profileErr;
    const cnpj = profileData?.cnpj;
    if (!cnpj) throw new Error("CNPJ não encontrado no perfil do usuário");

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    if (!userRes.user) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("cash_register_sessions")
      .insert({
        cnpj,
        opened_by: userRes.user.id,
        opening_balance: input.opening_balance ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async addMovement(input: {
    session_id: string;
    movement_type: CashMovementType;
    amount: number;
    notes?: string | null;
  }): Promise<CashRegisterMovement> {
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    if (!userRes.user) throw new Error("Usuário não autenticado");

    // Pega cnpj pelo profile (RLS garante acesso)
    const { data: profileData, error: profileErr } = await supabase
      .from("profiles")
      .select("cnpj")
      .eq("user_id", userRes.user.id)
      .maybeSingle();
    if (profileErr) throw profileErr;
    const cnpj = profileData?.cnpj;
    if (!cnpj) throw new Error("CNPJ não encontrado no perfil do usuário");

    const { data, error } = await supabase
      .from("cash_register_movements")
      .insert({
        session_id: input.session_id,
        cnpj,
        movement_type: input.movement_type,
        amount: input.amount,
        notes: input.notes ?? null,
        created_by: userRes.user.id,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getSessionSummary(sessionId: string): Promise<{
    salesTotal: number;
    salesCount: number;
    sangriaTotal: number;
    suprimentoTotal: number;
  }> {
    const [{ data: sales, error: salesErr }, { data: moves, error: movesErr }] =
      await Promise.all([
        supabase
          .from("sales")
          .select("id,total_amount")
          .eq("cash_session_id", sessionId),
        supabase
          .from("cash_register_movements")
          .select("movement_type,amount")
          .eq("session_id", sessionId),
      ]);

    if (salesErr) throw salesErr;
    if (movesErr) throw movesErr;

    const salesTotal = (sales ?? []).reduce(
      (sum: number, s: any) => sum + Number(s.total_amount ?? 0),
      0
    );
    const salesCount = (sales ?? []).length;

    const sangriaTotal = (moves ?? [])
      .filter((m: any) => m.movement_type === "sangria")
      .reduce((sum: number, m: any) => sum + Number(m.amount ?? 0), 0);

    const suprimentoTotal = (moves ?? [])
      .filter((m: any) => m.movement_type === "suprimento")
      .reduce((sum: number, m: any) => sum + Number(m.amount ?? 0), 0);

    return { salesTotal, salesCount, sangriaTotal, suprimentoTotal };
  },

  async closeSession(input: {
    session_id: string;
    closing_balance: number;
    closing_notes?: string | null;
  }): Promise<CashRegisterSession> {
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    if (!userRes.user) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("cash_register_sessions")
      .update({
        closed_by: userRes.user.id,
        closed_at: new Date().toISOString(),
        closing_balance: input.closing_balance,
        closing_notes: input.closing_notes ?? null,
      })
      .eq("id", input.session_id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// ============================================
// VENDAS
// ============================================

export const salesApi = {
  async getAll(): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, tutor:tutors(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Sale | null> {
    const { data, error } = await supabase
      .from('sales')
      .select(
        '*, tutor:tutors(*), items:sale_items(*, product:products(*), service:services(*))'
      )
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, tutor:tutors(*)')
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getToday(): Promise<Sale[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getByDateRange(today, today);
  },

  async create(sale: Omit<Sale, 'id' | 'created_at'>, items: Omit<SaleItem, 'id' | 'sale_id' | 'created_at'>[]): Promise<Sale> {
    // Criar venda
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        tutor_id: sale.tutor_id,
        total_amount: sale.total_amount,
        payment_method: sale.payment_method,
        notes: sale.notes,
        cash_session_id: sale.cash_session_id ?? null,
      })
      .select()
      .single();
    if (saleError) throw saleError;

    // Criar itens
    const itemsWithSaleId = items.map(item => ({
      ...item,
      sale_id: saleData.id,
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(itemsWithSaleId);
    if (itemsError) throw itemsError;

    // Atualizar estoque dos produtos
    for (const item of items) {
      if (item.product_id) {
        await productsApi.updateStock(item.product_id, -item.quantity);
      }
    }

    return saleData;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

export const reportsApi = {
  async getDailyRevenue(date: string): Promise<number> {
    const sales = await salesApi.getByDateRange(date, date);
    return sales.reduce((total, sale) => total + sale.total_amount, 0);
  },

  async getMonthlyRevenue(year: number, month: number): Promise<number> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    const sales = await salesApi.getByDateRange(startDate, endDate);
    return sales.reduce((total, sale) => total + sale.total_amount, 0);
  },

  async getMostFrequentPets(limit = 10): Promise<Pet[]> {
    const { data, error } = await supabase
      .from('pets')
      .select('*, tutor:tutors(*)')
      .order('total_visits', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async getTopServices(): Promise<{ service: Service; count: number }[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('service:services(*)');
    if (error) throw error;

    const serviceCounts = new Map<string, { service: Service; count: number }>();
    
    data?.forEach((appointment: any) => {
      if (appointment.service) {
        const existing = serviceCounts.get(appointment.service.id);
        if (existing) {
          existing.count++;
        } else {
          serviceCounts.set(appointment.service.id, {
            service: appointment.service,
            count: 1,
          });
        }
      }
    });

    return Array.from(serviceCounts.values())
      .sort((a, b) => b.count - a.count);
  },

  async getDashboardStats(): Promise<{
    todayAppointments: number;
    todayRevenue: number;
    pendingPickups: number;
    totalClients: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    
    const [appointments, revenue, pickups, tutors] = await Promise.all([
      appointmentsApi.getByDate(today),
      this.getDailyRevenue(today),
      appointmentsApi.getByStatus('aguardando_busca'),
      tutorsApi.getAll(),
    ]);

    return {
      todayAppointments: appointments.length,
      todayRevenue: revenue,
      pendingPickups: pickups.length,
      totalClients: tutors.length,
    };
  },
};

// ============================================
// WHATSAPP INTEGRATION
// ============================================

export const whatsappApi = {
  generateMessage(type: 'ready' | 'confirmation' | 'reminder' | 'feedback', petName?: string, tutorName?: string, date?: string, time?: string): string {
    switch (type) {
      case 'ready':
        return `Olá${tutorName ? `, ${tutorName}` : ''}! 🐾✂️\n\nSeu pet${petName ? ` ${petName}` : ''} está pronto e lindo esperando por você! 🎀\n\nVenha buscar quando puder! 💚`;
      case 'confirmation':
        return `Olá${tutorName ? `, ${tutorName}` : ''}! 🐾\n\nConfirmamos o agendamento${petName ? ` de ${petName}` : ''} para ${date} às ${time}.\n\nTe esperamos! 💚`;
      case 'reminder':
        return `Olá${tutorName ? `, ${tutorName}` : ''}! 🐾\n\nLembrando que${petName ? ` ${petName}` : ' seu pet'} tem agendamento amanhã às ${time}.\n\nConfirma presença? 💚`;
      case 'feedback':
        return `Olá${tutorName ? `, ${tutorName}` : ''}! 🐾\n\nComo foi o atendimento${petName ? ` de ${petName}` : ''}? Gostou?\n\nSua opinião é muito importante para nós! ⭐\n\nObrigado pela confiança! 💚`;
      default:
        return '';
    }
  },

  openWhatsApp(phone: string, message: string): void {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneWithCountry}?text=${encodedMessage}`, '_blank');
  },
};
