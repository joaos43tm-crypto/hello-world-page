import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Shield, 
  Plus, 
  Trash2, 
  Copy, 
  Building2, 
  FileText, 
  Key,
  Lock,
  LogIn,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RegistrationCode {
  id: string;
  code: string;
  cnpj: string;
  company_name: string;
  is_used: boolean;
  used_at: string | null;
  created_at: string;
}

export default function Admin() {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [storedPassword, setStoredPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [codes, setCodes] = useState<RegistrationCode[]>([]);
  
  // Form state
  const [newCode, setNewCode] = useState("");
  const [newCnpj, setNewCnpj] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('admin-codes', {
        body: { action: 'list', password }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.error) {
        toast({
          title: "Erro",
          description: response.data.error,
          variant: "destructive",
        });
        return;
      }

      setStoredPassword(password);
      setIsAuthenticated(true);
      setCodes(response.data.codes || []);
      toast({ title: "Acesso autorizado! 🔓" });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Senha incorreta",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCodes = async () => {
    try {
      const response = await supabase.functions.invoke('admin-codes', {
        body: { action: 'list', password: storedPassword }
      });

      if (response.data?.codes) {
        setCodes(response.data.codes);
      }
    } catch (error) {
      console.error('Error fetching codes:', error);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
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

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('admin-codes', {
        body: { 
          action: 'create', 
          password: storedPassword,
          code: newCode,
          cnpj: newCnpj,
          company_name: newCompanyName
        }
      });

      if (response.data?.error) {
        toast({
          title: "Erro",
          description: response.data.error,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Código criado com sucesso! ✅" });
      setNewCode("");
      setNewCnpj("");
      setNewCompanyName("");
      fetchCodes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCode = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este código?")) return;

    try {
      const response = await supabase.functions.invoke('admin-codes', {
        body: { 
          action: 'delete', 
          password: storedPassword,
          code: id
        }
      });

      if (response.data?.error) {
        toast({
          title: "Erro",
          description: response.data.error,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Código excluído!" });
      fetchCodes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado! 📋" });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-10 h-10 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Painel Admin</CardTitle>
            <p className="text-muted-foreground">Gerenciamento de códigos de cadastro</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock size={16} />
                Senha do Admin
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha"
                className="h-12"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button 
              onClick={handleLogin} 
              disabled={isLoading || !password}
              className="w-full h-12 gap-2"
            >
              <LogIn size={18} />
              {isLoading ? "Verificando..." : "Acessar"}
            </Button>
          </CardContent>
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
                  <Button variant="outline" onClick={generateCode} title="Gerar código">
                    <Key size={16} />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj" className="flex items-center gap-2">
                  <FileText size={14} />
                  CNPJ
                </Label>
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

            <Button 
              onClick={handleCreateCode} 
              disabled={isLoading || !newCode || !newCnpj || !newCompanyName}
              className="gap-2"
            >
              <Plus size={16} />
              Criar Código
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
              <p className="text-muted-foreground text-center py-8">
                Nenhum código cadastrado ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {codes.map((code) => (
                  <div 
                    key={code.id} 
                    className={`p-4 rounded-xl border ${
                      code.is_used 
                        ? 'bg-muted/50 border-muted' 
                        : 'bg-card border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-lg">{code.code}</span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(code.code)}
                          >
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
                          Criado em: {new Date(code.created_at).toLocaleDateString('pt-BR')}
                          {code.used_at && ` • Usado em: ${new Date(code.used_at).toLocaleDateString('pt-BR')}`}
                        </p>
                      </div>
                      {!code.is_used && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteCode(code.id)}
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