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
import { Dog, Plus, Trash2, Save, Loader2 } from "lucide-react";
import type { Pet, PetSize, PetTemperament } from "@/lib/petcontrol.api";

interface PetFormData {
  id: string;
  name: string;
  breed: string;
  size: PetSize;
  temperament: PetTemperament;
  is_aggressive: boolean;
  allergies: string;
  notes: string;
}

interface MultiPetFormProps {
  tutorId: string;
  onSave: (pets: Omit<Pet, 'id' | 'created_at' | 'updated_at'>[]) => Promise<void>;
  onCancel?: () => void;
}

export function MultiPetForm({ tutorId, onSave, onCancel }: MultiPetFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [pets, setPets] = useState<PetFormData[]>([
    {
      id: crypto.randomUUID(),
      name: "",
      breed: "",
      size: "medio",
      temperament: "docil",
      is_aggressive: false,
      allergies: "",
      notes: "",
    },
  ]);

  const addPet = () => {
    setPets([
      ...pets,
      {
        id: crypto.randomUUID(),
        name: "",
        breed: "",
        size: "medio",
        temperament: "docil",
        is_aggressive: false,
        allergies: "",
        notes: "",
      },
    ]);
  };

  const removePet = (id: string) => {
    if (pets.length > 1) {
      setPets(pets.filter((p) => p.id !== id));
    }
  };

  const updatePet = (id: string, field: keyof PetFormData, value: any) => {
    setPets(pets.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleSubmit = async () => {
    const validPets = pets.filter((p) => p.name.trim());
    if (validPets.length === 0) return;

    setIsLoading(true);
    try {
      const petsToSave = validPets.map((p) => ({
        tutor_id: tutorId,
        name: p.name,
        breed: p.breed || null,
        size: p.size,
        temperament: p.temperament,
        is_aggressive: p.is_aggressive,
        allergies: p.allergies || null,
        notes: p.notes || null,
      }));
      await onSave(petsToSave);
    } finally {
      setIsLoading(false);
    }
  };

  const hasValidPets = pets.some((p) => p.name.trim());

  return (
    <div className="space-y-6">
      {pets.map((pet, index) => (
        <div
          key={pet.id}
          className="p-4 bg-muted/50 rounded-xl space-y-4 relative"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-medium flex items-center gap-2">
              <Dog size={18} className="text-primary" />
              Pet {index + 1}
            </h3>
            {pets.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removePet(pet.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 size={18} />
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Nome do Pet *</Label>
            <Input
              value={pet.name}
              onChange={(e) => updatePet(pet.id, "name", e.target.value)}
              placeholder="Nome do pet"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label>Raça</Label>
            <Input
              value={pet.breed}
              onChange={(e) => updatePet(pet.id, "breed", e.target.value)}
              placeholder="Ex: Golden Retriever"
              className="h-12"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Porte</Label>
              <Select
                value={pet.size}
                onValueChange={(v) => updatePet(pet.id, "size", v)}
              >
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
              <Select
                value={pet.temperament}
                onValueChange={(v) => updatePet(pet.id, "temperament", v)}
              >
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

          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
            <span className="text-orange-600 font-medium text-sm">
              ⚠️ Pet agressivo?
            </span>
            <Switch
              checked={pet.is_aggressive}
              onCheckedChange={(v) => updatePet(pet.id, "is_aggressive", v)}
            />
          </div>

          <div className="space-y-2">
            <Label>Alergias</Label>
            <Input
              value={pet.allergies}
              onChange={(e) => updatePet(pet.id, "allergies", e.target.value)}
              placeholder="Liste as alergias conhecidas"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={pet.notes}
              onChange={(e) => updatePet(pet.id, "notes", e.target.value)}
              placeholder="Cuidados especiais..."
              className="min-h-[60px]"
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addPet}
        className="w-full gap-2"
      >
        <Plus size={18} />
        Adicionar Outro Pet
      </Button>

      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!hasValidPets || isLoading}
          className="flex-1 gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save size={18} />
          )}
          Cadastrar {pets.filter((p) => p.name.trim()).length} Pet(s)
        </Button>
      </div>
    </div>
  );
}
