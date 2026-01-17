import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { AppointmentCard } from "@/components/dashboard/AppointmentCard";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppointmentForm } from "@/components/forms/AppointmentForm";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
  const [filter, setFilter] = useState<AppointmentStatus | 'all'>('all');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, appointmentsData] = await Promise.all([
        reportsApi.getDashboardStats(),
        appointmentsApi.getToday(),
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
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Erro ao agendar",
        description: "Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    }
  };

  const filteredAppointments = filter === 'all' 
    ? appointments 
    : appointments.filter(a => a.status === filter);

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

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="whitespace-nowrap"
          >
            Todos ({appointments.length})
          </Button>
          {(['agendado', 'em_atendimento', 'aguardando_busca', 'finalizado'] as const).map(status => {
            const count = appointments.filter(a => a.status === status).length;
            return (
              <Button
                key={status}
                variant={filter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(status)}
                className="whitespace-nowrap gap-2"
              >
                <StatusBadge status={status} size="sm" showIcon={false} />
                ({count})
              </Button>
            );
          })}
        </div>

        {/* Appointments Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Atendimentos de Hoje
          </h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="pet-card animate-pulse">
                  <div className="h-16 bg-muted rounded-lg mb-3" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredAppointments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAppointments.map(appointment => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onStatusChange={handleStatusChange}
                  onWhatsApp={handleWhatsApp}
                />
              ))}
            </div>
          ) : (
            <div className="pet-card text-center py-12">
              <Dog className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum agendamento {filter !== 'all' && 'com este status'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {filter === 'all' 
                  ? 'Comece adicionando um novo agendamento!'
                  : 'Tente filtrar por outro status.'
                }
              </p>
              {filter === 'all' && (
                <Button onClick={() => setShowNewAppointment(true)} className="gap-2">
                  <Plus size={18} />
                  Novo Agendamento
                </Button>
              )}
            </div>
          )}
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
