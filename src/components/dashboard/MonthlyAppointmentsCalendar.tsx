import { useMemo, useState } from "react";
import { Calendar as DayPickerCalendar } from "@/components/ui/calendar";
import { AppointmentListRow } from "@/components/dashboard/AppointmentListRow";
import type { Appointment, AppointmentStatus } from "@/lib/petcontrol.api";
import { isoDateInTimeZone } from "@/lib/date";

type Props = {
  monthDate: Date; // qualquer dia dentro do mês desejado
  appointments: Appointment[];
  isLoading?: boolean;
  // Mantido por compatibilidade com o Dashboard (visualização apenas)
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
}: Props) {
  const [selectedDate, setSelectedDate] = useState<string>(isoDateInTimeZone());

  const monthStart = useMemo(() => startOfMonth(monthDate), [monthDate]);
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

  const selectedDateLabel = useMemo(() => {
    const d = new Date(`${selectedDate}T12:00:00`);
    return d.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  }, [selectedDate]);

  const monthLabel = useMemo(() => {
    const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [monthDate]);

  return (
    <div className="grid gap-4 lg:grid-cols-[520px,1fr]">
      {/* Calendar */}
      <div className="pet-card">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm text-muted-foreground">Mês vigente</p>
            <p className="text-base font-semibold text-foreground capitalize">{monthLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total no mês</p>
            <p className="text-lg font-semibold text-foreground">{appointments.length}</p>
          </div>
        </div>

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
          className="w-full"
          classNames={{
            months: "flex flex-col space-y-4",
            month: "space-y-4",
            table: "w-full border-collapse",
            head_row: "flex justify-between",
            head_cell:
              "text-muted-foreground rounded-md w-[calc((100%-24px)/7)] font-normal text-[0.75rem] text-center",
            row: "flex w-full mt-2 justify-between",
            cell:
              "w-[calc((100%-24px)/7)] aspect-square text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
            day:
              "h-full w-full rounded-xl hover:bg-accent data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground",
          }}
          components={{
            DayContent: ({ date }) => {
              const dateStr = isoDateInTimeZone(date);
              const count = countsByDate.get(dateStr) ?? 0;
              return (
                <div className="relative w-full h-full flex items-center justify-center">
                  <span className="leading-none">{date.getDate()}</span>
                  {count > 0 && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                      {count}
                    </span>
                  )}
                </div>
              );
            },
          }}
        />

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>• Número = qtde de agendamentos</span>
          <span className="capitalize">Selecionado: {selectedDateLabel}</span>
        </div>
      </div>

      {/* Day panel */}
      <div className="pet-card">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Agendamentos do dia</p>
            <p className="text-lg font-semibold text-foreground capitalize">{selectedDateLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-semibold text-foreground">{selectedAppointments.length}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl border bg-background p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-3" />
                <div className="h-3 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : selectedAppointments.length > 0 ? (
          <div className="rounded-2xl border bg-background">
            <div className="divide-y max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              {selectedAppointments.map((appointment) => (
                <div key={appointment.id} className="px-4">
                  <AppointmentListRow appointment={appointment} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-muted-foreground">Nenhum agendamento para esta data.</p>
          </div>
        )}
      </div>
    </div>
  );
}
