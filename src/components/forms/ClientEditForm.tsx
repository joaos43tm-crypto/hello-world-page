import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2 } from "lucide-react";
import type { Tutor } from "@/lib/petcontrol.api";
import { ConsultationHistory } from "@/components/medical/ConsultationHistory";

interface ClientEditFormProps {
  tutor: Tutor;
  onSave: (data: Partial<Tutor>) => Promise<void>;
  onCancel: () => void;
}

export function ClientEditForm({ tutor, onSave, onCancel }: ClientEditFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(tutor.name);
  const [phone, setPhone] = useState(tutor.phone);
  const [email, setEmail] = useState(tutor.email || "");
  const [address, setAddress] = useState(tutor.address || "");
  const [notes, setNotes] = useState(tutor.notes || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave({
        name,
        phone,
        email: email || null,
        address: address || null,
        notes: notes || null,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do cliente"
            className="h-12"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone/WhatsApp *</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 99999-9999"
            className="h-12"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Endereço</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Endereço completo"
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anotações sobre o cliente..."
            className="min-h-[80px]"
          />
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={!name || !phone || isLoading} className="flex-1 gap-2">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />}
            Salvar
          </Button>
        </div>
      </form>

      {/* Histórico consolidado (todos os pets do tutor) */}
      <ConsultationHistory tutorId={tutor.id} title="Histórico de consultas (Cliente)" />
    </div>
  );
}
