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
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  ReceiptText,
  Lock,
} from "lucide-react";
import {
  cashRegisterApi,
  productsApi,
  salesApi,
  servicesApi,
  tutorsApi,
  type CashRegisterSession,
  type Product,
  type Service,
  type Tutor,
} from "@/lib/petcontrol.api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { generateCashClosingPdf } from "@/lib/pdv/cashClosingPdf";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: "product" | "service";
  productId?: string;
  serviceId?: string;
}

const paymentMethods = [
  { id: "dinheiro", label: "Dinheiro", icon: Banknote },
  { id: "cartao", label: "Cartão", icon: CreditCard },
  { id: "pix", label: "Pix", icon: QrCode },
];

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
  const [services, setServices] = useState<Service[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTutor, setSelectedTutor] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("dinheiro");
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Caixa
  const [cashSession, setCashSession] = useState<CashRegisterSession | null>(null);
  const [isCashLoading, setIsCashLoading] = useState(true);
  const [openCashDialog, setOpenCashDialog] = useState(false);
  const [movementDialog, setMovementDialog] = useState<null | "sangria" | "suprimento">(null);
  const [closeCashDialog, setCloseCashDialog] = useState(false);

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

  const canSell = useMemo(() => {
    if (!cashSession) return false;
    return isSameLocalDay(cashSession.opened_at);
  }, [cashSession]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsData, servicesData, tutorsData] = await Promise.all([
          productsApi.getActive(),
          servicesApi.getActive(),
          tutorsApi.getAll(),
        ]);
        setProducts(productsData);
        setServices(servicesData);
        setTutors(tutorsData);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
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
    loadCash();
  }, [toast]);

  const addToCart = (item: Product | Service, type: "product" | "service") => {
    const existingIndex = cart.findIndex(
      (c) => (type === "product" ? c.productId : c.serviceId) === item.id
    );

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity++;
      setCart(newCart);
    } else {
      setCart([
        ...cart,
        {
          id: crypto.randomUUID(),
          name: item.name,
          price: item.price,
          quantity: 1,
          type,
          productId: type === "product" ? item.id : undefined,
          serviceId: type === "service" ? item.id : undefined,
        },
      ]);
    }
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
      setSelectedTutor("");

      toast({
        title: "Caixa fechado",
        description: `Diferença: R$ ${(closingBalance - expectedCash).toFixed(2)}`,
      });

      // Confirma antes de imprimir
      const shouldPrint = window.confirm("Imprimir fechamento agora?");
      if (shouldPrint) {
        const { data: settings } = await supabase
          .from("store_settings_public")
          .select("store_name")
          .limit(1)
          .maybeSingle();

        const storeName = settings?.store_name || "PetControl";

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

        const blobPart = pdfBytes.buffer.slice(
          pdfBytes.byteOffset,
          pdfBytes.byteOffset + pdfBytes.byteLength
        );
        const blob = new Blob([blobPart as unknown as BlobPart], {
          type: "application/pdf",
        });
        const url = URL.createObjectURL(blob);
        const w = window.open(url, "_blank");
        if (w) {
          w.addEventListener("load", () => {
            w.print();
          });
        }
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
      await salesApi.create(
        {
          tutor_id: selectedTutor || null,
          total_amount: total,
          payment_method: paymentMethod,
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

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setCart([]);
        setSelectedTutor("");
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
          {/* Products & Services */}
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
                      onClick={() => addToCart(product, "product")}
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

            {/* Services */}
            <div className="pet-card">
              <h2 className="font-semibold text-foreground mb-4">Serviços</h2>
              {services.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => addToCart(service, "service")}
                      disabled={!canSell}
                      className="p-3 bg-secondary/10 hover:bg-secondary/20 rounded-xl text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <p className="font-medium text-foreground truncate">
                        {service.name}
                      </p>
                      <p className="text-secondary font-semibold">
                        R$ {service.price.toFixed(2)}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum serviço cadastrado
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
                {/* Client */}
                <div className="space-y-2 mb-4">
                  <Label>Cliente (opcional)</Label>
                  <Select value={selectedTutor} onValueChange={setSelectedTutor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tutors.map((tutor) => (
                        <SelectItem key={tutor.id} value={tutor.id}>
                          {tutor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Method */}
                <div className="space-y-2 mb-4">
                  <Label>Forma de Pagamento</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id)}
                          disabled={!canSell}
                          className={cn(
                            "p-3 rounded-xl text-center transition-colors flex flex-col items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed",
                            paymentMethod === method.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-accent"
                          )}
                        >
                          <Icon size={20} />
                          <span className="text-xs font-medium">{method.label}</span>
                        </button>
                      );
                    })}
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

                  <Button
                    onClick={handleFinalizeSale}
                    disabled={isProcessing || !canSell}
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
    </MainLayout>
  );
}
