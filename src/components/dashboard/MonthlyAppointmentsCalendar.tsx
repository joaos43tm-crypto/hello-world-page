import { useMemo, useState } from "react";
import { Calendar as DayPickerCalendar } from "@/components/ui/calendar";
import { AppointmentCard } from "@/components/dashboard/AppointmentCard";
import type { Appointment, AppointmentStatus } from "@/lib/petcontrol.api";
import { isoDateInTimeZone } from "@/lib/date";

type Props = {
  monthDate: Date; // qualquer dia dentro do mês desejado
  appointments: Appointment[];
  isLoading?: boolean;
  onStatusChange?: (id: string, status: AppointmentStatus) => void;
  onWhatsApp?: (appointment: Appointment) => void;
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function MonthlyAppointmentsCalendar({
  monthDate,
  appointments,
  isLoading,
  onStatusChange,
  onWhatsApp,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<string>(isoDateInTimeZone());

  const monthStart = useMemo(() => startOfMonth(monthDate), [monthDate]);
  const monthEnd = useMemo(() => endOfMonth(monthDate), [monthDate]);

  const countsByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of appointments) {
      map.set(a.scheduled_date, (map.get(a.scheduled_date) ?? 0) + 1);
    }
    return map;
  }, [appointments]);

  const selectedAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.scheduled_date === selectedDate)
      .sort((a, b) => (a.scheduled_time ?? "").localeCompare(b.scheduled_time ?? ""));
  }, [appointments, selectedDate]);

  return (
    <div className="space-y-4">
      <div className="pet-card">
        <DayPickerCalendar
          mode="single"
          selected={selectedDate ? new Date(`${selectedDate}T12:00:00`) : undefined}
          onSelect={(day) => {
            if (!day) return;
            setSelectedDate(isoDateInTimeZone(day));
          }}
          month={monthStart}
          fromMonth={monthStart}
          toMonth={monthStart}
          showOutsideDays={false}
          components={{
            DayContent: ({ date }) => {
              const dateStr = isoDateInTimeZone(date);
              const count = countsByDate.get(dateStr) ?? 0;
              return (
                <div className="relative w-full h-full flex items-center justify-center">
                  <span>{date.getDate()}</span>
                  {count > 0 && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[10px] leading-none px-1 rounded-full bg-primary text-primary-foreground">
                      {count}
                    </span>
                  )}
                </div>
              );
            },
          }}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Agendamentos do dia</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="pet-card animate-pulse">
                <div className="h-16 bg-muted rounded-lg mb-3" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : selectedAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onStatusChange={onStatusChange}
                onWhatsApp={onWhatsApp}
              />
            ))}
          </div>
        ) : (
          <div className="pet-card text-center py-10">
            <p className="text-muted-foreground">Nenhum agendamento para esta data.</p>
          </div>
        )}
      </div>
    </div>
  );
}
