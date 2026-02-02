import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { 
  Dog, 
  Clock, 
  Scissors,
  MessageCircle,
  ChevronRight,
  AlertTriangle
} from "lucide-react";
import type { Appointment, AppointmentStatus } from "@/lib/petcontrol.api";
import { whatsappApi } from "@/lib/petcontrol.api";

interface AppointmentCardProps {
  appointment: Appointment;
  onStatusChange?: (id: string, status: AppointmentStatus) => void;
  onWhatsApp?: (appointment: Appointment) => void;
}

const nextStatus: Record<AppointmentStatus, AppointmentStatus | null> = {
  agendado: "em_atendimento",
  em_atendimento: "aguardando_busca",
  aguardando_busca: "finalizado",
  finalizado: null,
};

const actionLabels: Record<AppointmentStatus, string> = {
  agendado: "Iniciar Atendimento",
  em_atendimento: "Finalizar Banho",
  aguardando_busca: "Marcar como Entregue",
  finalizado: "Concluído",
};

export function AppointmentCard({ appointment, onStatusChange, onWhatsApp }: AppointmentCardProps) {
  const pet = appointment.pet;
  const tutor = pet?.tutor;
  const service = appointment.service;
  const status = appointment.status || "agendado";
  const next = nextStatus[status];

  const handleWhatsApp = () => {
    if (!tutor?.phone) return;
    
    const message = whatsappApi.generateMessage(
      'ready',
      pet?.name,
      tutor?.name
    );
    whatsappApi.openWhatsApp(tutor.phone, message);
    onWhatsApp?.(appointment);
  };

  return (
    <div className="pet-card animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center">
            <Dog className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              {pet?.name || "Pet"}
              {pet?.is_aggressive && (
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              )}
            </h3>
            <p className="text-sm text-muted-foreground">
              {tutor?.name || "Tutor"}
            </p>
          </div>
        </div>
        <StatusBadge status={status} size="sm" />
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock size={14} />
          <span>{appointment.scheduled_time?.slice(0, 5)}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Scissors size={14} />
          <span>{service?.name || "Serviço"}</span>
        </div>
      </div>

      {/* Notes */}
      {(pet?.notes || pet?.allergies) && (
        <div className="mb-4 p-2 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            {pet?.allergies && <span className="text-orange-600 font-medium">⚠️ Alergias: {pet.allergies}</span>}
            {pet?.allergies && pet?.notes && " • "}
            {pet?.notes}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {status === "aguardando_busca" && tutor?.phone && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={handleWhatsApp}
          >
            <MessageCircle size={16} />
            WhatsApp
          </Button>
        )}
        
        {next && onStatusChange && (
          <Button
            size="sm"
            className="flex-1 gap-2 bg-primary hover:bg-primary/90"
            onClick={() => onStatusChange(appointment.id, next)}
          >
            {actionLabels[status]}
            <ChevronRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}
