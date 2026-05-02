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
  HardDrive,
  Scale,
  FileSignature,
  Building,
  Info
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

const MIN_EMPLOYEES_BILLING = 50;

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
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);

  // Custom Price for White Label
  const [whiteLabelPrice, setWhiteLabelPrice] = useState('500.00');

  // Dual Pricing State
  const [pricing, setPricing] = useState({
    cloud: { setup: '1490.00', maintenance: '290.00', perUser: '12.90' },
    local: { setup: '2990.00', maintenance: '490.00', perUser: '15.90' }
  });

  const calculateMonthlyTotal = (type: 'cloud' | 'local') => {
    const current = pricing[type];
    const effectiveEmployeeCount = Math.max(MIN_EMPLOYEES_BILLING, Number(employeeCount) || 0);
    const perUserTotal = (Number(current.perUser) || 0) * effectiveEmployeeCount;
    const maintenanceTotal = Number(current.maintenance) || 0;
    
    const modulesBaseTotal = AVAILABLE_MODULES
      .filter(m => selectedModules.includes(m.id))
      .reduce((acc, curr) => {
        if (curr.id === 'whitelabel') {
          return acc + (Number(whiteLabelPrice) || 0);
        }
        return acc + curr.suggestedPrice;
      }, 0);

    return perUserTotal + modulesBaseTotal + maintenanceTotal;
  };

  const getBase64ImageFromUrl = async (url: string): Promise<string> => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(reader.result as string), false);
        reader.addEventListener("error", () => reject());
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return '';
    }
  };

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      const primaryColor = [0, 163, 255]; 
      const effectiveCount = Math.max(MIN_EMPLOYEES_BILLING, Number(employeeCount) || 0);

      // Cabeçalho Oficial
      doc.setFillColor(10, 15, 29);
      doc.rect(0, 0, 210, 50, 'F');

      const logoBase64 = await getBase64ImageFromUrl('/logo-cybertech.png');
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 15, 10, 30, 30);
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('CYBERTECH RH', 50, 25);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('INTELIGÊNCIA DIGITAL EM GESTÃO DE PESSOAL', 50, 32);

      // Info Proposta
      doc.setFontSize(8);
      doc.text('PROPOSTA COMERCIAL Nº: ' + Math.floor(Math.random() * 10000), 150, 20);
      doc.text('DATA: ' + new Date().toLocaleDateString('pt-BR'), 150, 25);

      // Cliente Section
      doc.setFillColor(245, 247, 250);
      doc.rect(15, 60, 180, 25, 'F');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('PREPARADO PARA:', 25, 70);
      doc.setFontSize(14);
      doc.text(clientName.toUpperCase(), 25, 78);
      doc.setFontSize(9);
      doc.text('CNPJ: ' + (clientCnpj || 'NÃO INFORMADO'), 140, 78);

      let y = 100;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Prezado(a) responsável pela ${clientName},`, 15, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const greeting = "Abaixo detalhamos o comparativo de investimento. Nota: Para fins de licenciamento, aplicamos um faturamento mínimo de 50 colaboradores.";
      const greetingLines = doc.splitTextToSize(greeting, 180);
      doc.text(greetingLines, 15, y);
      y += (greetingLines.length * 5) + 15;

      // Tabela Comparativa de Preços
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Comparativo de Investimento', 15, y);
      y += 5;

      const priceData = [
        ['ITEM DE CUSTO', 'SERVIDOR NUVEM (Cloud)', 'SERVIDOR FÍSICO (Local)'],
        ['Taxa de Implantação (Setup)', 'R$ ' + pricing.cloud.setup, 'R$ ' + pricing.local.setup],
        ['Manutenção Mensal', 'R$ ' + pricing.cloud.maintenance, 'R$ ' + pricing.local.maintenance],
        ['Licença Mensal p/ Usuário', 'R$ ' + pricing.cloud.perUser, 'R$ ' + pricing.local.perUser],
        ['Base de Faturamento', effectiveCount + ' Colab. (Mínimo)', effectiveCount + ' Colab. (Mínimo)'],
        ['INVESTIMENTO MENSAL TOTAL', 'R$ ' + calculateMonthlyTotal('cloud').toLocaleString('pt-BR'), 'R$ ' + calculateMonthlyTotal('local').toLocaleString('pt-BR')]
      ];

      (doc as any).autoTable({
        startY: y,
        head: [priceData[0]],
        body: priceData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [10, 15, 29], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: { 
          0: { fontStyle: 'bold', cellWidth: 60 }, 
          1: { textColor: [0, 163, 255], fontStyle: 'bold', halign: 'center' },
          2: { textColor: [10, 15, 29], fontStyle: 'bold', halign: 'center' }
        }
      });

      doc.save(`Proposta_CyberTech_${clientName.replace(/\s/g, '_')}.pdf`);
      toast({ title: "PDF Gerado!" });
    } catch (error) {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleGenerateContract = async (type: 'cloud' | 'local') => {
    setIsGeneratingContract(true);
    try {
      const doc = new jsPDF();
      const logoBase64 = await getBase64ImageFromUrl('/logo-cybertech.png');
      const current = pricing[type];
      const effectiveCount = Math.max(MIN_EMPLOYEES_BILLING, Number(employeeCount) || 0);
      
      doc.setFillColor(245, 245, 245);
      doc.rect(0, 0, 210, 40, 'F');
      if (logoBase64) doc.addImage(logoBase64, 'PNG', 15, 5, 25, 25);
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`CONTRATO DE LICENCIAMENTO - SERVIDOR ${type.toUpperCase()}`, 50, 20);
      
      let y = 55;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      const contractText = [
        { title: 'CONTRATADA', content: 'CYBERTECH RH SOLUÇÕES EM TECNOLOGIA LTDA, CNPJ: 00.000.000/0001-00.' },
        { title: 'CONTRATANTE', content: `${clientName.toUpperCase()}, CNPJ: ${clientCnpj || '___________________'}.` },
        { title: 'OBJETO', content: `O sistema será implantado em regime de SERVIDOR ${type === 'cloud' ? 'EM NUVEM (SaaS)' : 'FÍSICO/LOCAL (On-Premise)'}.` },
        { title: 'INVESTIMENTO', content: `Setup de R$ ${current.setup}. Mensalidade calculada sobre base mínima de ${MIN_EMPLOYEES_BILLING} colaboradores, totalizando R$ ${calculateMonthlyTotal(type).toLocaleString('pt-BR')} mensais.` }
      ];

      contractText.forEach(item => {
        doc.setFont('helvetica', 'bold');
        doc.text(item.title + ':', 20, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(item.content, 170);
        doc.text(lines, 20, y);
        y += (lines.length * 5) + 8;
      });

      doc.save(`Contrato_${type.toUpperCase()}_CyberTech_${clientName.replace(/\s/g, '_')}.pdf`);
      toast({ title: "Contrato Gerado!" });
    } catch (error) {
      toast({ title: "Erro ao gerar Contrato", variant: "destructive" });
    } finally {
      setIsGeneratingContract(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Building className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">CyberTech Dual-Server Proposal</h1>
            <p className="text-[13px] text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Faturamento Mínimo Ativado (50 Colaboradores)
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
          <div className="lg:col-span-12 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                  <Label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest ml-1">CNPJ</Label>
                  <Input 
                    value={clientCnpj} 
                    onChange={e => setClientCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="bg-white/5 border-white/10 h-12 rounded-xl"
                  />
               </div>
               <div className="space-y-2">
                  <div className="flex justify-between items-center pr-1">
                    <Label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest ml-1">Colaboradores</Label>
                    <span className="text-[9px] font-black text-rose-400 uppercase">Min 50</span>
                  </div>
                  <Input 
                    type="number"
                    value={employeeCount} 
                    onChange={e => setEmployeeCount(e.target.value)}
                    className={cn(
                      "bg-white/5 border-white/10 h-12 rounded-xl font-bold",
                      Number(employeeCount) < 50 && "text-rose-400 border-rose-500/30"
                    )}
                  />
               </div>
               <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase text-primary tracking-widest ml-1">Valor White Label (R$)</Label>
                  <Input 
                    type="number"
                    value={whiteLabelPrice} 
                    onChange={e => setWhiteLabelPrice(e.target.value)}
                    className="bg-primary/10 border-primary/20 h-12 rounded-xl font-black text-white"
                  />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Cloud Config */}
               <div className="glass-card p-8 rounded-[2rem] border border-primary/20 bg-primary/5 space-y-6">
                  <div className="flex items-center gap-4">
                    <Cloud className="w-8 h-8 text-primary" />
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Valores Servidor Nuvem</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Setup</Label>
                      <Input value={pricing.cloud.setup} onChange={e => setPricing(p => ({ ...p, cloud: { ...p.cloud, setup: e.target.value } }))} className="bg-black/40 border-white/10 h-10 font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Manutenção</Label>
                      <Input value={pricing.cloud.maintenance} onChange={e => setPricing(p => ({ ...p, cloud: { ...p.cloud, maintenance: e.target.value } }))} className="bg-black/40 border-white/10 h-10 font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">p/ Usuário</Label>
                      <Input value={pricing.cloud.perUser} onChange={e => setPricing(p => ({ ...p, cloud: { ...p.cloud, perUser: e.target.value } }))} className="bg-black/40 border-white/10 h-10 font-bold" />
                    </div>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black uppercase text-primary tracking-widest">Total Mensal</span>
                       <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-black uppercase">Mín. 50</span>
                    </div>
                    <span className="text-xl font-black text-white">R$ {calculateMonthlyTotal('cloud').toLocaleString('pt-BR')}</span>
                  </div>
               </div>

               {/* Local Config */}
               <div className="glass-card p-8 rounded-[2rem] border border-white/10 bg-white/[0.02] space-y-6">
                  <div className="flex items-center gap-4">
                    <HardDrive className="w-8 h-8 text-muted-foreground" />
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Valores Servidor Físico</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Setup</Label>
                      <Input value={pricing.local.setup} onChange={e => setPricing(p => ({ ...p, local: { ...p.local, setup: e.target.value } }))} className="bg-black/40 border-white/10 h-10 font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Manutenção</Label>
                      <Input value={pricing.local.maintenance} onChange={e => setPricing(p => ({ ...p, local: { ...p.local, maintenance: e.target.value } }))} className="bg-black/40 border-white/10 h-10 font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">p/ Usuário</Label>
                      <Input value={pricing.local.perUser} onChange={e => setPricing(p => ({ ...p, local: { ...p.local, perUser: e.target.value } }))} className="bg-black/40 border-white/10 h-10 font-bold" />
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Mensal</span>
                       <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-muted-foreground font-black uppercase">Mín. 50</span>
                    </div>
                    <span className="text-xl font-black text-white">R$ {calculateMonthlyTotal('local').toLocaleString('pt-BR')}</span>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AVAILABLE_MODULES.map((mod) => {
                const isSelected = selectedModules.includes(mod.id);
                const Icon = mod.icon;
                return (
                  <div key={mod.id} onClick={() => toggleModule(mod.id)} className={cn("group p-6 rounded-[1.5rem] border cursor-pointer transition-all", isSelected ? 'bg-primary/10 border-primary/40' : 'bg-white/[0.02] border-white/5')}>
                    <div className="flex items-start gap-5">
                      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border transition-all", isSelected ? 'bg-primary text-white' : 'bg-white/5 text-muted-foreground')}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <h4 className={cn("text-[15px] font-black uppercase", isSelected ? 'text-white' : 'text-zinc-400')}>{mod.label}</h4>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{mod.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Preview da Proposta - Design Ultra Comparativo */
        <div className="max-w-5xl mx-auto space-y-10 animate-in slide-in-from-bottom-12 duration-700 pb-20">
          <div className="glass-card rounded-[3rem] border border-white/10 overflow-hidden bg-white relative">
            
            {/* Header CyberTech */}
            <div className="relative bg-[#0a0f1d] p-12 flex flex-col md:flex-row items-center justify-between gap-8 z-10">
               <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-white rounded-2xl p-3 flex items-center justify-center shadow-2xl">
                    <img src="/logo-cybertech.png" alt="CyberTech Logo" className="w-full h-full object-contain" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black text-white tracking-tighter">CYBERTECH <span className="text-primary italic">RH</span></h2>
                    <p className="text-primary/80 font-black text-[10px] uppercase tracking-[0.3em]">Modernização & Inteligência</p>
                  </div>
               </div>
               <div className="text-right">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl mb-2">
                    <Award className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">COMPARATIVO DE INFRAESTRUTURA</span>
                  </div>
               </div>
            </div>

            {/* Introduction */}
            <div className="p-16 space-y-10 bg-white">
               <div className="max-w-3xl space-y-6">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                    Prezado(a) responsável pela <span className="text-primary">{clientName}</span>,
                  </h3>
                  <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-slate-600 text-sm leading-relaxed font-medium">
                      Nota: O licenciamento da plataforma CyberTech RH contempla um <strong>faturamento mínimo de 50 colaboradores</strong>. 
                      Empresas com volume inferior serão faturadas sobre esta base mínima contratual.
                    </p>
                  </div>
               </div>

               {/* Comparison Table View */}
               <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-xl bg-white">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th className="p-6 text-left text-[11px] font-black uppercase tracking-widest">Modelo de Investimento</th>
                        <th className="p-6 text-center border-l border-white/10">
                           <div className="flex flex-col items-center gap-1">
                              <Cloud className="w-5 h-5 text-primary" />
                              <span className="text-[14px] font-black">SERVIDOR NUVEM</span>
                              <span className="text-[9px] text-primary/60 font-medium">Escalabilidade & Agilidade</span>
                           </div>
                        </th>
                        <th className="p-6 text-center border-l border-white/10">
                           <div className="flex flex-col items-center gap-1">
                              <HardDrive className="w-5 h-5 text-slate-400" />
                              <span className="text-[14px] font-black">SERVIDOR FÍSICO</span>
                              <span className="text-[9px] text-slate-500 font-medium">Controle & Privacidade Total</span>
                           </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700 font-medium text-[13px]">
                      <tr className="border-b border-slate-100">
                        <td className="p-6 font-black bg-slate-50">Taxa de Setup (Implementação)</td>
                        <td className="p-6 text-center text-primary font-black border-l border-slate-100">R$ {pricing.cloud.setup}</td>
                        <td className="p-6 text-center font-black border-l border-slate-100">R$ {pricing.local.setup}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-6 font-black bg-slate-50">Manutenção de Infraestrutura</td>
                        <td className="p-6 text-center text-primary font-black border-l border-slate-100">R$ {pricing.cloud.maintenance} /mês</td>
                        <td className="p-6 text-center font-black border-l border-slate-100">R$ {pricing.local.maintenance} /mês</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-6 font-black bg-slate-50">Licenciamento por Colaborador</td>
                        <td className="p-6 text-center text-primary font-black border-l border-slate-100">R$ {pricing.cloud.perUser} /mês</td>
                        <td className="p-6 text-center font-black border-l border-slate-100">R$ {pricing.local.perUser} /mês</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-6 font-black bg-slate-50">Base de Faturamento (Mínima)</td>
                        <td className="p-6 text-center text-primary font-black border-l border-slate-100">{Math.max(50, Number(employeeCount))} Colaboradores</td>
                        <td className="p-6 text-center font-black border-l border-slate-100">{Math.max(50, Number(employeeCount))} Colaboradores</td>
                      </tr>
                      <tr className="bg-slate-900 text-white">
                        <td className="p-8 font-black uppercase tracking-widest text-[11px]">Total Recorrente Estimado</td>
                        <td className="p-8 text-center text-2xl font-black text-primary border-l border-white/10">R$ {calculateMonthlyTotal('cloud').toLocaleString('pt-BR')}</td>
                        <td className="p-8 text-center text-2xl font-black text-white border-l border-white/10">R$ {calculateMonthlyTotal('local').toLocaleString('pt-BR')}</td>
                      </tr>
                    </tbody>
                  </table>
               </div>
            </div>

            {/* Actions */}
            <div className="p-16 pt-0 flex flex-col md:flex-row justify-center gap-4 bg-white">
               <Button 
                variant="outline" 
                className="h-12 px-8 rounded-xl border-slate-200 hover:bg-slate-50 font-black uppercase text-[11px] gap-3"
                onClick={handleGeneratePdf}
               >
                 <Download className="w-4 h-4" /> Exportar Comparativo PDF
               </Button>
               <Button 
                className="h-12 px-8 rounded-xl bg-primary text-white font-black uppercase text-[11px] gap-3 shadow-lg hover:-translate-y-1 transition-all"
                onClick={() => handleGenerateContract('cloud')}
               >
                 <FileSignature className="w-4 h-4" /> Fechar Contrato NUVEM
               </Button>
               <Button 
                className="h-12 px-8 rounded-xl bg-slate-900 text-white font-black uppercase text-[11px] gap-3 shadow-lg hover:-translate-y-1 transition-all"
                onClick={() => handleGenerateContract('local')}
               >
                 <HardDrive className="w-4 h-4" /> Fechar Contrato FÍSICO
               </Button>
            </div>

            {/* Footer */}
            <div className="bg-slate-900 p-8 text-center z-10 relative">
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.4em] font-black">
                CyberTech RH &copy; 2026 – Tecnologia & Estratégia em Gestão
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
