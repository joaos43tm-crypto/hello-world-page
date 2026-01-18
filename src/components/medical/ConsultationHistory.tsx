import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ConsultationRow = {
  id: string;
  pet_id: string | null;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
};

type PetRow = {
  id: string;
  name: string;
  tutor_id: string;
};

interface ConsultationHistoryProps {
  petId?: string;
  tutorId?: string;
  limit?: number;
  title?: string;
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function ConsultationHistory({
  petId,
  tutorId,
  limit = 20,
  title = "Histórico de consultas",
}: ConsultationHistoryProps) {
  // Our generated DB types may lag behind newly created tables.
  const db = supabase as any;

  const [isLoading, setIsLoading] = useState(true);
  const [pets, setPets] = useState<PetRow[]>([]);
  const [items, setItems] = useState<ConsultationRow[]>([]);

  const petNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pets) map.set(p.id, p.name);
    return map;
  }, [pets]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        let petIds: string[] = [];

        if (petId) {
          petIds = [petId];
        } else if (tutorId) {
          const { data: petsData, error: petsError } = await supabase
            .from("pets")
            .select("id,name,tutor_id")
            .eq("tutor_id", tutorId)
            .order("name");

          if (petsError) throw petsError;

          const nextPets = (petsData ?? []) as PetRow[];
          petIds = nextPets.map((p) => p.id);
          if (!cancelled) setPets(nextPets);
        } else {
          // Nothing to load
          if (!cancelled) {
            setPets([]);
            setItems([]);
          }
          return;
        }

        if (petIds.length === 0) {
          if (!cancelled) setItems([]);
          return;
        }

        // If petId was provided, we still want its name for grouping/label.
        if (petId && pets.length === 0) {
          const { data: onePet, error: onePetErr } = await supabase
            .from("pets")
            .select("id,name,tutor_id")
            .eq("id", petId)
            .maybeSingle();
          if (!onePetErr && onePet) {
            if (!cancelled) setPets([(onePet as PetRow)]);
          }
        }

        const { data, error } = await db
          .from("medical_consultations")
          .select("id,pet_id,started_at,ended_at,notes")
          .in("pet_id", petIds)
          .order("started_at", { ascending: false })
          .limit(limit);

        if (error) throw error;
        if (!cancelled) setItems((data ?? []) as ConsultationRow[]);
      } catch (e) {
        console.error("Error loading consultation history:", e);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId, tutorId, limit]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma consulta registrada.</p>
        ) : (
          <div className="space-y-3">
            {items.map((c) => (
              <div key={c.id} className="p-3 rounded-xl bg-muted/50 border border-border">
                {tutorId && c.pet_id ? (
                  <p className="text-sm font-medium text-foreground">
                    {petNameById.get(c.pet_id) ?? "Pet"}
                  </p>
                ) : null}

                <p className="text-xs text-muted-foreground">
                  Início: {formatDateTime(c.started_at)}
                  {c.ended_at ? ` • Fim: ${formatDateTime(c.ended_at)}` : " • Em andamento"}
                </p>

                {c.notes ? (
                  <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{c.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">Sem anotações.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
