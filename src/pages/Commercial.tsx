import { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
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
  Printer,
  ChevronRight,
  Eye,
  Rocket,
  Shield,
  Zap,
  Globe,
  Lock,
  Headphones,
  Check,
  X,
  Sparkles,
  Award,
  Server,
  Cloud,
  HardDrive
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ModuleOption {
  id: string;
  label: string;
  description: string;
  longDescription: string;
  icon: any;
  suggestedPrice: number;
  category: 'CORE' | 'ADVANCED' | 'ADDON';
}

const AVAILABLE_MODULES: ModuleOption[] = [
  { 
    id: 'dashboard', 
    label: 'Inteligência de Dados (BI)', 
    description: 'Dashboards em tempo real com KPIs estratégicos',
    longDescription: 'Centralização de indicadores de performance, turnover, absenteísmo e custos operacionais em painéis interativos de alta fidelidade.',
    icon: PieChart, 
    suggestedPrice: 0,
    category: 'CORE'
  },
  { 
    id: 'employees', 
    label: 'Ecossistema de Colaboradores', 
    description: 'Gestão 360º do ciclo de vida do funcionário',
    longDescription: 'Prontuário digital completo com histórico de cargos, salários, documentos escaneados e trilha de evolução profissional.',
    icon: Users, 
    suggestedPrice: 150,
    category: 'CORE'
  },
  { 
    id: 'attendance', 
    label: 'Ponto Digital Biométrico', 
    description: 'Reconhecimento facial e geolocalização antifraude',
    longDescription: 'Sistema de batida de ponto via mobile ou tablet com validação por GPS e foto, garantindo segurança jurídica e precisão.',
    icon: Clock, 
    suggestedPrice: 200,
    category: 'ADVANCED'
  },
  { 
    id: 'payroll', 
    label: 'Motor de Folha & Holerites', 
    description: 'Cálculos automatizados e assinatura digital',
    longDescription: 'Automação total de proventos e descontos. Geração de holerites com workflow de assinatura digital integrada diretamente pelo App.',
    icon: DollarSign, 
    suggestedPrice: 250,
    category: 'CORE'
  },
  { 
    id: 'certificates', 
    label: 'Gestão Médica & Atestados', 
    description: 'Controle de CID e afastamentos preventivos',
    longDescription: 'Monitoramento inteligente de saúde ocupacional, com upload de atestados e integração automática com o banco de horas.',
    icon: Calendar, 
    suggestedPrice: 100,
    category: 'ADVANCED'
  },
  { 
    id: 'documents', 
    label: 'GED Cloud (Documentos)', 
    description: 'Repositório seguro com criptografia militar',
    longDescription: 'Armazenamento centralizado de contratos, exames e documentos admissionais com controle rigoroso de acesso e validade.',
    icon: FileText, 
    suggestedPrice: 100,
    category: 'CORE'
  },
  { 
    id: 'rescissions', 
    label: 'Módulo de Offboarding', 
    description: 'Cálculos rescisórios e integração eSocial',
    longDescription: 'Gestão humanizada e técnica do desligamento, com cálculos precisos de verbas rescisórias e geração de guias necessárias.',
    icon: UserX, 
    suggestedPrice: 150,
    category: 'ADVANCED'
  },
  { 
    id: 'service-providers', 
    label: 'Gestão de Terceiros (PJ)', 
    description: 'Controle de prestadores e contratos B2B',
    longDescription: 'Módulo especializado para gestão de profissionais autônomos e empresas prestadoras de serviço, com controle de notas fiscais.',
    icon: Briefcase, 
    suggestedPrice: 120,
    category: 'ADDON'
  },
  { 
    id: 'stores', 
    label: 'Arquitetura Multi-Unidades', 
    description: 'Gestão unificada de redes e filiais',
    longDescription: 'Estrutura preparada para empresas com múltiplas lojas, permitindo visão consolidada ou segmentada por unidade de negócio.',
    icon: Store, 
    suggestedPrice: 100,
    category: 'ADDON'
  },
  { 
    id: 'whitelabel', 
    label: 'White Label Experience', 
    description: 'Sua marca, sua identidade, seu domínio',
    longDescription: 'Personalização total da plataforma com as cores, logotipo e domínio da sua empresa, reforçando o branding institucional.',
    icon: Settings, 
    suggestedPrice: 500,
    category: 'ADDON'
  },
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
  const [employeeCount, setEmployeeCount] = useState('50');
  const [selectedModules, setSelectedModules] = useState<string[]>(['dashboard', 'employees', 'attendance', 'payroll']);
  const [showPreview, setShowPreview] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Server Choice State
  const [serverType, setServerType] = useState<'CLOUD' | 'LOCAL'>('CLOUD');
  const [pricing, setPricing] = useState({
    cloud: { setup: '1490.00', maintenance: '290.00', perUser: '12.90' },
    local: { setup: '2990.00', maintenance: '490.00', perUser: '15.90' }
  });

  const currentPricing = serverType === 'CLOUD' ? pricing.cloud : pricing.local;

  const toggleModule = (id: string) => {
    setSelectedModules(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const calculateMonthlyTotal = () => {
    const perUserTotal = (Number(currentPricing.perUser) || 0) * (Number(employeeCount) || 0);
    const maintenanceTotal = Number(currentPricing.maintenance) || 0;
    const modulesBaseTotal = AVAILABLE_MODULES
      .filter(m => selectedModules.includes(m.id))
      .reduce((acc, curr) => acc + curr.suggestedPrice, 0);
    return perUserTotal + modulesBaseTotal + maintenanceTotal;
  };

  const getBase64ImageFromUrl = async (url: string): Promise<string> => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result as string), false);
      reader.addEventListener("error", () => reject());
      reader.readAsDataURL(blob);
    });
  };

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      const primaryColor = [0, 102, 255]; // Blue

      // Header Background
      doc.setFillColor(15, 23, 42); // Slate 900
      doc.rect(0, 0, 210, 60, 'F');

      // Add Watermark to PDF
      try {
        const logoBase64 = await getBase64ImageFromUrl('/logo-cybertech.png');
        // jsPDF context for transparency
        doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
        doc.addImage(logoBase64, 'PNG', 45, 100, 120, 120, undefined, 'FAST');
        doc.setGState(new (doc as any).GState({ opacity: 1 }));
      } catch (e) {
        console.warn('Could not add watermark to PDF', e);
      }

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('PROPOSTA COMERCIAL', 20, 30);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('TECNOLOGIA PARA GESTÃO DE PESSOAL', 20, 38);

      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(1.5);
      doc.line(20, 45, 50, 45);

      // Client Info
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text('PREPARADO PARA:', 140, 25);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(clientName.toUpperCase(), 140, 32);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(clientCnpj || 'CNPJ NÃO INFORMADO', 140, 38);

      // Content
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Escopo da Solução - ' + (serverType === 'CLOUD' ? 'Servidor Nuvem' : 'Servidor Local'), 20, 80);

      const moduleData = AVAILABLE_MODULES
        .filter(m => selectedModules.includes(m.id))
        .map(m => [m.label, m.longDescription]);

      (doc as any).autoTable({
        startY: 85,
        head: [['Módulo', 'Descrição do Serviço']],
        body: moduleData,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } }
      });

      // Pricing
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Investimento Sugerido (' + (serverType === 'CLOUD' ? 'Cloud' : 'Local') + ')', 20, finalY);

      const priceData = [
        ['Taxa de Implementação (Setup)', 'R$ ' + currentPricing.setup, 'Pagamento único inicial'],
        ['Manutenção Mensal do Servidor', 'R$ ' + currentPricing.maintenance, 'Infraestrutura e Suporte'],
        ['Licenciamento p/ Colaborador', 'R$ ' + currentPricing.perUser, 'Valor unitário mensal'],
        ['Base de Usuários Estimada', employeeCount, 'Total de colaboradores'],
        ['Investimento Mensal Total', 'R$ ' + calculateMonthlyTotal().toLocaleString('pt-BR'), 'Recorrência mensal total']
      ];

      (doc as any).autoTable({
        startY: finalY + 5,
        body: priceData,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 6 },
        columnStyles: { 
          0: { fontStyle: 'bold', cellWidth: 70 },
          1: { textColor: primaryColor, fontStyle: 'bold' }
        }
      });

      // Security & Support
      const nextY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Garantias & Segurança', 20, nextY);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const safety = [
        '• Disponibilidade (SLA) de 99.9% garantida em contrato.',
        '• Backup diário automático e redundância segura.',
        '• Conformidade total com a LGPD (Lei Geral de Proteção de Dados).',
        '• Suporte técnico especializado via WhatsApp e Ticket.'
      ];
      safety.forEach((line, i) => doc.text(line, 20, nextY + 10 + (i * 6)));

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text('Esta proposta tem validade de 15 dias a partir desta data.', 105, 285, { align: 'center' });
      doc.text('CyberTech RH © 2026 - Inteligência Digital em RH', 105, 290, { align: 'center' });

      doc.save(`Proposta_${clientName.replace(/\s/g, '_')}_${serverType}.pdf`);
      toast({ title: "PDF Gerado!", description: "A proposta comercial foi baixada com sucesso." });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: "Erro ao gerar PDF", description: "Ocorreu um problema técnico.", variant: "destructive" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Briefcase className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase italic italic">Gestão Comercial</h1>
            <p className="text-[13px] text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Engenharia de Propostas Inteligentes
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {showPreview && (
            <Button variant="outline" className="h-10 gap-2 border-white/10 hover:bg-white/5" onClick={() => setShowPreview(false)}>
              <Plus className="w-4 h-4" /> Nova Proposta
            </Button>
          )}
          <Button 
            className="h-10 gap-2 bg-primary shadow-[0_8px_20px_rgba(var(--primary),0.3)] hover:scale-105 transition-all" 
            onClick={() => {
              if(!clientName) {
                toast({ title: "Dados incompletos", description: "Informe o nome do cliente.", variant: "destructive" });
                return;
              }
              setShowPreview(true);
            }}
          >
            {showPreview ? <CheckCircle2 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Aprovar Visualização' : 'Gerar Pré-visualização'}
          </Button>
        </div>
      </div>

      {!showPreview ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Configurações da Proposta */}
          <div className="lg:col-span-4 space-y-6 sticky top-24">
            <div className="glass-card rounded-[2rem] border border-white/10 p-8 space-y-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-all duration-500" />
              
              <div className="space-y-6">
                <h3 className="text-[14px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-[14px]">01</span>
                  Identificação
                </h3>
                
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest ml-1">Cliente / Empresa</Label>
                    <Input 
                      value={clientName} 
                      onChange={e => setClientName(e.target.value)}
                      placeholder="Ex: Grupo Marechal S/A"
                      className="bg-white/5 border-white/10 h-12 rounded-xl focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest ml-1">CNPJ (Opcional)</Label>
                    <Input 
                      value={clientCnpj} 
                      onChange={e => setClientCnpj(e.target.value)}
                      placeholder="00.000.000/0001-00"
                      className="bg-white/5 border-white/10 h-12 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Server Choice */}
              <div className="space-y-6 pt-8 border-t border-white/5">
                <h3 className="text-[14px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-[14px]">02</span>
                  Infraestrutura
                </h3>
                
                <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                  <button 
                    onClick={() => setServerType('CLOUD')}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                      serverType === 'CLOUD' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
                    )}
                  >
                    <Cloud className="w-3.5 h-3.5" /> Nuvem
                  </button>
                  <button 
                    onClick={() => setServerType('LOCAL')}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                      serverType === 'LOCAL' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
                    )}
                  >
                    <Server className="w-3.5 h-3.5" /> Local
                  </button>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest ml-1">Colaboradores</Label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="number"
                        value={employeeCount} 
                        onChange={e => setEmployeeCount(e.target.value)}
                        className="bg-white/5 border-white/10 h-12 pl-12 font-bold text-lg rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Implantação (Setup)</Label>
                        <Input 
                          value={currentPricing.setup} 
                          onChange={e => setPricing(prev => ({ 
                            ...prev, 
                            [serverType.toLowerCase()]: { ...prev[serverType.toLowerCase() as 'cloud'|'local'], setup: e.target.value }
                          }))}
                          className="bg-white/5 border-white/10 h-10 font-bold text-primary rounded-lg"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Manutenção Mensal</Label>
                        <Input 
                          value={currentPricing.maintenance} 
                          onChange={e => setPricing(prev => ({ 
                            ...prev, 
                            [serverType.toLowerCase()]: { ...prev[serverType.toLowerCase() as 'cloud'|'local'], maintenance: e.target.value }
                          }))}
                          className="bg-white/5 border-white/10 h-10 font-bold text-white rounded-lg"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Valor por Usuário</Label>
                        <Input 
                          value={currentPricing.perUser} 
                          onChange={e => setPricing(prev => ({ 
                            ...prev, 
                            [serverType.toLowerCase()]: { ...prev[serverType.toLowerCase() as 'cloud'|'local'], perUser: e.target.value }
                          }))}
                          className="bg-white/5 border-white/10 h-10 font-bold text-white rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground font-black uppercase tracking-widest">Recorrência Total</span>
                      <p className="text-[9px] text-primary/60 font-bold uppercase tracking-tighter">Inclui Manutenção + Licenças</p>
                    </div>
                    <span className="text-2xl font-black text-white tracking-tighter">
                      R$ {calculateMonthlyTotal().toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seleção de Módulos */}
          <div className="lg:col-span-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                  <Zap className="w-6 h-6 text-primary fill-primary/20" /> 
                  Engenharia de Módulos
                </h3>
                <p className="text-[13px] text-muted-foreground">Selecione os componentes de inteligência para esta proposta</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setSelectedModules(AVAILABLE_MODULES.map(m => m.id))} 
                  className="text-[11px] font-black text-primary uppercase tracking-[0.1em] hover:brightness-125 transition-all"
                >
                  Combo Full System
                </button>
                <span className="text-white/10 font-thin">|</span>
                <button 
                  onClick={() => setSelectedModules(['dashboard', 'employees'])} 
                  className="text-[11px] font-black text-rose-400 uppercase tracking-[0.1em] hover:brightness-125 transition-all"
                >
                  Resetar Seleção
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AVAILABLE_MODULES.map((mod) => {
                const isSelected = selectedModules.includes(mod.id);
                const Icon = mod.icon;
                return (
                  <div 
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    className={cn(
                      "group p-6 rounded-[1.5rem] border cursor-pointer transition-all duration-500 relative overflow-hidden",
                      isSelected 
                        ? 'bg-primary/10 border-primary/40 shadow-[0_15px_40px_rgba(var(--primary),0.15)] scale-[1.02]' 
                        : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]'
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-in zoom-in-50 duration-300">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    
                    <div className="flex items-start gap-5">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500",
                        isSelected 
                          ? 'bg-primary border-primary shadow-[0_0_20px_rgba(var(--primary),0.5)] text-white' 
                          : 'bg-white/5 border-white/10 text-muted-foreground group-hover:scale-110'
                      )}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <div className="space-y-1.5 flex-1 pr-4">
                        <div className="flex items-center gap-2">
                          <h4 className={cn("text-[15px] font-black uppercase tracking-tight", isSelected ? 'text-white' : 'text-zinc-400 group-hover:text-white')}>
                            {mod.label}
                          </h4>
                        </div>
                        <p className="text-[12px] text-muted-foreground leading-snug font-medium line-clamp-2">
                          {mod.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Preview da Proposta - Design Ultra Executive */
        <div className="max-w-5xl mx-auto space-y-10 animate-in slide-in-from-bottom-12 duration-700 pb-20">
          <div className="glass-card rounded-[3rem] border border-white/10 overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.7)] bg-[#05070a] relative">
            
            {/* BACKGROUND WATERMARK (LOGO) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] overflow-hidden z-0">
               <img src="/logo-cybertech.png" alt="Watermark" className="w-[80%] max-w-2xl transform -rotate-12 scale-150" />
            </div>

            {/* Cover Section */}
            <div className="relative h-[450px] flex items-center p-20 overflow-hidden border-b border-white/10 z-10">
               <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
               <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_20%,rgba(var(--primary),0.15),transparent_40%)]" />
               
               <div className="relative z-10 space-y-8 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
                    <Award className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Corporate Proposal 2026</span>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-6xl font-black text-white tracking-tighter leading-[0.9]">
                      TECNOLOGIA <br />
                      <span className="text-primary italic">TRANSFORMADORA.</span>
                    </h2>
                    <p className="text-lg text-muted-foreground font-medium max-w-md mt-4">
                      Elevando a gestão de capital humano a um novo patamar de inteligência e segurança jurídica via <span className="text-white font-bold">{serverType === 'CLOUD' ? 'Cloud Server' : 'Local Server'}</span>.
                    </p>
                  </div>
                  <div className="flex items-center gap-8 pt-8">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Preparado Para</p>
                      <p className="text-2xl font-bold text-white tracking-tight">{clientName}</p>
                    </div>
                    <div className="w-px h-12 bg-white/10" />
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Modelo de Entrega</p>
                      <p className="text-2xl font-bold text-white tracking-tight">{serverType === 'CLOUD' ? 'Servidor Nuvem' : 'Servidor Local'}</p>
                    </div>
                  </div>
               </div>
               
               {/* Abstract Elements */}
               <div className="absolute right-20 top-20 w-32 h-32 border-4 border-primary/20 rounded-full animate-pulse" />
               <div className="absolute right-40 bottom-20 w-16 h-16 border border-white/10 rounded-full" />
            </div>

            {/* Value Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-b border-white/10 z-10 relative">
               {[
                 { title: 'Segurança Máxima', desc: 'Conformidade total com LGPD e criptografia de dados.', icon: Shield },
                 { title: 'SLA de 99.9%', desc: 'Infraestrutura robusta com alta disponibilidade garantida.', icon: Globe },
                 { title: 'Suporte VIP', desc: 'Atendimento prioritário e consultoria de implantação.', icon: Headphones }
               ].map((p, i) => (
                 <div key={i} className="p-12 border-r last:border-0 border-white/10 flex flex-col items-center text-center space-y-4 hover:bg-white/[0.02] transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                      <p.icon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-[14px] font-black text-white uppercase tracking-widest">{p.title}</h4>
                      <p className="text-[12px] text-muted-foreground leading-relaxed font-medium">{p.desc}</p>
                    </div>
                 </div>
               ))}
            </div>

            {/* Technical Scope */}
            <div className="p-20 space-y-16 z-10 relative">
              <div className="text-center space-y-4 max-w-xl mx-auto">
                <h3 className="text-3xl font-black text-white tracking-tight uppercase">Escopo Modular de Soluções</h3>
                <p className="text-muted-foreground text-[14px]">
                  Componentes de software selecionados especificamente para atender aos desafios operacionais da sua empresa.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {AVAILABLE_MODULES.filter(m => selectedModules.includes(m.id)).map(m => (
                  <div key={m.id} className="group flex items-start gap-8 p-10 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-primary/30 transition-all backdrop-blur-sm">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 shrink-0 border border-white/10">
                      <m.icon className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h4 className="text-xl font-black text-white tracking-tight uppercase">{m.label}</h4>
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase">{m.category}</span>
                      </div>
                      <p className="text-[14px] text-muted-foreground leading-relaxed max-w-2xl font-medium">
                        {m.longDescription}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-20 bg-gradient-to-b from-transparent to-primary/[0.03] border-t border-white/10 z-10 relative">
              <div className="glass-card rounded-[2.5rem] border border-primary/20 p-16 space-y-16 bg-black relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[120px] rounded-full -mr-48 -mt-48" />
                
                <div className="text-center space-y-4">
                  <h3 className="text-2xl font-black text-white tracking-widest uppercase">Investimento Estratégico ({serverType})</h3>
                  <div className="h-1 w-20 bg-primary mx-auto" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                   <div className="space-y-2 text-center">
                      <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Setup Inicial</p>
                      <div className="flex flex-col">
                        <span className="text-3xl font-black text-white tracking-tighter">R$ {currentPricing.setup}</span>
                        <span className="text-[10px] text-primary font-black uppercase mt-1">Implementação única</span>
                      </div>
                   </div>
                   <div className="space-y-2 text-center">
                      <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Manutenção Mensal</p>
                      <div className="flex flex-col">
                        <span className="text-3xl font-black text-white tracking-tighter">R$ {currentPricing.maintenance}</span>
                        <span className="text-[10px] text-primary font-black uppercase mt-1">Infraestrutura de Servidor</span>
                      </div>
                   </div>
                   <div className="space-y-2 text-center">
                      <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Licenciamento</p>
                      <div className="flex flex-col">
                        <span className="text-3xl font-black text-white tracking-tighter">R$ {currentPricing.perUser}</span>
                        <span className="text-[10px] text-primary font-black uppercase mt-1">por colaborador / mês</span>
                      </div>
                   </div>
                   <div className="space-y-2 text-center">
                      <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Total Mensal</p>
                      <div className="flex flex-col">
                        <span className="text-3xl font-black text-primary tracking-tighter">R$ {calculateMonthlyTotal().toLocaleString('pt-BR')}</span>
                        <span className="text-[10px] text-white font-black uppercase mt-1">Recorrência Estimada</span>
                      </div>
                   </div>
                </div>

                <div className="pt-16 flex flex-col md:flex-row justify-center gap-6 no-print">
                   <Button 
                    variant="outline" 
                    className="h-14 px-10 rounded-2xl border-white/10 hover:bg-white/5 font-black uppercase text-[12px] tracking-widest gap-3"
                    onClick={() => window.print()}
                   >
                     <Printer className="w-5 h-5" /> Imprimir Documento
                   </Button>
                   <Button 
                    className="h-14 px-10 rounded-2xl bg-primary text-white font-black uppercase text-[12px] tracking-widest gap-3 shadow-[0_20px_40px_rgba(var(--primary),0.3)] hover:-translate-y-1 transition-all"
                    disabled={isGeneratingPdf}
                    onClick={handleGeneratePdf}
                   >
                     {isGeneratingPdf ? <CheckCircle2 className="w-5 h-5 animate-pulse" /> : <Download className="w-5 h-5" />}
                     {isGeneratingPdf ? 'Gerando Arquivo...' : 'Exportar PDF Premium'}
                   </Button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-black/60 p-12 text-center border-t border-white/5 z-10 relative">
              <div className="flex items-center justify-center gap-4 mb-4">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <Lock className="w-5 h-5 text-primary" />
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-[0.4em] font-black">
                CyberTech RH &copy; 2026 – Inteligência Digital em Gestão de Pessoas
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
