import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { generateConsultationPdf } from "@/lib/medical/consultationPdf";
import { isoDateInTimeZone } from "@/lib/date";
import { FileDown, Stethoscope } from "lucide-react";

type MedicalOffice = {
  id: string;
  name: string;
};

type TodayAppointment = {
  id: string;
  pet_id: string;
  service_id?: string;
  scheduled_time: string;
  status: string | null;
  petName?: string;
  tutorName?: string;
};

type Consultation = {
  id: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  office_id: string;
  office?: { name: string } | null;
  appointment_id?: string | null;
  pet_id?: string | null;
};

type ConsultationFields = {
  queixa: string;
  exame: string;
  diagnostico: string;
  conduta: string;
  prescricao: string;
  observacoes: string;
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const todayISODate = () => isoDateInTimeZone(new Date(), "America/Sao_Paulo");

const emptyFields = (): ConsultationFields => ({
  queixa: "",
  exame: "",
  diagnostico: "",
  conduta: "",
  prescricao: "",
  observacoes: "",
});

function parseStructuredNotes(raw: string | null | undefined): ConsultationFields {
  const text = (raw ?? "").replace(/\r\n/g, "\n").trim();
  if (!text) return emptyFields();

  const next = emptyFields();
  const lines = text.split("\n");

  const headerToKey = (h: string): keyof ConsultationFields | null => {
    const normalized = h
      .trim()
      .toUpperCase()
      .replace(/:$/, "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");

    if (normalized === "QUEIXA") return "queixa";
    if (normalized === "EXAME") return "exame";
    if (normalized === "DIAGNOSTICO") return "diagnostico";
    if (normalized === "CONDUTA") return "conduta";
    if (normalized === "PRESCRICAO" || normalized === "PRESCRICAO")
      return "prescricao";
    if (normalized === "OBSERVACOES" || normalized === "OBSERVACAO")
      return "observacoes";
    return null;
  };

  let currentKey: keyof ConsultationFields | null = null;
  let foundAnyHeader = false;

  for (const line of lines) {
    const match = line.match(
      /^\s*(QUEIXA|EXAME|DIAGN[ÓO]STICO|CONDUTA|PRESCRI[CÇ][AÃ]O|OBSERVA[CÇ][AÃ]O(?:ES)?):\s*$/i
    );

    if (match) {
      currentKey = headerToKey(match[1]);
      foundAnyHeader = true;
      continue;
    }

    if (!currentKey) continue;
    next[currentKey] += (next[currentKey] ? "\n" : "") + line;
  }

  // Se não tiver cabeçalhos, joga tudo em observações para não perder conteúdo antigo.
  if (!foundAnyHeader) {
    return { ...emptyFields(), observacoes: text };
  }

  return {
    queixa: next.queixa.trim(),
    exame: next.exame.trim(),
    diagnostico: next.diagnostico.trim(),
    conduta: next.conduta.trim(),
    prescricao: next.prescricao.trim(),
    observacoes: next.observacoes.trim(),
  };
}

function buildStructuredNotes(fields: ConsultationFields): string {
  const blocks: Array<{ title: string; content: string }> = [
    { title: "QUEIXA:", content: fields.queixa.trim() },
    { title: "EXAME:", content: fields.exame.trim() },
    { title: "DIAGNÓSTICO:", content: fields.diagnostico.trim() },
    { title: "CONDUTA:", content: fields.conduta.trim() },
    { title: "PRESCRIÇÃO:", content: fields.prescricao.trim() },
    { title: "OBSERVAÇÕES:", content: fields.observacoes.trim() },
  ].filter((b) => b.content.length > 0);

  return blocks.map((b) => `${b.title}\n${b.content}`).join("\n\n");
}

export default function ConsultaMedica() {
  const { toast } = useToast();
  const { user, profile, role } = useAuth();

  // Our generated DB types may lag behind newly created tables.
  const db = supabase as any;

  const [offices, setOffices] = useState<MedicalOffice[]>([]);
  const [officeId, setOfficeId] = useState<string>("");

  const [queryDate, setQueryDate] = useState<string>(todayISODate());

  const [appointments, setAppointments] = useState<TodayAppointment[]>([]);
  const [appointmentId, setAppointmentId] = useState<string>("");
  const [medicalServiceIds, setMedicalServiceIds] = useState<string[]>([]);
  const [medicalServicesLoaded, setMedicalServicesLoaded] = useState(false);

  const [current, setCurrent] = useState<Consultation | null>(null);

  const [fields, setFields] = useState<ConsultationFields>(emptyFields());

  const composedNotes = useMemo(() => buildStructuredNotes(fields), [fields]);

  const [pdfCrmv, setPdfCrmv] = useState<string>("");
  const [pdfIncludeCrmv, setPdfIncludeCrmv] = useState<boolean>(false);

  const [contextPetName, setContextPetName] = useState<string>("");
  const [contextTutorName, setContextTutorName] = useState<string>("");

  const [isStarting, setIsStarting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const selectedOffice = useMemo(
    () => offices.find((o) => o.id === officeId) ?? null,
    [offices, officeId]
  );

  const selectedAppointment = useMemo(
    () => appointments.find((a) => a.id === appointmentId) ?? null,
    [appointments, appointmentId]
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

  const loadMedicalServices = async (): Promise<string[]> => {
    const { data, error } = await supabase
      .from("services")
      .select("id,name")
      .eq("is_active", true)
      .ilike("name", "%consulta%")
      .order("name");

    if (error) {
      console.error("Error loading medical services:", error);
      setMedicalServicesLoaded(true);
      setMedicalServiceIds([]);
      return [];
    }

    const ids = (data ?? []).map((s: any) => s.id as string);
    setMedicalServiceIds(ids);
    setMedicalServicesLoaded(true);
    return ids;
  };

  const loadTodayAppointments = async (serviceIds: string[], date: string) => {
    if (serviceIds.length === 0) {
      setAppointments([]);
      return;
    }

    const { data: appts, error: apptsError } = await supabase
      .from("appointments")
      .select("id,pet_id,scheduled_time,status,service_id")
      .eq("scheduled_date", date)
      .eq("status", "agendado")
      .in("service_id", serviceIds)
      .order("scheduled_time", { ascending: true });

    if (apptsError) {
      console.error("Error loading today appointments:", apptsError);
      toast({ title: "Erro ao carregar agendamentos", variant: "destructive" });
      return;
    }

    const base = (appts ?? []) as TodayAppointment[];
    const petIds = Array.from(new Set(base.map((a) => a.pet_id).filter(Boolean)));

    if (petIds.length === 0) {
      setAppointments([]);
      return;
    }

    const { data: pets, error: petsError } = await supabase
      .from("pets")
      .select("id,name,tutor_id")
      .in("id", petIds);

    if (petsError) {
      console.error("Error loading pets for appointments:", petsError);
      setAppointments(base);
      return;
    }

    const petsById = new Map<
      string,
      { id: string; name: string; tutor_id: string }
    >();
    const tutorIds: string[] = [];
    for (const p of (pets ?? []) as any[]) {
      petsById.set(p.id, p);
      if (p.tutor_id) tutorIds.push(p.tutor_id);
    }

    const uniqueTutorIds = Array.from(new Set(tutorIds));
    let tutorsById = new Map<string, { id: string; name: string }>();

    if (uniqueTutorIds.length > 0) {
      const { data: tutors, error: tutorsError } = await supabase
        .from("tutors")
        .select("id,name")
        .in("id", uniqueTutorIds);

      if (!tutorsError) {
        tutorsById = new Map((tutors ?? []).map((t: any) => [t.id, t]));
      }
    }

    const enriched = base.map((a) => {
      const pet = petsById.get(a.pet_id);
      const tutor = pet?.tutor_id ? tutorsById.get(pet.tutor_id) : undefined;
      return {
        ...a,
        petName: pet?.name,
        tutorName: tutor?.name,
      };
    });

    setAppointments(enriched);
  };

  const loadCurrentConsultation = async () => {
    if (!user) return;

    const { data: currentData, error: currentError } = await db
      .from("medical_consultations")
      .select(
        "id,started_at,ended_at,notes,office_id,office:medical_offices(name),appointment_id,pet_id"
      )
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
    setFields(parseStructuredNotes(nextCurrent?.notes ?? ""));

    // Load context (pet/tutor name)
    if (nextCurrent?.pet_id) {
      const { data: pet, error: petError } = await supabase
        .from("pets")
        .select("id,name,tutor_id")
        .eq("id", nextCurrent.pet_id)
        .maybeSingle();

      if (!petError && pet) {
        setContextPetName((pet as any).name ?? "");

        const tutorId = (pet as any).tutor_id;
        if (tutorId) {
          const { data: tutor } = await supabase
            .from("tutors")
            .select("id,name")
            .eq("id", tutorId)
            .maybeSingle();
          setContextTutorName((tutor as any)?.name ?? "");
        }
      }
    } else {
      setContextPetName("");
      setContextTutorName("");
    }
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      await loadOffices();
      const ids = await loadMedicalServices();
      await loadTodayAppointments(ids, queryDate);
      if (mounted) await loadCurrentConsultation();
    };

    load();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, queryDate]);

  useEffect(() => {
    if (!selectedAppointment) {
      setContextPetName("");
      setContextTutorName("");
      return;
    }
    setContextPetName(selectedAppointment.petName ?? "");
    setContextTutorName(selectedAppointment.tutorName ?? "");
  }, [selectedAppointment]);

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

    if (!appointmentId || !selectedAppointment) {
      toast({
        title: "Selecione um agendamento",
        description: "Escolha o cliente/pet agendado para hoje.",
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
        appointment_id: selectedAppointment.id,
        pet_id: selectedAppointment.pet_id,
        notes: "",
      });

      if (error) throw error;

      toast({
        title: "Atendimento iniciado",
        description: selectedOffice
          ? `Consultório: ${selectedOffice.name}`
          : "Atendimento iniciado com sucesso.",
      });

      await loadCurrentConsultation();
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

    const notes = composedNotes.trim();
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
      await loadCurrentConsultation();
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

    const notes = composedNotes.trim();
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
      await loadCurrentConsultation();
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

  const handleGeneratePdf = async () => {
    if (!current || !current.pet_id) {
      toast({
        title: "Sem atendimento ativo",
        description: "Inicie um atendimento para gerar o PDF.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const [{ data: settings }, { data: pet, error: petError }] =
        await Promise.all([
          supabase
            .from("store_settings")
            .select("store_name,phone,email,address")
            .limit(1)
            .maybeSingle(),
          supabase
            .from("pets")
            .select("id,name,breed,allergies,tutor:tutors(name,phone,email)")
            .eq("id", current.pet_id)
            .maybeSingle(),
        ]);

      if (petError || !pet) throw petError ?? new Error("Pet não encontrado");

      const tutor = (pet as any).tutor;
      if (!tutor?.name) throw new Error("Tutor não encontrado");

      const pdfSections = [
        { title: "Queixa", content: fields.queixa },
        { title: "Exame", content: fields.exame },
        { title: "Diagnóstico", content: fields.diagnostico },
        { title: "Conduta", content: fields.conduta },
        { title: "Prescrição", content: fields.prescricao },
        { title: "Observações", content: fields.observacoes },
      ].filter((s) => (s.content ?? "").trim().length > 0);

      const blob = await generateConsultationPdf({
        store: settings ?? {},
        tutor: {
          name: tutor.name,
          phone: tutor.phone,
          email: tutor.email,
        },
        pet: {
          name: (pet as any).name,
          breed: (pet as any).breed,
          allergies: (pet as any).allergies,
        },
        consultation: {
          started_at: current.started_at,
          ended_at: current.ended_at,
          office_name: current.office?.name ?? null,
          notes: composedNotes,
          sections: pdfSections,
        },
        professional: {
          name: profile?.name ?? null,
          title:
            role === "medico"
              ? "MÉDICO VETERINÁRIO"
              : role
                ? role.toUpperCase()
                : null,
          crmv: pdfCrmv.trim() || null,
        },
        options: {
          // 1 página apenas: sem capa
          includeCoverPage: false,
          includeCrmv: pdfIncludeCrmv,
        },
      });

      const safeTutor = String(tutor.name)
        .replace(/[^a-zA-Z0-9-_ ]/g, "")
        .trim();
      const safePet = String((pet as any).name)
        .replace(/[^a-zA-Z0-9-_ ]/g, "")
        .trim();
      const filename = `atendimento_${safeTutor || "cliente"}_${safePet || "pet"}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast({ title: "PDF gerado" });
    } catch (e) {
      console.error("Error generating PDF:", e);
      toast({
        title: "Erro ao gerar PDF",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
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
              Selecione o cliente/pet agendado para hoje e inicie o atendimento.
            </p>
          </div>
        </header>

        {current && (
          <Card>
            <CardHeader>
              <CardTitle>Atendimento em andamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium text-foreground">Cliente:</span>{" "}
                  {contextTutorName || "—"}
                </p>
                <p>
                  <span className="font-medium text-foreground">Pet:</span>{" "}
                  {contextPetName || "—"}
                </p>
                <p>
                  <span className="font-medium text-foreground">Consultório:</span>{" "}
                  {current.office?.name ?? "—"}
                </p>
                <p>
                  <span className="font-medium text-foreground">Início:</span>{" "}
                  {formatDateTime(current.started_at)}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Queixa
                  </label>
                  <Textarea
                    value={fields.queixa}
                    onChange={(e) =>
                      setFields((prev) => ({ ...prev, queixa: e.target.value }))
                    }
                    placeholder="Queixa principal / motivo da consulta..."
                    maxLength={1200}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Exame</label>
                  <Textarea
                    value={fields.exame}
                    onChange={(e) =>
                      setFields((prev) => ({ ...prev, exame: e.target.value }))
                    }
                    placeholder="Achados do exame físico / observações clínicas..."
                    maxLength={1200}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Diagnóstico
                  </label>
                  <Textarea
                    value={fields.diagnostico}
                    onChange={(e) =>
                      setFields((prev) => ({
                        ...prev,
                        diagnostico: e.target.value,
                      }))
                    }
                    placeholder="Hipóteses / diagnóstico..."
                    maxLength={1200}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Conduta
                  </label>
                  <Textarea
                    value={fields.conduta}
                    onChange={(e) =>
                      setFields((prev) => ({ ...prev, conduta: e.target.value }))
                    }
                    placeholder="Tratamento / conduta..."
                    maxLength={1200}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Prescrição
                  </label>
                  <Textarea
                    value={fields.prescricao}
                    onChange={(e) =>
                      setFields((prev) => ({
                        ...prev,
                        prescricao: e.target.value,
                      }))
                    }
                    placeholder="Uma medicação por linha (medicação — dose — frequência — duração)"
                    maxLength={1200}
                  />
                  <p className="text-xs text-muted-foreground">
                    Dica: 1 item por linha para sair em lista no PDF.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Observações
                  </label>
                  <Textarea
                    value={fields.observacoes}
                    onChange={(e) =>
                      setFields((prev) => ({
                        ...prev,
                        observacoes: e.target.value,
                      }))
                    }
                    placeholder="Outras anotações..."
                    maxLength={1200}
                  />
                </div>

                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">CRMV (opcional)</label>
                      <Input
                        value={pdfCrmv}
                        onChange={(e) => setPdfCrmv(e.target.value)}
                        placeholder="Ex: CRMV-SP 12345"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Mostrar no PDF</label>
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={pdfIncludeCrmv}
                          onChange={(e) => setPdfIncludeCrmv(e.target.checked)}
                        />
                        Incluir CRMV na assinatura
                      </label>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {composedNotes.length}/5000
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleSaveNotes}
                  disabled={isSaving || isFinalizing || isGeneratingPdf}
                >
                  {isSaving ? "Salvando..." : "Salvar anotações"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGeneratePdf}
                  disabled={isSaving || isFinalizing || isGeneratingPdf}
                  className="gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  {isGeneratingPdf ? "Gerando PDF..." : "Gerar PDF"}
                </Button>
                <Button
                  onClick={handleFinalize}
                  disabled={isSaving || isFinalizing || isGeneratingPdf}
                >
                  {isFinalizing ? "Finalizando..." : "Finalizar atendimento"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Selecionar consulta agendada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Data</label>
              <Input
                type="date"
                value={queryDate}
                onChange={(e) => setQueryDate(e.target.value)}
                disabled={!!current}
                className="w-fit"
              />
              <p className="text-xs text-muted-foreground">
                Mostrando consultas com status{" "}
                <span className="font-medium">agendado</span>.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Cliente / Pet
              </label>
              <Select
                value={appointmentId}
                onValueChange={setAppointmentId}
                disabled={!!current}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      appointments.length === 0
                        ? "Nenhuma consulta agendada para esta data"
                        : "Selecione um agendamento"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {appointments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.scheduled_time?.slice(0, 5)} — {a.tutorName ?? "Cliente"} /{" "}
                      {a.petName ?? "Pet"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Consultório
              </label>
              <Select
                value={officeId}
                onValueChange={setOfficeId}
                disabled={!!current}
              >
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

            <Button
              onClick={handleStart}
              disabled={isStarting || !user || !!current || appointments.length === 0}
            >
              {current
                ? "Finalize o atendimento atual"
                : isStarting
                  ? "Iniciando..."
                  : "Iniciar Atendimento"}
            </Button>

            <p className="text-xs text-muted-foreground">
              {medicalServicesLoaded && medicalServiceIds.length === 0
                ? "Nenhum serviço de consulta médica encontrado. Cadastre um serviço com nome contendo 'Consulta' em Serviços."
                : "O histórico do paciente fica no cadastro do Pet/Cliente."}
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
