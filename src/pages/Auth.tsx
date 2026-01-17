import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dog, Mail, Lock, Building2, FileText, Key, LogIn, UserPlus, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const emailSchema = z.string().email("E-mail inválido");
const passwordSchema = z.string().min(6, "Senha deve ter pelo menos 6 caracteres");
const codeSchema = z.string().min(4, "Código de cadastro é obrigatório");

const normalizeCnpj = (value: string) => value.replace(/\D/g, "");
const cnpjSchema = z
  .string()
  .transform((v) => normalizeCnpj(v))
  .refine((v) => v.length === 14, "CNPJ deve ter 14 dígitos");

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signIn, signUp, isLoading } = useAuth();
  
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [codeValidation, setCodeValidation] = useState<{
    valid: boolean;
    cnpj?: string;
    companyName?: string;
  } | null>(null);
  const [errors, setErrors] = useState<{ cnpj?: string; email?: string; password?: string; code?: string }>({});

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  // Validate registration code when it changes using secure RPC function
  useEffect(() => {
    if (mode === "signup" && registrationCode.length >= 4) {
      const timer = setTimeout(async () => {
        setIsValidatingCode(true);
        try {
          const { data, error } = await supabase
            .rpc('check_registration_code', { _code: registrationCode.toUpperCase() });

          if (error) throw error;

          if (data && data.length > 0 && data[0].is_valid) {
            setCodeValidation({
              valid: true,
              cnpj: data[0].cnpj,
              companyName: data[0].company_name,
            });
          } else {
            setCodeValidation({ valid: false });
          }
        } catch (error) {
          console.error('Error validating code:', error);
          setCodeValidation({ valid: false });
        } finally {
          setIsValidatingCode(false);
        }
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setCodeValidation(null);
    }
  }, [registrationCode, mode]);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (mode === "login") {
      const parsed = cnpjSchema.safeParse(cnpj);
      if (!parsed.success) {
        newErrors.cnpj = parsed.error.errors[0]?.message ?? "CNPJ inválido";
      }
    }

    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    if (mode === "signup") {
      try {
        codeSchema.parse(registrationCode);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.code = e.errors[0].message;
        }
      }

      if (!codeValidation?.valid) {
        newErrors.code = "Código de cadastro inválido ou já utilizado";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Credenciais inválidas",
              description: "E-mail ou senha incorretos.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro ao entrar",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          // Enforce company login (CNPJ must match the authenticated user's profile)
          const typedCnpj = normalizeCnpj(cnpj);
          const { data: userData } = await supabase.auth.getUser();

          const userId = userData.user?.id;
          if (!userId) {
            await supabase.auth.signOut();
            toast({
              title: "Sessão inválida",
              description: "Faça login novamente.",
              variant: "destructive",
            });
            return;
          }

          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("cnpj")
            .eq("user_id", userId)
            .maybeSingle();

          if (profileError || !profileData?.cnpj) {
            await supabase.auth.signOut();
            toast({
              title: "Empresa não vinculada",
              description: "Seu usuário não está vinculado a nenhuma empresa.",
              variant: "destructive",
            });
            return;
          }

          const profileCnpj = normalizeCnpj(profileData.cnpj);
          if (profileCnpj !== typedCnpj) {
            await supabase.auth.signOut();
            toast({
              title: "Acesso negado",
              description: "Este e-mail não pertence ao CNPJ informado.",
              variant: "destructive",
            });
            return;
          }

          try {
            await supabase.functions.invoke("bootstrap-user", { body: {} });
          } catch {
            // non-blocking
          }

          toast({ title: "Bem-vindo! 🐾" });
          navigate("/");
        }
      } else {
        if (!codeValidation?.valid || !codeValidation.companyName || !codeValidation.cnpj) {
          toast({
            title: "Código inválido",
            description: "Por favor, insira um código de cadastro válido.",
            variant: "destructive",
          });
          return;
        }

        const { error } = await signUp(email, password, codeValidation.companyName, codeValidation.cnpj);
        
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "E-mail já cadastrado",
              description: "Este e-mail já está em uso. Tente fazer login.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro ao cadastrar",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          // Mark code as used
          await supabase.rpc('use_registration_code', { 
            _code: registrationCode.toUpperCase(),
            _user_id: (await supabase.auth.getUser()).data.user?.id
          });

          // Ensure the first account gets admin privileges
          try {
            await supabase.functions.invoke("bootstrap-user", { body: {} });
          } catch (e) {
            console.warn("bootstrap-user failed (non-blocking):", e);
          }

          toast({ 
            title: "Conta criada! 🎉",
            description: "Você já pode acessar o sistema.",
          });
          navigate("/");
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <Dog className="w-16 h-16 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="text-center">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Dog className="w-12 h-12 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">PetControl</h1>
          <p className="text-muted-foreground mt-2">Sistema de Gestão para Pet Shop</p>
        </div>

        {/* Form Card */}
        <div className="pet-card">
          {/* Mode Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                mode === "login"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <LogIn size={18} />
              Entrar
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                mode === "signup"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <UserPlus size={18} />
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="code" className="flex items-center gap-2">
                    <Key size={16} />
                    Código de Cadastro
                  </Label>
                  <div className="relative">
                    <Input
                      id="code"
                      type="text"
                      value={registrationCode}
                      onChange={(e) => setRegistrationCode(e.target.value.toUpperCase())}
                      placeholder="Digite o código recebido"
                      className="h-12 pr-12 uppercase"
                    />
                    {isValidatingCode && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {!isValidatingCode && codeValidation && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {codeValidation.valid ? (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-destructive" />
                        )}
                      </div>
                    )}
                  </div>
                  {errors.code && (
                    <p className="text-sm text-destructive">{errors.code}</p>
                  )}
                </div>

                {codeValidation?.valid && (
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-2">
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <CheckCircle2 size={16} />
                      Código válido!
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="flex items-center gap-2">
                        <Building2 size={14} className="text-muted-foreground" />
                        <span className="font-medium">{codeValidation.companyName}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <FileText size={14} className="text-muted-foreground" />
                        <span>CNPJ: {codeValidation.cnpj}</span>
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {mode === "login" && (
              <div className="space-y-2">
                <Label htmlFor="cnpj" className="flex items-center gap-2">
                  <FileText size={16} />
                  CNPJ
                </Label>
                <Input
                  id="cnpj"
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="h-12"
                  inputMode="numeric"
                />
                {errors.cnpj && <p className="text-sm text-destructive">{errors.cnpj}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail size={16} />
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="h-12"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock size={16} />
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || (mode === "signup" && !codeValidation?.valid)}
              className="w-full h-14 text-lg gap-2"
            >
              {isSubmitting ? (
                "Aguarde..."
              ) : mode === "login" ? (
                <>
                  <LogIn size={20} />
                  Entrar
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  Criar Conta
                </>
              )}
            </Button>
          </form>

          {mode === "signup" && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Você precisa de um código de cadastro fornecido pelo administrador.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}