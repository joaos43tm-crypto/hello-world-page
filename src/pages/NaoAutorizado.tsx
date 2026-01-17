import { Link, useLocation } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/MainLayout";

export default function NaoAutorizado() {
  const location = useLocation();
  const from = (location.state as any)?.from;

  return (
    <MainLayout>
      <div className="p-4 md:p-6">
        <section className="pet-card max-w-xl mx-auto text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Acesso não autorizado</h1>
          <p className="mt-2 text-muted-foreground">
            Sua permissão atual não permite acessar esta área.
          </p>
          {from && (
            <p className="mt-2 text-xs text-muted-foreground">
              Tentativa de acesso: <span className="font-medium">{from}</span>
            </p>
          )}

          <div className="mt-6 flex items-center justify-center gap-2">
            <Button asChild variant="outline" className="gap-2">
              <Link to={".."}>
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Link>
            </Button>
            <Button asChild>
              <Link to="/">Ir para o Dashboard</Link>
            </Button>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
