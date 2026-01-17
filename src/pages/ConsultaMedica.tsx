import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Stethoscope } from "lucide-react";

type MedicalOffice = {
  id: string;
  name: string;
};

export default function ConsultaMedica() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [offices, setOffices] = useState<MedicalOffice[]>([]);
  const [officeId, setOfficeId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const selectedOffice = useMemo(
    () => offices.find((o) => o.id === officeId) ?? null,
    [offices, officeId]
  );

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("medical_offices")
        .select("id,name")
        .eq("is_active", true)
        .order("name");

      if (!mounted) return;

      if (error) {
        console.error("Error loading medical offices:", error);
        toast({
          title: "Erro ao carregar consultórios",
          variant: "destructive",
        });
        return;
      }

      setOffices((data ?? []) as MedicalOffice[]);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const handleStart = async () => {
    if (!user) return;

    if (!officeId) {
      toast({
        title: "Selecione um consultório",
        description: "Escolha o consultório antes de iniciar o atendimento.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from("medical_consultations").insert({
        office_id: officeId,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Atendimento iniciado",
        description: selectedOffice
          ? `Consultório: ${selectedOffice.name}`
          : "Atendimento iniciado com sucesso.",
      });
    } catch (e) {
      console.error("Error starting consultation:", e);
      toast({
        title: "Não foi possível iniciar",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Stethoscope className="w-7 h-7 text-primary" />
              Consulta Médica
            </h1>
            <p className="text-muted-foreground mt-1">
              Selecione o consultório e inicie o atendimento.
            </p>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Iniciar atendimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Consultório
              </label>
              <Select value={officeId} onValueChange={setOfficeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um consultório" />
                </SelectTrigger>
                <SelectContent>
                  {offices.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleStart} disabled={isLoading || !user}>
              {isLoading ? "Iniciando..." : "Iniciar Atendimento"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
