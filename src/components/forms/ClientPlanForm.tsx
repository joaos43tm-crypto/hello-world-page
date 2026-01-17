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
import { Switch } from "@/components/ui/switch";
import { Save, Loader2 } from "lucide-react";
import { plansApi, type Plan, type ClientPlan } from "@/lib/petcontrol.api";

interface ClientPlanFormProps {
  tutorId: string;
  existingPlan?: ClientPlan | null;
  onSave: (data: Omit<ClientPlan, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
}

export function ClientPlanForm({ tutorId, existingPlan, onSave, onCancel }: ClientPlanFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState(existingPlan?.plan_id || "");
  const [startDate, setStartDate] = useState(
    existingPlan?.start_date || new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(existingPlan?.due_date || "");
  const [isPaid, setIsPaid] = useState(existingPlan?.is_paid || false);
  const [paymentMethod, setPaymentMethod] = useState(existingPlan?.payment_method || "");
  const [notes, setNotes] = useState(existingPlan?.notes || "");

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await plansApi.getActive();
      setPlans(data);
    } catch (error) {
      console.error("Error loading plans:", error);
    }
  };

  const handlePlanChange = (selectedPlanId: string) => {
    setPlanId(selectedPlanId);
    const plan = plans.find((p) => p.id === selectedPlanId);
    if (plan && !existingPlan) {
      // Calculate due date based on plan duration
      const start = new Date(startDate);
      start.setMonth(start.getMonth() + (plan.duration_months || 1));
      setDueDate(start.toISOString().split("T")[0]);
    }
  };

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      const start = new Date(date);
      start.setMonth(start.getMonth() + (plan.duration_months || 1));
      setDueDate(start.toISOString().split("T")[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planId || !dueDate) return;

    setIsLoading(true);
    try {
      await onSave({
        tutor_id: tutorId,
        plan_id: planId,
        start_date: startDate,
        due_date: dueDate,
        is_paid: isPaid,
        paid_at: isPaid ? new Date().toISOString() : null,
        payment_method: paymentMethod || null,
        notes: notes || null,
        is_active: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPlan = plans.find((p) => p.id === planId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Plano *</Label>
        <Select value={planId} onValueChange={handlePlanChange}>
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Selecione um plano" />
          </SelectTrigger>
          <SelectContent>
            {plans.map((plan) => (
              <SelectItem key={plan.id} value={plan.id}>
                {plan.name} - R$ {plan.price.toFixed(2)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedPlan && (
          <p className="text-sm text-muted-foreground">
            {selectedPlan.description} • {selectedPlan.duration_months} mês(es)
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Data Início</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Vencimento *</Label>
          <Input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-12"
            required
          />
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
        <div>
          <p className="font-medium text-green-700">Pagamento Realizado?</p>
          <p className="text-sm text-green-600">Marque se o cliente já pagou</p>
        </div>
        <Switch checked={isPaid} onCheckedChange={setIsPaid} />
      </div>

      {isPaid && (
        <div className="space-y-2">
          <Label>Forma de Pagamento</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dinheiro">Dinheiro</SelectItem>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
              <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anotações sobre o plano..."
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
        <Button
          type="submit"
          disabled={!planId || !dueDate || isLoading}
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
