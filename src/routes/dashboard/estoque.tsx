import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, AlertTriangle, Plus, Search, Edit2, Trash2, X, DollarSign, ListOrdered } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/dashboard/estoque")({
  head: () => ({ meta: [{ title: "Estoque — CYBERBARBERSHOP" }] }),
  component: EstoquePage,
});

type Product = {
  id?: string;
  empresa_id?: string;
  name: string;
  nome?: string;
  qty: number;
  quantidade?: number;
  min: number;
  price: number;
  preco?: number;
  category: string;
  categoria?: string;
  image_url?: string;
};

// initialProducts omitted for brevity

function EstoquePage() {
  const { user, isReadOnly } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [min, setMin] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Modeladores");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const demoProducts: Product[] = [
    { id: "demo-p1", name: "Pomada Alpha Matte", qty: 15, min: 5, price: 45, category: "Modeladores" },
    { id: "demo-p2", name: "Óleo para Barba Wood", qty: 3, min: 5, price: 35, category: "Cuidados" },
    { id: "demo-p3", name: "Shampoo Refrescante", qty: 20, min: 10, price: 28, category: "Higiene" },
    { id: "demo-p4", name: "Capa de Corte Pro", qty: 2, min: 3, price: 85, category: "Outros" },
    { id: "demo-p5", name: "Lâminas Platinum", qty: 100, min: 20, price: 1.5, category: "Descartáveis" },
  ];

  const fetchProducts = async () => {
    if (!user) return;
    setLoading(true);

    if (user.isDemo) {
      if (products.length === 0) {
        setProducts(demoProducts);
      }
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.from('produtos').select('*');
    
    if (!error && data) {
      const formatted = data.map(p => ({
        id: p.id,
        name: p.nome,
        nome: p.nome,
        qty: Number(p.quantidade),
        quantidade: Number(p.quantidade),
        // we didn't add min to db schema originally, so fallback to 5 or based on category
        min: 5, 
        price: Number(p.preco),
        preco: Number(p.preco),
        category: p.categoria || "Outros",
        categoria: p.categoria,
        image_url: p.image_url
      }));
      setProducts(formatted);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const handleOpenModal = (product: Product | null = null) => {
    if (product) {
      setEditingProduct(product);
      setName(product.name);
      setQty(product.qty.toString());
      setMin(product.min.toString());
      setPrice(product.price.toString());
      setCategory(product.category);
      setImagePreview(product.image_url || null);
      setImage(null);
    } else {
      setEditingProduct(null);
      setName("");
      setQty("");
      setMin("");
      setPrice("");
      setCategory("Modeladores");
      setImagePreview(null);
      setImage(null);
    }
    setShowModal(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('produtos')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('produtos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !qty || !price) return;

    setLoading(true);

    try {
      let imageUrl = imagePreview;
      
      if (image) {
        imageUrl = await uploadImage(image);
      }

      if (user?.isDemo) {
        if (editingProduct && editingProduct.id) {
          setProducts(products.map(p => p.id === editingProduct.id ? {
            ...p,
            name,
            qty: parseInt(qty),
            price: parseFloat(price),
            category,
            image_url: imageUrl || ""
          } : p));
        } else {
          const newProd: Product = {
            id: `sim-p-${Date.now()}`,
            name,
            qty: parseInt(qty),
            min: parseInt(min) || 5,
            price: parseFloat(price),
            category,
            image_url: imageUrl || ""
          };
          setProducts([newProd, ...products]);
        }
      } else if (editingProduct && editingProduct.id) {
        await supabase.from('produtos').update({
          nome: name,
          quantidade: parseInt(qty),
          preco: parseFloat(price),
          categoria: category,
          image_url: imageUrl
        }).eq('id', editingProduct.id);
      } else {
        const cybertechId = "579ea8ea-979e-4b38-a6af-529792882aa9";
        await supabase.from('produtos').insert({
          empresa_id: user?.empresa_id || cybertechId,
          nome: name,
          quantidade: parseInt(qty),
          preco: parseFloat(price),
          categoria: category,
          type: 'product',
          image_url: imageUrl
        });
        await fetchProducts(); // Only reload if not demo
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar produto no estoque.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string | undefined) => {
    if (!id) return;
    if (confirm("Deseja realmente excluir este produto?")) {
      setLoading(true);
      if (user?.isDemo) {
        setProducts(products.filter(p => p.id !== id));
      } else {
        await supabase.from('produtos').delete().eq('id', id);
        await fetchProducts();
      }
      setLoading(false);
    }
  };

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estoque</h1>
          <p className="text-sm text-muted-foreground">{products.length} produtos em catálogo</p>
        </div>
        <Button
          size="sm"
          className="bg-gradient-cyan text-primary-foreground gap-1 hover:opacity-90 disabled:opacity-50"
          onClick={() => handleOpenModal()}
        >
          <Plus size={16} /> Novo produto
        </Button>
      </div>

      <div className="mb-6 relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input 
          placeholder="Buscar produto..." 
          className="pl-10 bg-white/5 border-white/10 h-11 rounded-xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                <th className="p-4 text-left text-xs font-bold uppercase tracking-widest text-muted-foreground">Produto</th>
                <th className="p-4 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Qtd</th>
                <th className="p-4 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Mínimo</th>
                <th className="p-4 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Preço</th>
                <th className="p-4 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="p-4 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-surface/30 transition-colors">
                  <td className="p-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-muted text-primary overflow-hidden">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={18} />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{p.category}</p>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`font-black ${p.qty <= p.min ? "text-red-400" : "text-foreground"}`}>
                      {p.qty}
                    </span>
                  </td>
                  <td className="p-4 text-center text-muted-foreground font-medium">{p.min}</td>
                  <td className="p-4 text-center text-foreground font-black italic">R$ {p.price.toFixed(2)}</td>
                  <td className="p-4 text-center">
                    {p.qty <= p.min ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-black uppercase text-red-400 border border-red-500/20">
                        <AlertTriangle size={12} /> Baixo
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-black uppercase text-green-400 border border-green-500/20">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => handleOpenModal(p)}
                        className="p-2 text-muted-foreground hover:text-primary disabled:opacity-30"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(p.id)}
                        className="p-2 text-muted-foreground hover:text-red-500 disabled:opacity-30"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-muted-foreground italic">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={24} />
              </button>
            </div>

            <div className="flex justify-center mb-6">
              <div className="relative group cursor-pointer" onClick={() => document.getElementById('imageInput')?.click()}>
                <div className="w-24 h-24 rounded-2xl bg-white/5 border border-dashed border-white/20 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50 group-hover:bg-white/10">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Plus size={32} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-primary text-black p-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit2 size={12} />
                </div>
                <input 
                  id="imageInput"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nome do Produto</label>
                <Input 
                  required
                  placeholder="Ex: Pomada Efeito Matte" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/5 border-white/10 h-12 rounded-xl text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quantidade Atual</label>
                  <div className="relative">
                    <ListOrdered size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      required
                      type="number"
                      placeholder="0" 
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      className="pl-9 bg-white/5 border-white/10 h-12 rounded-xl text-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Qtd. Mínima (Alerta)</label>
                  <div className="relative">
                    <AlertTriangle size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      type="number"
                      placeholder="5" 
                      value={min}
                      onChange={(e) => setMin(e.target.value)}
                      className="pl-9 bg-white/5 border-white/10 h-12 rounded-xl text-foreground"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Preço de Venda (R$)</label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      required
                      type="number"
                      step="0.01"
                      placeholder="0.00" 
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="pl-9 bg-white/5 border-white/10 h-12 rounded-xl text-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Categoria</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 h-12 rounded-xl px-4 outline-none focus:border-primary/50 text-foreground transition-all"
                  >
                    <option value="Modeladores" className="bg-background">Modeladores</option>
                    <option value="Cuidados" className="bg-background">Cuidados</option>
                    <option value="Higiene" className="bg-background">Higiene</option>
                    <option value="Descartáveis" className="bg-background">Descartáveis</option>
                    <option value="Outros" className="bg-background">Outros</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-12 border border-white/10 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  className="flex-1 h-12 bg-gradient-cyan text-black font-bold italic uppercase rounded-xl shadow-[0_10px_30px_rgba(var(--primary),0.3)]"
                >
                  {editingProduct ? "Salvar Alterações" : "Criar Produto"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
