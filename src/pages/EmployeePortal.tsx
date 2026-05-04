import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  FileText, 
  Clock, 
  User, 
  ShieldCheck, 
  Download, 
  PenTool, 
  MapPin, 
  Zap, 
  Star,
  ChevronRight,
  LogOut,
  Bell,
  Calendar,
  Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MobileTimeClock } from '@/components/portal/MobileTimeClock';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function EmployeePortal() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("home");
  const [payslips, setPayslips] = useState<any[]>([]);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isClockOpen, setIsClockOpen] = useState(false);
  const [isPayslipsOpen, setIsPayslipsOpen] = useState(false);
  const [isBenefitsOpen, setIsBenefitsOpen] = useState(false);
  const [isVacationOpen, setIsVacationOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      
      try {
        // Busca dados do colaborador
        const { data: emp } = await supabase
          .from('employees')
          .select('*, stores(name)')
          .eq('id', user.id)
          .single();
        
        if (emp) setEmployeeData(emp);

        // Busca holerites (tabela payrolls)
        const { data: holerites } = await supabase
          .from('payrolls')
          .select('*')
          .eq('employee_id', user.id)
          .order('reference_year', { ascending: false })
          .order('reference_month', { ascending: false });

        if (holerites) setPayslips(holerites);
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const benefits = useMemo(() => {
    if (!employeeData) return [];
    return [
      { label: 'Vale Transporte', value: employeeData.vale_transporte, icon: MapPin, color: 'text-blue-400' },
      { label: 'Vale Refeição', value: employeeData.vale_refeicao, icon: Star, color: 'text-emerald-400' },
      { label: 'Vale Flexível', value: employeeData.vale_flexivel, icon: Zap, color: 'text-amber-400' },
      { label: 'Mobilidade', value: employeeData.mobilidade, icon: Wallet, color: 'text-purple-400' },
    ].filter(b => b.value > 0);
  }, [employeeData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0f1e] gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest animate-pulse">Sincronizando seu Portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white pb-24">
      {/* Header Fixo Mobile */}
      <div className="p-6 bg-gradient-to-b from-primary/20 to-transparent border-b border-white/5 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative shadow-2xl">
              {employeeData?.photo_url ? (
                <img src={employeeData.photo_url} alt="User" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary font-black text-xl">
                  {user?.name?.substring(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest">Bem-vindo(a),</p>
              <h1 className="text-lg font-black tracking-tighter uppercase italic truncate max-w-[150px]">{user?.name?.split(' ')[0]}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl bg-white/5 border border-white/10 relative">
               <Bell className="w-5 h-5 text-white/60" />
               <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#0a0f1e]" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => signOut()} className="h-11 w-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
               <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <main className="p-6 space-y-8 animate-fade-in-up">
        {/* Card Principal - Status de Hoje */}
        <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-all" />
           <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Jornada Ativa</span>
                 </div>
                 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{format(new Date(), "dd 'de' MMMM", { locale: ptBR })}</span>
              </div>
              <div>
                 <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-1">Carga Horária Hoje</p>
                 <p className="text-3xl font-black italic tracking-tighter">{employeeData?.jornada_entrada || '08:00'}h - {employeeData?.jornada_saida || '18:00'}h</p>
              </div>
              <Button onClick={() => setIsClockOpen(true)} className="h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[11px] tracking-[0.2em] gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-all">
                 <MapPin className="w-5 h-5" /> Registrar Ponto Agora
              </Button>
           </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-4">
           {[
             { id: 'holerites', label: 'Meus Holerites', sub: 'Financeiro', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
             { id: 'ponto', label: 'Meu Ponto', sub: 'Frequência', icon: Clock, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
             { id: 'beneficios', label: 'Benefícios', sub: 'Wallet', icon: Wallet, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
             { id: 'ferias', label: 'Férias', sub: 'Solicitar', icon: Calendar, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/20' },
           ].map((action, i) => (
             <button 
               key={i} 
               onClick={() => {
                 if (action.id === 'ponto') setIsClockOpen(true);
                 if (action.id === 'holerites') setIsPayslipsOpen(true);
                 if (action.id === 'beneficios') setIsBenefitsOpen(true);
                 if (action.id === 'ferias') setIsVacationOpen(true);
               }}
               className={cn("p-5 rounded-[2rem] border glass-card flex flex-col items-center justify-center gap-3 text-center transition-all active:scale-95", action.border)}
             >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border", action.bg, action.border)}>
                   <action.icon className={cn("w-6 h-6", action.color)} />
                </div>
                <div>
                   <p className="text-[11px] font-black text-white uppercase tracking-widest">{action.label}</p>
                   <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">{action.sub}</p>
                </div>
             </button>
           ))}
        </div>

        {/* Último Holerite - Preview */}
        <div className="space-y-4">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Últimos Pagamentos</h3>
              <button onClick={() => setIsPayslipsOpen(true)} className="text-[10px] font-black text-muted-foreground uppercase hover:text-white transition-colors">Ver todos</button>
           </div>
           
           <div className="space-y-3">
              {payslips.slice(0, 2).map((p, i) => (
                <div key={i} onClick={() => setIsPayslipsOpen(true)} className="glass-card p-5 rounded-3xl border border-white/5 flex items-center justify-between group active:bg-white/5 transition-all cursor-pointer">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                         <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                         <p className="text-[13px] font-black text-white tracking-tight uppercase italic">{format(new Date(p.reference_year, p.reference_month - 1), 'MMMM yyyy', { locale: ptBR })}</p>
                         <div className="flex items-center gap-2">
                           <span className={cn("text-[9px] font-black uppercase px-1.5 py-0.5 rounded", p.status === 'SIGNED' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500")}>
                              {p.status === 'SIGNED' ? 'Assinado' : 'Pendente'}
                           </span>
                           <span className="text-[10px] font-bold text-muted-foreground tabular-nums">R$ {Number(p.net_salary).toLocaleString('pt-BR')}</span>
                         </div>
                      </div>
                   </div>
                   <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-white transition-all" />
                </div>
              ))}
              {payslips.length === 0 && (
                <div className="py-8 text-center glass-card rounded-3xl border border-white/5 border-dashed">
                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Nenhum holerite disponível</p>
                </div>
              )}
           </div>
        </div>

        {/* Badge 360 do Perfil */}
        <div className="p-6 rounded-[2.5rem] bg-amber-500/5 border border-amber-500/10 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                 <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
              </div>
              <div>
                 <p className="text-[13px] font-black text-white uppercase italic tracking-tighter">Colaborador Destaque</p>
                 <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Time {employeeData?.department || 'CyberTech'}</p>
              </div>
           </div>
           <div className="text-right">
              <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Membro desde</p>
              <p className="text-[12px] font-black text-white tabular-nums">{employeeData?.admission_date ? format(new Date(employeeData.admission_date), 'yyyy') : '2024'}</p>
           </div>
        </div>
      </main>

      {/* Menu Inferior Estilo App */}
      <nav className="fixed bottom-0 left-0 right-0 p-4 z-[60]">
         <div className="max-w-md mx-auto h-20 glass-card rounded-[2rem] border border-white/10 flex items-center justify-around px-6 shadow-2xl backdrop-blur-xl">
            {[
              { id: 'home', icon: Zap, label: 'Início' },
              { id: 'ponto', icon: Clock, label: 'Ponto' },
              { id: 'folha', icon: FileText, label: 'Folha' },
              { id: 'perfil', icon: User, label: 'Eu' },
            ].map(item => (
              <button 
                key={item.id} 
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === 'ponto') setIsClockOpen(true);
                  if (item.id === 'folha') setIsPayslipsOpen(true);
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 transition-all duration-300",
                  activeTab === item.id ? "text-primary scale-110" : "text-muted-foreground hover:text-white"
                )}
              >
                 <item.icon className={cn("w-6 h-6", activeTab === item.id && "fill-primary/20")} />
                 <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
         </div>
      </nav>

      {/* MODAIS DO SISTEMA */}

      {/* Modal de Ponto Mobile */}
      <Dialog open={isClockOpen} onOpenChange={setIsClockOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-[#0a0f1e] border-white/10 rounded-[2.5rem] shadow-2xl">
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] text-center">Terminal de Ponto Digital</DialogTitle>
            </DialogHeader>
            <MobileTimeClock employee={employeeData} onSuccess={() => {}} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Holerites */}
      <Dialog open={isPayslipsOpen} onOpenChange={setIsPayslipsOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-[#0a0f1e] border-white/10 rounded-[2.5rem] shadow-2xl">
          <div className="p-8">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-center">Meus Recibos de Pagamento</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
               {payslips.map((p, i) => (
                 <div key={i} className="glass-card p-5 rounded-3xl border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                             <FileText className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                             <p className="text-[13px] font-black text-white uppercase italic">{format(new Date(p.reference_year, p.reference_month - 1), 'MMMM yyyy', { locale: ptBR })}</p>
                             <p className="text-[9px] font-bold text-muted-foreground uppercase">Salário Mensal</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-black text-white tracking-tight">R$ {Number(p.net_salary).toLocaleString('pt-BR')}</p>
                       </div>
                    </div>
                    <Button variant="outline" className="w-full h-10 rounded-xl border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest gap-2">
                       <Download className="w-3.5 h-3.5" /> Baixar PDF
                    </Button>
                 </div>
               ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Benefícios */}
      <Dialog open={isBenefitsOpen} onOpenChange={setIsBenefitsOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-[#0a0f1e] border-white/10 rounded-[2.5rem] shadow-2xl">
          <div className="p-8">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] text-center">Meus Benefícios Corporativos</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 gap-4">
               {benefits.map((b, i) => (
                 <div key={i} className="glass-card p-5 rounded-3xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border bg-white/5", b.color.replace('text', 'border'))}>
                          <b.icon className={cn("w-6 h-6", b.color)} />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{b.label}</p>
                          <p className="text-lg font-black text-white tracking-tight">R$ {Number(b.value).toLocaleString('pt-BR')}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <div className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                          <span className="text-[9px] font-black text-emerald-500 uppercase">Ativo</span>
                       </div>
                    </div>
                 </div>
               ))}
               {benefits.length === 0 && (
                 <div className="py-12 text-center">
                    <p className="text-[11px] font-black text-muted-foreground uppercase">Nenhum benefício ativo encontrado</p>
                 </div>
               )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Férias */}
      <Dialog open={isVacationOpen} onOpenChange={setIsVacationOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-[#0a0f1e] border-white/10 rounded-[2.5rem] shadow-2xl">
          <div className="p-8">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] text-center">Gestão de Férias</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
               <div className="glass-card p-6 rounded-[2rem] border border-rose-500/10 bg-gradient-to-br from-rose-500/5 to-transparent text-center">
                  <Calendar className="w-10 h-10 text-rose-500 mx-auto mb-4" />
                  <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-1">Saldo Disponível</p>
                  <p className="text-4xl font-black italic tracking-tighter text-white">30 Dias</p>
                  <p className="text-[9px] font-bold text-rose-400/60 uppercase mt-2 tracking-widest">Período Aquisitivo: 2023-2024</p>
               </div>

               <div className="space-y-3">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">Ações Rápidas</p>
                  <Button className="w-full h-14 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-rose-500/20">
                     Solicitar Agendamento
                  </Button>
                  <Button variant="outline" className="w-full h-14 rounded-2xl border-white/10 bg-white/5 text-[11px] font-black uppercase tracking-[0.2em]">
                     Histórico de Férias
                  </Button>
               </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
