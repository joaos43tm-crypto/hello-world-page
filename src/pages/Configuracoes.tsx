import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Settings,
  Store,
  Clock,
  Printer,
  Save,
  Instagram,
  MessageCircle,
  MapPin,
  Phone,
  Mail,
  Image,
  Users,
  Shield,
  LogOut,
  Plus,
  Pencil,
  Database,
  Stethoscope,
  CreditCard,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { getDefaultWhatsAppTemplates } from "@/lib/whatsappTemplates";
import { MedicalOfficesTab } from "@/components/settings/MedicalOfficesTab";
import { SubscriptionTab } from "@/components/subscription/SubscriptionTab";

interface StoreSettings {
  id: string;
  store_name: string;
  phone?: string;
  email?: string;
  address?: string;
  logo_url?: string;
  opening_time?: string;
  closing_time?: string;
  working_days?: string[];
  printer_enabled?: boolean;
  printer_type?: string;
  printer_address?: string;
  whatsapp_number?: string;
  instagram?: string;
  facebook?: string;
  plans_enabled?: boolean;
  whatsapp_templates?: Record<string, string> | null;
}

interface UserWithRole {
  id: string;
  user_id: string;
  name: string;
  role: string;
}

const weekDays = [
  { id: "seg", label: "Seg" },
  { id: "ter", label: "Ter" },
  { id: "qua", label: "Qua" },
  { id: "qui", label: "Qui" },
  { id: "sex", label: "Sex" },
  { id: "sab", label: "Sáb" },
  { id: "dom", label: "Dom" },
];

export default function Configuracoes() {
  const { toast } = useToast();
  const { profile, role, isAdmin, signOut, refreshUserData } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<
    "store" | "hours" | "printer" | "features" | "offices" | "users" | "data" | "assinatura"
  >("store");
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Data tab
  const [resetConfirm, setResetConfirm] = useState("");
  const [isResettingData, setIsResettingData] = useState(false);
  const isResetAllowed = isAdmin && !!profile?.cnpj;

  const [seedConfirm, setSeedConfirm] = useState("");
  const [isSeedingData, setIsSeedingData] = useState(false);

  const isPreviewEnv =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("lovable.app") || window.location.hostname.includes("lovableproject.com"));

  // Create user modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"administrador" | "atendente" | "tosador" | "medico">("atendente");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Edit user modal
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserRole, setEditUserRole] = useState<"administrador" | "atendente" | "tosador" | "medico">("atendente");
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeEmail, setStoreEmail] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  // WhatsApp message templates (per appointment status)
  const waDefaults = getDefaultWhatsAppTemplates();
  const [waMsgAgendado, setWaMsgAgendado] = useState(waDefaults.agendado);
  const [waMsgEmAtendimento, setWaMsgEmAtendimento] = useState(waDefaults.em_atendimento);
  const [waMsgAguardandoBusca, setWaMsgAguardandoBusca] = useState(waDefaults.aguardando_busca);
  const [waMsgFinalizado, setWaMsgFinalizado] = useState(waDefaults.finalizado);
  const [waMsgPago, setWaMsgPago] = useState(waDefaults.pago);
  const [instagram, setInstagram] = useState("");
  const [openingTime, setOpeningTime] = useState("08:00");
  const [closingTime, setClosingTime] = useState("18:00");
  const [workingDays, setWorkingDays] = useState<string[]>(["seg", "ter", "qua", "qui", "sex", "sab"]);
  const [printerEnabled, setPrinterEnabled] = useState(false);
  const [printerType, setPrinterType] = useState("bluetooth");
  const [printerAddress, setPrinterAddress] = useState("");
  const [plansEnabled, setPlansEnabled] = useState(false);

  // Médico: CRMV (salvo no cadastro do usuário)
  const [crmv, setCrmv] = useState("");
  const [isSavingCrmv, setIsSavingCrmv] = useState(false);
  const loadUsers = async () => {
    if (!isAdmin || !profile?.cnpj) return;

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, user_id, name")
      .eq("cnpj", profile.cnpj);

    if (profilesError) {
      console.error("Error loading users (profiles):", profilesError);
      return;
    }

    const userIds = (profilesData ?? []).map((p) => p.user_id);

    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

    if (rolesError) {
      console.error("Error loading users (roles):", rolesError);
      return;
    }

    const usersWithRoles = (profilesData ?? []).map((p) => ({
      ...p,
      role: rolesData?.find((r) => r.user_id === p.user_id)?.role || "atendente",
    }));

    setUsers(usersWithRoles);
  };

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setStoreName(data.store_name || "");
        setStorePhone(data.phone || "");
        setStoreEmail(data.email || "");
        setStoreAddress(data.address || "");
        setWhatsapp(data.whatsapp_number || "");

        const tpl = (data.whatsapp_templates ?? {}) as Record<string, string>;
        setWaMsgAgendado(tpl.agendado ?? waDefaults.agendado);
        setWaMsgEmAtendimento(tpl.em_atendimento ?? waDefaults.em_atendimento);
        setWaMsgAguardandoBusca(tpl.aguardando_busca ?? waDefaults.aguardando_busca);
        setWaMsgFinalizado(tpl.finalizado ?? waDefaults.finalizado);
        setWaMsgPago(tpl.pago ?? waDefaults.pago);

        setInstagram(data.instagram || "");
        setOpeningTime(data.opening_time || "08:00");
        setClosingTime(data.closing_time || "18:00");
        setWorkingDays(data.working_days || ["seg", "ter", "qua", "qui", "sex", "sab"]);
        setPrinterEnabled(data.printer_enabled || false);
        setPrinterType(data.printer_type || "bluetooth");
        setPrinterAddress(data.printer_address || "");
        setPlansEnabled(data.plans_enabled || false);
      }

      await loadUsers();
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [isAdmin, profile?.cnpj]);

  useEffect(() => {
    const tab = (searchParams.get("tab") || "").toLowerCase();
    if (tab === "assinatura") setActiveTab("assinatura");
  }, [searchParams]);

  useEffect(() => {
    setCrmv((profile as any)?.crmv ?? "");
  }, [profile?.id]);

  const handleSave = async () => {
    if (!settings?.id || !isAdmin) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("store_settings")
        .update({
          store_name: storeName,
          phone: storePhone || null,
          email: storeEmail || null,
          address: storeAddress || null,
          whatsapp_number: whatsapp || null,
          whatsapp_templates: {
            agendado: waMsgAgendado,
            em_atendimento: waMsgEmAtendimento,
            aguardando_busca: waMsgAguardandoBusca,
            finalizado: waMsgFinalizado,
            pago: waMsgPago,
          },
          instagram: instagram || null,
          opening_time: openingTime,
          closing_time: closingTime,
          working_days: workingDays,
          printer_enabled: printerEnabled,
          printer_type: printerType,
          printer_address: printerAddress || null,
          plans_enabled: plansEnabled,
        })
        .eq("id", settings.id);

      if (error) throw error;

      toast({ title: "Configurações salvas!" });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoleChange = async (
    userId: string,
    newRole: "administrador" | "atendente" | "tosador" | "medico"
  ) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole as any })
        .eq("user_id", userId);

      if (error) throw error;

      setUsers(users.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
      toast({ title: "Permissão atualizada!" });
    } catch (error) {
      console.error("Error updating role:", error);
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleSaveCrmv = async () => {
    if (!profile?.user_id) return;

    const value = crmv.trim();
    if (value.length > 60) {
      toast({
        title: "CRMV inválido",
        description: "Use até 60 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingCrmv(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ crmv: value || null })
        .eq("user_id", profile.user_id);

      if (error) throw error;

      await refreshUserData();
      toast({ title: "CRMV salvo no cadastro" });
    } catch (e) {
      console.error("Error saving CRMV:", e);
      toast({
        title: "Erro ao salvar CRMV",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSavingCrmv(false);
    }
  };

  const handleCreateUser = async () => {
    if (!profile?.cnpj) {
      toast({
        title: "Empresa não configurada",
        description: "Seu usuário não tem CNPJ vinculado.",
        variant: "destructive",
      });
      return;
    }

    const name = newUserName.trim();
    if (!name || name.length > 80) {
      toast({ title: "Nome inválido", description: "Informe um nome (até 80 caracteres).", variant: "destructive" });
      return;
    }

    const email = newUserEmail.trim().toLowerCase();
    if (!email || !email.includes("@") || email.length > 255) {
      toast({ title: "E-mail inválido", variant: "destructive" });
      return;
    }

    if (!newUserPassword || newUserPassword.length < 6 || newUserPassword.length > 72) {
      toast({ title: "Senha inválida", description: "Use entre 6 e 72 caracteres.", variant: "destructive" });
      return;
    }

    setIsCreatingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          name,
          email,
          password: newUserPassword,
          role: newUserRole,
          cnpj: profile.cnpj,
          company_name: profile.company_name || settings?.store_name || null,
        },
      });

      if (error) {
        toast({ title: "Erro ao criar usuário", description: error.message, variant: "destructive" });
        return;
      }

      if (data?.error) {
        toast({ title: "Erro ao criar usuário", description: data.error, variant: "destructive" });
        return;
      }

      toast({ title: "Usuário criado!", description: "Já pode fazer login com CNPJ + e-mail + senha." });
      setCreateOpen(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("atendente");
      await loadUsers();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      toast({ title: "Erro ao criar usuário", description: message, variant: "destructive" });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const openEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    setEditUserName(user.name);
    setEditUserRole(user.role as any);
    setEditOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    const name = editUserName.trim();
    if (!name || name.length > 80) {
      toast({ title: "Nome inválido", description: "Informe um nome (até 80 caracteres).", variant: "destructive" });
      return;
    }

    setIsUpdatingUser(true);
    try {
      const [{ error: profileError }, { error: roleError }] = await Promise.all([
        supabase.from("profiles").update({ name }).eq("user_id", editingUser.user_id),
        supabase.from("user_roles").update({ role: editUserRole as any }).eq("user_id", editingUser.user_id),
      ]);

      if (profileError) throw profileError;
      if (roleError) throw roleError;

      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === editingUser.user_id ? { ...u, name, role: editUserRole } : u
        )
      );

      toast({ title: "Usuário atualizado!" });
      setEditOpen(false);
      setEditingUser(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      toast({ title: "Erro ao atualizar usuário", description: message, variant: "destructive" });
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const toggleWorkingDay = (dayId: string) => {
    setWorkingDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId]
    );
  };

  const tabs = [
    { id: "store", label: "Loja", icon: Store },
    { id: "hours", label: "Horários", icon: Clock },
    { id: "printer", label: "Impressora", icon: Printer },
    { id: "features", label: "Recursos", icon: Settings },
    ...(isAdmin ? [{ id: "assinatura", label: "Assinatura", icon: CreditCard }] : []),
    ...(isAdmin ? [{ id: "offices", label: "Consultório", icon: Stethoscope }] : []),
    ...(isAdmin ? [{ id: "users", label: "Usuários", icon: Users }] : []),
    ...(isAdmin ? [{ id: "data", label: "Dados", icon: Database }] : []),
  ];

  const handleResetCompanyData = async () => {
    if (!isResetAllowed) return;

    const confirm = resetConfirm.trim();
    if (confirm !== "APAGAR") {
      toast({ title: "Confirmação inválida", description: "Digite APAGAR para confirmar.", variant: "destructive" });
      return;
    }

    setIsResettingData(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-cnpj-data", {
        body: { confirm },
      });

      if (error) {
        toast({ title: "Erro ao apagar dados", description: error.message, variant: "destructive" });
        return;
      }

      if (data?.error) {
        toast({ title: "Erro ao apagar dados", description: String(data.error), variant: "destructive" });
        return;
      }

      toast({
        title: "Dados apagados",
        description: "Os dados vinculados ao CNPJ foram removidos do ambiente atual.",
      });
      setResetConfirm("");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      toast({ title: "Erro ao apagar dados", description: message, variant: "destructive" });
    } finally {
      setIsResettingData(false);
    }
  };

  const handleSeedDemoData = async () => {
    if (!isAdmin) return;
    if (!profile?.cnpj) {
      toast({ title: "Sem CNPJ", description: "Seu usuário não possui CNPJ vinculado.", variant: "destructive" });
      return;
    }

    const confirm = seedConfirm.trim();
    if (confirm !== "GERAR") {
      toast({ title: "Confirmação inválida", description: "Digite GERAR para confirmar.", variant: "destructive" });
      return;
    }

    setIsSeedingData(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-demo-data", { body: {} });
      if (error) {
        toast({ title: "Erro ao gerar dados", description: error.message, variant: "destructive" });
        return;
      }
      if (data?.error) {
        toast({ title: "Erro ao gerar dados", description: String(data.error), variant: "destructive" });
        return;
      }

      toast({ title: "Dados gerados", description: "Dados fictícios criados para o seu CNPJ." });
      setSeedConfirm("");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      toast({ title: "Erro ao gerar dados", description: message, variant: "destructive" });
    } finally {
      setIsSeedingData(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Settings className="w-7 h-7 text-primary" />
              Configurações
            </h1>
            <p className="text-muted-foreground">
                {profile?.name} • {role === "administrador" ? "Administrador" : role === "atendente" ? "Atendente" : "Tosador"}
            </p>
          </div>
          <Button variant="outline" onClick={signOut} className="gap-2">
            <LogOut size={18} />
            Sair
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className="gap-2 whitespace-nowrap"
              >
                <Icon size={18} />
                {tab.label}
              </Button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="pet-card animate-pulse">
            <div className="h-64 bg-muted rounded-lg" />
          </div>
        ) : (
          <>
            {/* Store Info Tab */}
            {activeTab === "store" && (
              <div className="pet-card space-y-6 animate-fade-in">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Store size={20} />
                  Dados da Loja
                </h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Store size={14} />
                      Nome da Loja
                    </Label>
                    <Input
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Nome do pet shop"
                      className="h-12"
                      disabled={!isAdmin}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Phone size={14} />
                        Telefone
                      </Label>
                      <Input
                        value={storePhone}
                        onChange={(e) => setStorePhone(e.target.value)}
                        placeholder="(11) 1234-5678"
                        className="h-12"
                        disabled={!isAdmin}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Mail size={14} />
                        E-mail
                      </Label>
                      <Input
                        value={storeEmail}
                        onChange={(e) => setStoreEmail(e.target.value)}
                        placeholder="contato@petshop.com"
                        className="h-12"
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin size={14} />
                      Endereço
                    </Label>
                    <Input
                      value={storeAddress}
                      onChange={(e) => setStoreAddress(e.target.value)}
                      placeholder="Endereço completo"
                      className="h-12"
                      disabled={!isAdmin}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MessageCircle size={14} />
                        WhatsApp
                      </Label>
                      <Input
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="h-12"
                        disabled={!isAdmin}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Instagram size={14} />
                        Instagram
                      </Label>
                      <Input
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="@meupetshop"
                        className="h-12"
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Mensagens do WhatsApp (por status)</h3>
                    <p className="text-xs text-muted-foreground">
                      Use variáveis: <span className="font-mono">{'{tutor}'}</span>, <span className="font-mono">{'{pet}'}</span>, <span className="font-mono">{'{date}'}</span>, <span className="font-mono">{'{time}'}</span>, <span className="font-mono">{'{service}'}</span>.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Agendado</Label>
                        <Textarea
                          value={waMsgAgendado}
                          onChange={(e) => setWaMsgAgendado(e.target.value)}
                          className="min-h-[120px]"
                          disabled={!isAdmin}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Em atendimento</Label>
                        <Textarea
                          value={waMsgEmAtendimento}
                          onChange={(e) => setWaMsgEmAtendimento(e.target.value)}
                          className="min-h-[120px]"
                          disabled={!isAdmin}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Aguardando busca</Label>
                        <Textarea
                          value={waMsgAguardandoBusca}
                          onChange={(e) => setWaMsgAguardandoBusca(e.target.value)}
                          className="min-h-[120px]"
                          disabled={!isAdmin}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Finalizado</Label>
                        <Textarea
                          value={waMsgFinalizado}
                          onChange={(e) => setWaMsgFinalizado(e.target.value)}
                          className="min-h-[120px]"
                          disabled={!isAdmin}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Pago</Label>
                        <Textarea
                          value={waMsgPago}
                          onChange={(e) => setWaMsgPago(e.target.value)}
                          className="min-h-[120px]"
                          disabled={!isAdmin}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                    <Save size={18} />
                    {isSaving ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                )}
              </div>
            )}

            {/* Hours Tab */}
            {activeTab === "hours" && (
              <div className="pet-card space-y-6 animate-fade-in">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Clock size={20} />
                  Horário de Funcionamento
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Abertura</Label>
                    <Input
                      type="time"
                      value={openingTime}
                      onChange={(e) => setOpeningTime(e.target.value)}
                      className="h-12"
                      disabled={!isAdmin}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Fechamento</Label>
                    <Input
                      type="time"
                      value={closingTime}
                      onChange={(e) => setClosingTime(e.target.value)}
                      className="h-12"
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Dias de Funcionamento</Label>
                  <div className="flex flex-wrap gap-2">
                    {weekDays.map((day) => (
                      <button
                        key={day.id}
                        onClick={() => isAdmin && toggleWorkingDay(day.id)}
                        disabled={!isAdmin}
                        className={cn(
                          "w-12 h-12 rounded-xl font-medium transition-colors",
                          workingDays.includes(day.id)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                          !isAdmin && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                {isAdmin && (
                  <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                    <Save size={18} />
                    {isSaving ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                )}
              </div>
            )}

            {/* Printer Tab */}
            {activeTab === "printer" && (
              <div className="pet-card space-y-6 animate-fade-in">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Printer size={20} />
                  Impressora de Recibos
                </h2>

                <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div>
                    <p className="font-medium text-foreground">Habilitar Impressão</p>
                    <p className="text-sm text-muted-foreground">
                      Imprimir recibos automaticamente após vendas
                    </p>
                  </div>
                  <Switch
                    checked={printerEnabled}
                    onCheckedChange={setPrinterEnabled}
                    disabled={!isAdmin}
                  />
                </div>

                {printerEnabled && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tipo de Conexão</Label>
                      <Select 
                        value={printerType} 
                        onValueChange={setPrinterType}
                        disabled={!isAdmin}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bluetooth">Bluetooth</SelectItem>
                          <SelectItem value="usb">USB</SelectItem>
                          <SelectItem value="network">Rede (IP)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        {printerType === "network" ? "Endereço IP" : "Endereço do Dispositivo"}
                      </Label>
                      <Input
                        value={printerAddress}
                        onChange={(e) => setPrinterAddress(e.target.value)}
                        placeholder={
                          printerType === "network" 
                            ? "192.168.1.100:9100" 
                            : "Nome do dispositivo"
                        }
                        className="h-12"
                        disabled={!isAdmin}
                      />
                    </div>

                    <Button variant="outline" className="gap-2">
                      <Printer size={18} />
                      Testar Impressão
                    </Button>
                  </div>
                )}

                {isAdmin && (
                  <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                    <Save size={18} />
                    {isSaving ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                )}
              </div>
            )}

            {/* Features Tab */}
            {activeTab === "features" && (
              <div className="pet-card space-y-6 animate-fade-in">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Settings size={20} />
                  Recursos do Sistema
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                    <div>
                      <p className="font-medium text-foreground">Planos para Clientes</p>
                      <p className="text-sm text-muted-foreground">
                        Permite associar planos mensais aos clientes com controle de vencimento e pagamento
                      </p>
                    </div>
                    <Switch
                      checked={plansEnabled}
                      onCheckedChange={setPlansEnabled}
                      disabled={!isAdmin}
                    />
                  </div>

                  {role === "medico" && (
                    <div className="p-4 bg-muted rounded-xl space-y-3">
                      <div>
                        <p className="font-medium text-foreground">Assinatura do PDF</p>
                        <p className="text-sm text-muted-foreground">
                          Configure seu CRMV para preencher automaticamente nas consultas (você pode editar ao gerar o PDF).
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>CRMV</Label>
                        <Input
                          value={crmv}
                          onChange={(e) => setCrmv(e.target.value)}
                          placeholder="Ex: CRMV-SP 12345"
                          className="h-12"
                        />
                      </div>

                      <Button
                        variant="outline"
                        onClick={handleSaveCrmv}
                        disabled={isSavingCrmv}
                        className="w-fit"
                      >
                        {isSavingCrmv ? "Salvando..." : "Salvar CRMV"}
                      </Button>
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                    <Save size={18} />
                    {isSaving ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                )}
              </div>
            )}

            {/* Offices Tab (Admin only) */}
            {activeTab === "assinatura" && isAdmin && <SubscriptionTab />}

            {/* Offices Tab (Admin only) */}
            {activeTab === "offices" && isAdmin && <MedicalOfficesTab />}

            {/* Users Tab (Admin only) */}
            {activeTab === "users" && isAdmin && (
              <div className="pet-card space-y-6 animate-fade-in">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <Users size={20} />
                    Usuários e Permissões
                  </h2>

                  <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus size={18} />
                        Criar usuário
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Criar usuário</DialogTitle>
                        <DialogDescription>
                          Este usuário ficará vinculado ao CNPJ da sua empresa e só conseguirá entrar com o mesmo CNPJ.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="newUserName">Nome do usuário</Label>
                          <Input
                            id="newUserName"
                            value={newUserName}
                            onChange={(e) => setNewUserName(e.target.value)}
                            placeholder="Ex: Maria Silva"
                            className="h-12"
                            autoComplete="name"
                            maxLength={80}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="newUserEmail">E-mail</Label>
                          <Input
                            id="newUserEmail"
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            placeholder="usuario@empresa.com"
                            className="h-12"
                            autoComplete="email"
                            maxLength={255}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="newUserPassword">Senha</Label>
                          <Input
                            id="newUserPassword"
                            type="password"
                            value={newUserPassword}
                            onChange={(e) => setNewUserPassword(e.target.value)}
                            placeholder="Crie uma senha"
                            className="h-12"
                            autoComplete="new-password"
                            maxLength={72}
                          />
                          <p className="text-sm text-muted-foreground">Mínimo de 6 caracteres.</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Permissão</Label>
                          <Select value={newUserRole} onValueChange={(v: any) => setNewUserRole(v)}>
                            <SelectTrigger className="h-12">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="administrador">Administrador</SelectItem>
                              <SelectItem value="atendente">Atendente</SelectItem>
                              <SelectItem value="tosador">Tosador</SelectItem>
                              <SelectItem value="medico">Médico</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setCreateOpen(false)}
                          disabled={isCreatingUser}
                        >
                          Cancelar
                        </Button>
                        <Button onClick={handleCreateUser} disabled={isCreatingUser} className="gap-2">
                          <Plus size={18} />
                          {isCreatingUser ? "Criando..." : "Criar"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-3">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center">
                          <Shield className="w-5 h-5 text-secondary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{user.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditUser(user)}
                        className="gap-2"
                      >
                        <Pencil size={16} />
                        Editar
                      </Button>
                    </div>
                  ))}
                </div>

                <Dialog open={editOpen} onOpenChange={(open) => {
                  setEditOpen(open);
                  if (!open) setEditingUser(null);
                }}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar usuário</DialogTitle>
                      <DialogDescription>
                        Atualize o nome e a permissão do usuário.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="editUserName">Nome do usuário</Label>
                        <Input
                          id="editUserName"
                          value={editUserName}
                          onChange={(e) => setEditUserName(e.target.value)}
                          className="h-12"
                          maxLength={80}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Permissão</Label>
                        <Select value={editUserRole} onValueChange={(v: any) => setEditUserRole(v)}>
                          <SelectTrigger className="h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="administrador">Administrador</SelectItem>
                            <SelectItem value="atendente">Atendente</SelectItem>
                            <SelectItem value="tosador">Tosador</SelectItem>
                            <SelectItem value="medico">Médico</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setEditOpen(false)}
                        disabled={isUpdatingUser}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={handleUpdateUser} disabled={isUpdatingUser}>
                        {isUpdatingUser ? "Salvando..." : "Salvar"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="p-4 bg-accent rounded-xl">
                  <h3 className="font-medium text-foreground mb-2">Sobre as Permissões</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li><strong>Administrador:</strong> Acesso total ao sistema</li>
                    <li><strong>Atendente:</strong> Agenda, clientes, vendas e relatórios</li>
                    <li><strong>Tosador:</strong> Visualizar agenda e atualizar status</li>
                    <li><strong>Médico:</strong> Agenda e Consulta Médica</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Data Tab (Admin only) */}
            {activeTab === "data" && isAdmin && (
              <div className="pet-card space-y-6 animate-fade-in">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Database size={20} />
                  Dados
                </h2>

                <div className="p-4 bg-muted rounded-xl space-y-3">
                  <div>
                    <p className="font-medium text-foreground">Apagar dados do CNPJ</p>
                    <p className="text-sm text-muted-foreground">
                      Remove todos os dados vinculados ao CNPJ da sua empresa: clientes (tutores), pets, agendamentos,
                      vendas/itens e histórico de caixa, além de consultas médicas.
                    </p>
                  </div>

                  {!profile?.cnpj ? (
                    <p className="text-sm text-muted-foreground">
                      Seu usuário não possui CNPJ vinculado — não é possível apagar dados por empresa.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="resetConfirm">Digite APAGAR para confirmar</Label>
                        <Input
                          id="resetConfirm"
                          value={resetConfirm}
                          onChange={(e) => setResetConfirm(e.target.value)}
                          placeholder="APAGAR"
                          className="h-12"
                          maxLength={20}
                        />
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            disabled={!isResetAllowed || isResettingData || resetConfirm.trim() !== "APAGAR"}
                          >
                            {isResettingData ? "Apagando..." : "Apagar todos os dados do CNPJ"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Apagar dados da empresa?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação é irreversível e remove os dados do ambiente atual (teste/produção) vinculados ao
                              CNPJ {profile.cnpj}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleResetCompanyData}>Confirmar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-muted rounded-xl space-y-3">
                  <div>
                    <p className="font-medium text-foreground">Dados fictícios (sem botão na interface)</p>
                    <p className="text-sm text-muted-foreground">
                      Gere clientes/pets/agendamentos/vendas de exemplo para testar o sistema. Este botão aparece apenas
                      no ambiente de preview.
                    </p>
                  </div>

                  {isPreviewEnv ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="seedConfirm">Digite GERAR para confirmar</Label>
                        <Input
                          id="seedConfirm"
                          value={seedConfirm}
                          onChange={(e) => setSeedConfirm(e.target.value)}
                          placeholder="GERAR"
                          className="h-12"
                          maxLength={20}
                        />
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={!isAdmin || isSeedingData || seedConfirm.trim() !== "GERAR"}
                          >
                            {isSeedingData ? "Gerando..." : "Criar dados fictícios"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Criar dados fictícios?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Isso vai inserir dados de exemplo no ambiente atual para o CNPJ {profile?.cnpj}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleSeedDemoData}>Confirmar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Disponível apenas no ambiente de preview.</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
