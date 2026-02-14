export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          cnpj: string | null
          created_at: string | null
          id: string
          notes: string | null
          pet_id: string
          price: number | null
          professional_id: string | null
          scheduled_date: string
          scheduled_time: string
          service_id: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          updated_at: string | null
          whatsapp_sent: boolean | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          pet_id: string
          price?: number | null
          professional_id?: string | null
          scheduled_date: string
          scheduled_time: string
          service_id: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string | null
          whatsapp_sent?: boolean | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          pet_id?: string
          price?: number | null
          professional_id?: string | null
          scheduled_date?: string
          scheduled_time?: string
          service_id?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string | null
          whatsapp_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_register_movements: {
        Row: {
          amount: number
          cnpj: string
          created_at: string
          created_by: string
          id: string
          movement_type: Database["public"]["Enums"]["cash_movement_type"]
          notes: string | null
          session_id: string
        }
        Insert: {
          amount: number
          cnpj: string
          created_at?: string
          created_by: string
          id?: string
          movement_type: Database["public"]["Enums"]["cash_movement_type"]
          notes?: string | null
          session_id: string
        }
        Update: {
          amount?: number
          cnpj?: string
          created_at?: string
          created_by?: string
          id?: string
          movement_type?: Database["public"]["Enums"]["cash_movement_type"]
          notes?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_movements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_register_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_register_sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_balance: number | null
          closing_notes: string | null
          cnpj: string
          created_at: string
          id: string
          opened_at: string
          opened_by: string
          opening_balance: number
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_balance?: number | null
          closing_notes?: string | null
          cnpj: string
          created_at?: string
          id?: string
          opened_at?: string
          opened_by: string
          opening_balance?: number
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_balance?: number | null
          closing_notes?: string | null
          cnpj?: string
          created_at?: string
          id?: string
          opened_at?: string
          opened_by?: string
          opening_balance?: number
          updated_at?: string
        }
        Relationships: []
      }
      client_plans: {
        Row: {
          created_at: string | null
          due_date: string
          id: string
          is_active: boolean | null
          is_paid: boolean | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          plan_id: string
          start_date: string
          tutor_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          due_date: string
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          plan_id: string
          start_date?: string
          tutor_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          due_date?: string
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          plan_id?: string
          start_date?: string
          tutor_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_plans_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cnpj: string | null
          created_at: string
          email: string
          id: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      company_subscriptions: {
        Row: {
          cnpj: string
          created_at: string
          current_plan_key: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_started_at: string
          updated_at: string
          valid_until: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          current_plan_key?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_started_at?: string
          updated_at?: string
          valid_until: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          current_plan_key?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_started_at?: string
          updated_at?: string
          valid_until?: string
        }
        Relationships: []
      }
      master_admin_allowlist: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      medical_consultations: {
        Row: {
          appointment_id: string | null
          cnpj: string | null
          created_at: string
          created_by: string
          ended_at: string | null
          id: string
          notes: string | null
          office_id: string
          pet_id: string | null
          started_at: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          cnpj?: string | null
          created_at?: string
          created_by: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          office_id: string
          pet_id?: string | null
          started_at?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          office_id?: string
          pet_id?: string | null
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_consultations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_consultations_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "medical_offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_consultations_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_offices: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          included_services: string[] | null
          is_active: boolean | null
          name: string
          price: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          included_services?: string[] | null
          is_active?: boolean | null
          name: string
          price: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          included_services?: string[] | null
          is_active?: boolean | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      pets: {
        Row: {
          allergies: string | null
          birth_date: string | null
          breed: string | null
          cnpj: string | null
          created_at: string | null
          id: string
          is_aggressive: boolean | null
          loyalty_points: number | null
          name: string
          notes: string | null
          size: Database["public"]["Enums"]["pet_size"] | null
          temperament: Database["public"]["Enums"]["pet_temperament"] | null
          total_visits: number | null
          tutor_id: string
          updated_at: string | null
        }
        Insert: {
          allergies?: string | null
          birth_date?: string | null
          breed?: string | null
          cnpj?: string | null
          created_at?: string | null
          id?: string
          is_aggressive?: boolean | null
          loyalty_points?: number | null
          name: string
          notes?: string | null
          size?: Database["public"]["Enums"]["pet_size"] | null
          temperament?: Database["public"]["Enums"]["pet_temperament"] | null
          total_visits?: number | null
          tutor_id: string
          updated_at?: string | null
        }
        Update: {
          allergies?: string | null
          birth_date?: string | null
          breed?: string | null
          cnpj?: string | null
          created_at?: string | null
          id?: string
          is_aggressive?: boolean | null
          loyalty_points?: number | null
          name?: string
          notes?: string | null
          size?: Database["public"]["Enums"]["pet_size"] | null
          temperament?: Database["public"]["Enums"]["pet_temperament"] | null
          total_visits?: number | null
          tutor_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string | null
          description: string | null
          duration_months: number
          id: string
          included_services: string[] | null
          is_active: boolean | null
          name: string
          price: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_months?: number
          id?: string
          included_services?: string[] | null
          is_active?: boolean | null
          name: string
          price: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_months?: number
          id?: string
          included_services?: string[] | null
          is_active?: boolean | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          stock_quantity: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          stock_quantity?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          stock_quantity?: number | null
        }
        Relationships: []
      }
      professionals: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          specialty: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          specialty?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          specialty?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cnpj: string | null
          company_name: string | null
          created_at: string | null
          crmv: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cnpj?: string | null
          company_name?: string | null
          created_at?: string | null
          crmv?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cnpj?: string | null
          company_name?: string | null
          created_at?: string | null
          crmv?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      registration_codes: {
        Row: {
          cnpj: string
          code: string
          company_name: string
          created_at: string
          created_by: string | null
          id: string
          is_used: boolean | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          cnpj: string
          code: string
          company_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_used?: boolean | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          cnpj?: string
          code?: string
          company_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_used?: boolean | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          cnpj: string | null
          created_at: string | null
          id: string
          product_id: string | null
          quantity: number | null
          sale_id: string
          service_id: string | null
          subtotal: number
          unit_price: number
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity?: number | null
          sale_id: string
          service_id?: string | null
          subtotal: number
          unit_price: number
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity?: number | null
          sale_id?: string
          service_id?: string | null
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cash_session_id: string | null
          cnpj: string | null
          created_at: string | null
          id: string
          notes: string | null
          payment_method: string | null
          total_amount: number
          tutor_id: string | null
        }
        Insert: {
          cash_session_id?: string | null
          cnpj?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          total_amount: number
          tutor_id?: string | null
        }
        Update: {
          cash_session_id?: string | null
          cnpj?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          total_amount?: number
          tutor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_register_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          icon_key: string
          id: string
          is_active: boolean | null
          name: string
          price: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          icon_key?: string
          id?: string
          is_active?: boolean | null
          name: string
          price: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          icon_key?: string
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          address: string | null
          closing_time: string | null
          created_at: string | null
          email: string | null
          facebook: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          opening_time: string | null
          phone: string | null
          plans_enabled: boolean | null
          printer_address: string | null
          printer_enabled: boolean | null
          printer_type: string | null
          store_name: string
          updated_at: string | null
          whatsapp_number: string | null
          whatsapp_templates: Json
          working_days: string[] | null
        }
        Insert: {
          address?: string | null
          closing_time?: string | null
          created_at?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          opening_time?: string | null
          phone?: string | null
          plans_enabled?: boolean | null
          printer_address?: string | null
          printer_enabled?: boolean | null
          printer_type?: string | null
          store_name?: string
          updated_at?: string | null
          whatsapp_number?: string | null
          whatsapp_templates?: Json
          working_days?: string[] | null
        }
        Update: {
          address?: string | null
          closing_time?: string | null
          created_at?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          opening_time?: string | null
          phone?: string | null
          plans_enabled?: boolean | null
          printer_address?: string | null
          printer_enabled?: boolean | null
          printer_type?: string | null
          store_name?: string
          updated_at?: string | null
          whatsapp_number?: string | null
          whatsapp_templates?: Json
          working_days?: string[] | null
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          amount: number | null
          cnpj: string
          created_at: string
          currency: string | null
          id: string
          paid_at: string
          period_end: string | null
          period_start: string | null
          plan_key: string | null
          stripe_customer_id: string | null
          stripe_event_id: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          amount?: number | null
          cnpj: string
          created_at?: string
          currency?: string | null
          id?: string
          paid_at?: string
          period_end?: string | null
          period_start?: string | null
          plan_key?: string | null
          stripe_customer_id?: string | null
          stripe_event_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          amount?: number | null
          cnpj?: string
          created_at?: string
          currency?: string | null
          id?: string
          paid_at?: string
          period_end?: string | null
          period_start?: string | null
          plan_key?: string | null
          stripe_customer_id?: string | null
          stripe_event_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: []
      }
      tutors: {
        Row: {
          address: string | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      medical_consultations_safe: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          created_by: string | null
          ended_at: string | null
          id: string | null
          office_id: string | null
          pet_id: string | null
          started_at: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          id?: string | null
          office_id?: string | null
          pet_id?: string | null
          started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          id?: string | null
          office_id?: string | null
          pet_id?: string | null
          started_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_consultations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_consultations_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "medical_offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_consultations_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings_public: {
        Row: {
          id: string | null
          plans_enabled: boolean | null
          store_name: string | null
        }
        Insert: {
          id?: string | null
          plans_enabled?: boolean | null
          store_name?: string | null
        }
        Update: {
          id?: string | null
          plans_enabled?: boolean | null
          store_name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_registration_code: {
        Args: { _code: string }
        Returns: {
          cnpj: string
          company_name: string
          is_valid: boolean
        }[]
      }
      current_user_cnpj: { Args: { _user_id: string }; Returns: string }
      current_user_email: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_master_email_allowed: { Args: { _email: string }; Returns: boolean }
      list_companies_master: {
        Args: never
        Returns: {
          cnpj: string
          created_at: string
          email: string
          id: string
          user_count: number
        }[]
      }
      use_registration_code: {
        Args: { _code: string; _user_id: string }
        Returns: boolean
      }
      validate_registration_code: {
        Args: { _cnpj: string; _code: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "administrador" | "atendente" | "tosador" | "medico"
      appointment_status:
        | "agendado"
        | "em_atendimento"
        | "aguardando_busca"
        | "finalizado"
        | "pago"
      cash_movement_type: "sangria" | "suprimento"
      pet_size: "pequeno" | "medio" | "grande"
      pet_temperament: "docil" | "agitado" | "agressivo" | "timido"
      subscription_status: "ATIVO" | "A_VENCER" | "VENCIDA" | "BLOQUEADA"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["administrador", "atendente", "tosador", "medico"],
      appointment_status: [
        "agendado",
        "em_atendimento",
        "aguardando_busca",
        "finalizado",
        "pago",
      ],
      cash_movement_type: ["sangria", "suprimento"],
      pet_size: ["pequeno", "medio", "grande"],
      pet_temperament: ["docil", "agitado", "agressivo", "timido"],
      subscription_status: ["ATIVO", "A_VENCER", "VENCIDA", "BLOQUEADA"],
    },
  },
} as const
