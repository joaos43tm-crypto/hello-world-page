import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TutorPetForm } from "@/components/forms/TutorPetForm";
import { ClientEditForm } from "@/components/forms/ClientEditForm";
import { PetEditForm } from "@/components/forms/PetEditForm";
import { MultiPetForm } from "@/components/forms/MultiPetForm";
import { ClientPlanForm } from "@/components/forms/ClientPlanForm";
import { 
  Dog, 
  Plus,
  Search,
  Phone,
  Star,
  AlertTriangle,
  User,
  MessageCircle,
  Edit,
  CreditCard,
  Calendar,
  Check,
  X,
} from "lucide-react";
import { 
  tutorsApi, 
  petsApi,
  whatsappApi,
  clientPlansApi,
  type Tutor,
  type Pet,
  type ClientPlan,
} from "@/lib/petcontrol.api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export default function Clientes() {
  const { toast } = useToast();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [clientPlans, setClientPlans] = useState<ClientPlan[]>([]);
  const [plansEnabled, setPlansEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showNewClient, setShowNewClient] = useState(false);
  
  // Edit states
  const [editingTutor, setEditingTutor] = useState<Tutor | null>(null);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [addingPetsToTutor, setAddingPetsToTutor] = useState<Tutor | null>(null);
  const [addingPlanToTutor, setAddingPlanToTutor] = useState<Tutor | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tutorsData, petsData, plansData, settingsData] = await Promise.all([
        tutorsApi.getAll(),
        petsApi.getAll(),
        clientPlansApi.getAll(),
        supabase.from('store_settings_public').select('plans_enabled').limit(1).maybeSingle(),
      ]);
      setTutors(tutorsData);
      setPets(petsData);
      setClientPlans(plansData);
      setPlansEnabled(settingsData.data?.plans_enabled || false);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveTutor = async (data: Omit<Tutor, 'id' | 'created_at' | 'updated_at'>) => {
    const tutor = await tutorsApi.create(data);
    toast({ title: "Tutor cadastrado!" });
    return tutor;
  };

  const handleUpdateTutor = async (data: Partial<Tutor>) => {
    if (!editingTutor) return;
    await tutorsApi.update(editingTutor.id, data);
    toast({ title: "Cliente atualizado!" });
    setEditingTutor(null);
    loadData();
  };

  const handleSavePet = async (data: Omit<Pet, 'id' | 'created_at' | 'updated_at'>) => {
    await petsApi.create(data);
    toast({ title: "Pet cadastrado com sucesso!" });
    setShowNewClient(false);
    loadData();
  };

  const handleSaveMultiplePets = async (petsData: Omit<Pet, 'id' | 'created_at' | 'updated_at'>[]) => {
    for (const pet of petsData) {
      await petsApi.create(pet);
    }
    toast({ title: `${petsData.length} pet(s) cadastrado(s)!` });
    setAddingPetsToTutor(null);
    loadData();
  };

  const handleUpdatePet = async (data: Partial<Pet>) => {
    if (!editingPet) return;
    await petsApi.update(editingPet.id, data);
    toast({ title: "Pet atualizado!" });
    setEditingPet(null);
    loadData();
  };

  const handleDeletePet = async () => {
    if (!editingPet) return;
    await petsApi.delete(editingPet.id);
    toast({ title: "Pet excluído!" });
    setEditingPet(null);
    loadData();
  };

  const handleSaveClientPlan = async (data: Omit<ClientPlan, 'id' | 'created_at' | 'updated_at'>) => {
    await clientPlansApi.create(data);
    toast({ title: "Plano associado ao cliente!" });
    setAddingPlanToTutor(null);
    loadData();
  };

  const handleMarkPlanAsPaid = async (planId: string) => {
    await clientPlansApi.markAsPaid(planId, 'pix');
    toast({ title: "Pagamento registrado!" });
    loadData();
  };

  const handleWhatsApp = (tutor: Tutor) => {
    const message = `Olá ${tutor.name}! 🐾`;
    whatsappApi.openWhatsApp(tutor.phone, message);
  };

  const filteredTutors = searchQuery 
    ? tutors.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.phone.includes(searchQuery)
      )
    : tutors;

  const getPetsByTutor = (tutorId: string) => 
    pets.filter(p => p.tutor_id === tutorId);

  const getPlansByTutor = (tutorId: string) =>
    clientPlans.filter(p => p.tutor_id === tutorId && p.is_active);

  const sizeLabels = { pequeno: 'P', medio: 'M', grande: 'G' };
  const temperamentColors = {
    docil: 'bg-green-100 text-green-700',
    agitado: 'bg-yellow-100 text-yellow-700',
    agressivo: 'bg-red-100 text-red-700',
    timido: 'bg-blue-100 text-blue-700',
  };

  const isPlanOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Dog className="w-7 h-7 text-primary" />
              Clientes & Pets
            </h1>
            <p className="text-muted-foreground">
              {tutors.length} tutores • {pets.length} pets
            </p>
          </div>
          <Button onClick={() => setShowNewClient(true)} className="gap-2">
            <Plus size={18} />
            Novo
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <Input
            type="search"
            placeholder="Buscar por nome ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Clients List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="pet-card animate-pulse">
                  <div className="h-24 bg-muted rounded-lg" />
                </div>
              ))}
            </div>
          ) : filteredTutors.length > 0 ? (
            filteredTutors.map(tutor => {
              const tutorPets = getPetsByTutor(tutor.id);
              const tutorPlans = getPlansByTutor(tutor.id);
              
              return (
                <div key={tutor.id} className="pet-card">
                  {/* Tutor Info */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-secondary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{tutor.name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone size={12} />
                          {tutor.phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingTutor(tutor)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Edit size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleWhatsApp(tutor)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <MessageCircle size={20} />
                      </Button>
                    </div>
                  </div>

                  {/* Client Plans (if enabled) */}
                  {plansEnabled && tutorPlans.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {tutorPlans.map(plan => (
                        <div
                          key={plan.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl",
                            plan.is_paid
                              ? "bg-green-50"
                              : isPlanOverdue(plan.due_date)
                              ? "bg-red-50"
                              : "bg-yellow-50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <CreditCard size={16} className={cn(
                              plan.is_paid
                                ? "text-green-600"
                                : isPlanOverdue(plan.due_date)
                                ? "text-red-600"
                                : "text-yellow-600"
                            )} />
                            <div>
                              <p className="font-medium text-sm">{plan.plan?.name}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar size={10} />
                                Vencimento: {new Date(plan.due_date).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {plan.is_paid ? (
                              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                <Check size={14} />
                                Pago
                              </span>
                            ) : (
                              <>
                                <span className={cn(
                                  "text-xs font-medium",
                                  isPlanOverdue(plan.due_date)
                                    ? "text-red-600"
                                    : "text-yellow-600"
                                )}>
                                  {isPlanOverdue(plan.due_date) ? "Vencido" : "Pendente"}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMarkPlanAsPaid(plan.id)}
                                  className="h-7 text-xs"
                                >
                                  Marcar Pago
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pets */}
                  <div className="space-y-2">
                    {tutorPets.length > 0 ? (
                      tutorPets.map(pet => (
                        <div
                          key={pet.id}
                          className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => setEditingPet(pet)}
                        >
                          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                            <Dog className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground truncate">
                                {pet.name}
                              </span>
                              {pet.is_aggressive && (
                                <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {pet.breed || 'SRD'} • {sizeLabels[pet.size || 'medio']}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {pet.temperament && (
                              <span className={cn(
                                "text-xs px-2 py-1 rounded-full font-medium",
                                temperamentColors[pet.temperament]
                              )}>
                                {pet.temperament}
                              </span>
                            )}
                            <div className="flex items-center gap-1 text-primary">
                              <Star size={14} fill="currentColor" />
                              <span className="text-sm font-medium">{pet.loyalty_points || 0}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        Nenhum pet cadastrado
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAddingPetsToTutor(tutor)}
                      className="flex-1 gap-1"
                    >
                      <Plus size={14} />
                      Adicionar Pet
                    </Button>
                    {plansEnabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddingPlanToTutor(tutor)}
                        className="flex-1 gap-1"
                      >
                        <CreditCard size={14} />
                        Associar Plano
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="pet-card text-center py-12">
              <Dog className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchQuery ? 'Nenhum resultado' : 'Nenhum cliente cadastrado'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? 'Tente buscar por outro termo.'
                  : 'Comece cadastrando um novo cliente!'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowNewClient(true)} className="gap-2">
                  <Plus size={18} />
                  Cadastrar Cliente
                </Button>
              )}
            </div>
          )}
        </div>

        {/* New Client Dialog */}
        <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Dog className="w-5 h-5 text-primary" />
                Novo Cadastro
              </DialogTitle>
            </DialogHeader>
            <TutorPetForm
              onSaveTutor={handleSaveTutor}
              onSavePet={handleSavePet}
              existingTutors={tutors}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Tutor Dialog */}
        <Dialog open={!!editingTutor} onOpenChange={(open) => !open && setEditingTutor(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Editar Cliente
              </DialogTitle>
            </DialogHeader>
            {editingTutor && (
              <ClientEditForm
                tutor={editingTutor}
                onSave={handleUpdateTutor}
                onCancel={() => setEditingTutor(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Pet Dialog */}
        <Dialog open={!!editingPet} onOpenChange={(open) => !open && setEditingPet(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Dog className="w-5 h-5 text-primary" />
                Editar Pet
              </DialogTitle>
            </DialogHeader>
            {editingPet && (
              <PetEditForm
                pet={editingPet}
                onSave={handleUpdatePet}
                onDelete={handleDeletePet}
                onCancel={() => setEditingPet(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Add Pets to Tutor Dialog */}
        <Dialog open={!!addingPetsToTutor} onOpenChange={(open) => !open && setAddingPetsToTutor(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Dog className="w-5 h-5 text-primary" />
                Adicionar Pets - {addingPetsToTutor?.name}
              </DialogTitle>
            </DialogHeader>
            {addingPetsToTutor && (
              <MultiPetForm
                tutorId={addingPetsToTutor.id}
                onSave={handleSaveMultiplePets}
                onCancel={() => setAddingPetsToTutor(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Add Plan to Tutor Dialog */}
        <Dialog open={!!addingPlanToTutor} onOpenChange={(open) => !open && setAddingPlanToTutor(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Associar Plano - {addingPlanToTutor?.name}
              </DialogTitle>
            </DialogHeader>
            {addingPlanToTutor && (
              <ClientPlanForm
                tutorId={addingPlanToTutor.id}
                onSave={handleSaveClientPlan}
                onCancel={() => setAddingPlanToTutor(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
