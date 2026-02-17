import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { MonthlyAppointmentsCalendar } from "@/components/dashboard/MonthlyAppointmentsCalendar";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppointmentForm } from "@/components/forms/AppointmentForm";
import { 
  Calendar, 
  DollarSign, 
  Bell, 
  Users,
  Plus,
  RefreshCw,
  Dog
} from "lucide-react";
import { 
  reportsApi, 
  appointmentsApi, 
  type Appointment,
  type AppointmentStatus 
} from "@/lib/petcontrol.api";
import { useToast } from "@/hooks/use-toast";
import { isoDateInTimeZone } from "@/lib/date";

export default function Index() {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    todayAppointments: 0,
    todayRevenue: 0,
    pendingPickups: 0,
    totalClients: 0,
  });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewAppointment, setShowNewAppointment] = useState(false);

  const getMonthRange = (base: Date) => {
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return {
      start: isoDateInTimeZone(start),
      end: isoDateInTimeZone(end),
    };
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const { start, end } = getMonthRange(now);

      const [statsData, appointmentsData] = await Promise.all([
        reportsApi.getDashboardStats(),
        appointmentsApi.getByDateRange(start, end),
      ]);
      setStats(statsData);
      setAppointments(appointmentsData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (id: string, newStatus: AppointmentStatus) => {
    try {
      await appointmentsApi.updateStatus(id, newStatus);
      toast({
        title: "Status atualizado!",
        description: newStatus === 'finalizado' 
          ? "🎉 Atendimento finalizado! Pontos de fidelidade adicionados."
          : "Status alterado com sucesso.",
      });
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleWhatsApp = async (appointment: Appointment) => {
    try {
      await appointmentsApi.markWhatsAppSent(appointment.id);
      toast({
        title: "WhatsApp enviado!",
        description: "O cliente foi notificado.",
      });
    } catch (error) {
      console.error('Error marking WhatsApp:', error);
    }
  };

  const handleNewAppointment = async (data: any) => {
    try {
      await appointmentsApi.create(data);
      toast({
        title: "Agendado com sucesso!",
        description: "O atendimento foi adicionado à agenda.",
      });
      setShowNewAppointment(false);
      loadData();
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      const description =
        typeof error?.message === "string" && error.message.trim()
          ? error.message
          : "Verifique os dados e tente novamente.";

      toast({
        title: "Erro ao agendar",
        description,
        variant: "destructive",
      });
    }
  };

  const today = new Date().toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Dog className="w-7 h-7 text-primary" />
              PetControl
            </h1>
            <p className="text-muted-foreground capitalize">{today}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadData}
            className="rounded-full"
            disabled={isLoading}
          >
            <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Agendamentos Hoje"
            value={stats.todayAppointments}
            icon={Calendar}
            variant="primary"
          />
          <StatCard
            title="Faturamento Hoje"
            value={`R$ ${stats.todayRevenue.toFixed(0)}`}
            icon={DollarSign}
            variant="success"
          />
          <StatCard
            title="Aguardando Busca"
            value={stats.pendingPickups}
            icon={Bell}
            variant="warning"
          />
          <StatCard
            title="Total Clientes"
            value={stats.totalClients}
            icon={Users}
            variant="secondary"
          />
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          <Button
            onClick={() => setShowNewAppointment(true)}
            className="gap-2 whitespace-nowrap"
          >
            <Plus size={18} />
            Novo Agendamento
          </Button>
        </div>

        {/* Monthly Calendar */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Agendamentos do mês</h2>
          <MonthlyAppointmentsCalendar
            monthDate={new Date()}
            appointments={appointments}
            isLoading={isLoading}
            onStatusChange={handleStatusChange}
            onWhatsApp={handleWhatsApp}
          />
        </div>

        {/* New Appointment Dialog */}
        <Dialog open={showNewAppointment} onOpenChange={setShowNewAppointment}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Novo Agendamento
              </DialogTitle>
            </DialogHeader>
            <AppointmentForm onSave={handleNewAppointment} />
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
