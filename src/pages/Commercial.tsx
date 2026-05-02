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
  Building
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
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);

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

      // Linha Divisória
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(1);
      doc.line(50, 36, 120, 36);

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

      // Mensagem de Saudação
      let y = 100;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Prezado(a) responsável pela ${clientName},`, 15, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const greeting = "É um prazer apresentar nossa proposta de modernização para o seu RH. O ecossistema CyberTech foi projetado para eliminar burocracias, garantir segurança jurídica e oferecer uma experiência digital superior para seus colaboradores.";
      const greetingLines = doc.splitTextToSize(greeting, 180);
      doc.text(greetingLines, 15, y);
      y += (greetingLines.length * 5) + 15;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Escopo da Solução - Servidor ' + (serverType === 'CLOUD' ? 'Nuvem' : 'Local'), 15, y);
      y += 5;

      const moduleData = AVAILABLE_MODULES
        .filter(m => selectedModules.includes(m.id))
        .map(m => [m.label, m.longDescription]);

      (doc as any).autoTable({
        startY: y,
        head: [['Módulo', 'Descrição do Serviço']],
        body: moduleData,
        theme: 'striped',
        headStyles: { fillColor: [10, 15, 29], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } }
      });

      y = (doc as any).lastAutoTable.finalY + 15;
      
      // Nova Página se necessário
      if (y > 220) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo do Investimento', 15, y);
      y += 5;

      const priceData = [
        ['Implementação (Setup)', 'R$ ' + currentPricing.setup, 'Configuração e Treinamento'],
        ['Manutenção Mensal', 'R$ ' + currentPricing.maintenance, 'Hospedagem e Atualizações'],
        ['Licenciamento/Usuário', 'R$ ' + currentPricing.perUser, 'Por colaborador ativo'],
        ['Colaboradores Estimados', employeeCount, 'Volume de licenças'],
        ['INVESTIMENTO TOTAL MENSAL', 'R$ ' + calculateMonthlyTotal().toLocaleString('pt-BR'), 'Recorrência estimada']
      ];

      (doc as any).autoTable({
        startY: y,
        body: priceData,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 6 },
        columnStyles: { 
          0: { fontStyle: 'bold', cellWidth: 60 }, 
          1: { textColor: primaryColor, fontStyle: 'bold', halign: 'right' },
          2: { textColor: [100, 100, 100], fontSize: 8 }
        }
      });

      // Marca d'água de fundo (mais suave)
      if (logoBase64) {
        doc.setGState(new (doc as any).GState({ opacity: 0.03 }));
        doc.addImage(logoBase64, 'PNG', 40, 80, 130, 130);
        doc.setGState(new (doc as any).GState({ opacity: 1 }));
      }

      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text('CyberTech RH © 2026 - Tecnologia Brasileira para o Mundo', 105, 285, { align: 'center' });

      doc.save(`Proposta_CyberTech_${clientName.replace(/\s/g, '_')}.pdf`);
      toast({ title: "Proposta Gerada!", description: "O documento oficial da CyberTech foi baixado." });
    } catch (error) {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleGenerateContract = async () => {
    setIsGeneratingContract(true);
    try {
      const doc = new jsPDF();
      const logoBase64 = await getBase64ImageFromUrl('/logo-cybertech.png');
      
      doc.setFillColor(245, 245, 245);
      doc.rect(0, 0, 210, 40, 'F');
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 15, 5, 25, 25);
      }
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('CONTRATO DE LICENCIAMENTO DE SOFTWARE', 50, 20);
      doc.setFontSize(10);
      doc.text('CYBERTECH RH - HR-HUB PLUS', 50, 28);

      let y = 55;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      const contractText = [
        { title: 'CONTRATADA', content: 'CYBERTECH RH SOLUÇÕES EM TECNOLOGIA LTDA, inscrita no CNPJ sob o nº 00.000.000/0001-00.' },
        { title: 'CONTRATANTE', content: `${clientName.toUpperCase()}, CNPJ: ${clientCnpj || '___________________'}.` },
        { title: 'OBJETO', content: `Licenciamento de uso da plataforma CyberTech RH em servidor ${serverType}, contemplando os módulos de BI, Ecossistema, Ponto e Folha.` },
        { title: 'INVESTIMENTO', content: `Taxa de Setup de R$ ${currentPricing.setup} e Mensalidade de R$ ${calculateMonthlyTotal().toLocaleString('pt-BR')}.` },
        { title: 'SUPORTE', content: 'Incluso suporte técnico ilimitado via WhatsApp corporativo e Tickets de atendimento.' }
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

      doc.save(`Contrato_CyberTech_${clientName.replace(/\s/g, '_')}.pdf`);
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
            <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">CyberTech Proposal</h1>
            <p className="text-[13px] text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Gerador de Documentos Oficiais
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
          <div className="glass-card rounded-[3rem] border border-white/10 overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.7)] bg-white relative">
            
            {/* BACKGROUND WATERMARK (LOGO) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] overflow-hidden z-0">
               <img src="/logo-cybertech.png" alt="Watermark" className="w-[80%] max-w-2xl transform -rotate-12 scale-150" />
            </div>

            {/* Header CyberTech */}
            <div className="relative bg-[#0a0f1d] p-16 flex flex-col md:flex-row items-center justify-between gap-8 z-10 border-b border-primary/20">
               <div className="flex items-center gap-8">
                  <div className="w-24 h-24 bg-white rounded-[2rem] p-4 flex items-center justify-center shadow-2xl">
                    <img src="/logo-cybertech.png" alt="CyberTech Logo" className="w-full h-full object-contain" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black text-white tracking-tighter leading-none">CYBERTECH <span className="text-primary italic">RH</span></h2>
                    <p className="text-primary/80 font-black text-[12px] uppercase tracking-[0.3em]">Inteligência Digital em Gestão</p>
                  </div>
               </div>
               <div className="text-right space-y-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
                    <Award className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">PROPOSTA COMERCIAL 2026</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest">Ref: CT-{Math.floor(Math.random() * 10000)}</p>
               </div>
            </div>

            {/* Greeting & Introduction */}
            <div className="p-20 space-y-12 z-10 relative bg-white">
               <div className="space-y-6 max-w-3xl">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
                    Prezado(a) responsável pela <span className="text-primary">{clientName}</span>,
                  </h3>
                  <div className="space-y-4 text-slate-600 text-lg leading-relaxed font-medium">
                    <p>
                      É com grande entusiasmo que a <strong>CyberTech RH</strong> apresenta este projeto de transformação digital para sua empresa. 
                      Nosso objetivo é elevar o patamar da sua gestão de capital humano através de uma plataforma robusta, segura e centrada na experiência do colaborador.
                    </p>
                    <p>
                      O ecossistema <strong>HR-HUB PLUS</strong> foi desenvolvido para automatizar processos complexos, garantir total segurança jurídica (LGPD) e oferecer insights estratégicos 
                      em tempo real para a tomada de decisão da alta diretoria.
                    </p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8">
                  <div className="space-y-4">
                     <p className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">Preparado Especialmente Para</p>
                     <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                        <p className="text-2xl font-black text-slate-900">{clientName}</p>
                        <p className="text-[13px] text-slate-500 font-bold uppercase">CNPJ: {clientCnpj || 'Consumidor Final'}</p>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <p className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">Modelo de Entrega</p>
                     <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                        <p className="text-2xl font-black text-slate-900">{serverType === 'CLOUD' ? 'Servidor Cloud' : 'Servidor Local'}</p>
                        <p className="text-[13px] text-slate-500 font-bold uppercase">Infraestrutura Dedicada</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Technical Scope */}
            <div className="p-20 space-y-16 z-10 relative bg-slate-50">
              <div className="text-center space-y-4 max-w-xl mx-auto">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Módulos Selecionados</h3>
                <div className="h-1 w-20 bg-primary mx-auto" />
              </div>

              <div className="grid grid-cols-1 gap-6">
                {AVAILABLE_MODULES.filter(m => selectedModules.includes(m.id)).map(m => (
                  <div key={m.id} className="group flex items-start gap-8 p-10 rounded-[2rem] bg-white border border-slate-200 hover:border-primary/30 transition-all shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 shrink-0 border border-primary/10">
                      <m.icon className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h4 className="text-xl font-black text-slate-900 tracking-tight uppercase">{m.label}</h4>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[9px] font-black uppercase">{m.category}</span>
                      </div>
                      <p className="text-[14px] text-slate-600 leading-relaxed max-w-2xl font-medium">
                        {m.longDescription}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-20 bg-white border-t border-slate-100 z-10 relative">
              <div className="rounded-[2.5rem] border border-primary/20 p-16 space-y-16 bg-[#0a0f1d] relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[120px] rounded-full -mr-48 -mt-48" />
                
                <div className="text-center space-y-4">
                  <h3 className="text-2xl font-black text-white tracking-widest uppercase">Investimento Estratégico</h3>
                  <div className="h-1 w-20 bg-primary mx-auto" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                   <div className="space-y-2 text-center">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Setup Único</p>
                      <div className="flex flex-col">
                        <span className="text-3xl font-black text-white tracking-tighter">R$ {currentPricing.setup}</span>
                        <span className="text-[10px] text-primary font-black uppercase mt-1">Implementação</span>
                      </div>
                   </div>
                   <div className="space-y-2 text-center">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Manutenção</p>
                      <div className="flex flex-col">
                        <span className="text-3xl font-black text-white tracking-tighter">R$ {currentPricing.maintenance}</span>
                        <span className="text-[10px] text-primary font-black uppercase mt-1">Hospedagem & Suporte</span>
                      </div>
                   </div>
                   <div className="space-y-2 text-center">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Licenciamento</p>
                      <div className="flex flex-col">
                        <span className="text-3xl font-black text-white tracking-tighter">R$ {currentPricing.perUser}</span>
                        <span className="text-[10px] text-primary font-black uppercase mt-1">Por Colaborador</span>
                      </div>
                   </div>
                   <div className="space-y-2 text-center">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Mensal</p>
                      <div className="flex flex-col">
                        <span className="text-3xl font-black text-primary tracking-tighter">R$ {calculateMonthlyTotal().toLocaleString('pt-BR')}</span>
                        <span className="text-[10px] text-white font-black uppercase mt-1">Faturamento Recorrente</span>
                      </div>
                   </div>
                </div>

                <div className="pt-16 flex flex-col md:flex-row justify-center gap-6 no-print">
                   <Button 
                    variant="outline" 
                    className="h-14 px-10 rounded-2xl border-white/10 hover:bg-white/5 font-black uppercase text-[12px] tracking-widest gap-3"
                    onClick={() => window.print()}
                   >
                     <Printer className="w-5 h-5" /> Imprimir
                   </Button>
                   <Button 
                    className="h-14 px-10 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase text-[12px] tracking-widest gap-3 hover:bg-white/10 transition-all"
                    disabled={isGeneratingPdf}
                    onClick={handleGeneratePdf}
                   >
                     <Download className="w-5 h-5" /> Exportar Proposta
                   </Button>
                   <Button 
                    className="h-14 px-10 rounded-2xl bg-primary text-white font-black uppercase text-[12px] tracking-widest gap-3 shadow-[0_20px_40px_rgba(var(--primary),0.3)] hover:-translate-y-1 transition-all"
                    disabled={isGeneratingContract}
                    onClick={handleGenerateContract}
                   >
                     {isGeneratingContract ? <CheckCircle2 className="w-5 h-5 animate-pulse" /> : <FileSignature className="w-5 h-5" />}
                     {isGeneratingContract ? 'Gerando Contrato...' : 'Gerar Contrato Jurídico'}
                   </Button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-900 p-12 text-center border-t border-white/5 z-10 relative">
              <div className="flex items-center justify-center gap-4 mb-6">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <Lock className="w-5 h-5 text-primary" />
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <p className="text-[11px] text-slate-400 uppercase tracking-[0.4em] font-black">
                CyberTech RH &copy; 2026 – Inteligência Digital em Gestão de Pessoas
              </p>
              <p className="text-[9px] text-slate-600 mt-4 uppercase tracking-widest">
                tecnologia brasileira • segurança de dados • conformidade lgpd
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
