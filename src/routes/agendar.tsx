import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock, 
  User, 
  Scissors, 
  MessageCircle, 
  CheckCircle2,
  Phone,
  ArrowRight
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export const Route = createFileRoute("/agendar")({
  head: () => ({
    meta: [
      { title: "Agendamento Web — CYBERBARBERSHOP" },
      { property: "og:title", content: "Agendamento Web — CYBERBARBERSHOP" },
      { name: "description", content: "Reserve seu horário com a melhor barbearia da região." },
    ],
  }),
  component: PublicBookingPage,
});

const barbers = [
  { id: "Carlos", name: "Carlos", role: "Master Barber", img: "C" },
  { id: "Rafael", name: "Rafael", role: "Specialist", img: "R" },
  { id: "Felipe", name: "Felipe", role: "Pro Barber", img: "F" },
];

const services = [
  { id: "corte", name: "Corte Social", price: "R$ 45", duration: "30 min" },
  { id: "barba", name: "Barba Profissional", price: "R$ 35", duration: "25 min" },
  { id: "combo", name: "Corte + Barba", price: "R$ 70", duration: "60 min" },
  { id: "navalha", name: "Corte Navalhado", price: "R$ 55", duration: "45 min" },
];

const hours = Array.from({ length: 12 }, (_, i) => `${(i + 8).toString().padStart(2, "0")}:00`);

function PublicBookingPage() {
  const [step, setStep] = useState(1);
  const [selectedBarber, setSelectedBarber] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedHour, setSelectedHour] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Auto-scroll to top on step change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const handleConfirm = () => {
    if (!clientName.trim() || !clientPhone.trim()) {
      alert("Por favor, informe seu nome e telefone.");
      return;
    }

    // 1. Save to localStorage (sync with system)
    const saved = localStorage.getItem("cybertech_appointments");
    const appointments = saved ? JSON.parse(saved) : {};
    
    const key = `${selectedBarber}-${selectedHour}`;
    const newApts = {
      ...appointments,
      [key]: [{ client: clientName, service: selectedService, duration: 1 }]
    };
    
    localStorage.setItem("cybertech_appointments", JSON.stringify(newApts));

    // 2. Generate WhatsApp Link
    const message = encodeURIComponent(
      `💈 *CONFIRMAÇÃO DE AGENDAMENTO* 💈\n\n` +
      `Olá! Acabei de agendar um horário pelo site:\n\n` +
      `👤 *Cliente:* ${clientName}\n` +
      `💇‍♂️ *Serviço:* ${selectedService}\n` +
      `👨‍🎨 *Barbeiro:* ${selectedBarber}\n` +
      `⏰ *Horário:* ${selectedHour}\n` +
      `📅 *Data:* Hoje (${new Date().toLocaleDateString('pt-BR')})\n\n` +
      `*Por favor, confirme meu horário no sistema!*`
    );
    
    // Using a sample business number (you can customize this)
    const businessPhone = "5511999990000"; 
    window.open(`https://wa.me/${businessPhone}?text=${message}`, "_blank");

    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
        <div className="glass-card max-w-md w-full rounded-[2.5rem] p-10 border border-primary/20 shadow-[0_0_50px_rgba(var(--primary),0.2)]">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/30 shadow-[0_0_20px_rgba(var(--primary),0.3)]">
            <CheckCircle2 size={40} className="text-primary animate-bounce" />
          </div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-4 text-foreground">
            TUDO CERTO!
          </h1>
          <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
            Seu agendamento foi registrado com sucesso. <br/>
            Enviamos uma mensagem de confirmação para nosso WhatsApp.
          </p>
          <Link to="/">
            <Button className="w-full h-14 bg-gradient-cyan text-black font-black uppercase italic rounded-2xl shadow-[0_10px_30px_rgba(var(--primary),0.3)] hover:scale-[1.02] transition-all">
              Voltar para a Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/20 blur-[120px] rounded-full" />
      </div>

      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/50 border-b border-white/5 py-4 px-6 mb-8">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link to="/">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-1.5 bg-white/5 px-4 py-2 rounded-full border border-white/10">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AGENDAMENTO ONLINE</span>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 pb-20 relative z-10">
        {/* Progress Bar */}
        <div className="mb-10 flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= i ? "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" : "bg-white/10"}`} 
            />
          ))}
        </div>

        {/* STEP 1: Selecionar Barbeiro */}
        {step === 1 && (
          <div className="animate-in slide-in-from-right-10 fade-in duration-500">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-8 text-foreground">
              Com quem você quer <br/> <span className="text-primary underline decoration-primary/30">cortar hoje?</span>
            </h2>
            <div className="grid gap-4">
              {barbers.map((b) => (
                <button
                  key={b.id}
                  onClick={() => { setSelectedBarber(b.id); setStep(2); }}
                  className={`flex items-center gap-4 p-5 rounded-3xl border transition-all active:scale-[0.98] ${selectedBarber === b.id ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]" : "bg-white/5 border-white/10 hover:bg-white/10 shadow-xl"}`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-background flex items-center justify-center text-xl font-black text-primary border border-primary/20">
                    {b.img}
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-foreground">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.role}</p>
                  </div>
                  <ChevronRight size={20} className="text-muted-foreground/30" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Selecionar Serviço */}
        {step === 2 && (
          <div className="animate-in slide-in-from-right-10 fade-in duration-500">
            <button onClick={() => setStep(1)} className="mb-6 flex items-center gap-2 text-primary font-bold text-sm uppercase italic">
              <ChevronLeft size={16} /> Voltar
            </button>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-8 text-foreground">
              Escolha seu <br/> <span className="text-primary underline decoration-primary/30">estilo</span>
            </h2>
            <div className="grid gap-4">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedService(s.name); setStep(3); }}
                  className={`flex items-center justify-between p-5 rounded-3xl border transition-all active:scale-[0.98] ${selectedService === s.name ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]" : "bg-white/5 border-white/10 hover:bg-white/10 shadow-xl"}`}
                >
                  <div>
                    <p className="font-bold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.duration}</p>
                  </div>
                  <div className="bg-primary px-4 py-1.5 rounded-xl text-black font-black text-sm italic">
                    {s.price}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Selecionar Horário */}
        {step === 3 && (
          <div className="animate-in slide-in-from-right-10 fade-in duration-500">
            <button onClick={() => setStep(2)} className="mb-6 flex items-center gap-2 text-primary font-bold text-sm uppercase italic">
              <ChevronLeft size={16} /> Voltar
            </button>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-8 text-foreground">
              Qual o melhor <br/> <span className="text-primary underline decoration-primary/30">momento?</span>
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {hours.map((h) => (
                <button
                  key={h}
                  onClick={() => { setSelectedHour(h); setStep(4); }}
                  className={`p-4 rounded-2xl border text-sm font-bold transition-all active:scale-[0.95] ${selectedHour === h ? "bg-primary text-black border-primary shadow-[0_0_15px_rgba(var(--primary),0.4)]" : "bg-white/5 border-white/10 hover:border-primary/30 text-muted-foreground hover:text-foreground hover:bg-white/10"}`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Checkout */}
        {step === 4 && (
          <div className="animate-in slide-in-from-right-10 fade-in duration-500">
            <button onClick={() => setStep(3)} className="mb-6 flex items-center gap-2 text-primary font-bold text-sm uppercase italic">
              <ChevronLeft size={16} /> Voltar
            </button>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-8 text-foreground">
              Quase <span className="text-primary underline decoration-primary/30">pronto</span>
            </h2>

            <div className="glass-card rounded-[2rem] p-8 border border-white/10 shadow-2xl space-y-6 mb-8">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Seu Nome</label>
                <div className="relative">
                   <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60" />
                   <Input 
                      placeholder="Ex: João Silva" 
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="pl-12 bg-white/5 h-14 rounded-2xl border-white/10 focus:border-primary text-base font-medium"
                   />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Seu WhatsApp</label>
                <div className="relative">
                   <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60" />
                   <Input 
                      placeholder="(DD) 99999-9999" 
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="pl-12 bg-white/5 h-14 rounded-2xl border-white/10 focus:border-primary text-base font-medium"
                   />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-4">
                 <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                       <Scissors size={14} />
                       <span>Serviço:</span>
                    </div>
                    <span className="font-bold text-foreground italic uppercase tracking-tighter">{selectedService}</span>
                 </div>
                 <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                       <User size={14} />
                       <span>Barbeiro:</span>
                    </div>
                    <span className="font-bold text-foreground italic uppercase tracking-tighter">{selectedBarber}</span>
                 </div>
                 <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                       <Clock size={14} />
                       <span>Horário:</span>
                    </div>
                    <span className="font-bold text-primary italic uppercase tracking-tighter">{selectedHour}</span>
                 </div>
              </div>
            </div>

            <Button 
               onClick={handleConfirm}
               className="w-full h-16 bg-gradient-cyan text-black font-black uppercase italic text-lg rounded-2xl shadow-[0_15px_40px_rgba(var(--primary),0.3)] hover:scale-[1.02] flex items-center justify-center gap-3 transition-all"
            >
              Confirmar e Enviar WhatsApp
              <MessageCircle size={24} className="fill-black/20" />
            </Button>
            <p className="mt-4 text-[10px] text-center text-muted-foreground uppercase font-bold tracking-[0.2em]">
              Seus dados estão protegidos por <span className="text-primary/60">Cybertech SEC</span>
            </p>
          </div>
        )}
      </main>

      <footer className="mt-auto py-10 text-center border-t border-white/5">
        <p className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground/30 uppercase">
           CYBERBARBERSHOP © 2026
        </p>
      </footer>
    </div>
  );
}
