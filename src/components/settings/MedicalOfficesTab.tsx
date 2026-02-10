import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Plus, Save, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

type MedicalOffice = {
  id: string;
  name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

const officeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe um nome")
    .max(80, "Use até 80 caracteres"),
  is_active: z.boolean(),
});

export function MedicalOfficesTab() {
  const { toast } = useToast();

  // Our generated DB types may lag behind newly created tables.
  const db = supabase as any;

  const [items, setItems] = useState<MedicalOffice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await db
        .from("medical_offices")
        .select("id,name,is_active,created_at,updated_at")
        .order("name");

      if (error) throw error;
      setItems((data ?? []) as MedicalOffice[]);
    } catch (e) {
      console.error("Error loading medical offices:", e);
      toast({ title: "Erro ao carregar consultórios", variant: "destructive" });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (office: MedicalOffice) => {
    setEditingId(office.id);
    setEditingName(office.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveEdit = async () => {
    if (!editingId) return;

    const parsed = officeSchema.safeParse({
      name: editingName,
      is_active: true,
    });

    if (!parsed.success) {
      toast({
        title: "Nome inválido",
        description: parsed.error.issues[0]?.message,
        variant: "destructive",
      });
      return;
    }

    setIsSavingEdit(true);
    try {
      const { error } = await db
        .from("medical_offices")
        .update({ name: parsed.data.name })
        .eq("id", editingId);

      if (error) throw error;

      setItems((prev) =>
        prev.map((o) => (o.id === editingId ? { ...o, name: parsed.data.name } : o)),
      );
      toast({ title: "Consultório atualizado" });
      cancelEdit();
    } catch (e) {
      console.error("Error updating office:", e);
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const toggleActive = async (office: MedicalOffice, next: boolean) => {
    try {
      const { error } = await db
        .from("medical_offices")
        .update({ is_active: next })
        .eq("id", office.id);

      if (error) throw error;

      setItems((prev) =>
        prev.map((o) => (o.id === office.id ? { ...o, is_active: next } : o)),
      );
      toast({
        title: next ? "Consultório ativado" : "Consultório desativado",
      });
    } catch (e) {
      console.error("Error toggling office:", e);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const createOffice = async () => {
    const parsed = officeSchema.safeParse({ name: newName, is_active: newActive });

    if (!parsed.success) {
      toast({
        title: "Dados inválidos",
        description: parsed.error.issues[0]?.message,
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await db
        .from("medical_offices")
        .insert({ name: parsed.data.name, is_active: parsed.data.is_active })
        .select("id,name,is_active,created_at,updated_at")
        .single();

      if (error) throw error;

      setItems((prev) => {
        const next = [data as MedicalOffice, ...prev];
        next.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        return next;
      });

      toast({ title: "Consultório criado" });
      setCreateOpen(false);
      setNewName("");
      setNewActive(true);
    } catch (e) {
      console.error("Error creating office:", e);
      toast({ title: "Erro ao criar", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const deleteOffice = async (office: MedicalOffice) => {
    try {
      const { error } = await db.from("medical_offices").delete().eq("id", office.id);
      if (error) throw error;

      setItems((prev) => prev.filter((o) => o.id !== office.id));
      toast({ title: "Consultório removido" });
    } catch (e) {
      console.error("Error deleting office:", e);
      toast({
        title: "Erro ao remover",
        description: "Verifique se não existe consulta vinculada a este consultório.",
        variant: "destructive",
      });
    }
  };

  const activeCount = useMemo(() => items.filter((i) => i.is_active).length, [items]);

  return (
    <div className="pet-card space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">Consultórios</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os consultórios/salas disponíveis para a Consulta Médica. Apenas os
            <span className="font-medium text-foreground"> ativos</span> aparecem para seleção.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 whitespace-nowrap">
              <Plus size={18} />
              Novo consultório
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo consultório</DialogTitle>
              <DialogDescription>Crie uma sala/consultório para atendimentos.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="officeName">Nome</Label>
                <Input
                  id="officeName"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Consultório 1"
                  className="h-12"
                  maxLength={80}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
                <div>
                  <p className="font-medium text-foreground">Ativo</p>
                  <p className="text-sm text-muted-foreground">
                    Se desativado, não aparecerá na Consulta Médica.
                  </p>
                </div>
                <Switch checked={newActive} onCheckedChange={setNewActive} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={isCreating}>
                Cancelar
              </Button>
              <Button onClick={createOffice} disabled={isCreating} className="gap-2">
                <Save size={18} />
                {isCreating ? "Salvando..." : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="text-sm text-muted-foreground">
        {isLoading ? "Carregando..." : `${activeCount} ativo(s) • ${items.length} total`}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">Nenhum consultório cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((office) => {
            const isEditing = editingId === office.id;

            return (
              <div
                key={office.id}
                className="flex flex-col gap-3 rounded-xl border bg-background p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-11"
                        maxLength={80}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={saveEdit}
                        disabled={isSavingEdit}
                        className="whitespace-nowrap"
                      >
                        {isSavingEdit ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(office)}
                      className="text-left"
                    >
                      <p className="font-medium text-foreground truncate">{office.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Clique no nome para editar
                      </p>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 md:justify-end">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Ativo</span>
                    <Switch
                      checked={office.is_active}
                      onCheckedChange={(v) => toggleActive(office, v)}
                      disabled={isEditing}
                    />
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        disabled={isEditing}
                        aria-label="Remover consultório"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover consultório?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Essa ação não pode ser desfeita. Se houver atendimentos vinculados,
                          a remoção pode falhar.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteOffice(office)}>
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          Dica: para esconder um consultório sem perder o cadastro, basta desativar.
        </p>
      </div>
    </div>
  );
}
