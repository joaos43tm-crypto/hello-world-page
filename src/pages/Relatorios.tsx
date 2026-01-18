import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Dog,
  Scissors,
  Star,
  Calendar,
  ReceiptText,
  Wallet,
} from "lucide-react";
import {
  cashRegisterApi,
  reportsApi,
  salesApi,
  type CashRegisterSession,
  type Pet,
  type Sale,
} from "@/lib/petcontrol.api";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateCashClosingPdf } from "@/lib/pdv/cashClosingPdf";
import { generateSaleReceiptPdf } from "@/lib/pdv/saleReceiptPdf";
import { openAndPrintPdfBytes } from "@/lib/pdv/printPdf";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export default function Relatorios() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"overview" | "vendas" | "caixa">(
    "overview"
  );

  // Store
  const [storeName, setStoreName] = useState("PetControl");

  // Overview
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [frequentPets, setFrequentPets] = useState<Pet[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [topServices, setTopServices] = useState<{ service: any; count: number }[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);

  // Vendas (filtro)
  const [salesStart, setSalesStart] = useState(todayISO());
  const [salesEnd, setSalesEnd] = useState(todayISO());
  const [salesList, setSalesList] = useState<Sale[]>([]);
  const [isSalesLoading, setIsSalesLoading] = useState(false);

  // Caixa (histórico)
  const [cashStart, setCashStart] = useState(todayISO());
  const [cashEnd, setCashEnd] = useState(todayISO());
  const [cashSessions, setCashSessions] = useState<CashRegisterSession[]>([]);
  const [isCashLoading, setIsCashLoading] = useState(false);

  const monthName = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString("pt-BR", { month: "long" });
  }, []);

  useEffect(() => {
    const loadStore = async () => {
      try {
        const { data } = await supabase
          .from("store_settings_public")
          .select("store_name")
          .limit(1)
          .maybeSingle();
        setStoreName(data?.store_name || "PetControl");
      } catch {
        setStoreName("PetControl");
      }
    };

    const loadOverview = async () => {
      try {
        const today = new Date();
        const [daily, monthly, pets, sales, services] = await Promise.all([
          reportsApi.getDailyRevenue(today.toISOString().split("T")[0]),
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
        console.error("Error loading reports:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStore();
    loadOverview();
  }, []);

  const loadSales = async () => {
    setIsSalesLoading(true);
    try {
      const data = await salesApi.getByDateRange(salesStart, salesEnd);
      setSalesList(data);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao carregar vendas", variant: "destructive" });
    } finally {
      setIsSalesLoading(false);
    }
  };

  const loadCashHistory = async () => {
    setIsCashLoading(true);
    try {
      const sessions = await cashRegisterApi.getSessionsByDateRange(cashStart, cashEnd);
      setCashSessions(sessions);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao carregar histórico do caixa", variant: "destructive" });
    } finally {
      setIsCashLoading(false);
    }
  };

  const printSaleReceipt = async (saleId: string) => {
    try {
      const sale = await salesApi.getById(saleId);
      if (!sale || !sale.created_at) throw new Error("Venda não encontrada");

      const items = (sale.items ?? []).map((i: any) => {
        const name = i.product?.name || i.service?.name || "Item";
        const qty = Number(i.quantity ?? 0);
        const unitPrice = Number(i.unit_price ?? 0);
        const subtotal = Number(i.subtotal ?? unitPrice * qty);
        return { name, quantity: qty, unitPrice, subtotal };
      });

      const pdfBytes = await generateSaleReceiptPdf({
        storeName,
        sale: {
          id: sale.id,
          createdAt: sale.created_at,
          paymentMethod: sale.payment_method || null,
          customerName: sale.tutor?.name || null,
        },
        items,
        total: Number(sale.total_amount ?? 0),
      });

      await openAndPrintPdfBytes(pdfBytes);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao imprimir recibo", variant: "destructive" });
    }
  };

  const printCashClosing = async (sessionId: string) => {
    try {
      const session = await cashRegisterApi.getById(sessionId);
      if (!session) throw new Error("Sessão não encontrada");
      if (!session.closed_at) {
        toast({ title: "O caixa ainda está aberto", variant: "destructive" });
        return;
      }

      const summary = await cashRegisterApi.getSessionSummary(session.id);
      const expectedCash =
        Number(session.opening_balance ?? 0) +
        Number(summary.salesTotal ?? 0) +
        Number(summary.suprimentoTotal ?? 0) -
        Number(summary.sangriaTotal ?? 0);

      const closingBalance = Number(session.closing_balance ?? 0);

      const pdfBytes = await generateCashClosingPdf({
        storeName,
        session: {
          id: session.id,
          openedAt: session.opened_at,
          closedAt: session.closed_at,
          openingBalance: Number(session.opening_balance ?? 0),
          closingBalance,
        },
        totals: {
          salesTotal: Number(summary.salesTotal ?? 0),
          sangriaTotal: Number(summary.sangriaTotal ?? 0),
          suprimentoTotal: Number(summary.suprimentoTotal ?? 0),
          expectedCash,
          difference: closingBalance - expectedCash,
          salesCount: summary.salesCount,
        },
        notes: session.closing_notes || null,
      });

      await openAndPrintPdfBytes(pdfBytes);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao imprimir fechamento", variant: "destructive" });
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary" />
            Relatórios
          </h1>
          <p className="text-muted-foreground">Visão geral e histórico do PDV</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="vendas">Vendas</TabsTrigger>
            <TabsTrigger value="caixa">Caixa</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview">
            <div className="space-y-6">
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
                <div className="pet-card">
                  <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Pets Mais Frequentes
                  </h2>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
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
                    <p className="text-muted-foreground text-center py-8">Nenhum dado disponível</p>
                  )}
                </div>

                <div className="pet-card">
                  <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-secondary" />
                    Serviços Mais Vendidos
                  </h2>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
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
                            <p className="text-sm text-muted-foreground">R$ {item.service.price.toFixed(2)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-secondary">{item.count}</p>
                            <p className="text-xs text-muted-foreground">agendamentos</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">Nenhum dado disponível</p>
                  )}
                </div>

                <div className="pet-card lg:col-span-2">
                  <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Vendas de Hoje
                  </h2>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : recentSales.length > 0 ? (
                    <div className="space-y-3">
                      {recentSales.map((sale) => (
                        <div
                          key={sale.id}
                          className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-xl"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {sale.tutor?.name || "Cliente não identificado"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(sale.created_at!).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })} {"•"} {sale.payment_method}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <p className="font-bold text-primary text-lg whitespace-nowrap">
                              R$ {sale.total_amount.toFixed(2)}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              onClick={() => printSaleReceipt(sale.id)}
                            >
                              <ReceiptText className="w-4 h-4" />
                              Imprimir
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">Nenhuma venda registrada hoje</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* VENDAS */}
          <TabsContent value="vendas">
            <div className="pet-card space-y-4">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Dog className="w-5 h-5 text-primary" />
                Histórico de Vendas
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>De</Label>
                  <Input type="date" value={salesStart} onChange={(e) => setSalesStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Até</Label>
                  <Input type="date" value={salesEnd} onChange={(e) => setSalesEnd(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button className="w-full" onClick={loadSales} disabled={isSalesLoading}>
                    {isSalesLoading ? "Carregando..." : "Buscar"}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {salesList.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhuma venda no período</p>
                ) : (
                  salesList.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-xl"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {sale.tutor?.name || "Cliente não identificado"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {sale.created_at
                            ? new Date(sale.created_at).toLocaleString("pt-BR")
                            : ""} {"•"} {sale.payment_method}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-primary whitespace-nowrap">
                          R$ {Number(sale.total_amount ?? 0).toFixed(2)}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => printSaleReceipt(sale.id)}
                        >
                          <ReceiptText className="w-4 h-4" />
                          Reimprimir
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* CAIXA */}
          <TabsContent value="caixa">
            <div className="pet-card space-y-4">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Wallet className="w-5 h-5 text-primary" />
                Histórico de Caixa
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>De</Label>
                  <Input type="date" value={cashStart} onChange={(e) => setCashStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Até</Label>
                  <Input type="date" value={cashEnd} onChange={(e) => setCashEnd(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button className="w-full" onClick={loadCashHistory} disabled={isCashLoading}>
                    {isCashLoading ? "Carregando..." : "Buscar"}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {cashSessions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhuma sessão no período</p>
                ) : (
                  cashSessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-xl"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {new Date(s.opened_at).toLocaleString("pt-BR")} {s.closed_at ? "• Fechado" : "• Aberto"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Abertura: R$ {Number(s.opening_balance ?? 0).toFixed(2)}
                          {s.closed_at ? ` • Fechamento: R$ ${Number(s.closing_balance ?? 0).toFixed(2)}` : ""}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        disabled={!s.closed_at}
                        onClick={() => printCashClosing(s.id)}
                      >
                        <ReceiptText className="w-4 h-4" />
                        {s.closed_at ? "Reimprimir" : "Aguardando"}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

