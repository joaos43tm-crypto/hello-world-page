import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AppointmentCard } from "@/components/dashboard/AppointmentCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppointmentForm } from "@/components/forms/AppointmentForm";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Stethoscope,
} from "lucide-react";
import {
  appointmentsApi,
  servicesApi,
  type Appointment,
  type AppointmentStatus,
} from "@/lib/petcontrol.api";
import { isoDateInTimeZone } from "@/lib/date";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function Agenda() {
  const { toast } = useToast();
  const { role } = useAuth();
  const canCreateAppointment = role === "admin" || role === "atendente";

  const [selectedDate, setSelectedDate] = useState(isoDateInTimeZone());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showNewMedicalAppointment, setShowNewMedicalAppointment] = useState(false);
  const [medicalServiceId, setMedicalServiceId] = useState<string>("");

  const loadAppointments = async () => {
    setIsLoading(true);
    try {
      const data = await appointmentsApi.getByDate(selectedDate);
      setAppointments(data);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [selectedDate]);

  useEffect(() => {
    const loadMedicalService = async () => {
      try {
        const services = await servicesApi.getActive();
        const medical = services.find((s) => /consulta/i.test(s.name));
        setMedicalServiceId(medical?.id ?? "");
      } catch (e) {
        console.error("Error loading services:", e);
      }
    };
    loadMedicalService();
  }, []);

  const handleStatusChange = async (id: string, newStatus: AppointmentStatus) => {
    try {
      await appointmentsApi.updateStatus(id, newStatus);
      toast({
        title: "Status atualizado!",
        description: newStatus === 'finalizado' 
          ? "🎉 Atendimento finalizado!"
          : "Status alterado com sucesso.",
      });
      loadAppointments();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleNewAppointment = async (data: any) => {
    try {
      await appointmentsApi.create(data);
      toast({
        title: "Agendado com sucesso!",
        description: "O atendimento foi adicionado.",
      });
      setShowNewAppointment(false);
      loadAppointments();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Erro ao agendar",
        variant: "destructive",
      });
    }
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  };

  const isToday = selectedDate === isoDateInTimeZone();

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-7 h-7 text-primary" />
              Agenda
            </h1>
          </div>
          {canCreateAppointment && (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  if (!medicalServiceId) {
                    toast({
                      title: "Serviço de consulta não encontrado",
                      description: "Cadastre um serviço com nome contendo 'Consulta' em Serviços.",
                      variant: "destructive",
                    });
                    return;
                  }
                  setShowNewMedicalAppointment(true);
                }}
                className="gap-2"
              >
                <Stethoscope size={18} />
                Agendar Consulta
              </Button>
              <Button onClick={() => setShowNewAppointment(true)} className="gap-2">
                <Plus size={18} />
                Agendar
              </Button>
            </div>
          )}
        </div>

        {/* Date Navigation */}
        <div className="pet-card">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => changeDate(-1)}>
              <ChevronLeft size={24} />
            </Button>
            
            <div className="flex-1 text-center">
              <p className={`text-lg font-semibold capitalize ${isToday ? 'text-primary' : 'text-foreground'}`}>
                {isToday ? '📅 Hoje' : formatDate(selectedDate)}
              </p>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto mx-auto mt-2 text-center"
              />
            </div>
            
            <Button variant="ghost" size="icon" onClick={() => changeDate(1)}>
              <ChevronRight size={24} />
            </Button>
          </div>
        </div>

        {/* Quick Date Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={isToday ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedDate(isoDateInTimeZone())}
          >
            Hoje
          </Button>
          {[1, 2, 3, 4, 5, 6].map(i => {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dateStr = isoDateInTimeZone(date);
            const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' });
            
            return (
              <Button
                key={i}
                variant={selectedDate === dateStr ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDate(dateStr)}
                className="whitespace-nowrap"
              >
                {dayName} {date.getDate()}
              </Button>
            );
          })}
        </div>

        {/* Appointments */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            {appointments.length} agendamento{appointments.length !== 1 && 's'}
          </h2>
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="pet-card animate-pulse">
                  <div className="h-20 bg-muted rounded-lg" />
                </div>
              ))}
            </div>
          ) : appointments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {appointments.map(appointment => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          ) : (
            <div className="pet-card text-center py-12">
              <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum agendamento
              </h3>
              <p className="text-muted-foreground mb-4">
                Não há atendimentos marcados para esta data.
              </p>
              {canCreateAppointment && (
                <div className="flex justify-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (!medicalServiceId) {
                        toast({
                          title: "Serviço de consulta não encontrado",
                          description: "Cadastre um serviço com nome contendo 'Consulta' em Serviços.",
                          variant: "destructive",
                        });
                        return;
                      }
                      setShowNewMedicalAppointment(true);
                    }}
                    className="gap-2"
                  >
                    <Stethoscope size={18} />
                    Agendar Consulta
                  </Button>
                  <Button onClick={() => setShowNewAppointment(true)} className="gap-2">
                    <Plus size={18} />
                    Agendar
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* New Appointment Dialog */}
        {canCreateAppointment && (
          <>
            <Dialog open={showNewAppointment} onOpenChange={setShowNewAppointment}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Novo Agendamento
                  </DialogTitle>
                </DialogHeader>
                <AppointmentForm onSave={handleNewAppointment} defaultDate={selectedDate} />
              </DialogContent>
            </Dialog>

            <Dialog
              open={showNewMedicalAppointment}
              onOpenChange={setShowNewMedicalAppointment}
            >
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-primary" />
                    Nova Consulta Médica
                  </DialogTitle>
                </DialogHeader>
                <AppointmentForm
                  onSave={handleNewAppointment}
                  defaultDate={selectedDate}
                  defaultServiceId={medicalServiceId}
                  lockService
                />
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </MainLayout>
  );
}
