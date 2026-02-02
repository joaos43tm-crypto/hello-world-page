import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Copy,
  Key,
  Plus,
  Shield,
  Database,
  Trash2,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface RegistrationCode {
  id: string;
  code: string;
  cnpj: string;
  company_name: string;
  is_used: boolean;
  used_at: string | null;
  created_at: string;
}

type AdminCodesResponse = { codes?: RegistrationCode[]; error?: string };

type AdminCodesAction =
  | { action: "list" }
  | { action: "create"; code: string; cnpj: string; company_name: string }
  | { action: "delete"; code: string };

type SeedResponse = {
  success: boolean;
  tutor?: { id: string; name: string };
  pet?: { id: string; name: string };
  service?: { id: string; name: string };
  professional?: { id: string; name: string };
  appointment?: { id: string; scheduled_date: string; scheduled_time: string };
  error?: string;
};

export default function Admin() {
  const { toast } = useToast();
  const { isAdmin, isLoading } = useAuth();

  const [isBusy, setIsBusy] = useState(false);
  const [codes, setCodes] = useState<RegistrationCode[]>([]);

  // Form state
  const [newCode, setNewCode] = useState("");
  const [newCnpj, setNewCnpj] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");

  const canUse = useMemo(() => !isLoading && isAdmin, [isLoading, isAdmin]);

  const invoke = async (body: AdminCodesAction) => {
    const response = await supabase.functions.invoke<AdminCodesResponse>("admin-codes", { body });
    if (response.error) throw new Error(response.error.message);
    if (response.data?.error) throw new Error(response.data.error);
    return response.data;
  };

  const fetchCodes = async () => {
    if (!canUse) return;
    const data = await invoke({ action: "list" });
    setCodes(data?.codes || []);
  };

  useEffect(() => {
    void fetchCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUse]);

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(code);
  };

  const handleCreateCode = async () => {
    if (!newCode || !newCnpj || !newCompanyName) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    setIsBusy(true);
    try {
      await invoke({
        action: "create",
        code: newCode,
        cnpj: newCnpj,
        company_name: newCompanyName,
      });

      toast({ title: "Código criado com sucesso!" });
      setNewCode("");
      setNewCnpj("");
      setNewCompanyName("");
      await fetchCodes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteCode = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este código?")) return;

    setIsBusy(true);
    try {
      await invoke({ action: "delete", code: id });
      toast({ title: "Código excluído!" });
      await fetchCodes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  const handleSeedData = async () => {
    setIsBusy(true);
    try {
      const res = await supabase.functions.invoke<SeedResponse>("seed-test-data", { body: {} });
      if (res.error) throw new Error(res.error.message);
      if (!res.data?.success) throw new Error(res.data?.error || "Falha ao criar dados de teste");

      toast({
        title: "Dados de teste criados!",
        description: `Cliente: ${res.data.tutor?.name} • Pet: ${res.data.pet?.name} • Agendamento: ${res.data.appointment?.scheduled_date} ${res.data.appointment?.scheduled_time}`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao criar dados seed",
        description: error?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Shield className="w-10 h-10 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Carregando…</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-10 h-10 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Acesso negado</CardTitle>
            <p className="text-muted-foreground">Somente administradores.</p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <Shield className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel Admin</h1>
            <p className="text-muted-foreground">Gerenciar códigos de cadastro de empresas</p>
          </div>
        </div>

        {/* Create Code Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus size={20} />
              Criar Novo Código
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="code" className="flex items-center gap-2">
                  <Key size={14} />
                  Código
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="ABCD1234"
                    className="uppercase"
                  />
                  <Button variant="outline" onClick={generateCode} title="Gerar código" type="button">
                    <Key size={16} />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={newCnpj}
                  onChange={(e) => setNewCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName" className="flex items-center gap-2">
                  <Building2 size={14} />
                  Razão Social
                </Label>
                <Input
                  id="companyName"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Nome da Empresa LTDA"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleCreateCode}
                disabled={isBusy || !newCode || !newCnpj || !newCompanyName}
                className="gap-2"
              >
                <Plus size={16} />
                Criar Código
              </Button>

              <Button variant="outline" onClick={fetchCodes} disabled={isBusy}>
                Atualizar lista
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Seed data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database size={20} />
              Dados de teste (seed)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cria automaticamente um cliente/tutor, um pet, um serviço, um profissional e um agendamento
              para facilitar testes repetíveis (ambiente de Teste).
            </p>
            <Button onClick={() => void handleSeedData()} disabled={isBusy} className="gap-2">
              <Database size={16} />
              Criar dados de teste
            </Button>
          </CardContent>
        </Card>

        {/* Codes List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 size={20} />
              Códigos Cadastrados ({codes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {codes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum código cadastrado ainda.</p>
            ) : (
              <div className="space-y-3">
                {codes.map((code) => (
                  <div
                    key={code.id}
                    className={`p-4 rounded-xl border ${
                      code.is_used ? "bg-muted/50 border-muted" : "bg-card border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-lg">{code.code}</span>
                          <Button variant="ghost" size="sm" onClick={() => void copyToClipboard(code.code)}>
                            <Copy size={14} />
                          </Button>
                          {code.is_used ? (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                              <CheckCircle2 size={12} />
                              Usado
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                              <XCircle size={12} />
                              Disponível
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium">{code.company_name}</p>
                        <p className="text-xs text-muted-foreground">CNPJ: {code.cnpj}</p>
                        <p className="text-xs text-muted-foreground">
                          Criado em: {new Date(code.created_at).toLocaleDateString("pt-BR")}
                          {code.used_at &&
                            ` • Usado em: ${new Date(code.used_at).toLocaleDateString("pt-BR")}`}
                        </p>
                      </div>

                      {!code.is_used && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDeleteCode(code.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
