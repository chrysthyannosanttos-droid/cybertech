import { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Download, 
  ShieldCheck, 
  CheckCircle2, 
  Settings, 
  Users, 
  Calendar, 
  DollarSign, 
  PieChart, 
  Briefcase, 
  UserX, 
  Store, 
  Clock, 
  Mail,
  Printer,
  ChevronRight,
  Eye
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

interface ModuleOption {
  id: string;
  label: string;
  description: string;
  icon: any;
  suggestedPrice: number;
}

const AVAILABLE_MODULES: ModuleOption[] = [
  { id: 'dashboard', label: 'Dashboard Inteligente', description: 'Visão geral e indicadores em tempo real', icon: PieChart, suggestedPrice: 0 },
  { id: 'employees', label: 'Gestão de Funcionários', description: 'Cadastro e prontuário digital completo', icon: Users, suggestedPrice: 150 },
  { id: 'attendance', label: 'Ponto Eletrônico GPS', description: 'Registro via GPS com foto e biometria facial', icon: Clock, suggestedPrice: 200 },
  { id: 'payroll', label: 'Folha de Pagamento', description: 'Cálculos automatizados e holerites digitais', icon: DollarSign, suggestedPrice: 250 },
  { id: 'certificates', label: 'Gestão de Atestados', description: 'Controle de CID e dias de afastamento', icon: Calendar, suggestedPrice: 100 },
  { id: 'documents', label: 'GED (Documentos)', description: 'Armazenamento seguro de documentos e contratos', icon: FileText, suggestedPrice: 100 },
  { id: 'rescissions', label: 'Módulo de Rescisões', description: 'Cálculos de desligamento e integração eSocial', icon: UserX, suggestedPrice: 150 },
  { id: 'service-providers', label: 'Prestadores de Serviço', description: 'Gestão de terceirizados e contratos PJ', icon: Briefcase, suggestedPrice: 120 },
  { id: 'stores', label: 'Gestão de Unidades', description: 'Controle de múltiplas lojas e filiais', icon: Store, suggestedPrice: 100 },
  { id: 'whitelabel', label: 'White Label Custom', description: 'Sua marca, seu logotipo e seu domínio', icon: Settings, suggestedPrice: 500 },
];

export default function Commercial() {
  const { user: currentUser } = useAuth();
  const isCristiano = currentUser?.email?.toLowerCase().includes('cristiano') || currentUser?.name?.toLowerCase().includes('cristiano');

  if (!isCristiano) {
    return <Navigate to="/dashboard" replace />;
  }

  const { toast } = useToast();
  const [clientName, setClientName] = useState('');
  const [clientCnpj, setClientCnpj] = useState('');
  const [perUserPrice, setPerUserPrice] = useState('9.99');
  const [implementationFee, setImplementationFee] = useState('990.00');
  const [selectedModules, setSelectedModules] = useState<string[]>(['dashboard', 'employees']);
  const [showPreview, setShowPreview] = useState(false);

  const toggleModule = (id: string) => {
    setSelectedModules(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const calculateTotalMonthly = () => {
    const modulesTotal = AVAILABLE_MODULES
      .filter(m => selectedModules.includes(m.id))
      .reduce((acc, curr) => acc + curr.suggestedPrice, 0);
    return modulesTotal;
  };

  const handleGenerate = () => {
    if (!clientName) {
      toast({ title: "Dados incompletos", description: "Informe o nome do cliente.", variant: "destructive" });
      return;
    }
    setShowPreview(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase italic italic">Módulo Comercial</h1>
          <p className="text-[13px] text-muted-foreground">Gerador de propostas modulares e personalizadas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-9 gap-2 border-white/10" onClick={() => setShowPreview(false)}>
            <Plus className="w-4 h-4" /> Nova Proposta
          </Button>
          <Button className="h-9 gap-2 bg-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]" onClick={handleGenerate}>
            <Eye className="w-4 h-4" /> Visualizar Proposta
          </Button>
        </div>
      </div>

      {!showPreview ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configurações da Proposta */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card rounded-2xl border border-white/5 p-6 space-y-6">
              <h3 className="text-[14px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4" /> Dados do Cliente
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase text-muted-foreground">Nome da Empresa / Cliente</Label>
                  <Input 
                    value={clientName} 
                    onChange={e => setClientName(e.target.value)}
                    placeholder="Ex: Supermercado Alagoas LTDA"
                    className="bg-white/5 border-white/10 h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase text-muted-foreground">CNPJ (Opcional)</Label>
                  <Input 
                    value={clientCnpj} 
                    onChange={e => setClientCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="bg-white/5 border-white/10 h-11"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-4">
                <h3 className="text-[14px] font-bold text-primary uppercase tracking-widest">Precificação Base</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-muted-foreground">Valor / Usuário</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input 
                        value={perUserPrice} 
                        onChange={e => setPerUserPrice(e.target.value)}
                        className="bg-white/5 border-white/10 h-11 pl-9 font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-muted-foreground">Implementação</Label>
                    <Input 
                      value={implementationFee} 
                      onChange={e => setImplementationFee(e.target.value)}
                      className="bg-white/5 border-white/10 h-11 font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl border border-white/5 p-6 bg-primary/5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[14px] font-bold text-white uppercase tracking-widest">Resumo Comercial</h3>
                <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded font-black">PRE-VIEW</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted-foreground">Módulos Selecionados:</span>
                  <span className="text-white font-bold">{selectedModules.length}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted-foreground">Valor p/ Colaborador:</span>
                  <span className="text-primary font-bold">R$ {perUserPrice}</span>
                </div>
                <div className="pt-3 border-t border-white/10 flex justify-between items-end">
                  <span className="text-[11px] text-muted-foreground font-bold uppercase">Setup Inicial</span>
                  <span className="text-lg font-black text-white">R$ {implementationFee}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Seleção de Módulos */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" /> Módulos Disponíveis para Contratação
              </h3>
              <div className="flex gap-2">
                <button onClick={() => setSelectedModules(AVAILABLE_MODULES.map(m => m.id))} className="text-[10px] font-bold text-primary hover:underline">Selecionar Todos</button>
                <span className="text-white/10">|</span>
                <button onClick={() => setSelectedModules(['dashboard'])} className="text-[10px] font-bold text-rose-400 hover:underline">Limpar</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AVAILABLE_MODULES.map((mod) => {
                const isSelected = selectedModules.includes(mod.id);
                const Icon = mod.icon;
                return (
                  <div 
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 relative overflow-hidden group ${
                      isSelected 
                        ? 'bg-primary/10 border-primary/40 shadow-[0_0_20px_rgba(var(--primary),0.1)]' 
                        : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-xl border transition-all ${
                        isSelected ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-muted-foreground group-hover:text-white'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className={`text-[14px] font-bold ${isSelected ? 'text-white' : 'text-muted-foreground group-hover:text-white'}`}>{mod.label}</h4>
                        <p className="text-[11px] text-muted-foreground leading-tight">{mod.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Preview da Proposta */
        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-700">
          <div className="glass-card rounded-[2rem] border border-white/10 overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.5)]">
            {/* Cabeçalho da Proposta */}
            <div className="bg-gradient-to-r from-zinc-900 to-black p-12 border-b border-white/10 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-32 -mt-32" />
               <div className="flex flex-col md:flex-row justify-between items-start gap-8 relative z-10">
                  <div className="space-y-4">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-[0.2em]">
                      Proposta Comercial v2.1
                    </div>
                    <h2 className="text-4xl font-black text-white tracking-tighter leading-none">
                      CYBERTECH <span className="text-primary">RH</span>
                    </h2>
                    <div className="h-1 w-20 bg-primary" />
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-primary font-black uppercase tracking-widest mb-1">Preparado para</p>
                    <p className="text-2xl font-bold text-white">{clientName}</p>
                    <p className="text-[13px] text-muted-foreground mt-1">{clientCnpj || 'CNPJ não informado'}</p>
                  </div>
               </div>
            </div>

            {/* Conteúdo */}
            <div className="p-12 space-y-12 bg-black/40">
              {/* Seção de Segurança */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div className="space-y-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-3">
                      <ShieldCheck className="w-6 h-6 text-primary" /> 
                      Segurança de Dados & Controle
                    </h3>
                    <ul className="space-y-4">
                      {[
                        'Criptografia de ponta a ponta em todos os módulos.',
                        'Audit Logs: Histórico completo de todas as ações.',
                        'Ponto Digital com Geolocalização GPS e Foto.',
                        'Gestão de Documentos com armazenamento em nuvem.',
                        'Assinatura Digital de holerites e contratos.'
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-[13px] text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                 </div>
                 <div className="glass-card p-8 rounded-2xl border border-white/5 bg-white/[0.02]">
                    <h4 className="text-[11px] font-black text-primary uppercase tracking-widest mb-6 text-center">Resumo da Solução Modular</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedModules.map(mid => {
                        const m = AVAILABLE_MODULES.find(mod => mod.id === mid);
                        if (!m) return null;
                        return (
                          <div key={mid} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/5">
                            <m.icon className="w-3.5 h-3.5 text-primary" />
                            <span className="text-[10px] font-bold text-white uppercase truncate">{m.label}</span>
                          </div>
                        );
                      })}
                    </div>
                 </div>
              </div>

              {/* Seção de Valores */}
              <div className="pt-12 border-t border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/5 space-y-2">
                      <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Valor por Colaborador</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[13px] font-bold text-white">R$</span>
                        <span className="text-4xl font-black text-white tracking-tighter">{perUserPrice}</span>
                        <span className="text-[13px] text-muted-foreground">/mês</span>
                      </div>
                   </div>
                   <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/5 space-y-2">
                      <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Módulos Contratados</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-white tracking-tighter">{selectedModules.length}</span>
                        <span className="text-[13px] text-muted-foreground">ativos</span>
                      </div>
                   </div>
                   <div className="p-8 rounded-3xl bg-primary/10 border border-primary/20 space-y-2">
                      <p className="text-[11px] font-black text-primary uppercase tracking-widest">Setup & Implementação</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[13px] font-bold text-primary">R$</span>
                        <span className="text-4xl font-black text-primary tracking-tighter">{implementationFee}</span>
                        <span className="text-[13px] text-primary/60">(Taxa Única)</span>
                      </div>
                   </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-8">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-black uppercase">Validade</span>
                    <span className="text-[14px] font-bold text-white">15 Dias</span>
                  </div>
                  <div className="w-[1px] h-10 bg-white/10" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-black uppercase">Entrega</span>
                    <span className="text-[14px] font-bold text-white">Imediata</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" className="h-12 px-8 rounded-xl border-white/10 font-bold uppercase text-[12px] tracking-widest gap-2" onClick={() => window.print()}>
                    <Printer className="w-4 h-4" /> Imprimir / PDF
                  </Button>
                  <Button className="h-12 px-8 rounded-xl bg-primary text-white font-black uppercase text-[12px] tracking-widest gap-2 shadow-[0_10px_30px_rgba(var(--primary),0.3)]">
                    <Download className="w-4 h-4" /> Salvar Proposta
                  </Button>
                </div>
              </div>
            </div>

            {/* Rodapé */}
            <div className="bg-white/5 p-8 text-center border-t border-white/5">
              <p className="text-[11px] text-muted-foreground uppercase tracking-[0.3em] font-black">
                CyberTech RH &copy; 2026 – Inteligência que Transforma a Gestão
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
