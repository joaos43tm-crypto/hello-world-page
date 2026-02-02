import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, Save, Dog, Scissors } from "lucide-react";
import type { Pet, Service } from "@/lib/petcontrol.api";
import { petsApi, servicesApi } from "@/lib/petcontrol.api";
import { isoDateInTimeZone } from "@/lib/date";

interface AppointmentFormProps {
  onSave: (data: {
    pet_id: string;
    service_id: string;
    scheduled_date: string;
    scheduled_time: string;
    notes?: string;
    price?: number;
  }) => Promise<void>;
  defaultDate?: string;
  defaultPetId?: string;
  defaultServiceId?: string;
  lockService?: boolean;
}

export function AppointmentForm({
  onSave,
  defaultDate,
  defaultPetId,
  defaultServiceId,
  lockService,
}: AppointmentFormProps) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [petId, setPetId] = useState(defaultPetId || "");
  const [serviceId, setServiceId] = useState(defaultServiceId || "");
  const [date, setDate] = useState(defaultDate || isoDateInTimeZone());
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");

  const selectedService = services.find((s) => s.id === serviceId);

  useEffect(() => {
    const loadData = async () => {
      const [petsData, servicesData] = await Promise.all([
        petsApi.getAll(),
        servicesApi.getActive(),
      ]);
      setPets(petsData);
      setServices(servicesData);
    };
    loadData();
  }, []);

  const handleSubmit = async () => {
    if (!petId || !serviceId || !date || !time) return;

    setIsLoading(true);
    try {
      await onSave({
        pet_id: petId,
        service_id: serviceId,
        scheduled_date: date,
        scheduled_time: time,
        notes: notes || undefined,
        price: selectedService?.price,
      });
    } catch (error) {
      console.error('Error saving appointment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Pet Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Dog size={16} />
          Pet *
        </Label>
        <Select value={petId} onValueChange={setPetId}>
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Selecione o pet..." />
          </SelectTrigger>
          <SelectContent>
            {pets.map((pet) => (
              <SelectItem key={pet.id} value={pet.id}>
                {pet.name} - {pet.tutor?.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Service Selection */}
      {lockService ? (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Scissors size={16} />
            Serviço
          </Label>
          <div className="h-12 px-3 rounded-md border bg-muted flex items-center text-sm text-foreground">
            {selectedService?.name ?? "Consulta Médica"}
          </div>
          <p className="text-xs text-muted-foreground">
            Este agendamento será criado como Consulta Médica.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Scissors size={16} />
            Serviço *
          </Label>
          <Select value={serviceId} onValueChange={setServiceId}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Selecione o serviço..." />
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name} - R$ {service.price.toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Date and Time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar size={16} />
            Data *
          </Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock size={16} />
            Horário *
          </Label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-12"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observações para o atendimento..."
          className="min-h-[80px]"
        />
      </div>

      {/* Price Display */}
      {selectedService && (
        <div className="p-4 bg-accent rounded-xl">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Valor do serviço:</span>
            <span className="text-xl font-bold text-primary">
              R$ {selectedService.price.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={!petId || !serviceId || !date || !time || isLoading}
        className="w-full h-14 text-lg gap-2"
      >
        <Save size={20} />
        {isLoading ? "Salvando..." : "Agendar"}
      </Button>
    </div>
  );
}
