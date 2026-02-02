import { useMemo, useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  ReceiptText,
  Lock,
} from "lucide-react";
import {
  cashRegisterApi,
  appointmentsApi,
  productsApi,
  salesApi,
  type CashRegisterSession,
  type Appointment,
  type Product,
} from "@/lib/petcontrol.api";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateCashClosingPdf } from "@/lib/pdv/cashClosingPdf";
import { generateSaleReceiptPdf } from "@/lib/pdv/saleReceiptPdf";
import { openAndPrintPdfBytes } from "@/lib/pdv/printPdf";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: "product" | "appointment";
  productId?: string;
  serviceId?: string;
  appointmentId?: string;
}

type ReceiptPreviewPayload = {
  createdAt: string;
  paymentMethod: string;
  items: Array<{ name: string; quantity: number; unitPrice: number; subtotal: number }>;
  total: number;
};

const paymentMethods = [
  { id: "dinheiro", label: "Dinheiro" },
  { id: "cartao", label: "Cartão" },
  { id: "pix", label: "Pix" },
];

function formatMoneyBRL(value: number) {
  return value.toFixed(2).replace(".", ",");
}

function formatPaymentSummary(methodId: string, amount: number) {
  const label = paymentMethods.find((m) => m.id === methodId)?.label ?? methodId;
  return `${label} R$ ${formatMoneyBRL(amount)}`;
}

function isSameLocalDay(iso: string, ref = new Date()) {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

function parseMoneyInput(raw: string) {
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export default function Vendas() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [finalizedAppointments, setFinalizedAppointments] = useState<Appointment[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Pagamento (dividido em 2 formas)
  const [payment1Method, setPayment1Method] = useState("dinheiro");
  const [payment1AmountText, setPayment1AmountText] = useState("0,00");
  const [payment2Method, setPayment2Method] = useState("pix");
  const [payment2AmountText, setPayment2AmountText] = useState("0,00");

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<ReceiptPreviewPayload | null>(null);

  // Caixa
  const [cashSession, setCashSession] = useState<CashRegisterSession | null>(null);
  const [isCashLoading, setIsCashLoading] = useState(true);
  const [openCashDialog, setOpenCashDialog] = useState(false);
  const [movementDialog, setMovementDialog] = useState<null | "sangria" | "suprimento">(null);
  const [closeCashDialog, setCloseCashDialog] = useState(false);

  const [printerEnabled, setPrinterEnabled] = useState(false);
  const [storeName, setStoreName] = useState("PetControl");

  const [openingBalanceText, setOpeningBalanceText] = useState("0,00");
  const [movementAmountText, setMovementAmountText] = useState("0,00");
  const [movementNotes, setMovementNotes] = useState("");

  const [closingBalanceText, setClosingBalanceText] = useState("0,00");
  const [closingNotes, setClosingNotes] = useState("");

  const [forceCloseBecauseDate, setForceCloseBecauseDate] = useState(false);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  // Inicializa o split quando o carrinho começa (sem sobrescrever edição do usuário)
  useEffect(() => {
    if (cart.length === 0) {
      setPayment1Method("dinheiro");
      setPayment2Method("pix");
      setPayment1AmountText("0,00");
      setPayment2AmountText("0,00");
      return;
    }

    // Se ambos estiverem zerados, preenche tudo no método 1
    const a1 = parseMoneyInput(payment1AmountText);
    const a2 = parseMoneyInput(payment2AmountText);
    if (a1 === 0 && a2 === 0 && total > 0) {
      setPayment1AmountText(formatMoneyBRL(total));
      setPayment2AmountText("0,00");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.length, total]);

  const payment1Amount = useMemo(() => parseMoneyInput(payment1AmountText), [payment1AmountText]);
  const payment2Amount = useMemo(() => parseMoneyInput(payment2AmountText), [payment2AmountText]);

  const paymentSplitError = useMemo(() => {
    if (cart.length === 0) return null;
    if (payment1Method === payment2Method) return "Escolha 2 formas de pagamento diferentes.";
    if (payment1Amount < 0 || payment2Amount < 0) return "Valores de pagamento não podem ser negativos.";

    // Comparação com tolerância para arredondamento
    const diff = Math.abs((payment1Amount + payment2Amount) - total);
    if (diff > 0.009) return "A soma das 2 formas precisa bater exatamente o total.";
    return null;
  }, [cart.length, payment1Amount, payment1Method, payment2Amount, payment2Method, total]);

  const paymentMethodSummary = useMemo(() => {
    return `${formatPaymentSummary(payment1Method, payment1Amount)} + ${formatPaymentSummary(
      payment2Method,
      payment2Amount
    )}`;
  }, [payment1Amount, payment1Method, payment2Amount, payment2Method]);

  const handlePrintReceiptPreview = async () => {
    if (cart.length === 0) return;
    if (paymentSplitError) {
      toast({
        title: "Pagamento inválido",
        description: paymentSplitError,
        variant: "destructive",
      });
      return;
    }

    try {
      const receiptBytes = await generateSaleReceiptPdf({
        storeName,
        sale: {
          id: "PREVIEW",
          createdAt: new Date().toISOString(),
          paymentMethod: paymentMethodSummary,
          customerName: null,
        },
        items: cart.map((c) => ({
          name: c.name,
          quantity: c.quantity,
          unitPrice: c.price,
          subtotal: c.price * c.quantity,
        })),
        total,
      });

      await openAndPrintPdfBytes(receiptBytes);
    } catch (e) {
      console.error("Error printing receipt preview:", e);
      toast({
        title: "Erro ao gerar recibo",
        description: "Não foi possível gerar/imprimir o recibo agora.",
        variant: "destructive",
      });
    }
  };

  const handleReprintLastReceipt = async () => {
    if (!lastReceipt) return;
    try {
      const receiptBytes = await generateSaleReceiptPdf({
        storeName,
        sale: {
          id: "REPRINT",
          createdAt: lastReceipt.createdAt,
          paymentMethod: lastReceipt.paymentMethod,
          customerName: null,
        },
        items: lastReceipt.items,
        total: lastReceipt.total,
      });
      await openAndPrintPdfBytes(receiptBytes);
    } catch (e) {
      console.error("Error reprinting receipt:", e);
      toast({
        title: "Erro ao imprimir recibo",
        description: "Não foi possível reimprimir o recibo agora.",
        variant: "destructive",
      });
    }
  };

  const canSell = useMemo(() => {
    if (!cashSession) return false;
    return isSameLocalDay(cashSession.opened_at);
  }, [cashSession]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsData, finalized] = await Promise.all([
          productsApi.getActive(),
          appointmentsApi.getByStatus("finalizado"),
        ]);
        setProducts(productsData);
        setFinalizedAppointments(finalized);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const loadPrinter = async () => {
      try {
        const { data, error } = await supabase
          .from("store_settings")
          .select("store_name, printer_enabled")
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        setStoreName(data?.store_name || "PetControl");
        setPrinterEnabled(!!data?.printer_enabled);
      } catch (e) {
        // fallback silencioso
        setStoreName("PetControl");
        setPrinterEnabled(false);
      }
    };

    const loadCash = async () => {
      setIsCashLoading(true);
      try {
        const session = await cashRegisterApi.getOpenSession();
        setCashSession(session);
        if (session && !isSameLocalDay(session.opened_at)) {
          setForceCloseBecauseDate(true);
          setCloseCashDialog(true);
        } else {
          setForceCloseBecauseDate(false);
        }
      } catch (error) {
        console.error("Error loading cash session:", error);
        toast({
          title: "Erro ao carregar caixa",
          variant: "destructive",
        });
      } finally {
        setIsCashLoading(false);
      }
    };

    loadData();
    loadPrinter();
    loadCash();
  }, [toast]);

  const addProductToCart = (product: Product) => {
    const existingIndex = cart.findIndex((c) => c.type === "product" && c.productId === product.id);

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity++;
      setCart(newCart);
    } else {
      setCart([
        ...cart,
        {
          id: crypto.randomUUID(),
          name: product.name,
          price: product.price,
          quantity: 1,
          type: "product",
          productId: product.id,
        },
      ]);
    }
  };

  const addAppointmentToCart = (appointment: Appointment) => {
    const existingIndex = cart.findIndex(
      (c) => c.type === "appointment" && c.appointmentId === appointment.id
    );

    const petName = appointment.pet?.name ?? "Pet";
    const serviceName = appointment.service?.name ?? "Serviço";
    const time = appointment.scheduled_time?.slice(0, 5) ?? "";
    const datePt = appointment.scheduled_date
      ? new Date(`${appointment.scheduled_date}T12:00:00`).toLocaleDateString("pt-BR")
      : "";
    const price = Number(
      appointment.price ?? appointment.service?.price ?? 0
    );

    if (existingIndex >= 0) {
      // agendamento entra como item único (quantidade 1)
      return;
    }

    setCart([
      ...cart,
      {
        id: crypto.randomUUID(),
        name: `${petName} • ${serviceName} (${datePt} ${time})`,
        price,
        quantity: 1,
        type: "appointment",
        serviceId: appointment.service_id,
        appointmentId: appointment.id,
      },
    ]);
  };

  const updateQuantity = (id: string, delta: number) => {
    const newCart = cart
      .map((item) => {
        if (item.id === id) {
          const newQuantity = item.quantity + delta;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        }
        return item;
      })
      .filter((item) => item.quantity > 0);
    setCart(newCart);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const refreshCash = async () => {
    const session = await cashRegisterApi.getOpenSession();
    setCashSession(session);
    if (session && !isSameLocalDay(session.opened_at)) {
      setForceCloseBecauseDate(true);
      setCloseCashDialog(true);
    } else {
      setForceCloseBecauseDate(false);
    }
  };

  const handleOpenCash = async () => {
    setIsProcessing(true);
    try {
      const openingBalance = parseMoneyInput(openingBalanceText);
      const session = await cashRegisterApi.openSession({ opening_balance: openingBalance });
      setCashSession(session);
      setOpenCashDialog(false);
      toast({
        title: "Caixa aberto",
        description: `Saldo inicial: R$ ${openingBalance.toFixed(2)}`,
      });
    } catch (error) {
      console.error("Error opening cash:", error);
      toast({ title: "Erro ao abrir caixa", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMovement = async () => {
    if (!cashSession || !movementDialog) return;

    setIsProcessing(true);
    try {
      const amount = parseMoneyInput(movementAmountText);
      if (amount <= 0) {
        toast({ title: "Informe um valor válido", variant: "destructive" });
        return;
      }

      await cashRegisterApi.addMovement({
        session_id: cashSession.id,
        movement_type: movementDialog,
        amount,
        notes: movementNotes || null,
      });

      toast({
        title: movementDialog === "sangria" ? "Sangria registrada" : "Suprimento registrado",
        description: `Valor: R$ ${amount.toFixed(2)}`,
      });

      setMovementDialog(null);
      setMovementAmountText("0,00");
      setMovementNotes("");
    } catch (error) {
      console.error("Error creating movement:", error);
      toast({ title: "Erro ao registrar movimentação", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseCash = async () => {
    if (!cashSession) return;

    setIsProcessing(true);
    try {
      const closingBalance = parseMoneyInput(closingBalanceText);
      const summary = await cashRegisterApi.getSessionSummary(cashSession.id);

      const expectedCash =
        Number(cashSession.opening_balance ?? 0) +
        Number(summary.salesTotal ?? 0) +
        Number(summary.suprimentoTotal ?? 0) -
        Number(summary.sangriaTotal ?? 0);

      const closed = await cashRegisterApi.closeSession({
        session_id: cashSession.id,
        closing_balance: closingBalance,
        closing_notes: closingNotes || null,
      });

      setCloseCashDialog(false);
      setCashSession(null);
      setCart([]);

      toast({
        title: "Caixa fechado",
        description: `Diferença: R$ ${(closingBalance - expectedCash).toFixed(2)}`,
      });

      const shouldPrint = window.confirm("Imprimir fechamento agora?");
      if (shouldPrint) {
        const pdfBytes = await generateCashClosingPdf({
          storeName,
          session: {
            id: closed.id,
            openedAt: closed.opened_at,
            closedAt: closed.closed_at!,
            openingBalance: Number(closed.opening_balance ?? 0),
            closingBalance: Number(closed.closing_balance ?? 0),
          },
          totals: {
            salesTotal: Number(summary.salesTotal ?? 0),
            sangriaTotal: Number(summary.sangriaTotal ?? 0),
            suprimentoTotal: Number(summary.suprimentoTotal ?? 0),
            expectedCash,
            difference: closingBalance - expectedCash,
            salesCount: summary.salesCount,
          },
          notes: closingNotes || null,
        });

        await openAndPrintPdfBytes(pdfBytes);
      }

      setClosingBalanceText("0,00");
      setClosingNotes("");
      setForceCloseBecauseDate(false);

      await refreshCash();
    } catch (error) {
      console.error("Error closing cash:", error);
      toast({ title: "Erro ao fechar caixa", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalizeSale = async () => {
    if (cart.length === 0) return;

    if (paymentSplitError) {
      toast({
        title: "Pagamento inválido",
        description: paymentSplitError,
        variant: "destructive",
      });
      return;
    }

    if (!cashSession) {
      toast({ title: "Abra o caixa antes de vender", variant: "destructive" });
      return;
    }

    if (!canSell) {
      toast({
        title: "Caixa de dia anterior",
        description: "Feche o caixa antes de continuar.",
        variant: "destructive",
      });
      setForceCloseBecauseDate(true);
      setCloseCashDialog(true);
      return;
    }

    setIsProcessing(true);
    try {
      const receiptPayload: ReceiptPreviewPayload = {
        createdAt: new Date().toISOString(),
        paymentMethod: paymentMethodSummary,
        items: cart.map((c) => ({
          name: c.name,
          quantity: c.quantity,
          unitPrice: c.price,
          subtotal: c.price * c.quantity,
        })),
        total,
      };

      const created = await salesApi.create(
        {
          tutor_id: null,
          total_amount: total,
          payment_method: paymentMethodSummary,
          cash_session_id: cashSession.id,
        },
        cart.map((item) => ({
          product_id: item.productId || null,
          service_id: item.serviceId || null,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.price * item.quantity,
        }))
      );

      const appointmentIds = cart
        .filter((c) => c.type === "appointment" && !!c.appointmentId)
        .map((c) => c.appointmentId!)
        .filter(Boolean);

      if (appointmentIds.length) {
        await Promise.all(
          appointmentIds.map((id) => appointmentsApi.updateStatus(id, "pago"))
        );
        setFinalizedAppointments((prev) => prev.filter((a) => !appointmentIds.includes(a.id)));
      }

      // Impressão automática do recibo (PDF). Em ambiente com impressora térmica instalada,
      // o navegador imprimirá para ela via diálogo/config padrão do sistema.
      if (printerEnabled) {
        const receiptBytes = await generateSaleReceiptPdf({
          storeName,
          sale: {
            id: created.id,
            createdAt: created.created_at || receiptPayload.createdAt,
            paymentMethod: receiptPayload.paymentMethod,
            customerName: null,
          },
          items: receiptPayload.items,
          total: receiptPayload.total,
        });
        await openAndPrintPdfBytes(receiptBytes);
      }

      // Guarda a última venda para reimpressão rápida (tela de sucesso)
      setLastReceipt({
        ...receiptPayload,
        createdAt: created.created_at || receiptPayload.createdAt,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setCart([]);
      }, 2000);

      toast({
        title: "Venda realizada!",
        description: `Total: R$ ${total.toFixed(2)}`,
      });
    } catch (error) {
      console.error("Error processing sale:", error);
      toast({
        title: "Erro ao processar venda",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (showSuccess) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[80vh] p-4">
          <div className="text-center animate-scale-in">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Venda Finalizada!
            </h2>
            <p className="text-muted-foreground text-lg">
              R$ {total.toFixed(2)}
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <Button
                type="button"
                onClick={handleReprintLastReceipt}
                disabled={!lastReceipt}
                className="mx-auto"
              >
                Imprimir recibo da venda
              </Button>
              <p className="text-xs text-muted-foreground">
                A impressão abre o diálogo do navegador.
              </p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start md:items-center justify-between gap-4 flex-col md:flex-row">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-7 h-7 text-primary" />
              PDV - Ponto de Venda
            </h1>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="w-4 h-4" />
              {isCashLoading ? (
                "Carregando caixa..."
              ) : cashSession ? (
                <span>
                  Caixa aberto em {new Date(cashSession.opened_at).toLocaleString("pt-BR")}
                  {canSell ? null : (
                    <span className="ml-2 inline-flex items-center gap-1 text-destructive">
                      <Lock className="w-4 h-4" />
                      Precisa fechar (dia anterior)
                    </span>
                  )}
                </span>
              ) : (
                "Caixa fechado"
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setOpenCashDialog(true)}
              disabled={!!cashSession || isCashLoading}
            >
              <Wallet className="w-4 h-4" />
              Abrir caixa
            </Button>

            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setMovementDialog("suprimento")}
              disabled={!cashSession || !canSell}
            >
              <ArrowUpCircle className="w-4 h-4" />
              Suprimento
            </Button>

            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setMovementDialog("sangria")}
              disabled={!cashSession || !canSell}
            >
              <ArrowDownCircle className="w-4 h-4" />
              Sangria
            </Button>

            <Button
              className="gap-2"
              onClick={() => setCloseCashDialog(true)}
              disabled={!cashSession}
            >
              <ReceiptText className="w-4 h-4" />
              Fechar caixa
            </Button>
          </div>
        </div>

        {!cashSession && !isCashLoading && (
          <div className="pet-card">
            <p className="text-muted-foreground">
              Para iniciar vendas, <strong>abra o caixa</strong>.
            </p>
          </div>
        )}

        {forceCloseBecauseDate && (
          <div className="pet-card border border-destructive/30">
            <p className="text-foreground font-medium">
              Existe um caixa aberto de dia anterior.
            </p>
            <p className="text-muted-foreground">
              O sistema bloqueou novas vendas. Faça o <strong>fechamento</strong> para continuar.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Produtos & Agendamentos */}
          <div className="lg:col-span-2 space-y-6">
            {/* Products */}
            <div className="pet-card">
              <h2 className="font-semibold text-foreground mb-4">Produtos</h2>
              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-20 bg-muted rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {products.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addProductToCart(product)}
                      disabled={!canSell}
                      className="p-3 bg-muted/50 hover:bg-accent rounded-xl text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <p className="font-medium text-foreground truncate">
                        {product.name}
                      </p>
                      <p className="text-primary font-semibold">
                        R$ {product.price.toFixed(2)}
                      </p>
                      {product.stock_quantity !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          Estoque: {product.stock_quantity}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum produto cadastrado
                </p>
              )}
            </div>

            {/* Finalized Appointments */}
            <div className="pet-card">
              <h2 className="font-semibold text-foreground mb-4">Agendamentos Finalizados</h2>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : finalizedAppointments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                  {finalizedAppointments.map((a) => {
                    const petName = a.pet?.name ?? "Pet";
                    const tutorName = a.pet?.tutor?.name ?? "Cliente";
                    const serviceName = a.service?.name ?? "Serviço";
                    const time = a.scheduled_time?.slice(0, 5) ?? "";
                    const datePt = a.scheduled_date
                      ? new Date(`${a.scheduled_date}T12:00:00`).toLocaleDateString("pt-BR")
                      : "";
                    const price = Number(a.price ?? a.service?.price ?? 0);
                    return (
                      <button
                        key={a.id}
                        onClick={() => addAppointmentToCart(a)}
                        disabled={!canSell}
                        className="p-3 bg-muted/50 hover:bg-accent rounded-xl text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <p className="font-medium text-foreground truncate">
                          {petName} • {serviceName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {tutorName} • {datePt} {time}
                        </p>
                        <p className="text-primary font-semibold">R$ {price.toFixed(2)}</p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum agendamento finalizado pendente de pagamento
                </p>
              )}
            </div>
          </div>

          {/* Cart */}
          <div className="pet-card h-fit sticky top-4">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <ShoppingCart size={18} />
              Carrinho ({cart.length})
            </h2>

            {/* Cart Items */}
            <div className="space-y-3 mb-4 max-h-[40vh] overflow-y-auto">
              {cart.length > 0 ? (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate text-sm">
                        {item.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        R$ {item.price.toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, -1)}
                        disabled={!canSell}
                      >
                        <Minus size={14} />
                      </Button>
                      <span className="w-6 text-center font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, 1)}
                        disabled={!canSell}
                      >
                        <Plus size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeFromCart(item.id)}
                        disabled={!canSell}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-6">Carrinho vazio</p>
              )}
            </div>

            {cart.length > 0 && (
              <>
                {/* Payment Split */}
                <div className="space-y-3 mb-4">
                  <Label>Formas de Pagamento (2)</Label>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-5 gap-2 items-end">
                      <div className="col-span-3">
                        <Label className="text-xs text-muted-foreground">Forma 1</Label>
                        <Select value={payment1Method} onValueChange={setPayment1Method}>
                          <SelectTrigger disabled={!canSell}>
                            <SelectValue placeholder="Selecionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethods.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">Valor</Label>
                        <Input
                          value={payment1AmountText}
                          onChange={(e) => setPayment1AmountText(e.target.value)}
                          placeholder="0,00"
                          disabled={!canSell}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-2 items-end">
                      <div className="col-span-3">
                        <Label className="text-xs text-muted-foreground">Forma 2</Label>
                        <Select value={payment2Method} onValueChange={setPayment2Method}>
                          <SelectTrigger disabled={!canSell}>
                            <SelectValue placeholder="Selecionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethods.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">Valor</Label>
                        <Input
                          value={payment2AmountText}
                          onChange={(e) => setPayment2AmountText(e.target.value)}
                          placeholder="0,00"
                          disabled={!canSell}
                        />
                      </div>
                    </div>

                    {paymentSplitError && (
                      <p className="text-sm text-destructive">{paymentSplitError}</p>
                    )}
                  </div>
                </div>

                {/* Total */}
                <div className="py-4 border-t border-border">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="text-2xl font-bold text-primary">
                      R$ {total.toFixed(2)}
                    </span>
                  </div>

                  {/* Receipt Preview */}
                  <div className="mb-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setReceiptPreviewOpen(true)}
                      disabled={!canSell || cart.length === 0}
                    >
                      Ver resumo/recibo
                    </Button>
                  </div>

                  <Button
                    onClick={handleFinalizeSale}
                    disabled={isProcessing || !canSell || !!paymentSplitError}
                    className="w-full h-14 text-lg gap-2"
                  >
                    <CheckCircle2 size={20} />
                    {isProcessing ? "Processando..." : "Finalizar Venda"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Abrir caixa */}
      <Dialog open={openCashDialog} onOpenChange={setOpenCashDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir caixa</DialogTitle>
            <DialogDescription>Informe o saldo inicial em dinheiro.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Saldo inicial</Label>
            <Input value={openingBalanceText} onChange={(e) => setOpeningBalanceText(e.target.value)} placeholder="0,00" />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCashDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleOpenCash} disabled={isProcessing}>
              Abrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sangria / Suprimento */}
      <Dialog open={movementDialog !== null} onOpenChange={(o) => !o && setMovementDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movementDialog === "sangria" ? "Fazer sangria" : "Adicionar suprimento"}
            </DialogTitle>
            <DialogDescription>
              {movementDialog === "sangria"
                ? "Retirada de dinheiro do caixa."
                : "Entrada de dinheiro no caixa."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input value={movementAmountText} onChange={(e) => setMovementAmountText(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>Observação (opcional)</Label>
              <Input value={movementNotes} onChange={(e) => setMovementNotes(e.target.value)} placeholder="Ex.: troco, retirada para banco..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleMovement} disabled={isProcessing}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fechar caixa */}
      <Dialog open={closeCashDialog} onOpenChange={(o) => !o && !forceCloseBecauseDate && setCloseCashDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechamento de caixa</DialogTitle>
            <DialogDescription>
              {forceCloseBecauseDate
                ? "Caixa aberto de dia anterior. O fechamento é obrigatório para continuar."
                : "Informe a contagem final em dinheiro."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Contagem final (dinheiro)</Label>
              <Input value={closingBalanceText} onChange={(e) => setClosingBalanceText(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Input value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)} placeholder="Quebra, ajustes, etc." />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCloseCashDialog(false)}
              disabled={forceCloseBecauseDate}
            >
              Cancelar
            </Button>
            <Button onClick={handleCloseCash} disabled={isProcessing}>
              Fechar e gerar fechamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prévia de recibo */}
      <Dialog open={receiptPreviewOpen} onOpenChange={setReceiptPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resumo / Recibo (prévia)</DialogTitle>
            <DialogDescription>
              Confira os itens e o pagamento antes de finalizar. Você pode imprimir esta prévia.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Itens</p>
              <div className="max-h-[40vh] overflow-y-auto rounded-md border border-border">
                <div className="divide-y divide-border">
                  {cart.map((c) => (
                    <div key={c.id} className="p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.quantity} × R$ {c.price.toFixed(2)}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-foreground whitespace-nowrap">
                        R$ {(c.price * c.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Pagamento</p>
              <div className="rounded-md border border-border p-3 space-y-1">
                <p className="text-sm text-foreground">{formatPaymentSummary(payment1Method, payment1Amount)}</p>
                <p className="text-sm text-foreground">{formatPaymentSummary(payment2Method, payment2Amount)}</p>
                {paymentSplitError && <p className="text-sm text-destructive">{paymentSplitError}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-semibold text-foreground">R$ {total.toFixed(2)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptPreviewOpen(false)}>
              Fechar
            </Button>
            <Button onClick={handlePrintReceiptPreview} disabled={!canSell || cart.length === 0 || !!paymentSplitError}>
              Imprimir recibo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
