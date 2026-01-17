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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Stethoscope } from "lucide-react";

type MedicalOffice = {
  id: string;
  name: string;
};

type Consultation = {
  id: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  office_id: string;
  office?: { name: string } | null;
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function ConsultaMedica() {
  const { toast } = useToast();
  const { user } = useAuth();

  // Our generated DB types may lag behind newly created tables.
  // Use a narrow escape hatch for the new medical_* tables.
  const db = supabase as any;

  const [offices, setOffices] = useState<MedicalOffice[]>([]);
  const [officeId, setOfficeId] = useState<string>("");

  const [current, setCurrent] = useState<Consultation | null>(null);
  const [history, setHistory] = useState<Consultation[]>([]);

  const [notesDraft, setNotesDraft] = useState<string>("");

  const [isStarting, setIsStarting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const selectedOffice = useMemo(
    () => offices.find((o) => o.id === officeId) ?? null,
    [offices, officeId]
  );

  const loadOffices = async () => {
    const { data, error } = await db
      .from("medical_offices")
      .select("id,name")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error loading medical offices:", error);
      toast({ title: "Erro ao carregar consultórios", variant: "destructive" });
      return;
    }

    setOffices((data ?? []) as MedicalOffice[]);
  };

  const loadConsultations = async () => {
    if (!user) return;

    const { data: currentData, error: currentError } = await db
      .from("medical_consultations")
      .select("id,started_at,ended_at,notes,office_id,office:medical_offices(name)")
      .eq("created_by", user.id)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1);

    if (currentError) {
      console.error("Error loading current consultation:", currentError);
      toast({ title: "Erro ao carregar atendimento", variant: "destructive" });
      return;
    }

    const nextCurrent = (currentData?.[0] as Consultation | undefined) ?? null;
    setCurrent(nextCurrent);
    setNotesDraft(nextCurrent?.notes ?? "");

    const { data: historyData, error: historyError } = await db
      .from("medical_consultations")
      .select("id,started_at,ended_at,notes,office_id,office:medical_offices(name)")
      .eq("created_by", user.id)
      .order("started_at", { ascending: false })
      .limit(20);

    if (historyError) {
      console.error("Error loading consultations history:", historyError);
      toast({ title: "Erro ao carregar histórico", variant: "destructive" });
      return;
    }

    setHistory((historyData ?? []) as Consultation[]);
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      await loadOffices();
      if (mounted) await loadConsultations();
    };

    load();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleStart = async () => {
    if (!user) return;

    if (current) {
      toast({
        title: "Já existe um atendimento em andamento",
        description: "Finalize o atendimento atual para iniciar outro.",
        variant: "destructive",
      });
      return;
    }

    if (!officeId) {
      toast({
        title: "Selecione um consultório",
        description: "Escolha o consultório antes de iniciar o atendimento.",
        variant: "destructive",
      });
      return;
    }

    setIsStarting(true);
    try {
      const { error } = await db.from("medical_consultations").insert({
        office_id: officeId,
        created_by: user.id,
        notes: "",
      });

      if (error) throw error;

      toast({
        title: "Atendimento iniciado",
        description: selectedOffice
          ? `Consultório: ${selectedOffice.name}`
          : "Atendimento iniciado com sucesso.",
      });

      await loadConsultations();
    } catch (e) {
      console.error("Error starting consultation:", e);
      toast({
        title: "Não foi possível iniciar",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!current) return;

    const notes = notesDraft.trim();
    if (notes.length > 5000) {
      toast({
        title: "Anotações muito longas",
        description: "Limite de 5000 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await db
        .from("medical_consultations")
        .update({ notes })
        .eq("id", current.id);

      if (error) throw error;

      toast({ title: "Anotações salvas" });
      await loadConsultations();
    } catch (e) {
      console.error("Error saving notes:", e);
      toast({
        title: "Erro ao salvar anotações",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!current) return;

    const notes = notesDraft.trim();
    if (notes.length > 5000) {
      toast({
        title: "Anotações muito longas",
        description: "Limite de 5000 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsFinalizing(true);
    try {
      const { error } = await db
        .from("medical_consultations")
        .update({ ended_at: new Date().toISOString(), notes })
        .eq("id", current.id);

      if (error) throw error;

      toast({ title: "Atendimento finalizado" });
      await loadConsultations();
    } catch (e) {
      console.error("Error finalizing consultation:", e);
      toast({
        title: "Erro ao finalizar",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsFinalizing(false);
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
              Inicie um atendimento, registre as anotações e finalize ao término.
            </p>
          </div>
        </header>

        {current && (
          <Card>
            <CardHeader>
              <CardTitle>Atendimento em andamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Consultório:</span>{" "}
                  {current.office?.name ?? "—"}
                </p>
                <p>
                  <span className="font-medium text-foreground">Início:</span>{" "}
                  {formatDateTime(current.started_at)}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Anotações</label>
                <Textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Escreva as anotações do atendimento..."
                  maxLength={5000}
                />
                <div className="text-xs text-muted-foreground">
                  {notesDraft.length}/5000
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={handleSaveNotes}
                  disabled={isSaving || isFinalizing}
                >
                  {isSaving ? "Salvando..." : "Salvar anotações"}
                </Button>
                <Button onClick={handleFinalize} disabled={isSaving || isFinalizing}>
                  {isFinalizing ? "Finalizando..." : "Finalizar atendimento"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Iniciar atendimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Consultório</label>
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

            <Button onClick={handleStart} disabled={isStarting || !user || !!current}>
              {current
                ? "Finalize o atendimento atual"
                : isStarting
                  ? "Iniciando..."
                  : "Iniciar Atendimento"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma consulta registrada ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {history.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl bg-muted/50 border border-border"
                  >
                    <p className="font-medium text-foreground">
                      {c.office?.name ?? "Consultório"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Início: {formatDateTime(c.started_at)}
                      {c.ended_at
                        ? ` • Fim: ${formatDateTime(c.ended_at)}`
                        : " • Em andamento"}
                    </p>

                    {c.notes ? (
                      <p className="text-sm text-foreground mt-3 whitespace-pre-wrap">
                        {c.notes}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-3">
                        Sem anotações.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
