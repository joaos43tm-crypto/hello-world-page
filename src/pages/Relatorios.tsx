import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  Package,
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
import { generateSalesPeriodReportPdf } from "@/lib/reports/salesPeriodReportPdf";
import { generateCashPeriodReportPdf } from "@/lib/reports/cashPeriodReportPdf";
import { generateProductsPeriodReportPdf } from "@/lib/reports/productsPeriodReportPdf";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export default function Relatorios() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<
    "overview" | "vendas" | "produtos" | "caixa"
  >("overview");


  // Store
  const [storeName, setStoreName] = useState("PetControl");
  const [storeAddress, setStoreAddress] = useState<string | null>(null);
  const [storeWhatsapp, setStoreWhatsapp] = useState<string | null>(null);
  const [storeLogoUrl, setStoreLogoUrl] = useState<string | null>(null);

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
  const [salesReportMode, setSalesReportMode] = useState<"simples" | "detalhado">(
    "detalhado"
  );
  const [isPrintingSalesReport, setIsPrintingSalesReport] = useState(false);

  // Caixa (histórico)
  const [cashStart, setCashStart] = useState(todayISO());
  const [cashEnd, setCashEnd] = useState(todayISO());
  const [cashSessions, setCashSessions] = useState<CashRegisterSession[]>([]);
  const [isCashLoading, setIsCashLoading] = useState(false);
  const [isPrintingCashReport, setIsPrintingCashReport] = useState(false);

  // Produtos (relatório)
  const [productsStart, setProductsStart] = useState(todayISO());
  const [productsEnd, setProductsEnd] = useState(todayISO());
  const [productsRank, setProductsRank] = useState<
    Array<{
      productId: string;
      name: string;
      qty: number;
      revenue: number;
      costUnit: number;
      costTotal: number;
      profit: number;
      marginPct: number;
    }>
  >([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [isPrintingProductsReport, setIsPrintingProductsReport] = useState(false);

  const monthName = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString("pt-BR", { month: "long" });
  }, []);


  useEffect(() => {
    const loadStore = async () => {
      try {
        const { data } = await supabase
          .from("store_settings")
          .select("store_name, address, whatsapp_number, logo_url")
          .limit(1)
          .maybeSingle();
        setStoreName(data?.store_name || "PetControl");
        setStoreAddress((data as any)?.address ?? null);
        setStoreWhatsapp((data as any)?.whatsapp_number ?? null);
        setStoreLogoUrl((data as any)?.logo_url ?? null);
      } catch {
        setStoreName("PetControl");
        setStoreAddress(null);
        setStoreWhatsapp(null);
        setStoreLogoUrl(null);
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

  const loadProductsReport = async () => {
    setIsProductsLoading(true);
    try {
      const sales = await salesApi.getByDateRange(productsStart, productsEnd);
      if (!sales.length) {
        setProductsRank([]);
        return;
      }

      // Busca itens (evita joins complexos no PostgREST)
      const fullSales = await Promise.all(sales.map((s) => salesApi.getById(s.id)));

      const map = new Map<
        string,
        {
          productId: string;
          name: string;
          qty: number;
          revenue: number;
          costUnit: number;
        }
      >();

      for (const sale of fullSales) {
        const items = (sale?.items ?? []) as any[];
        for (const it of items) {
          const productId = it.product_id as string | null;
          if (!productId) continue;

          const qty = Number(it.quantity ?? 0);
          const revenue = Number(it.subtotal ?? 0);
          const name = (it.product?.name ?? "Produto") as string;
          const costUnit = Number(it.product?.cost_price ?? 0);

          const prev = map.get(productId);
          if (!prev) {
            map.set(productId, { productId, name, qty, revenue, costUnit });
          } else {
            prev.qty += qty;
            prev.revenue += revenue;
            // Mantém custo atual do cadastro (se mudou entre vendas, usamos o atual)
            prev.costUnit = costUnit;
            prev.name = name;
          }
        }
      }

      const rows = Array.from(map.values()).map((r) => {
        const costTotal = r.qty * r.costUnit;
        const profit = r.revenue - costTotal;
        const marginPct = r.revenue > 0 ? profit / r.revenue : 0;
        return {
          productId: r.productId,
          name: r.name,
          qty: r.qty,
          revenue: r.revenue,
          costUnit: r.costUnit,
          costTotal,
          profit,
          marginPct,
        };
      });

      rows.sort((a, b) => (b.qty - a.qty) || (b.revenue - a.revenue));
      setProductsRank(rows);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao carregar relatório de produtos", variant: "destructive" });
    } finally {
      setIsProductsLoading(false);
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
        store: {
          name: storeName,
          address: storeAddress,
          whatsapp: storeWhatsapp,
          logoUrl: storeLogoUrl,
        },
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

  const printSalesReport = async () => {
    if (salesList.length === 0 || isSalesLoading || isPrintingSalesReport) return;

    setIsPrintingSalesReport(true);
    try {
      let salesToPrint: Sale[] = salesList;

      if (salesReportMode === "detalhado") {
        const fullSales = await Promise.all(salesList.map((s) => salesApi.getById(s.id)));
        salesToPrint = fullSales.filter(Boolean) as Sale[];
      }

      const reportSales = salesToPrint
        .filter((s) => !!s.created_at)
        .map((s) => ({
          id: s.id,
          createdAt: s.created_at!,
          customerName: s.tutor?.name ?? null,
          paymentMethod: s.payment_method ?? null,
          totalAmount: Number(s.total_amount ?? 0),
          items:
            salesReportMode === "detalhado"
              ? (s.items ?? []).map((i: any) => ({
                  name: i.product?.name || i.service?.name || "Item",
                  quantity: Number(i.quantity ?? 0),
                  unitPrice: Number(i.unit_price ?? 0),
                  subtotal: Number(i.subtotal ?? 0),
                }))
              : undefined,
        }));

      const pdfBytes = await generateSalesPeriodReportPdf({
        storeName,
        store: {
          address: storeAddress,
          whatsapp: storeWhatsapp,
          logoUrl: storeLogoUrl,
        },
        period: { start: salesStart, end: salesEnd },
        mode: salesReportMode,
        sales: reportSales,
      });

      await openAndPrintPdfBytes(pdfBytes);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao imprimir relatório de vendas", variant: "destructive" });
    } finally {
      setIsPrintingSalesReport(false);
    }
  };

  const printCashReport = async () => {
    if (cashSessions.length === 0 || isCashLoading || isPrintingCashReport) return;

    setIsPrintingCashReport(true);
    try {
      const closedSessions = cashSessions.filter((s) => !!s.closed_at);
      const summaries = await Promise.all(
        closedSessions.map(async (s) => ({
          session: s,
          summary: await cashRegisterApi.getSessionSummary(s.id),
        }))
      );

      const sessionsForPdf = cashSessions.map((s) => {
        if (!s.closed_at) {
          return {
            id: s.id,
            openedAt: s.opened_at,
            closedAt: null,
            openingBalance: Number(s.opening_balance ?? 0),
            closingBalance: null,
            notes: null,
            totals: undefined,
          };
        }

        const match = summaries.find((x) => x.session.id === s.id);
        const summary = match?.summary;

        const expectedCash =
          Number(s.opening_balance ?? 0) +
          Number(summary?.salesTotal ?? 0) +
          Number(summary?.suprimentoTotal ?? 0) -
          Number(summary?.sangriaTotal ?? 0);

        const closingBalance = Number(s.closing_balance ?? 0);

        return {
          id: s.id,
          openedAt: s.opened_at,
          closedAt: s.closed_at,
          openingBalance: Number(s.opening_balance ?? 0),
          closingBalance,
          notes: s.closing_notes ?? null,
          totals: {
            salesTotal: Number(summary?.salesTotal ?? 0),
            salesCount: Number(summary?.salesCount ?? 0),
            sangriaTotal: Number(summary?.sangriaTotal ?? 0),
            suprimentoTotal: Number(summary?.suprimentoTotal ?? 0),
            expectedCash,
            difference: closingBalance - expectedCash,
          },
        };
      });

      const totals = sessionsForPdf
        .filter((s) => !!s.closedAt && !!s.totals)
        .reduce(
          (acc, s) => {
            const t = s.totals!;
            acc.salesTotal += t.salesTotal;
            acc.salesCount += t.salesCount;
            acc.sangriaTotal += t.sangriaTotal;
            acc.suprimentoTotal += t.suprimentoTotal;
            acc.openingBalanceTotal += s.openingBalance;
            acc.closingBalanceTotal += Number(s.closingBalance ?? 0);
            acc.expectedCashTotal += t.expectedCash;
            acc.differenceTotal += t.difference;
            return acc;
          },
          {
            salesTotal: 0,
            salesCount: 0,
            sangriaTotal: 0,
            suprimentoTotal: 0,
            openingBalanceTotal: 0,
            closingBalanceTotal: 0,
            expectedCashTotal: 0,
            differenceTotal: 0,
          }
        );

      const pdfBytes = await generateCashPeriodReportPdf({
        storeName,
        store: {
          address: storeAddress,
          whatsapp: storeWhatsapp,
          logoUrl: storeLogoUrl,
        },
        period: { start: cashStart, end: cashEnd },
        sessions: sessionsForPdf,
        totals,
      });

      await openAndPrintPdfBytes(pdfBytes);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao imprimir relatório de caixa", variant: "destructive" });
    } finally {
      setIsPrintingCashReport(false);
    }
  };

  const productsTotals = useMemo(() => {
    const itemsTotal = productsRank.reduce((sum, r) => sum + Number(r.qty ?? 0), 0);
    const revenueTotal = productsRank.reduce((sum, r) => sum + Number(r.revenue ?? 0), 0);
    const costTotal = productsRank.reduce((sum, r) => sum + Number(r.costTotal ?? 0), 0);
    const profitTotal = productsRank.reduce((sum, r) => sum + Number(r.profit ?? 0), 0);
    const marginPct = revenueTotal > 0 ? profitTotal / revenueTotal : 0;
    return { itemsTotal, revenueTotal, costTotal, profitTotal, marginPct };
  }, [productsRank]);

  const printProductsReport = async () => {
    if (productsRank.length === 0 || isProductsLoading || isPrintingProductsReport) return;

    setIsPrintingProductsReport(true);
    try {
      const pdfBytes = await generateProductsPeriodReportPdf({
        storeName,
        store: {
          address: storeAddress,
          whatsapp: storeWhatsapp,
          logoUrl: storeLogoUrl,
        },
        period: { start: productsStart, end: productsEnd },
        summary: productsTotals,
        rows: productsRank,
      });

      await openAndPrintPdfBytes(pdfBytes);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao imprimir relatório de produtos", variant: "destructive" });
    } finally {
      setIsPrintingProductsReport(false);
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
              <TabsTrigger value="produtos">Produtos</TabsTrigger>
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
                    <Star className="w-5 h-5 text-primary" />
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-2 space-y-2">
                  <Label>Tipo de relatório</Label>
                  <RadioGroup
                    value={salesReportMode}
                    onValueChange={(v) => setSalesReportMode(v as any)}
                    className="flex flex-col sm:flex-row gap-3"
                  >
                    <Label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="simples" />
                      Relatório simples
                    </Label>
                    <Label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="detalhado" />
                      Relatório detalhado
                    </Label>
                  </RadioGroup>
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={printSalesReport}
                  disabled={salesList.length === 0 || isSalesLoading || isPrintingSalesReport}
                >
                  <ReceiptText className="w-4 h-4" />
                  {isPrintingSalesReport ? "Gerando..." : "Imprimir relatório"}
                </Button>
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

          {/* PRODUTOS */}
          <TabsContent value="produtos">
            <div className="pet-card space-y-4">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Package className="w-5 h-5 text-primary" />
                Produtos mais vendidos
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>De</Label>
                  <Input type="date" value={productsStart} onChange={(e) => setProductsStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Até</Label>
                  <Input type="date" value={productsEnd} onChange={(e) => setProductsEnd(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button className="w-full" onClick={loadProductsReport} disabled={isProductsLoading}>
                    {isProductsLoading ? "Carregando..." : "Buscar"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                  title="Itens vendidos"
                  value={String(productsTotals.itemsTotal)}
                  icon={TrendingUp}
                  variant="primary"
                />
                <StatCard
                  title="Faturamento produtos"
                  value={`R$ ${productsTotals.revenueTotal.toFixed(2)}`}
                  icon={DollarSign}
                  variant="success"
                />
                <StatCard
                  title="Lucro bruto estimado"
                  value={`R$ ${productsTotals.profitTotal.toFixed(2)}`}
                  icon={TrendingUp}
                  variant="success"
                />
                <StatCard
                  title="Margem média"
                  value={`${(productsTotals.marginPct * 100).toFixed(1)}%`}
                  icon={TrendingUp}
                  variant="primary"
                />
              </div>

              <div className="overflow-hidden rounded-xl border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Custo (un)</TableHead>
                      <TableHead className="text-right">Custo total</TableHead>
                      <TableHead className="text-right">Lucro</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsRank.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                          Nenhum produto vendido no período
                        </TableCell>
                      </TableRow>
                    ) : (
                      productsRank.map((r) => (
                        <TableRow key={r.productId}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell className="text-right">{r.qty}</TableCell>
                          <TableCell className="text-right">R$ {r.revenue.toFixed(2)}</TableCell>
                          <TableCell className="text-right">R$ {r.costUnit.toFixed(2)}</TableCell>
                          <TableCell className="text-right">R$ {r.costTotal.toFixed(2)}</TableCell>
                          <TableCell className="text-right">R$ {r.profit.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{(r.marginPct * 100).toFixed(1)}%</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2" />
                <Button
                  className="w-full gap-2"
                  onClick={printProductsReport}
                  disabled={productsRank.length === 0 || isProductsLoading || isPrintingProductsReport}
                >
                  <ReceiptText className="w-4 h-4" />
                  {isPrintingProductsReport ? "Gerando..." : "Imprimir relatório"}
                </Button>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2" />
                <Button
                  className="w-full gap-2"
                  onClick={printCashReport}
                  disabled={cashSessions.length === 0 || isCashLoading || isPrintingCashReport}
                >
                  <ReceiptText className="w-4 h-4" />
                  {isPrintingCashReport ? "Gerando..." : "Imprimir relatório"}
                </Button>
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

