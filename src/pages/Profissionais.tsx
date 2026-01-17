import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Users, 
  Plus,
  Edit,
  Trash2,
  Phone,
  Briefcase
} from "lucide-react";
import { professionalsApi, type Professional } from "@/lib/petcontrol.api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Profissionais() {
  const { toast } = useToast();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [isActive, setIsActive] = useState(true);

  const loadProfessionals = async () => {
    setIsLoading(true);
    try {
      const data = await professionalsApi.getAll();
      setProfessionals(data);
    } catch (error) {
      console.error('Error loading professionals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfessionals();
  }, []);

  const resetForm = () => {
    setName("");
    setPhone("");
    setSpecialty("");
    setIsActive(true);
    setEditingProfessional(null);
  };

  const handleEdit = (professional: Professional) => {
    setEditingProfessional(professional);
    setName(professional.name);
    setPhone(professional.phone || "");
    setSpecialty(professional.specialty || "");
    setIsActive(professional.is_active ?? true);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!name) return;

    try {
      if (editingProfessional) {
        await professionalsApi.update(editingProfessional.id, {
          name,
          phone: phone || null,
          specialty: specialty || null,
          is_active: isActive,
        });
        toast({ title: "Profissional atualizado!" });
      } else {
        await professionalsApi.create({
          name,
          phone: phone || null,
          specialty: specialty || null,
          is_active: isActive,
        });
        toast({ title: "Profissional cadastrado!" });
      }
      setShowForm(false);
      resetForm();
      loadProfessionals();
    } catch (error) {
      console.error('Error saving professional:', error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir este profissional?")) return;

    try {
      await professionalsApi.delete(id);
      toast({ title: "Profissional excluído!" });
      loadProfessionals();
    } catch (error) {
      console.error('Error deleting professional:', error);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-7 h-7 text-primary" />
              Profissionais
            </h1>
            <p className="text-muted-foreground">{professionals.length} profissionais cadastrados</p>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
            <Plus size={18} />
            Novo
          </Button>
        </div>

        {/* Professionals List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="pet-card animate-pulse">
                <div className="h-24 bg-muted rounded-lg" />
              </div>
            ))
          ) : professionals.length > 0 ? (
            professionals.map(professional => (
              <div 
                key={professional.id} 
                className={cn("pet-card", !professional.is_active && "opacity-60")}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-secondary" />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(professional)}
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(professional.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{professional.name}</h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full font-medium",
                    professional.is_active 
                      ? "bg-green-100 text-green-700" 
                      : "bg-gray-100 text-gray-600"
                  )}>
                    {professional.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {professional.phone && (
                    <p className="flex items-center gap-2">
                      <Phone size={14} />
                      {professional.phone}
                    </p>
                  )}
                  {professional.specialty && (
                    <p className="flex items-center gap-2">
                      <Briefcase size={14} />
                      {professional.specialty}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full pet-card text-center py-12">
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum profissional cadastrado
              </h3>
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus size={18} />
                Cadastrar Profissional
              </Button>
            </div>
          )}
        </div>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                {editingProfessional ? 'Editar Profissional' : 'Novo Profissional'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome completo"
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Especialidade</Label>
                <Input
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Ex: Tosa, Banho, Veterinário..."
                  className="h-12"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                <Label className="cursor-pointer">Profissional Ativo</Label>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!name}
                className="w-full h-12"
              >
                {editingProfessional ? 'Salvar Alterações' : 'Cadastrar Profissional'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
