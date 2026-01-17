import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  CheckCircle2
} from "lucide-react";
import { 
  productsApi, 
  servicesApi,
  tutorsApi,
  salesApi,
  type Product,
  type Service,
  type Tutor 
} from "@/lib/petcontrol.api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: 'product' | 'service';
  productId?: string;
  serviceId?: string;
}

const paymentMethods = [
  { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { id: 'cartao', label: 'Cartão', icon: CreditCard },
  { id: 'pix', label: 'Pix', icon: QrCode },
];

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
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const addToCart = (item: Product | Service, type: 'product' | 'service') => {
    const existingIndex = cart.findIndex(
      c => (type === 'product' ? c.productId : c.serviceId) === item.id
    );

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity++;
      setCart(newCart);
    } else {
      setCart([...cart, {
        id: crypto.randomUUID(),
        name: item.name,
        price: item.price,
        quantity: 1,
        type,
        productId: type === 'product' ? item.id : undefined,
        serviceId: type === 'service' ? item.id : undefined,
      }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    const newCart = cart.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0);
    setCart(newCart);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleFinalizeSale = async () => {
    if (cart.length === 0) return;

    setIsProcessing(true);
    try {
      await salesApi.create(
        {
          tutor_id: selectedTutor || null,
          total_amount: total,
          payment_method: paymentMethod,
        },
        cart.map(item => ({
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
      console.error('Error processing sale:', error);
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
            <h2 className="text-2xl font-bold text-foreground mb-2">Venda Finalizada!</h2>
            <p className="text-muted-foreground text-lg">R$ {total.toFixed(2)}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-primary" />
            PDV - Ponto de Venda
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products & Services */}
          <div className="lg:col-span-2 space-y-6">
            {/* Products */}
            <div className="pet-card">
              <h2 className="font-semibold text-foreground mb-4">Produtos</h2>
              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {products.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product, 'product')}
                      className="p-3 bg-muted/50 hover:bg-accent rounded-xl text-left transition-colors"
                    >
                      <p className="font-medium text-foreground truncate">{product.name}</p>
                      <p className="text-primary font-semibold">R$ {product.price.toFixed(2)}</p>
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
                  {services.map(service => (
                    <button
                      key={service.id}
                      onClick={() => addToCart(service, 'service')}
                      className="p-3 bg-secondary/10 hover:bg-secondary/20 rounded-xl text-left transition-colors"
                    >
                      <p className="font-medium text-foreground truncate">{service.name}</p>
                      <p className="text-secondary font-semibold">R$ {service.price.toFixed(2)}</p>
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
                cart.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate text-sm">{item.name}</p>
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
                      >
                        <Minus size={14} />
                      </Button>
                      <span className="w-6 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-6">
                  Carrinho vazio
                </p>
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
                      {tutors.map(tutor => (
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
                    {paymentMethods.map(method => {
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id)}
                          className={cn(
                            "p-3 rounded-xl text-center transition-colors flex flex-col items-center gap-1",
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
                    disabled={isProcessing}
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
    </MainLayout>
  );
}
