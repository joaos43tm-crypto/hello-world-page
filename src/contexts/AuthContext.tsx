"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { CompanySubscription } from "@/lib/subscription";

export type AppRole = "administrador" | "atendente" | "tosador" | "medico";

interface Profile {
  id: string;
  user_id: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  cnpj?: string;
  company_name?: string;
  crmv?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isAdmin: boolean;
  isLoading: boolean;
  subscription: CompanySubscription | null;
  refreshSubscription: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    companyName: string,
    cnpj: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [subscription, setSubscription] = useState<CompanySubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("subscription-status", { body: {} });
      if (error) throw error;
      setSubscription((data?.subscription ?? null) as CompanySubscription | null);
    } catch (e) {
      console.warn("subscription-status failed (non-blocking):", e);
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      // Garante que o usuário tenha um perfil/papel (primeira conta vira administrador)
      try {
        await supabase.functions.invoke("bootstrap-user", { body: {} });
      } catch (e) {
        console.warn("bootstrap-user failed (non-blocking):", e);
      }

      // Busca perfil e papel em paralelo para ser mais rápido
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle()
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
      }

      if (roleRes.data) {
        setRole(roleRes.data.role as AppRole);
      } else {
        // Se não encontrar papel, define como null explicitamente para sair do loop de carregamento
        setRole(null);
      }

      await fetchSubscription();
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await fetchUserData(session.user.id);
          }
        }
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Se já temos um papel e é o mesmo usuário, atualiza em background
          if (role && user?.id === session.user.id) {
            fetchUserData(session.user.id);
          } else {
            // Caso contrário, bloqueia o carregamento até ter os dados
            setIsLoading(true);
            try {
              await fetchUserData(session.user.id);
            } finally {
              setIsLoading(false);
            }
          }
        } else {
          setProfile(null);
          setRole(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, companyName: string, cnpj: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name: companyName, company_name: companyName, cnpj },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const isAdmin = role === "administrador";

  const refreshSubscription = async () => {
    await fetchSubscription();
  };

  const refreshUserData = async () => {
    if (!user?.id) return;
    await fetchUserData(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isAdmin,
        isLoading,
        subscription,
        refreshSubscription,
        signIn,
        signUp,
        signOut,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}