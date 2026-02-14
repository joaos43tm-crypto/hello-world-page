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
      if (!error && data?.subscription) {
        setSubscription(data.subscription as CompanySubscription);
      }
    } catch (e) {
      console.warn("Falha ao buscar assinatura (não crítico):", e);
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      // Tenta garantir o papel/perfil, mas não trava se falhar
      supabase.functions.invoke("bootstrap-user", { body: {} }).catch(console.warn);

      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle()
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (roleRes.data) setRole(roleRes.data.role as AppRole);

      fetchSubscription();
    } catch (error) {
      console.error("Erro ao buscar dados do usuário:", error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserData(session.user.id);
        }
      } catch (error) {
        console.error("Erro na inicialização:", error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        const newUser = session?.user ?? null;
        setSession(session);
        setUser(newUser);

        if (newUser) {
          fetchUserData(newUser.id);
        } else {
          setProfile(null);
          setRole(null);
          setSubscription(null);
        }
        
        // Garante que o loading saia se houver mudança de estado
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string, companyName: string, cnpj: string) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: companyName, company_name: companyName, cnpj },
      },
    });
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
    if (user?.id) await fetchUserData(user.id);
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
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}