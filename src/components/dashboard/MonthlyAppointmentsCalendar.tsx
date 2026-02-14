import { useMemo, useState } from "react";
import { Calendar as DayPickerCalendar } from "@/components/ui/calendar";
import { AppointmentListRow } from "@/components/dashboard/AppointmentListRow";
import type { Appointment, AppointmentStatus } from "@/lib/petcontrol.api";
import { isoDateInTimeZone } from "@/lib/date";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const statusLabels: Record<AppointmentStatus, string> = {
  agendado: "Agendado",
  em_atendimento: "Em Atendimento",
  aguardando_busca: "Aguardando Busca",
  finalizado: "Finalizado",
  pago: "Pago",
};

const statusOrder: AppointmentStatus[] = [
  "agendado",
  "em_atendimento",
  "aguardando_busca",
  "finalizado",
  "pago",
];

export function MonthlyAppointmentsCalendar({
  monthDate,
  appointments,
  isLoading,
  onStatusChange,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<string>(isoDateInTimeZone());

  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editingStatus, setEditingStatus] = useState<AppointmentStatus>("agendado");
  const [isSaving, setIsSaving] = useState(false);

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

  const closeDialog = () => {
    setEditingAppointment(null);
    setIsSaving(false);
  };

  const openEditDialog = (appointment: Appointment) => {
    if (!onStatusChange) return; // modo somente leitura
    setEditingAppointment(appointment);
    setEditingStatus(appointment.status ?? "agendado");
  };

  const handleSave = async () => {
    if (!editingAppointment || !onStatusChange) return;

    const currentStatus = editingAppointment.status ?? "agendado";
    if (editingStatus === currentStatus) {
      closeDialog();
      return;
    }

    try {
      setIsSaving(true);
      await Promise.resolve(onStatusChange(editingAppointment.id, editingStatus));
      closeDialog();
    } finally {
      setIsSaving(false);
    }
  };

  // Filtra opções de status baseadas no status atual (não permite voltar)
  const availableStatusOptions = useMemo(() => {
    if (!editingAppointment) return [];
    const current = editingAppointment.status ?? "agendado";
    const currentIndex = statusOrder.indexOf(current);
    
    // Se já estiver pago, não permite mudar nada
    if (current === 'pago') return ['pago' as AppointmentStatus];
    
    // Se estiver finalizado, só permite mudar para pago
    if (current === 'finalizado') return ['finalizado' as AppointmentStatus, 'pago' as AppointmentStatus];

    // Caso contrário, permite o status atual e qualquer um à frente
    return statusOrder.slice(currentIndex);
  }, [editingAppointment]);

  return (
    <>
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
              {onStatusChange && (
                <p className="text-xs text-muted-foreground mt-1">
                  Dica: clique em um agendamento para alterar o status.
                </p>
              )}
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
                  <div
                    key={appointment.id}
                    className={onStatusChange ? "px-4" : "px-4"}
                  >
                    {onStatusChange ? (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => openEditDialog(appointment)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") openEditDialog(appointment);
                        }}
                        className="rounded-xl -mx-2 px-2 cursor-pointer hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <AppointmentListRow appointment={appointment} />
                      </div>
                    ) : (
                      <AppointmentListRow appointment={appointment} />
                    )}
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

      <Dialog open={!!editingAppointment} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar status do agendamento</DialogTitle>
          </DialogHeader>

          {editingAppointment && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="text-sm text-foreground font-medium">
                  {editingAppointment.scheduled_time?.slice(0, 5) ?? ""} • {editingAppointment.pet?.name ?? "Pet"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {editingAppointment.pet?.tutor?.name ?? "Cliente"} • {editingAppointment.service?.name ?? "Serviço"}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Novo status</p>
                <Select
                  value={editingStatus}
                  onValueChange={(v) => setEditingStatus(v as AppointmentStatus)}
                  disabled={editingAppointment.status === 'pago'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStatusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabels[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editingAppointment.status === 'pago' && (
                  <p className="text-xs text-muted-foreground">Agendamentos pagos não podem ser alterados.</p>
                )}
                {editingAppointment.status === 'finalizado' && (
                  <p className="text-xs text-muted-foreground">Agendamentos finalizados só podem ser alterados para Pago.</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !editingAppointment || editingAppointment.status === 'pago'}
            >
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}