import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Scissors, Clock, DollarSign, X, Edit2, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/dashboard/servicos")({
  head: () => ({
    meta: [{ title: "Serviços — CYBERBARBERSHOP" }],
  }),
  component: ServicosPage,
});

type Service = {
  id?: string;
  empresa_id?: string;
  name: string;
  nome?: string;
  price: number;
  preco?: number;
  duration: string;
  duracao?: string;
  category: string;
  categoria?: string;
  image_url?: string;
};

// ... initialServices omitted for brevity as they are now in the DB

function ServicosPage() {
  const { user, isReadOnly } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [category, setCategory] = useState("Cabelo");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const demoServices: Service[] = [
    { id: "demo-s1", name: "Corte Social", price: 35, duration: "30 min", category: "Cabelo" },
    { id: "demo-s2", name: "Degradê / Fade", price: 45, duration: "45 min", category: "Cabelo" },
    { id: "demo-s3", name: "Barba Terapia", price: 30, duration: "30 min", category: "Barba" },
    { id: "demo-s4", name: "Corte + Barba", price: 65, duration: "1h", category: "Combo" },
    { id: "demo-s5", name: "Pigmentação", price: 20, duration: "20 min", category: "Estética" },
  ];

  const fetchServices = async () => {
    if (!user) return;
    setLoading(true);

    if (user.isDemo) {
      if (services.length === 0) {
        setServices(demoServices);
      }
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.from('servicos').select('*');
    
    if (!error && data) {
      const formatted = data.map(s => ({
        id: s.id,
        name: s.nome,
        nome: s.nome,
        price: Number(s.preco),
        preco: Number(s.preco),
        duration: s.duracao,
        duracao: s.duracao,
        category: s.categoria,
        categoria: s.categoria,
        image_url: s.image_url
      }));
      setServices(formatted);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, [user]);

  const handleOpenModal = (service: Service | null = null) => {
    if (service) {
      setEditingService(service);
      setName(service.name);
      setPrice(service.price.toString());
      setDuration(service.duration);
      setCategory(service.category);
      setImagePreview(service.image_url || null);
      setImage(null);
    } else {
      setEditingService(null);
      setName("");
      setPrice("");
      setDuration("");
      setCategory("Cabelo");
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
      .from('servicos')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('servicos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;
    
    setLoading(true);

    try {
      let imageUrl = imagePreview;
      
      if (image) {
        imageUrl = await uploadImage(image);
      }

      if (user?.isDemo) {
        if (editingService && editingService.id) {
          setServices(services.map(s => s.id === editingService.id ? {
            ...s,
            name,
            price: parseFloat(price),
            duration,
            category,
            image_url: imageUrl || ""
          } : s));
        } else {
          const newServ: Service = {
            id: `sim-s-${Date.now()}`,
            name,
            price: parseFloat(price),
            duration,
            category,
            image_url: imageUrl || ""
          };
          setServices([newServ, ...services]);
        }
      } else if (editingService && editingService.id) {
        await supabase.from('servicos').update({
          nome: name,
          preco: parseFloat(price),
          duracao: duration,
          categoria: category,
          image_url: imageUrl
        }).eq('id', editingService.id);
      } else {
        const cybertechId = "579ea8ea-979e-4b38-a6af-529792882aa9";
        await supabase.from('servicos').insert({
          empresa_id: user?.empresa_id || cybertechId,
          nome: name,
          preco: parseFloat(price),
          duracao: duration,
          categoria: category,
          image_url: imageUrl
        });
        await fetchServices(); // Only reload if not demo
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar serviço.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string | undefined) => {
    if (!id) return;
    if (confirm("Deseja realmente excluir este serviço?")) {
      setLoading(true);
      if (user?.isDemo) {
        setServices(services.filter(s => s.id !== id));
      } else {
        await supabase.from('servicos').delete().eq('id', id);
        await fetchServices();
      }
      setLoading(false);
    }
  };

  const filtered = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Serviços</h1>
          <p className="text-sm text-muted-foreground">{services.length} serviços catalogados</p>
        </div>
        <Button
          size="sm"
          className="bg-gradient-cyan text-primary-foreground gap-1 hover:opacity-90 disabled:opacity-50"
          onClick={() => handleOpenModal()}
        >
          <Plus size={16} /> Novo serviço
        </Button>
      </div>

      <div className="mb-6 relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input 
          placeholder="Buscar serviço..." 
          className="pl-10 bg-white/5 border-white/10 h-11 rounded-xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <div key={s.id} className="glass-card rounded-2xl p-5 border border-white/5 group hover:border-primary/20 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary overflow-hidden">
                {s.image_url ? (
                  <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" />
                ) : (
                  <Scissors size={20} />
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleOpenModal(s)}
                  className="p-2 text-muted-foreground hover:text-primary disabled:opacity-30"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(s.id)}
                  className="p-2 text-muted-foreground hover:text-red-500 disabled:opacity-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-foreground mb-1">{s.name}</h3>
            <span className="inline-block px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-4">
              {s.category}
            </span>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock size={14} />
                <span className="text-xs">{s.duration}</span>
              </div>
              <div className="text-lg font-black text-primary italic">
                R$ {s.price.toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                {editingService ? "Editar Serviço" : "Novo Serviço"}
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
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nome do Serviço</label>
                <Input 
                  required
                  placeholder="Ex: Corte Navalhado" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/5 border-white/10 h-12 rounded-xl text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Preço (R$)</label>
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
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Duração</label>
                  <div className="relative">
                    <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      placeholder="Ex: 45 min" 
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="pl-9 bg-white/5 border-white/10 h-12 rounded-xl text-foreground"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Categoria</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 h-12 rounded-xl px-4 outline-none focus:border-primary/50 text-foreground transition-all"
                >
                  <option value="Cabelo" className="bg-background">Cabelo</option>
                  <option value="Barba" className="bg-background">Barba</option>
                  <option value="Combo" className="bg-background">Combo</option>
                  <option value="Estética" className="bg-background">Estética</option>
                </select>
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
                  {editingService ? "Salvar Alterações" : "Criar Serviço"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
