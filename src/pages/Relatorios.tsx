import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { 
  BarChart3, 
  DollarSign, 
  TrendingUp,
  Dog,
  Scissors,
  Star,
  Calendar
} from "lucide-react";
import { 
  reportsApi, 
  salesApi,
  type Pet,
  type Sale 
} from "@/lib/petcontrol.api";

export default function Relatorios() {
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [frequentPets, setFrequentPets] = useState<Pet[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [topServices, setTopServices] = useState<{ service: any; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const today = new Date();
        const [daily, monthly, pets, sales, services] = await Promise.all([
          reportsApi.getDailyRevenue(today.toISOString().split('T')[0]),
          reportsApi.getMonthlyRevenue(today.getFullYear(), today.getMonth() + 1),
          reportsApi.getMostFrequentPets(5),
          salesApi.getToday(),
          reportsApi.getTopServices(),
        ]);
        setDailyRevenue(daily);
        setMonthlyRevenue(monthly);
        setFrequentPets(pets);
        setRecentSales(sales);
        setTopServices(services.slice(0, 5));
      } catch (error) {
        console.error('Error loading reports:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const today = new Date();
  const monthName = today.toLocaleDateString('pt-BR', { month: 'long' });

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary" />
            Relatórios
          </h1>
          <p className="text-muted-foreground">
            Visão geral do seu pet shop
          </p>
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            title="Faturamento Hoje"
            value={`R$ ${dailyRevenue.toFixed(2)}`}
            icon={DollarSign}
            variant="success"
          />
          <StatCard
            title={`Faturamento ${monthName}`}
            value={`R$ ${monthlyRevenue.toFixed(2)}`}
            icon={TrendingUp}
            variant="primary"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Frequent Pets */}
          <div className="pet-card">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Pets Mais Frequentes
            </h2>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : frequentPets.length > 0 ? (
              <div className="space-y-3">
                {frequentPets.map((pet, index) => (
                  <div
                    key={pet.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl"
                  >
                    <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                      <span className="font-bold text-primary">{index + 1}º</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{pet.name}</p>
                      <p className="text-sm text-muted-foreground">{pet.tutor?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{pet.total_visits || 0}</p>
                      <p className="text-xs text-muted-foreground">visitas</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhum dado disponível
              </p>
            )}
          </div>

          {/* Top Services */}
          <div className="pet-card">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Scissors className="w-5 h-5 text-secondary" />
              Serviços Mais Vendidos
            </h2>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : topServices.length > 0 ? (
              <div className="space-y-3">
                {topServices.map((item, index) => (
                  <div
                    key={item.service.id}
                    className="flex items-center gap-3 p-3 bg-secondary/10 rounded-xl"
                  >
                    <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center">
                      <span className="font-bold text-secondary">{index + 1}º</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{item.service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        R$ {item.service.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-secondary">{item.count}</p>
                      <p className="text-xs text-muted-foreground">agendamentos</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhum dado disponível
              </p>
            )}
          </div>

          {/* Today's Sales */}
          <div className="pet-card lg:col-span-2">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Vendas de Hoje
            </h2>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentSales.length > 0 ? (
              <div className="space-y-3">
                {recentSales.map(sale => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {sale.tutor?.name || 'Cliente não identificado'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(sale.created_at!).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} • {sale.payment_method}
                      </p>
                    </div>
                    <p className="font-bold text-primary text-lg">
                      R$ {sale.total_amount.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma venda registrada hoje
              </p>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
