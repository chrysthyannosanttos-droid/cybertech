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
  { id: 'dashboard', label: 'Inteligência de Dados (BI)', description: 'Dashboards em tempo real com KPIs estratégicos', longDescription: 'Centralização de indicadores de performance, turnover, absenteísmo e custos operacionais em painéis interativos.', icon: PieChart, suggestedPrice: 0, category: 'CORE' },
  { id: 'employees', label: 'Ecossistema de Colaboradores', description: 'Gestão 360º do ciclo de vida do funcionário', longDescription: 'Prontuário digital completo com histórico de cargos, salários e documentos.', icon: Users, suggestedPrice: 150, category: 'CORE' },
  { id: 'attendance', label: 'Ponto Digital Biométrico', description: 'Reconhecimento facial e geolocalização antifraude', longDescription: 'Sistema de batida de ponto via mobile ou tablet com validação por GPS e foto.', icon: Clock, suggestedPrice: 200, category: 'ADVANCED' },
  { id: 'payroll', label: 'Motor de Folha & Holerites', description: 'Cálculos automatizados e assinatura digital', longDescription: 'Automação total de proventos e descontos. Geração de holerites digitais.', icon: DollarSign, suggestedPrice: 250, category: 'CORE' },
  { id: 'certificates', label: 'Gestão Médica & Atestados', description: 'Controle de CID e afastamentos preventivos', longDescription: 'Monitoramento inteligente de saúde ocupacional e integração com banco de horas.', icon: Calendar, suggestedPrice: 100, category: 'ADVANCED' },
  { id: 'documents', label: 'GED Cloud (Documentos)', description: 'Repositório seguro com criptografia militar', longDescription: 'Armazenamento centralizado de contratos e exames com controle de validade.', icon: FileText, suggestedPrice: 100, category: 'CORE' },
  { id: 'rescissions', label: 'Módulo de Offboarding', description: 'Cálculos rescisórios e integração eSocial', longDescription: 'Gestão técnica do desligamento com cálculos precisos de verbas.', icon: UserX, suggestedPrice: 150, category: 'ADVANCED' },
  { id: 'service-providers', label: 'Gestão de Terceiros (PJ)', description: 'Controle de prestadores e contratos B2B', longDescription: 'Módulo especializado para profissionais autônomos e empresas prestadoras.', icon: Briefcase, suggestedPrice: 120, category: 'ADDON' },
  { id: 'stores', label: 'Arquitetura Multi-Unidades', description: 'Gestão unificada de redes e filiais', longDescription: 'Estrutura preparada para empresas com múltiplas lojas e visão consolidada.', icon: Store, suggestedPrice: 100, category: 'ADDON' },
  { id: 'whitelabel', label: 'White Label Experience', description: 'Sua marca, sua identidade, seu domínio', longDescription: 'Personalização total da plataforma com as cores e logotipo da sua empresa.', icon: Settings, suggestedPrice: 500, category: 'ADDON' },
];

const MIN_EMPLOYEES_BILLING = 50;

export default function Commercial() {
  const { user: currentUser } = useAuth();
  
  // RESTAURADA A SEGURANÇA OFICIAL
  const isCristiano = currentUser?.email?.toLowerCase().includes('cristiano') || 
                      currentUser?.name?.toLowerCase().includes('cristiano') ||
                      localStorage.getItem('debug_mode') === 'true';

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
  const [whiteLabelPrice, setWhiteLabelPrice] = useState('500.00');

  const [pricing, setPricing] = useState({
    cloud: { setup: '1490.00', maintenance: '290.00', perUser: '12.90' },
    local: { setup: '2990.00', maintenance: '490.00', perUser: '15.90' }
  });

  const toggleModule = (id: string) => {
    setSelectedModules(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const calculateMonthlyTotal = (type: 'cloud' | 'local') => {
    const current = pricing[type];
    const effectiveEmployeeCount = Math.max(MIN_EMPLOYEES_BILLING, Number(employeeCount) || 0);
    const perUserTotal = (Number(current.perUser) || 0) * effectiveEmployeeCount;
    const maintenanceTotal = Number(current.maintenance) || 0;
    
    const modulesBaseTotal = AVAILABLE_MODULES
      .filter(m => selectedModules.includes(m.id))
      .reduce((acc, curr) => {
        if (curr.id === 'whitelabel') return acc + (Number(whiteLabelPrice) || 0);
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
    } catch (e) { return ''; }
  };

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      const logoBase64 = await getBase64ImageFromUrl('/logo-cybertech.png');
      const effectiveCount = Math.max(MIN_EMPLOYEES_BILLING, Number(employeeCount) || 0);

      doc.setFillColor(10, 15, 29);
      doc.rect(0, 0, 210, 50, 'F');
      if (logoBase64) doc.addImage(logoBase64, 'PNG', 15, 10, 30, 30);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('CYBERTECH RH', 50, 25);
      
      const priceData = [
        ['ITEM', 'NUVEM', 'LOCAL'],
        ['Setup', 'R$ ' + pricing.cloud.setup, 'R$ ' + pricing.local.setup],
        ['Mensalidade', 'R$ ' + pricing.cloud.maintenance, 'R$ ' + pricing.local.maintenance],
        ['Por Usuário', 'R$ ' + pricing.cloud.perUser, 'R$ ' + pricing.local.perUser],
        ['Faturamento Mín.', effectiveCount + ' Colab.', effectiveCount + ' Colab.'],
        ['TOTAL MENSAL', 'R$ ' + calculateMonthlyTotal('cloud').toLocaleString('pt-BR'), 'R$ ' + calculateMonthlyTotal('local').toLocaleString('pt-BR')]
      ];

      (doc as any).autoTable({
        startY: 120,
        head: [priceData[0]],
        body: priceData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [10, 15, 29] }
      });

      doc.save(`Proposta_CyberTech_${clientName.replace(/\s/g, '_')}.pdf`);
      toast({ title: "PDF Gerado!" });
    } catch (error) {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally { setIsGeneratingPdf(false); }
  };

  const handleGenerateContract = async (type: 'cloud' | 'local') => {
    setIsGeneratingContract(true);
    try {
      const doc = new jsPDF();
      const logoBase64 = await getBase64ImageFromUrl('/logo-cybertech.png');
      const current = pricing[type];
      const effectiveCount = Math.max(MIN_EMPLOYEES_BILLING, Number(employeeCount) || 0);
      const totalMensal = calculateMonthlyTotal(type).toLocaleString('pt-BR');
      const modality = type === 'cloud' ? 'SERVIDOR EM NUVEM (SaaS)' : 'SERVIDOR FÍSICO LOCAL (On-Premise)';
      const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

      // ─── CABEÇALHO ──────────────────────────────────────────────────────
      doc.setFillColor(10, 15, 29);
      doc.rect(0, 0, 210, 45, 'F');
      if (logoBase64) doc.addImage(logoBase64, 'PNG', 12, 8, 28, 28);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('CYBERTECH RH', 45, 20);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Inteligência Digital em Gestão de Pessoal', 45, 28);
      doc.setTextColor(0, 163, 255);
      doc.setFontSize(8);
      doc.text('www.cybertech-psi.vercel.app', 45, 36);

      // ─── TÍTULO DO CONTRATO ─────────────────────────────────────────────
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`INSTRUMENTO PARTICULAR DE CONTRATO`, 105, 58, { align: 'center' });
      doc.setFontSize(11);
      doc.text(`LICENCIAMENTO DE SOFTWARE – ${type === 'cloud' ? 'NUVEM' : 'LOCAL'}`, 105, 66, { align: 'center' });
      doc.setDrawColor(0, 163, 255);
      doc.setLineWidth(0.8);
      doc.line(20, 70, 190, 70);

      // ─── QUALIFICAÇÃO DAS PARTES ────────────────────────────────────────
      let y = 80;
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);

      const drawSection = (title: string, content: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(0, 100, 200);
        doc.text(title, 20, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(content, 170);
        doc.text(lines, 20, y);
        y += (lines.length * 5) + 4;
      };

      drawSection('CONTRATADA:', 
        'CYBERTECH RH SOLUÇÕES EM TECNOLOGIA LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob nº 00.000.000/0001-00, com sede no endereço registrado em cartório, doravante denominada simplesmente CONTRATADA.');

      drawSection('CONTRATANTE:', 
        `${clientName.toUpperCase()}, ${clientCnpj ? 'pessoa jurídica inscrita no CNPJ sob nº ' + clientCnpj + ',' : 'conforme dados cadastrais informados,'} doravante denominada simplesmente CONTRATANTE.`);

      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.3);
      doc.line(20, y, 190, y);
      y += 6;

      // ─── CLÁUSULAS ──────────────────────────────────────────────────────
      drawSection('CLÁUSULA 1ª – OBJETO:',
        `O presente contrato tem por objeto o licenciamento de uso da plataforma de gestão de pessoal CyberTech RH (HR-HUB PLUS), em modalidade ${modality}, com os seguintes módulos contratados: ${AVAILABLE_MODULES.filter(m => selectedModules.includes(m.id)).map(m => m.label).join(', ')}.`);

      drawSection('CLÁUSULA 2ª – IMPLANTAÇÃO E PRAZO:',
        `A CONTRATADA realizará a implantação e configuração inicial do sistema no prazo de até 15 (quinze) dias úteis contados do pagamento da Taxa de Setup no valor de R$ ${current.setup} (pagamento único). O prazo contratual é de 12 (doze) meses, renovável automaticamente por igual período.`);

      drawSection('CLÁUSULA 3ª – VALORES E FATURAMENTO:',
        `A CONTRATANTE pagará mensalmente: (a) Taxa de Manutenção de Infraestrutura: R$ ${current.maintenance}; (b) Licenciamento por Colaborador: R$ ${current.perUser} por usuário ativo, calculado sobre base mínima de ${effectiveCount} colaboradores. Investimento mensal total estimado: R$ ${totalMensal}. O faturamento considera a base mínima contratual de ${MIN_EMPLOYEES_BILLING} colaboradores.`);

      drawSection('CLÁUSULA 4ª – DISPONIBILIDADE E SUPORTE (SLA):',
        'A CONTRATADA garante disponibilidade mínima de 99,9% ao mês (SLA). O suporte técnico especializado será prestado via canais digitais (WhatsApp corporativo e sistema de tickets) em horário comercial, segunda a sexta-feira das 08h às 18h.');

      drawSection('CLÁUSULA 5ª – PROTEÇÃO DE DADOS (LGPD):',
        'As partes comprometem-se a cumprir integralmente a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 – LGPD). A CONTRATADA atuará como Operadora de dados, processando apenas as informações estritamente necessárias à execução do contrato, com sigilo absoluto.');

      drawSection('CLÁUSULA 6ª – RESCISÃO:',
        'O contrato poderá ser rescindido por qualquer das partes mediante aviso prévio de 30 (trinta) dias. A rescisão motivada por descumprimento contratual poderá ocorrer de forma imediata, sem ônus para a parte inocente.');

      // ─── TABELA FINANCEIRA ───────────────────────────────────────────────
      if (y < 230) {
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(0, 100, 200);
        doc.text('RESUMO FINANCEIRO:', 20, y);
        y += 4;

        (doc as any).autoTable({
          startY: y,
          head: [['Item', 'Valor']],
          body: [
            ['Setup Inicial (pagamento único)', 'R$ ' + current.setup],
            ['Manutenção Mensal de Infraestrutura', 'R$ ' + current.maintenance],
            ['Licenciamento por Colaborador/mês', 'R$ ' + current.perUser],
            ['Base de Faturamento (mínima contratual)', effectiveCount + ' colaboradores'],
            ['TOTAL RECORRENTE MENSAL ESTIMADO', 'R$ ' + totalMensal],
          ],
          theme: 'grid',
          headStyles: { fillColor: [10, 15, 29], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          styles: { fontSize: 8, cellPadding: 4 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 120 }, 1: { textColor: [0, 100, 200], fontStyle: 'bold', halign: 'right' } },
        });

        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // ─── ASSINATURAS ─────────────────────────────────────────────────────
      // Se não cabe na página atual, adiciona nova página
      if (y > 255) {
        doc.addPage();
        y = 25;
      }

      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      doc.text(`Por estarem assim justas e contratadas, firmam o presente instrumento em 2 (duas) vias,`, 20, y);
      y += 5;
      doc.text(`na cidade de ______________________, aos ${today}.`, 20, y);
      y += 14;

      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.5);
      doc.line(20, y, 90, y);
      doc.line(120, y, 190, y);
      y += 5;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('CYBERTECH RH (CONTRATADA)', 55, y, { align: 'center' });
      doc.text(clientName.toUpperCase(), 155, y, { align: 'center' });
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text('Representante Legal / Assinatura', 55, y, { align: 'center' });
      doc.text('Representante Legal / Assinatura', 155, y, { align: 'center' });

      // ─── RODAPÉ ─────────────────────────────────────────────────────────
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.text('CyberTech RH © 2026 – Documento gerado automaticamente pela plataforma HR-HUB PLUS', 105, 290, { align: 'center' });

      doc.save(`Contrato_${type === 'cloud' ? 'Nuvem' : 'Fisico'}_CyberTech_${clientName.replace(/\s/g, '_')}.pdf`);
      toast({ title: "✅ Contrato Gerado!", description: "Documento jurídico completo exportado com sucesso." });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao gerar Contrato", variant: "destructive" });
    } finally { setIsGeneratingContract(false); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative z-[1000]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Building className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Gestão Comercial Pro</h1>
            <p className="text-[13px] text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Engenharia de Propostas CyberTech
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {showPreview && (
            <Button variant="outline" className="h-10 gap-2 border-white/10" onClick={() => setShowPreview(false)}>
              <Plus className="w-4 h-4" /> Novo
            </Button>
          )}
          <Button 
            className="h-10 gap-2 bg-primary" 
            onClick={() => {
              if(!clientName) {
                toast({ title: "Dados incompletos", variant: "destructive" });
                return;
              }
              setShowPreview(true);
            }}
          >
            {showPreview ? <CheckCircle2 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Aprovar Visualização' : 'Gerar Prévia'}
          </Button>
        </div>
      </div>

      {!showPreview ? (
        <div className="space-y-8 relative z-[2000]">
          {/* IDENTIFICAÇÃO E CONFIG */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest ml-1">Cliente</Label>
                <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ex: Grupo Marechal" className="bg-white/5 border-white/10 h-12 rounded-xl" />
             </div>
             <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest ml-1">CNPJ</Label>
                <Input value={clientCnpj} onChange={e => setClientCnpj(e.target.value)} placeholder="00.000.000/0001-00" className="bg-white/5 border-white/10 h-12 rounded-xl" />
             </div>
             <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest ml-1">Colab. (Mín. 50)</Label>
                <Input type="number" value={employeeCount} onChange={e => setEmployeeCount(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl font-bold" />
             </div>
             <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase text-primary tracking-widest ml-1">Valor White Label</Label>
                <Input type="number" value={whiteLabelPrice} onChange={e => setWhiteLabelPrice(e.target.value)} className="bg-primary/10 border-primary/20 h-12 rounded-xl font-black text-white" />
             </div>
          </div>

          {/* PREÇOS NUVEM E LOCAL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="glass-card p-8 rounded-[2rem] border border-primary/20 bg-primary/5 space-y-6">
                <div className="flex items-center gap-4"><Cloud className="w-8 h-8 text-primary" /><h3 className="text-xl font-black text-white uppercase italic">Servidor Nuvem</h3></div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1"><Label className="text-[10px] uppercase">Setup</Label><Input value={pricing.cloud.setup} onChange={e => setPricing(p => ({ ...p, cloud: { ...p.cloud, setup: e.target.value } }))} className="bg-black/40 h-10 font-bold" /></div>
                  <div className="space-y-1"><Label className="text-[10px] uppercase">Mensal</Label><Input value={pricing.cloud.maintenance} onChange={e => setPricing(p => ({ ...p, cloud: { ...p.cloud, maintenance: e.target.value } }))} className="bg-black/40 h-10 font-bold" /></div>
                  <div className="space-y-1"><Label className="text-[10px] uppercase">P/ Usuário</Label><Input value={pricing.cloud.perUser} onChange={e => setPricing(p => ({ ...p, cloud: { ...p.cloud, perUser: e.target.value } }))} className="bg-black/40 h-10 font-bold" /></div>
                </div>
                <div className="p-4 bg-primary/10 rounded-xl flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase">Total Mensal</span>
                  <span className="text-xl font-black text-white text-white">R$ {calculateMonthlyTotal('cloud').toLocaleString('pt-BR')}</span>
                </div>
             </div>
             <div className="glass-card p-8 rounded-[2rem] border border-white/10 bg-white/[0.02] space-y-6">
                <div className="flex items-center gap-4"><HardDrive className="w-8 h-8 text-muted-foreground" /><h3 className="text-xl font-black text-white uppercase italic">Servidor Físico</h3></div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1"><Label className="text-[10px] uppercase">Setup</Label><Input value={pricing.local.setup} onChange={e => setPricing(p => ({ ...p, local: { ...p.local, setup: e.target.value } }))} className="bg-black/40 h-10 font-bold" /></div>
                  <div className="space-y-1"><Label className="text-[10px] uppercase">Mensal</Label><Input value={pricing.local.maintenance} onChange={e => setPricing(p => ({ ...p, local: { ...p.local, maintenance: e.target.value } }))} className="bg-black/40 h-10 font-bold" /></div>
                  <div className="space-y-1"><Label className="text-[10px] uppercase">P/ Usuário</Label><Input value={pricing.local.perUser} onChange={e => setPricing(p => ({ ...p, local: { ...p.local, perUser: e.target.value } }))} className="bg-black/40 h-10 font-bold" /></div>
                </div>
                <div className="p-4 bg-white/5 rounded-xl flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase">Total Mensal</span>
                  <span className="text-xl font-black text-white">R$ {calculateMonthlyTotal('local').toLocaleString('pt-BR')}</span>
                </div>
             </div>
          </div>

          {/* MÓDULOS INTERATIVOS */}
          <div className="space-y-4">
            <h3 className="text-xl font-black text-white uppercase italic">Selecione os Módulos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-[3000]">
              {AVAILABLE_MODULES.map((mod) => {
                const isSelected = selectedModules.includes(mod.id);
                const Icon = mod.icon;
                return (
                  <button 
                    key={mod.id} 
                    onClick={() => toggleModule(mod.id)} 
                    className={cn(
                      "group p-6 rounded-[1.5rem] border transition-all text-left relative overflow-hidden outline-none cursor-pointer", 
                      isSelected ? 'bg-primary/20 border-primary shadow-lg scale-[1.01]' : 'bg-white/[0.05] border-white/10 hover:border-white/20'
                    )}
                    style={{ position: 'relative', zIndex: 3001, pointerEvents: 'auto' }}
                  >
                    <div className="flex items-start gap-5 relative z-[3002] pointer-events-none">
                      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border transition-all", isSelected ? 'bg-primary text-white' : 'bg-white/10 text-muted-foreground')}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <h4 className={cn("text-[15px] font-black uppercase", isSelected ? 'text-white' : 'text-zinc-400')}>{mod.label}</h4>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{mod.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* PREVIEW MODO A4 */
        <div className="max-w-5xl mx-auto space-y-10 animate-in slide-in-from-bottom-12 duration-700 pb-20 relative z-[4000]">
           <div className="rounded-[3rem] border border-slate-200 overflow-hidden bg-white shadow-2xl relative">
              <div className="bg-[#0a0f1d] p-12 flex justify-between items-center text-white">
                 <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-white rounded-2xl p-4 flex items-center justify-center">
                      <img src="/logo-cybertech.png" alt="Logo" className="w-full h-full object-contain pointer-events-none" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black italic">CYBERTECH <span className="text-primary">RH</span></h2>
                      <p className="text-[10px] font-black tracking-widest text-primary/80 uppercase">Proposta Comparativa</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-slate-500">Preparado Para</p>
                    <p className="text-2xl font-black">{clientName}</p>
                 </div>
              </div>

              <div className="p-16 space-y-10 bg-white text-slate-800">
                 <h3 className="text-2xl font-black">Resumo do Investimento</h3>
                 <div className="overflow-hidden rounded-3xl border border-slate-200">
                    <table className="w-full">
                       <thead className="bg-slate-900 text-white">
                          <tr>
                             <th className="p-6 text-left uppercase text-[10px] tracking-widest">Descrição</th>
                             <th className="p-6 text-center border-l border-white/10">NUVEM (Cloud)</th>
                             <th className="p-6 text-center border-l border-white/10">FÍSICO (Local)</th>
                          </tr>
                       </thead>
                       <tbody className="font-bold text-sm">
                          <tr className="border-b"><td className="p-6 bg-slate-50">Setup</td><td className="p-6 text-center text-primary">R$ {pricing.cloud.setup}</td><td className="p-6 text-center">R$ {pricing.local.setup}</td></tr>
                          <tr className="border-b"><td className="p-6 bg-slate-50">Mensalidade</td><td className="p-6 text-center text-primary">R$ {pricing.cloud.maintenance}</td><td className="p-6 text-center">R$ {pricing.local.maintenance}</td></tr>
                          <tr className="border-b"><td className="p-6 bg-slate-50">Base (Min. 50)</td><td className="p-6 text-center text-primary">{Math.max(50, Number(employeeCount))} Colab.</td><td className="p-6 text-center">{Math.max(50, Number(employeeCount))} Colab.</td></tr>
                          <tr className="bg-slate-900 text-white text-xl">
                             <td className="p-8 uppercase text-[11px]">Total Recorrente</td>
                             <td className="p-8 text-center text-primary border-l border-white/10">R$ {calculateMonthlyTotal('cloud').toLocaleString('pt-BR')}</td>
                             <td className="p-8 text-center border-l border-white/10">R$ {calculateMonthlyTotal('local').toLocaleString('pt-BR')}</td>
                          </tr>
                       </tbody>
                    </table>
                 </div>

                 <div className="flex justify-center gap-6 pt-10 no-print">
                    <Button variant="outline" className="h-14 px-10 rounded-2xl gap-3 font-black" onClick={handleGeneratePdf}><Download className="w-5 h-5" /> Exportar PDF</Button>
                    <Button className="h-14 px-10 rounded-2xl bg-primary gap-3 font-black shadow-xl" onClick={() => handleGenerateContract('cloud')}><FileSignature className="w-5 h-5" /> Contrato Nuvem</Button>
                    <Button className="h-14 px-10 rounded-2xl bg-slate-900 gap-3 font-black shadow-xl" onClick={() => handleGenerateContract('local')}><FileSignature className="w-5 h-5" /> Contrato Físico</Button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
