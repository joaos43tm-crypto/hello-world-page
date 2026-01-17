import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Save, Loader2, Trash2 } from "lucide-react";
import type { Pet, PetSize, PetTemperament } from "@/lib/petcontrol.api";

interface PetEditFormProps {
  pet: Pet;
  onSave: (data: Partial<Pet>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}

export function PetEditForm({ pet, onSave, onDelete, onCancel }: PetEditFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [name, setName] = useState(pet.name);
  const [breed, setBreed] = useState(pet.breed || "");
  const [size, setSize] = useState<PetSize>(pet.size || "medio");
  const [temperament, setTemperament] = useState<PetTemperament>(pet.temperament || "docil");
  const [isAggressive, setIsAggressive] = useState(pet.is_aggressive || false);
  const [allergies, setAllergies] = useState(pet.allergies || "");
  const [notes, setNotes] = useState(pet.notes || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave({
        name,
        breed: breed || null,
        size,
        temperament,
        is_aggressive: isAggressive,
        allergies: allergies || null,
        notes: notes || null,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm(`Tem certeza que deseja excluir ${pet.name}?`)) return;
    
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="petName">Nome do Pet *</Label>
        <Input
          id="petName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do pet"
          className="h-12"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="breed">Raça</Label>
        <Input
          id="breed"
          value={breed}
          onChange={(e) => setBreed(e.target.value)}
          placeholder="Ex: Golden Retriever"
          className="h-12"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Porte</Label>
          <Select value={size} onValueChange={(v) => setSize(v as PetSize)}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pequeno">Pequeno</SelectItem>
              <SelectItem value="medio">Médio</SelectItem>
              <SelectItem value="grande">Grande</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Temperamento</Label>
          <Select value={temperament} onValueChange={(v) => setTemperament(v as PetTemperament)}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="docil">Dócil</SelectItem>
              <SelectItem value="agitado">Agitado</SelectItem>
              <SelectItem value="agressivo">Agressivo</SelectItem>
              <SelectItem value="timido">Tímido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl">
        <span className="text-orange-600 font-medium">⚠️ Pet agressivo?</span>
        <Switch
          checked={isAggressive}
          onCheckedChange={setIsAggressive}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="allergies">Alergias</Label>
        <Input
          id="allergies"
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          placeholder="Liste as alergias conhecidas"
          className="h-12"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="petNotes">Observações</Label>
        <Textarea
          id="petNotes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Cuidados especiais, preferências..."
          className="min-h-[80px]"
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancelar
        </Button>
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="gap-2"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
          </Button>
        )}
        <Button
          type="submit"
          disabled={!name || isLoading}
          className="flex-1 gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save size={18} />
          )}
          Salvar
        </Button>
      </div>
    </form>
  );
}
