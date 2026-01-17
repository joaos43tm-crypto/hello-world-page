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
import { User, Dog, Save, Plus } from "lucide-react";
import type { Tutor, Pet, PetSize, PetTemperament } from "@/lib/petcontrol.api";

interface TutorPetFormProps {
  tutor?: Tutor | null;
  pet?: Pet | null;
  onSaveTutor: (data: Omit<Tutor, 'id' | 'created_at' | 'updated_at'>) => Promise<Tutor>;
  onSavePet: (data: Omit<Pet, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  existingTutors?: Tutor[];
}

export function TutorPetForm({ 
  tutor, 
  pet, 
  onSaveTutor, 
  onSavePet,
  existingTutors = []
}: TutorPetFormProps) {
  const [step, setStep] = useState<'tutor' | 'pet'>(tutor ? 'pet' : 'tutor');
  const [selectedTutorId, setSelectedTutorId] = useState<string>(tutor?.id || "");
  const [isLoading, setIsLoading] = useState(false);

  // Tutor form
  const [tutorName, setTutorName] = useState(tutor?.name || "");
  const [tutorPhone, setTutorPhone] = useState(tutor?.phone || "");
  const [tutorEmail, setTutorEmail] = useState(tutor?.email || "");
  const [tutorAddress, setTutorAddress] = useState(tutor?.address || "");
  const [tutorNotes, setTutorNotes] = useState(tutor?.notes || "");

  // Pet form
  const [petName, setPetName] = useState(pet?.name || "");
  const [petBreed, setPetBreed] = useState(pet?.breed || "");
  const [petSize, setPetSize] = useState<PetSize>(pet?.size || "medio");
  const [petTemperament, setPetTemperament] = useState<PetTemperament>(pet?.temperament || "docil");
  const [petIsAggressive, setPetIsAggressive] = useState(pet?.is_aggressive || false);
  const [petAllergies, setPetAllergies] = useState(pet?.allergies || "");
  const [petNotes, setPetNotes] = useState(pet?.notes || "");

  const handleSaveTutor = async () => {
    setIsLoading(true);
    try {
      const newTutor = await onSaveTutor({
        name: tutorName,
        phone: tutorPhone,
        email: tutorEmail || null,
        address: tutorAddress || null,
        notes: tutorNotes || null,
      });
      setSelectedTutorId(newTutor.id);
      setStep('pet');
    } catch (error) {
      console.error('Error saving tutor:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePet = async () => {
    if (!selectedTutorId) return;
    
    setIsLoading(true);
    try {
      await onSavePet({
        tutor_id: selectedTutorId,
        name: petName,
        breed: petBreed || null,
        size: petSize,
        temperament: petTemperament,
        is_aggressive: petIsAggressive,
        allergies: petAllergies || null,
        notes: petNotes || null,
      });
    } catch (error) {
      console.error('Error saving pet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectExistingTutor = (tutorId: string) => {
    setSelectedTutorId(tutorId);
    const selected = existingTutors.find(t => t.id === tutorId);
    if (selected) {
      setTutorName(selected.name);
      setTutorPhone(selected.phone);
      setTutorEmail(selected.email || "");
      setTutorAddress(selected.address || "");
      setTutorNotes(selected.notes || "");
    }
    setStep('pet');
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex gap-2">
        <button
          onClick={() => setStep('tutor')}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
            step === 'tutor' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
          }`}
        >
          <User size={18} />
          1. Tutor
        </button>
        <button
          onClick={() => selectedTutorId && setStep('pet')}
          disabled={!selectedTutorId}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
            step === 'pet' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
          } disabled:opacity-50`}
        >
          <Dog size={18} />
          2. Pet
        </button>
      </div>

      {/* Tutor Form */}
      {step === 'tutor' && (
        <div className="space-y-4 animate-fade-in">
          {/* Select existing tutor */}
          {existingTutors.length > 0 && (
            <div className="space-y-2">
              <Label>Tutor existente</Label>
              <Select onValueChange={handleSelectExistingTutor}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar tutor existente..." />
                </SelectTrigger>
                <SelectContent>
                  {existingTutors.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} - {t.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground text-center">ou cadastre um novo</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="tutorName">Nome *</Label>
            <Input
              id="tutorName"
              value={tutorName}
              onChange={(e) => setTutorName(e.target.value)}
              placeholder="Nome do tutor"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tutorPhone">Telefone/WhatsApp *</Label>
            <Input
              id="tutorPhone"
              value={tutorPhone}
              onChange={(e) => setTutorPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tutorEmail">E-mail</Label>
            <Input
              id="tutorEmail"
              type="email"
              value={tutorEmail}
              onChange={(e) => setTutorEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tutorAddress">Endereço</Label>
            <Input
              id="tutorAddress"
              value={tutorAddress}
              onChange={(e) => setTutorAddress(e.target.value)}
              placeholder="Endereço completo"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tutorNotes">Observações</Label>
            <Textarea
              id="tutorNotes"
              value={tutorNotes}
              onChange={(e) => setTutorNotes(e.target.value)}
              placeholder="Anotações sobre o cliente..."
              className="min-h-[80px]"
            />
          </div>

          <Button
            onClick={handleSaveTutor}
            disabled={!tutorName || !tutorPhone || isLoading}
            className="w-full h-14 text-lg gap-2"
          >
            <Save size={20} />
            {isLoading ? "Salvando..." : "Salvar e Continuar"}
          </Button>
        </div>
      )}

      {/* Pet Form */}
      {step === 'pet' && (
        <div className="space-y-4 animate-fade-in">
          <div className="space-y-2">
            <Label htmlFor="petName">Nome do Pet *</Label>
            <Input
              id="petName"
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              placeholder="Nome do pet"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="petBreed">Raça</Label>
            <Input
              id="petBreed"
              value={petBreed}
              onChange={(e) => setPetBreed(e.target.value)}
              placeholder="Ex: Golden Retriever"
              className="h-12 text-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Porte</Label>
              <Select value={petSize} onValueChange={(v) => setPetSize(v as PetSize)}>
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
              <Select value={petTemperament} onValueChange={(v) => setPetTemperament(v as PetTemperament)}>
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
            <div className="flex items-center gap-2">
              <span className="text-orange-600 font-medium">⚠️ Pet agressivo?</span>
            </div>
            <Switch
              checked={petIsAggressive}
              onCheckedChange={setPetIsAggressive}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="petAllergies">Alergias</Label>
            <Input
              id="petAllergies"
              value={petAllergies}
              onChange={(e) => setPetAllergies(e.target.value)}
              placeholder="Liste as alergias conhecidas"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="petNotes">Observações Importantes</Label>
            <Textarea
              id="petNotes"
              value={petNotes}
              onChange={(e) => setPetNotes(e.target.value)}
              placeholder="Cuidados especiais, preferências..."
              className="min-h-[80px]"
            />
          </div>

          <Button
            onClick={handleSavePet}
            disabled={!petName || isLoading}
            className="w-full h-14 text-lg gap-2"
          >
            <Plus size={20} />
            {isLoading ? "Salvando..." : "Cadastrar Pet"}
          </Button>
        </div>
      )}
    </div>
  );
}
