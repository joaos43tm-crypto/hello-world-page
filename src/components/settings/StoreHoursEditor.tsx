import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { StoreHoursDay, StoreHoursWeek } from "@/lib/storeHours";

const weekdayLabels: Array<{ id: keyof StoreHoursWeek; label: string; full: string }> = [
  { id: "seg", label: "Seg", full: "Segunda" },
  { id: "ter", label: "Ter", full: "Terça" },
  { id: "qua", label: "Qua", full: "Quarta" },
  { id: "qui", label: "Qui", full: "Quinta" },
  { id: "sex", label: "Sex", full: "Sexta" },
  { id: "sab", label: "Sáb", full: "Sábado" },
  { id: "dom", label: "Dom", full: "Domingo" },
];

type Props = {
  value: StoreHoursWeek;
  onChange: (next: StoreHoursWeek) => void;
  disabled?: boolean;
};

export function StoreHoursEditor({ value, onChange, disabled }: Props) {
  const setDay = (id: keyof StoreHoursWeek, patch: Partial<StoreHoursDay>) => {
    const next = {
      ...value,
      [id]: { ...value[id], ...patch },
    } as StoreHoursWeek;
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3">
        {weekdayLabels.map((d) => {
          const day = value[d.id];
          return (
            <div
              key={d.id}
              className={cn(
                "rounded-xl border bg-background p-4",
                day.enabled ? "" : "opacity-70",
              )}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-foreground">
                      {d.label}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{d.full}</p>
                      <p className="text-sm text-muted-foreground">Defina se atende e o horário desse dia</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 md:justify-end">
                  <Label className="text-sm text-muted-foreground">Atende</Label>
                  <Switch
                    checked={day.enabled}
                    onCheckedChange={(checked) => setDay(d.id, { enabled: checked })}
                    disabled={disabled}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Abertura</Label>
                  <Input
                    type="time"
                    value={day.open}
                    onChange={(e) => setDay(d.id, { open: e.target.value })}
                    className="h-11"
                    disabled={disabled || !day.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fechamento</Label>
                  <Input
                    type="time"
                    value={day.close}
                    onChange={(e) => setDay(d.id, { close: e.target.value })}
                    className="h-11"
                    disabled={disabled || !day.enabled}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Dica: horários são usados para validar agendamentos. Se um dia estiver desativado, não será possível agendar nele.
      </p>
    </div>
  );
}
