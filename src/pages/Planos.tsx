import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Save,
  Loader2,
  Package,
} from "lucide-react";
import { plansApi, type Plan } from "@/lib/petcontrol.api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function Planos() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [durationMonths, setDurationMonths] = useState("1");
  const [isActive, setIsActive] = useState(true);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const data = await plansApi.getAll();
      setPlans(data);
    } catch (error) {
      console.error("Error loading plans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setDurationMonths("1");
    setIsActive(true);
    setEditingPlan(null);
  };

  const openNewDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (plan: Plan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setDescription(plan.description || "");
    setPrice(plan.price.toString());
    setDurationMonths((plan.duration_months || 1).toString());
    setIsActive(plan.is_active ?? true);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!name || !price) return;

    setIsSaving(true);
    try {
      const planData = {
        name,
        description: description || null,
        price: parseFloat(price),
        duration_months: parseInt(durationMonths),
        is_active: isActive,
      };

      if (editingPlan) {
        await plansApi.update(editingPlan.id, planData);
        toast({ title: "Plano atualizado!" });
      } else {
        await plansApi.create(planData);
        toast({ title: "Plano criado!" });
      }

      setShowDialog(false);
      resetForm();
      loadPlans();
    } catch (error) {
      console.error("Error saving plan:", error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (!window.confirm(`Excluir o plano "${plan.name}"?`)) return;

    try {
      await plansApi.delete(plan.id);
      toast({ title: "Plano excluído!" });
      loadPlans();
    } catch (error) {
      console.error("Error deleting plan:", error);
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
              <CreditCard className="w-7 h-7 text-primary" />
              Planos
            </h1>
            <p className="text-muted-foreground">
              {plans.length} plano(s) cadastrado(s)
            </p>
          </div>
          {isAdmin && (
            <Button onClick={openNewDialog} className="gap-2">
              <Plus size={18} />
              Novo Plano
            </Button>
          )}
        </div>

        {/* Plans List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="pet-card animate-pulse">
                <div className="h-32 bg-muted rounded-lg" />
              </div>
            ))
          ) : plans.length > 0 ? (
            plans.map((plan) => (
              <div
                key={plan.id}
                className={`pet-card ${
                  !plan.is_active ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  {!plan.is_active && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                      Inativo
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-foreground text-lg">
                  {plan.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {plan.description || "Sem descrição"}
                </p>

                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-2xl font-bold text-primary">
                    R$ {plan.price.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">
                    /{plan.duration_months || 1} mês(es)
                  </span>
                </div>

                {isAdmin && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(plan)}
                      className="flex-1 gap-1"
                    >
                      <Edit size={14} />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(plan)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full pet-card text-center py-12">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum plano cadastrado
              </h3>
              <p className="text-muted-foreground mb-4">
                Crie planos para oferecer aos seus clientes!
              </p>
              {isAdmin && (
                <Button onClick={openNewDialog} className="gap-2">
                  <Plus size={18} />
                  Criar Primeiro Plano
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                {editingPlan ? "Editar Plano" : "Novo Plano"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="planName">Nome *</Label>
                <Input
                  id="planName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Plano Mensal"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="planDescription">Descrição</Label>
                <Textarea
                  id="planDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição do plano..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="planPrice">Preço (R$) *</Label>
                  <Input
                    id="planPrice"
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="planDuration">Duração (meses)</Label>
                  <Input
                    id="planDuration"
                    type="number"
                    min="1"
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                <div>
                  <p className="font-medium text-foreground">Plano Ativo</p>
                  <p className="text-sm text-muted-foreground">
                    Disponível para novos clientes
                  </p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              <Button
                onClick={handleSave}
                disabled={!name || !price || isSaving}
                className="w-full h-12 gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {isSaving ? "Salvando..." : "Salvar Plano"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
