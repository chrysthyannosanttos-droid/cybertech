import { useState, useEffect, useRef } from "react";
import * as htmlToImage from "html-to-image";
import { Button } from "@/components/ui/button";
import { Download, LayoutTemplate, Smartphone, Monitor } from "lucide-react";

type Item = { id: string; name: string; price: number; category: string };

export function MenuGenerator() {
  const [services, setServices] = useState<Item[]>([]);
  const [products, setProducts] = useState<Item[]>([]);
  
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  const [format, setFormat] = useState<"instagram" | "story" | "tv">("story");
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listas Iniciais (Fallback caso localStorage esteja vazio)
    const initialServices = [
      { id: "s1", name: "Corte Alpha", price: 35, category: "Cabelo" },
      { id: "s2", name: "Fade Neon", price: 45, category: "Cabelo" },
      { id: "s3", name: "Corte Titanium", price: 50, category: "Cabelo" },
      { id: "s4", name: "Corte Social Pro", price: 40, category: "Cabelo" },
      { id: "b1", name: "Barba Hacker", price: 30, category: "Barba" },
      { id: "c1", name: "Combo Basic Mode", price: 45, category: "Combo" },
      { id: "c2", name: "Combo Premium Mode", price: 75, category: "Combo" },
    ];

    const initialInventory = [
      { id: "p1", name: "Pomada modeladora", price: 35, category: "Modeladores" },
      { id: "p2", name: "Cera matte", price: 35, category: "Modeladores" },
      { id: "p3", name: "Óleo para barba", price: 30, category: "Cuidados" },
      { id: "p4", name: "Balm para barba", price: 35, category: "Cuidados" },
      { id: "d3", name: "Energético", price: 12, category: "Bebidas" },
    ];

    try {
      const savedServices = localStorage.getItem("cybertech_servicos");
      if (savedServices) {
        const data = JSON.parse(savedServices);
        setServices(data);
        setSelectedServices(data.slice(0, 5).map((s: any) => s.id));
      } else {
        setServices(initialServices);
        setSelectedServices(initialServices.slice(0, 5).map(s => s.id));
      }

      const savedProducts = localStorage.getItem("cybertech_estoque");
      if (savedProducts) {
        const data = JSON.parse(savedProducts);
        // Garantindo mapeamento de campos (qty -> price se necessário ou outros fallbacks)
        const mappedData = data.map((p: any) => ({
          ...p,
          price: p.price || 0
        }));
        setProducts(mappedData);
        setSelectedProducts(mappedData.slice(0, 3).map((p: any) => p.id));
      } else {
        setProducts(initialInventory);
        setSelectedProducts(initialInventory.slice(0, 3).map(p => p.id));
      }
    } catch (e) {
      console.error(e);
      // Fallback em caso de erro no JSON
      setServices(initialServices);
      setProducts(initialInventory);
    }
  }, []);

  const handleDownload = async () => {
    if (!printRef.current) return;
    setIsGenerating(true);
    try {
      const element = printRef.current;
      const dataUrl = await htmlToImage.toPng(element, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#050b14",
      });
      const link = document.createElement("a");
      link.download = `cyberbarbershop-menu-${format}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      console.error("Error generating image", err);
      alert("Houve um erro ao gerar a imagem detalhado: " + (err?.message || JSON.stringify(err) || "Falha não identificada"));
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleService = (id: string) => {
    setSelectedServices(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleProduct = (id: string) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Styles per format
  const formatStyles = {
    instagram: "w-[1080px] h-[1080px]",
    story: "w-[1080px] h-[1920px]",
    tv: "w-[1920px] h-[1080px] flex-row flex-wrap"
  };

  const selectedServicesList = services.filter(s => selectedServices.includes(s.id));
  const selectedProductsList = products.filter(p => selectedProducts.includes(p.id));

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Controles */}
      <div className="lg:col-span-4 space-y-6">
        <div className="glass-card p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-primary flex items-center gap-2 mb-4">
            <LayoutTemplate size={18} /> Format da Mídia
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => setFormat("instagram")}
              className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 ${format === "instagram" ? "bg-primary border-primary text-black" : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"}`}
            >
              <div className="w-6 h-6 border-2 border-current rounded-sm"></div>
              Post Quadrado
            </button>
            <button 
              onClick={() => setFormat("story")}
              className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 ${format === "story" ? "bg-primary border-primary text-black" : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"}`}
            >
              <Smartphone size={18} />
              Banner Vertical
            </button>
            <button 
              onClick={() => setFormat("tv")}
              className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 ${format === "tv" ? "bg-primary border-primary text-black" : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"}`}
            >
              <Monitor size={18} />
              TV Horizontal
            </button>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-4 max-h-[600px] overflow-y-auto scrollbar-none">
          <div className="space-y-4 sticky top-0 bg-[#050b14]/90 backdrop-blur-md pb-4 z-20">
            <input 
              type="text"
              placeholder="Pesquisar serviço ou produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-primary">Serviços ({selectedServices.length})</h2>
            <div className="flex gap-2">
              <button onClick={() => setSelectedServices(services.map(s => s.id))} className="text-[10px] uppercase font-bold hover:text-primary">Todos</button>
              <button onClick={() => setSelectedServices([])} className="text-[10px] uppercase font-bold hover:text-red-400">Nenhum</button>
            </div>
          </div>
          
          <div className="space-y-2">
            {services.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
              <label key={s.id} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={selectedServices.includes(s.id)}
                  onChange={() => toggleService(s.id)}
                  className="accent-primary w-4 h-4"
                />
                <div className="flex-1">
                  <p className={`text-sm font-semibold transition-colors ${selectedServices.includes(s.id) ? 'text-primary' : 'text-foreground'}`}>{s.name}</p>
                </div>
                <span className="text-sm font-black text-primary/80 group-hover:text-primary transition-colors">R$ {s.price}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between mb-2 mt-6">
            <h2 className="text-lg font-bold text-primary">Produtos ({selectedProducts.length})</h2>
            <div className="flex gap-2">
              <button onClick={() => setSelectedProducts(products.map(p => p.id))} className="text-[10px] uppercase font-bold hover:text-primary">Todos</button>
              <button onClick={() => setSelectedProducts([])} className="text-[10px] uppercase font-bold hover:text-red-400">Nenhum</button>
            </div>
          </div>
          
          <div className="space-y-2">
            {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
              <label key={p.id} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={selectedProducts.includes(p.id)}
                  onChange={() => toggleProduct(p.id)}
                  className="accent-primary w-4 h-4"
                />
                <div className="flex-1">
                  <p className={`text-sm font-semibold transition-colors ${selectedProducts.includes(p.id) ? 'text-primary' : 'text-foreground'}`}>{p.name}</p>
                </div>
                <span className="text-sm font-black text-primary/80 group-hover:text-primary transition-colors">R$ {p.price}</span>
              </label>
            ))}
          </div>
        </div>
        
        <Button 
          onClick={handleDownload}
          disabled={isGenerating || (selectedServicesList.length === 0 && selectedProductsList.length === 0)}
          className="w-full bg-gradient-cyan text-black font-black uppercase text-lg h-14 rounded-2xl shadow-lg shadow-cyan-500/20"
        >
          {isGenerating ? "Gerando..." : <><Download className="mr-2" /> Baixar Arte (PNG)</>}
        </Button>
      </div>

      {/* Preview */}
      <div className="lg:col-span-8 flex justify-center bg-black/40 rounded-2xl border border-white/5 p-4 overflow-hidden relative">
        <p className="absolute top-4 left-4 text-xs font-bold text-muted-foreground uppercase tracking-widest z-10">Preview em Escala</p>
        
        {/* Contêiner de Escala para caber na tela mantendo a resolução original exata para o html2canvas */}
        <div className="overflow-hidden flex items-center justify-center w-full h-full min-h-[600px]">
          <div 
            style={{ transform: `scale(${format === 'story' ? 0.35 : format === 'tv' ? 0.4 : 0.45})`, transformOrigin: 'top center' }} 
            className="transition-all duration-500 will-change-transform"
          >
            {/* O ALVO DO RENDER */}
            <div 
              ref={printRef}
              className={`relative bg-[#050b14] overflow-hidden flex flex-col p-16 ${formatStyles[format]}`}
              style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              {/* Imagem de Fundo com Transparência Ajustada */}
              <div 
                className="absolute inset-0 z-0"
                style={{
                  backgroundImage: "url('/assets/menu-bg.png')",
                  backgroundSize: "cover",
                  backgroundPosition: format === "tv" ? "center" : "top center",
                  opacity: 0.65, // Restaurado conforme versão anterior preferida
                }}
              />

              {/* Overlay Escurecedor Base para Leitura */}
              <div className="absolute inset-0 bg-black/40 z-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050b14] via-[#050b14]/60 to-transparent z-0" />
              
              {/* Borda Exterior Neon */}
              <div className="absolute inset-4 border-[3px] border-cyan-500/40 rounded-lg z-0 pointer-events-none" style={{ boxShadow: "0 0 40px rgba(6, 182, 212, 0.3), inset 0 0 40px rgba(6, 182, 212, 0.3)" }} />

              {format === "tv" ? (
                <div className="w-full flex flex-col items-center justify-start mb-8 pt-6 z-10 relative">
                  <div className="flex flex-col items-center justify-center w-full mt-2">
                    {/* TV mantém o fundo sutil com os cards limpos */}
                    <div className="relative flex items-center justify-center mt-36">
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center justify-center mb-10 pt-[45%] z-10">
                  {/* Fundo restaurado sem logo redundante no topo */}
                </div>
              )}

              {/* Corpo / Itens */}
              <div className={`z-10 w-full flex-1 ${format === 'tv' ? 'flex flex-col gap-8 px-12 relative h-full' : 'flex flex-col gap-10 px-10'}`}>
                
                {format === "tv" ? (
                  <div className="flex flex-row w-full gap-8 h-full">
                    {/* Coluna Esquerda CORTES */}
                    <div className="flex flex-col w-[45%] gap-8">
                       <div className="bg-[#051828]/60 border-t-2 border-cyan-400/70 rounded-tr-3xl shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col w-full min-h-[400px]">
                         <div className="w-full bg-[#092b45]/80 py-4 px-6 rounded-tr-3xl">
                           <h3 className="text-[2.2rem] font-bold text-white uppercase tracking-wider drop-shadow-[0_0_10px_rgba(6,182,212,0.9)]">CORTES E SERVIÇOS</h3>
                         </div>
                         <div className="p-6 space-y-4">
                            {selectedServicesList.slice(0, 10).map(item => (
                              <div key={item.id} className="flex items-center justify-between w-full">
                                 <span className="text-[1.6rem] font-bold text-gray-100 tracking-wider flex-shrink-0">{item.name}</span>
                                 <div className="flex-1 mx-4 border-b-2 border-cyan-500/30 border-dashed transform translate-y-1" />
                                 <span className="text-[2.2rem] font-black text-cyan-50 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)] whitespace-nowrap">
                                   <span className="text-[1.2rem] opacity-70 mr-2 font-bold text-cyan-300">R$</span>{item.price}
                                 </span>
                              </div>
                            ))}
                            {selectedServicesList.length === 0 && <p className="text-cyan-500/50 italic">Nenhum serviço selecionado</p>}
                         </div>
                       </div>
                    </div>

                    {/* Coluna Direita PRODUTOS */}
                    <div className="flex flex-col w-[55%] gap-8 h-full relative">
                       <div className="bg-[#051828]/60 border-t-2 border-cyan-400/70 rounded-tr-3xl shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col w-full min-h-[400px]">
                         <div className="w-full bg-[#092b45]/80 py-4 px-6 rounded-tr-3xl flex justify-between items-center">
                           <h3 className="text-[2.2rem] font-bold text-cyan-300 uppercase tracking-wider drop-shadow-[0_0_10px_rgba(6,182,212,0.9)]">PRODUTOS E COMBOS</h3>
                         </div>
                         <div className="p-6 space-y-4">
                            {selectedProductsList.slice(0, 8).map(item => (
                              <div key={item.id} className="flex items-center justify-between w-full">
                                 <span className="text-[1.6rem] font-bold text-gray-100 tracking-wider flex-shrink-0">{item.name}</span>
                                 <div className="flex-1 mx-4 border-b-2 border-cyan-500/30 border-dashed transform translate-y-1" />
                                 <span className="text-[2.2rem] font-black text-cyan-50 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)] whitespace-nowrap">
                                   <span className="text-[1.2rem] opacity-70 mr-2 font-bold text-cyan-300">R$</span>{item.price}
                                 </span>
                              </div>
                            ))}
                            {selectedProductsList.length === 0 && <p className="text-cyan-500/50 italic">Nenhum produto selecionado</p>}
                         </div>
                       </div>

                       {/* Potes e Sprays Decorativos */}
                       <div className="absolute bottom-0 right-0 w-[400px] h-[300px] flex items-end justify-end pointer-events-none opacity-40">
                         <div className="relative w-full h-full"> 
                           <div className="absolute bottom-4 right-12 w-24 h-48 bg-gradient-to-t from-cyan-950 to-blue-900 border-2 border-cyan-500 rounded-t-3xl rounded-b-lg shadow-[0_0_30px_#06b6d4] flex flex-col items-center pt-8">
                             <div className="w-full h-2 bg-red-600 mb-2"></div>
                             <span className="text-cyan-400 font-black mt-16 rotate-90 tracking-widest text-[8px]">CYBERTECH</span>
                           </div>
                           <div className="absolute bottom-0 right-32 w-32 h-36 bg-gradient-to-t from-cyan-900 to-[#031b26] border-2 border-cyan-500 rounded-xl shadow-[0_0_30px_#00f0ff] flex items-center justify-center">
                              <span className="text-cyan-400 font-black text-5xl">X</span>
                           </div>
                         </div>
                       </div>
                    </div>
                  </div>
                ) : (
                    /* Render Padrão Mobile Leftovers */
                    <>
                    {/* Seção Serviços */}
                    {selectedServicesList.length > 0 && (
                      <div className="w-full h-fit">
                        <div className="flex items-center gap-4 mb-6">
                           <h3 className="text-[2.5rem] font-bold text-cyan-400 uppercase tracking-wide drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">CORTES E SERVIÇOS</h3>
                           <div className="flex-1 h-1 bg-cyan-500/80 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                        </div>
                        <div className="space-y-4">
                          {selectedServicesList.map(item => (
                            <div key={item.id} className="flex items-end justify-between w-full">
                               <span className="text-[1.7rem] font-bold text-gray-100 tracking-wider font-sans">{item.name}</span>
                               <div className="flex-1 mx-4 border-b-[3px] border-gray-500/40 mb-2 border-dotted" />
                               <span className="text-3xl font-black text-cyan-50 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)] whitespace-nowrap">
                                 <span className="text-xl opacity-80 mr-2 font-bold text-cyan-300">R$</span>{item.price}
                               </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Seção Produtos */}
                    {selectedProductsList.length > 0 && (
                      <div className="w-full h-fit mt-8">
                        <div className="flex items-center gap-4 mb-6">
                           <h3 className="text-[2.5rem] font-bold text-cyan-400 uppercase tracking-wide drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">PRODUTOS E COMBOS</h3>
                           <div className="flex-1 h-1 bg-cyan-500/80 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                        </div>
                        <div className="space-y-4">
                          {selectedProductsList.map(item => (
                            <div key={item.id} className="flex items-end justify-between w-full">
                               <span className="text-[1.7rem] font-bold text-gray-100 tracking-wider font-sans">{item.name}</span>
                               <div className="flex-1 mx-4 border-b-[3px] border-gray-500/40 mb-2 border-dotted" />
                               <span className="text-3xl font-black text-cyan-50 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)] whitespace-nowrap">
                                 <span className="text-xl opacity-80 mr-2 font-bold text-cyan-300">R$</span>{item.price}
                               </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    </>
                )}
              </div>
              {/* Footer */}
              <div className="mt-auto w-full text-center pt-8 z-10 w-full flex items-center justify-between px-12">
                 <p className="text-xl text-cyan-500/80 font-bold tracking-widest">AGENDAMENTOS VIA WHATSAPP</p>
                 <div className="flex gap-2">
                    <span className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></span>
                    <span className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></span>
                    <span className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></span>
                 </div>
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
