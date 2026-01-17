import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Package, 
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Archive
} from "lucide-react";
import { productsApi, type Product } from "@/lib/petcontrol.api";
import { useToast } from "@/hooks/use-toast";

export default function Produtos() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [category, setCategory] = useState("");

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const data = await productsApi.getAll();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setStock("0");
    setCategory("");
    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description || "");
    setPrice(product.price.toString());
    setStock(product.stock_quantity?.toString() || "0");
    setCategory(product.category || "");
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!name || !price) return;

    try {
      if (editingProduct) {
        await productsApi.update(editingProduct.id, {
          name,
          description: description || null,
          price: parseFloat(price),
          stock_quantity: parseInt(stock),
          category: category || null,
        });
        toast({ title: "Produto atualizado!" });
      } else {
        await productsApi.create({
          name,
          description: description || null,
          price: parseFloat(price),
          stock_quantity: parseInt(stock),
          category: category || null,
        });
        toast({ title: "Produto cadastrado!" });
      }
      setShowForm(false);
      resetForm();
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir este produto?")) return;

    try {
      await productsApi.delete(id);
      toast({ title: "Produto excluído!" });
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Package className="w-7 h-7 text-primary" />
              Produtos
            </h1>
            <p className="text-muted-foreground">{products.length} produtos cadastrados</p>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
            <Plus size={18} />
            Novo Produto
          </Button>
        </div>

        {/* Products List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="pet-card animate-pulse">
                <div className="h-24 bg-muted rounded-lg" />
              </div>
            ))
          ) : products.length > 0 ? (
            products.map(product => (
              <div key={product.id} className="pet-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(product)}
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{product.name}</h3>
                {product.category && (
                  <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                    {product.category}
                  </span>
                )}
                {product.description && (
                  <p className="text-sm text-muted-foreground mt-2 mb-3">{product.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm mt-3">
                  <span className="flex items-center gap-1 text-primary font-semibold">
                    <DollarSign size={14} />
                    R$ {product.price.toFixed(2)}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Archive size={14} />
                    {product.stock_quantity} un.
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full pet-card text-center py-12">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum produto cadastrado
              </h3>
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus size={18} />
                Cadastrar Produto
              </Button>
            </div>
          )}
        </div>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Ração Premium"
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Ração, Brinquedos..."
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição do produto..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preço (R$) *</Label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estoque</Label>
                  <Input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="0"
                    className="h-12"
                  />
                </div>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!name || !price}
                className="w-full h-12"
              >
                {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
