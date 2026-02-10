import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  Clock,
  DollarSign,
} from "lucide-react";
import { servicesApi, type Service } from "@/lib/petcontrol.api";
import { useToast } from "@/hooks/use-toast";
import {
  SERVICE_ICON_OPTIONS,
  type ServiceIconKey,
  getServiceIconByKey,
} from "@/lib/serviceIcons";

export default function Servicos() {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("60");
  const [iconKey, setIconKey] = useState<ServiceIconKey>("scissors");

  const loadServices = async () => {
    setIsLoading(true);
    try {
      const data = await servicesApi.getAll();
      setServices(data);
    } catch (error) {
      console.error("Error loading services:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setDuration("60");
    setIconKey("scissors");
    setEditingService(null);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setName(service.name);
    setDescription(service.description || "");
    setPrice(service.price.toString());
    setDuration(service.duration_minutes?.toString() || "60");
    setIconKey((service.icon_key as ServiceIconKey) || "scissors");
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!name || !price) return;

    try {
      if (editingService) {
        await servicesApi.update(editingService.id, {
          name,
          description: description || null,
          price: parseFloat(price),
          duration_minutes: parseInt(duration),
          icon_key: iconKey,
        });
        toast({ title: "Serviço atualizado!" });
      } else {
        await servicesApi.create({
          name,
          description: description || null,
          price: parseFloat(price),
          duration_minutes: parseInt(duration),
          icon_key: iconKey,
        });
        toast({ title: "Serviço cadastrado!" });
      }
      setShowForm(false);
      resetForm();
      loadServices();
    } catch (error) {
      console.error("Error saving service:", error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir este serviço?")) return;

    try {
      await servicesApi.delete(id);
      toast({ title: "Serviço excluído!" });
      loadServices();
    } catch (error) {
      console.error("Error deleting service:", error);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const SelectedIcon = getServiceIconByKey(iconKey);

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <SelectedIcon className="w-7 h-7 text-primary" />
              Serviços
            </h1>
            <p className="text-muted-foreground">
              {services.length} serviços cadastrados
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="gap-2"
          >
            <Plus size={18} />
            Novo Serviço
          </Button>
        </div>

        {/* Services List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="pet-card animate-pulse">
                <div className="h-24 bg-muted rounded-lg" />
              </div>
            ))
          ) : services.length > 0 ? (
            services.map((service) => {
              const Icon = getServiceIconByKey(service.icon_key);
              return (
                <div key={service.id} className="pet-card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center">
                      <Icon className="w-6 h-6 text-secondary" />
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(service)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(service.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">
                    {service.name}
                  </h3>
                  {service.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {service.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-primary font-semibold">
                      <DollarSign size={14} />
                      R$ {service.price.toFixed(2)}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock size={14} />
                      {service.duration_minutes} min
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full pet-card text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
                <SelectedIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum serviço cadastrado
              </h3>
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus size={18} />
                Cadastrar Serviço
              </Button>
            </div>
          )}
        </div>

        {/* Form Dialog */}
        <Dialog
          open={showForm}
          onOpenChange={(open) => {
            setShowForm(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <SelectedIcon className="w-5 h-5 text-primary" />
                {editingService ? "Editar Serviço" : "Novo Serviço"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Banho e Tosa"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label>Símbolo</Label>
                <Select value={iconKey} onValueChange={(v) => setIconKey(v as ServiceIconKey)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Selecione um símbolo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_ICON_OPTIONS.map(({ key, label, Icon }) => (
                      <SelectItem key={key} value={key}>
                        <span className="inline-flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição do serviço..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preço (R$) *</Label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duração (min)</Label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="60"
                    className="h-12"
                  />
                </div>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!name || !price}
                className="w-full h-12"
              >
                {editingService ? "Salvar Alterações" : "Cadastrar Serviço"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
