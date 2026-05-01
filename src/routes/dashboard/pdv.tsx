import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ShoppingCart, 
  User, 
  Scissors, 
  DollarSign, 
  CreditCard, 
  Zap, 
  CheckCircle2,
  Trash2,
  Plus,
  Search,
  Package,
  X,
  UserPlus
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/dashboard/pdv")({
  head: () => ({
    meta: [{ title: "PDV — CYBERBARBERSHOP" }],
  }),
  component: PDVPage,
});

type Item = { id: string; name: string; price: number; category: string; type: "service" | "product"; qty?: number };
type Client = { 
  id?: string; 
  name: string; 
  phone: string; 
  visits?: number; 
  lastVisit?: string;
  is_subscriber?: boolean;
  credits_remaining?: number;
};
const barbers = ["Carlos", "Rafael", "Felipe"];

function PDVPage() {
  const { user, isReadOnly } = useAuth();
  
  // State for data
  const [services, setServices] = useState<Item[]>([]);
  const [products, setProducts] = useState<Item[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState<"services" | "products">("services");
  const [showClientModal, setShowClientModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // New Client Form
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  // Selection
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedBarber, setSelectedBarber] = useState(barbers[0]);
  const [cart, setCart] = useState<Item[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("Dinheiro");

  // Search filter
  const [itemSearch, setItemSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [useSubscriptionCredits, setUseSubscriptionCredits] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);

    if (user.isDemo) {
      setServices([
        { id: "ds1", name: "Corte Alpha", price: 45, category: "Cabelo", type: "service" },
        { id: "ds2", name: "Barba Tradicional", price: 30, category: "Barba", type: "service" },
        { id: "ds3", name: "Sobrancelha", price: 15, category: "Estética", type: "service" },
      ]);
      setProducts([
        { id: "dp1", name: "Pomada Alpha", price: 45, category: "Modeladores", qty: 10, type: "product" },
        { id: "dp2", name: "Óleo Wood", price: 35, category: "Cuidados", qty: 5, type: "product" },
      ]);
        { id: "dc1", name: "Ricardo Oliveira", phone: "11988772211", visits: 12, lastVisit: "10/04/2026", is_subscriber: true, credits_remaining: 3 },
        { id: "dc2", name: "Felipe Mendes", phone: "11977663322", visits: 5, lastVisit: "12/04/2026", is_subscriber: false },
        { id: "dc3", name: "Gustavo Santos", phone: "11966554433", visits: 22, lastVisit: "05/04/2026", is_subscriber: true, credits_remaining: 8 },
      ]);
      setIsLoading(false);
      return;
    }
    
    const [servRes, prodRes, cliRes] = await Promise.all([
      supabase.from('servicos').select('*'),
      supabase.from('produtos').select('*'),
      supabase.from('clientes').select('*')
    ]);

    if (!servRes.error && servRes.data) {
      setServices(servRes.data.map(s => ({
        id: s.id, name: s.nome, price: Number(s.preco), category: s.categoria, type: "service"
      })));
    }
    
    if (!prodRes.error && prodRes.data) {
      setProducts(prodRes.data.map(p => ({
        id: p.id, name: p.nome, price: Number(p.preco), category: p.categoria, qty: p.quantidade, type: "product"
      })));
    }
    
    if (!cliRes.error && cliRes.data) {
      setClients(cliRes.data.map(c => ({
        id: c.id, 
        name: c.nome, 
        phone: c.telefone || "", 
        visits: c.visitas || 0, 
        lastVisit: c.ultima_visita ? new Date(c.ultima_visita).toLocaleDateString("pt-BR") : "Nunca",
        is_subscriber: c.is_subscriber || false,
        credits_remaining: c.credits_remaining || 0
      })));
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const total = cart.reduce((sum, s) => {
    // If using subscription credits, services cost R$ 0
    if (useSubscriptionCredits && selectedClient?.is_subscriber && s.type === "service") {
      return sum;
    }
    return sum + s.price;
  }, 0);

  const handleAddToCart = (item: Item) => {
    setCart([...cart, item]);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    
    if (user?.isDemo) {
      const newSimClient: Client = { 
        id: `sim-c-${Date.now()}`, 
        name: newName, 
        phone: newPhone, 
        visits: 0, 
        lastVisit: "Hoje",
        is_subscriber: false 
      };
      setClients([...clients, newSimClient]);
      setSelectedClient(newSimClient);
    } else {
      const cybertechId = "579ea8ea-979e-4b38-a6af-529792882aa9";
      
      const { data, error } = await supabase.from('clientes').insert({
        empresa_id: user?.empresa_id || cybertechId,
        nome: newName,
        telefone: newPhone,
        visitas: 0
      }).select().single();

      if (!error && data) {
        const newClient = { id: data.id, name: data.nome, phone: data.telefone || "", visits: 0, lastVisit: "Nunca" };
        setClients([...clients, newClient]);
        setSelectedClient(newClient);
      }
    }
    
    setNewName("");
    setNewPhone("");
    setShowClientModal(false);
  };

  const handleFinishSale = async () => {
    if (cart.length === 0) return;
    setIsLoading(true);
    
    if (user?.isDemo) {
      // Simulate success for demo
      setIsSuccess(true);
      setIsLoading(false);
      setTimeout(() => {
        setIsSuccess(false);
        setCart([]);
        setSelectedClient(null);
      }, 2000);
      return;
    }

    const cybertechId = "579ea8ea-979e-4b38-a6af-529792882aa9";
    const empresaId = user?.empresa_id || cybertechId;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const dateStr = now.toLocaleDateString("pt-BR");

    // 1. Save transaction
    await supabase.from('transacoes').insert({
      empresa_id: empresaId,
      descricao: cart.map(s => s.name).join(" + ") + (selectedClient ? ` — ${selectedClient.name}` : ""),
      barbeiro: selectedBarber,
      valor: `+R$ ${total.toFixed(2)}`,
      tipo: "income",
      hora: timeStr,
      data: dateStr,
      metodo_pagamento: paymentMethod
    });

    // 2. Decrement stock for products
    const productItems = cart.filter(item => item.type === "product");
    if (productItems.length > 0) {
      for (const item of productItems) {
        // Encontra produto atual para decrementar certinho
        const cProd = products.find(p => p.id === item.id);
        if (cProd && cProd.qty !== undefined) {
          await supabase.from('produtos').update({
            quantidade: Math.max(0, cProd.qty - 1)
          }).eq('id', cProd.id);
        }
      }
    }

    // 3. Update Client Stats and Credits
    if (selectedClient && selectedClient.id) {
       const hasServiceInCart = cart.some(i => i.type === "service");
       const creditsToUse = (useSubscriptionCredits && selectedClient.is_subscriber && hasServiceInCart) ? 1 : 0;
       
       const updateData: any = {
         visitas: (selectedClient.visits || 0) + 1,
         ultima_visita: now.toISOString()
       };

       if (creditsToUse > 0) {
         updateData.credits_remaining = Math.max(0, (selectedClient.credits_remaining || 0) - 1);
       }

       await supabase.from('clientes').update(updateData).eq('id', selectedClient.id);
    }

    // Refresh everything
    await fetchData();

    // Success animation
    setIsSuccess(true);
    setIsLoading(false);
    
    setTimeout(() => {
      setIsSuccess(false);
      setCart([]);
      setSelectedClient(null);
      setPaymentMethod("Dinheiro");
      setUseSubscriptionCredits(false);
    }, 2000);
  };

  const filteredItems = (activeTab === "services" ? services : products).filter(item => 
    item.name.toLowerCase().includes(itemSearch.toLowerCase())
  );
  
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground underline decoration-primary/30">Frente de Caixa (PDV)</h1>
          <p className="text-sm text-muted-foreground italic tracking-widest uppercase">REGISTRE VENDAS COM VELOCIDADE CYBERTECH</p>
        </div>
        {cart.length > 0 && (
          <Button 
            variant="ghost" 
            onClick={clearCart}
            className="text-muted-foreground hover:text-red-500 gap-2"
          >
            <Trash2 size={16} /> Limpar Carrinho
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* LADO ESQUERDO: Seleção */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Cliente */}
          <div className="glass-card rounded-2xl p-6 border border-white/5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
              <User size={16} /> 1. Selecionar Cliente
            </h2>
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Pesquisar cliente..." 
                className="pl-10 bg-white/5 border-white/10 h-11"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {filteredClients.slice(0, 10).map((c) => (
                <button
                  key={c.name}
                  onClick={() => setSelectedClient(c)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                    selectedClient?.name === c.name ? "bg-primary text-black border-primary" : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  {c.name}
                </button>
              ))}
              <button 
                onClick={() => setShowClientModal(true)}
                className="flex-shrink-0 px-4 py-2 rounded-xl border border-dashed border-white/20 text-xs font-bold text-muted-foreground hover:bg-white/5 flex items-center gap-2"
              >
                <Plus size={14} /> Novo Cliente
              </button>
            </div>
            {selectedClient?.is_subscriber && (
              <div className="mt-4 p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between animate-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                     <Zap size={14} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-primary uppercase italic">Cliente Assinante</p>
                    <p className="text-xs font-bold text-foreground">{selectedClient.credits_remaining} créditos disponíveis</p>
                  </div>
                </div>
                <button 
                  onClick={() => setUseSubscriptionCredits(!useSubscriptionCredits)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                    useSubscriptionCredits ? "bg-primary text-black" : "bg-white/10 text-muted-foreground"
                  }`}
                >
                  {useSubscriptionCredits ? "Usando Crédito" : "Usar Crédito"}
                </button>
              </div>
            )}
          </div>

          {/* Barbeiro */}
          <div className="glass-card rounded-2xl p-6 border border-white/5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
               <Zap size={16} /> 2. Profissional
            </h2>
            <div className="grid grid-cols-3 gap-3">
               {barbers.map(b => (
                 <button
                   key={b}
                   onClick={() => setSelectedBarber(b)}
                   className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                     selectedBarber === b ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/10 text-muted-foreground"
                   }`}
                 >
                   {b}
                 </button>
               ))}
            </div>
          </div>

          {/* Itens (Serviços / Produtos) */}
          <div className="glass-card rounded-2xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                 <Scissors size={16} /> 3. Adicionar Itens
              </h2>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                <button 
                  onClick={() => setActiveTab("services")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "services" ? "bg-primary text-black" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Scissors size={14} /> Serviços
                </button>
                <button 
                  onClick={() => setActiveTab("products")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "products" ? "bg-primary text-black" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Package size={14} /> Produtos
                </button>
              </div>
            </div>

            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder={`Pesquisar ${activeTab === "services" ? "serviço" : "produto"}...`} 
                className="pl-10 bg-white/5 border-white/10 h-11"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
              />
            </div>
            
            <div className="grid gap-3 md:grid-cols-2">
               {filteredItems.map(item => (
                 <button
                   key={item.id}
                   onClick={() => handleAddToCart(item)}
                   className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all group"
                 >
                   <div className="text-left">
                     <p className="text-sm font-bold text-foreground">{item.name}</p>
                     <p className="text-[10px] text-muted-foreground uppercase">{item.category}</p>
                   </div>
                   <div className="flex items-center gap-3">
                     <span className="text-sm font-black text-primary italic">R$ {item.price.toFixed(2)}</span>
                     <Plus size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                   </div>
                 </button>
               ))}
               {filteredItems.length === 0 && (
                 <div className="col-span-2 py-10 text-center text-muted-foreground italic text-sm">
                   Nenhum {activeTab === "services" ? "serviço" : "produto"} encontrado.
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* LADO DIREITO: Carrinho e Checkout */}
        <div className="lg:col-span-4 lg:sticky lg:top-8 self-start">
           <div className="glass-card rounded-[2rem] border border-white/10 bg-card p-6 shadow-2xl overflow-hidden relative">
              
              {isSuccess && (
                <div className="absolute inset-0 z-20 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300 text-center px-4">
                   <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 border border-primary/30">
                      <CheckCircle2 size={32} className="text-primary" />
                   </div>
                   <h3 className="text-xl font-black italic uppercase text-foreground">VENDA CONCLUÍDA!</h3>
                   <p className="text-xs text-muted-foreground mt-1">Sincronizado com financeiro e estoque.</p>
                </div>
              )}

              <div className="flex items-center justify-between mb-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <ShoppingCart size={20} className="text-primary" /> Carrinho
                </h2>
                <span className="bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase italic">
                  Cybertech PDV
                </span>
              </div>

              {/* Lista do Carrinho */}
              <div className="space-y-3 mb-6 min-h-[120px] max-h-[350px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground italic text-sm opacity-50">
                    <ShoppingCart size={40} className="mx-auto mb-2 opacity-10" />
                    Carrinho vazio...
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-surface/50 border border-white/5 group animate-in slide-in-from-right-2 duration-200">
                      <div>
                        <p className="text-xs font-bold text-foreground">{item.name}</p>
                        <p className="text-[9px] text-muted-foreground flex items-center gap-1 uppercase">
                          {item.type === "service" ? <Scissors size={8} /> : <Package size={8} />}
                          {item.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-foreground italic">R$ {item.price.toFixed(2)}</span>
                        <button onClick={() => removeFromCart(idx)} className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Forma de Pagamento */}
              <div className="space-y-2 mb-6 pt-6 border-t border-white/5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Forma de Pagamento</label>
                <div className="grid grid-cols-2 gap-2">
                   {["Dinheiro", "PIX", "Cartão", "Link"].map(method => (
                     <button
                       key={method}
                       onClick={() => setPaymentMethod(method)}
                       className={`p-2 rounded-lg border text-[10px] font-black uppercase italic transition-all ${
                         paymentMethod === method ? "bg-primary text-black border-primary" : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                       }`}
                     >
                       {method}
                     </button>
                   ))}
                </div>
              </div>

              {/* Total e Botão */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                 <div className="flex items-center justify-between px-1">
                    <span className="text-muted-foreground font-bold text-xs uppercase tracking-widest">Total Geral</span>
                    <span className="text-2xl font-black text-primary italic">R$ {total.toFixed(2)}</span>
                 </div>
                 
                 <Button 
                    onClick={handleFinishSale}
                    disabled={cart.length === 0}
                    className="w-full h-14 bg-gradient-cyan text-black font-black uppercase italic rounded-2xl shadow-[0_10px_30px_rgba(var(--primary),0.3)] hover:scale-[1.02] transition-all disabled:opacity-40"
                  >
                   FINALIZAR VENDA
                 </Button>
              </div>
           </div>
        </div>
      </div>

      {/* Modal Novo Cliente */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-sm rounded-[2rem] p-8 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <UserPlus size={20} className="text-primary" /> Novo Cliente
              </h2>
              <button onClick={() => setShowClientModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddClient} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nome Completo</label>
                <Input 
                  required
                  placeholder="Nome do cliente" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-white/5 border-white/10 h-11"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Telefone</label>
                <Input 
                  placeholder="(00) 00000-0000" 
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="bg-white/5 border-white/10 h-11"
                />
              </div>
              <Button type="submit" className="w-full h-11 bg-gradient-cyan text-black font-bold uppercase italic rounded-xl mt-4">
                Cadastrar Cliente
              </Button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
