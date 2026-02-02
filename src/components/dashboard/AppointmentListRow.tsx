import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/lib/petcontrol.api";
import { Clock, Scissors, User } from "lucide-react";

type Props = {
  appointment: Appointment;
  dense?: boolean;
};

export function AppointmentListRow({ appointment, dense }: Props) {
  const petName = appointment.pet?.name ?? "Pet";
  const tutorName = appointment.pet?.tutor?.name ?? "Cliente";
  const serviceName = appointment.service?.name ?? "Serviço";
  const time = appointment.scheduled_time?.slice(0, 5) ?? "";
  const status = appointment.status ?? "agendado";

  return (
    <div
      className={cn(
        "flex items-start gap-4 py-3",
        dense ? "py-2" : "py-3"
      )}
    >
      <div className="shrink-0 mt-0.5">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-foreground">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">
              {time} • {petName}
            </p>
            <div className="mt-1 grid gap-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 min-w-0">
                <User className="w-4 h-4 shrink-0" />
                <span className="truncate">{tutorName}</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Scissors className="w-4 h-4 shrink-0" />
                <span className="truncate">{serviceName}</span>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <StatusBadge status={status} size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
