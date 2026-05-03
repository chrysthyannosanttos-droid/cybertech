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
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { generateServerComparisonPDF } from '@/services/ServerComparisonService';
import { generateClientGuidePDF } from '@/services/ClientGuideService';

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

export default function Commercial() {
  const { user: currentUser } = useAuth();
  
  const isCristiano = currentUser?.email?.toLowerCase().includes('cristiano') || 
                      currentUser?.name?.toLowerCase().includes('cristiano');

  if (!isCristiano) {
    return <Navigate to="/dashboard" replace />;
  }

  const { toast } = useToast();
  const [clientName, setClientName] = useState('');
  const [clientCnpj, setClientCnpj] = useState('');
  const [employeeCount, setEmployeeCount] = useState('1'); // Padrão 1
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
    const actualEmployeeCount = Math.max(1, Number(employeeCount) || 0); // Mínimo real de 1
    const perUserTotal = (Number(current.perUser) || 0) * actualEmployeeCount;
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
      const actualCount = Math.max(1, Number(employeeCount) || 0);
      const propNum = `CT-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;
      const validity = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');

      const addWatermark = () => {
        if (logoBase64) {
          doc.setGState(new (doc as any).GState({ opacity: 0.04 }));
          doc.addImage(logoBase64, 'PNG', 35, 80, 140, 140);
          doc.setGState(new (doc as any).GState({ opacity: 1 }));
        }
      };

      const addPageFooter = (pageLabel: string) => {
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.setFont('helvetica', 'normal');
        doc.text(`CyberTech RH © ${new Date().getFullYear()}  |  ${propNum}  |  Válida até: ${validity}  |  ${pageLabel}`, 105, 290, { align: 'center' });
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(15, 287, 195, 287);
      };

      // ── PÁG 1: CAPA ────────────────────────────────────────────────────
      addWatermark();
      // Faixa topo
      doc.setFillColor(10, 15, 29);
      doc.rect(0, 0, 210, 60, 'F');
      // Faixa accent
      doc.setFillColor(0, 163, 255);
      doc.rect(0, 60, 210, 3, 'F');

      if (logoBase64) doc.addImage(logoBase64, 'PNG', 12, 10, 35, 35);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('CYBERTECH RH', 55, 28);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 163, 255);
      doc.text('INTELIGÊNCIA DIGITAL EM GESTÃO DE PESSOAL', 55, 37);
      doc.setTextColor(180, 180, 180);
      doc.setFontSize(7.5);
      doc.text(`Nº ${propNum}   |   ${new Date().toLocaleDateString('pt-BR')}`, 55, 47);

      // Bloco cliente
      doc.setFillColor(248, 249, 251);
      doc.roundedRect(15, 70, 180, 26, 3, 3, 'F');
      doc.setDrawColor(0, 163, 255);
      doc.setLineWidth(0.5);
      doc.roundedRect(15, 70, 180, 26, 3, 3, 'S');
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('PROPOSTA PREPARADA PARA:', 22, 78);
      doc.setTextColor(10, 15, 29);
      doc.setFontSize(14);
      doc.text(clientName.toUpperCase(), 22, 87);
      if (clientCnpj) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('CNPJ: ' + clientCnpj, 155, 87, { align: 'right' });
      }

      // Carta de apresentação
      let y = 107;
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`Prezado(a) responsável pela ${clientName},`, 15, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(70, 70, 70);
      const carta = `Agradecemos a oportunidade de apresentar nossa proposta de modernização tecnológica para a gestão de pessoas da sua empresa. A CyberTech RH é uma plataforma desenvolvida para eliminar burocracias operacionais, garantir conformidade jurídica e entregar uma experiência digital de alto nível para os seus colaboradores.

Nossa solução integra todos os processos de RH em um único ecossistema — do ponto eletrônico ao eSocial — reduzindo custos operacionais e aumentando a produtividade do departamento pessoal em até 70%.`;
      const cartaLines = doc.splitTextToSize(carta, 180);
      doc.text(cartaLines, 15, y);
      y += (cartaLines.length * 5) + 10;

      // Diferenciais
      doc.setFillColor(10, 15, 29);
      doc.roundedRect(15, y, 180, 8, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('POR QUE ESCOLHER A CYBERTECH RH?', 105, y + 5.5, { align: 'center' });
      y += 12;

      const diferenciais = [
        ['✦ 100% em Nuvem ou Local', 'Escolha a infraestrutura que melhor se adapta ao seu negócio'],
        ['✦ Conformidade Legal', 'eSocial, LGPD e CLT integrados nativamente na plataforma'],
        ['✦ Ponto Biométrico Antifraude', 'Registro por reconhecimento facial e GPS em tempo real'],
        ['✦ Suporte Especializado', 'Equipe de especialistas em RH e tecnologia à disposição'],
      ];

      (doc as any).autoTable({
        startY: y,
        body: diferenciais,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: [0, 100, 200], cellWidth: 65 },
          1: { textColor: [80, 80, 80] },
        },
        didDrawPage: addWatermark,
      });
      y = (doc as any).lastAutoTable.finalY + 6;
      addPageFooter('Página 1 de 3');

      // ── PÁG 2: ESCOPO ─────────────────────────────────────────────────
      doc.addPage();
      addWatermark();
      doc.setFillColor(10, 15, 29);
      doc.rect(0, 0, 210, 18, 'F');
      doc.setFillColor(0, 163, 255);
      doc.rect(0, 18, 210, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('ESCOPO DA SOLUÇÃO CONTRATADA', 105, 12, { align: 'center' });

      y = 28;
      const moduleData = AVAILABLE_MODULES
        .filter(m => selectedModules.includes(m.id))
        .map(m => [
          m.label,
          m.category === 'CORE' ? 'Core' : m.category === 'ADVANCED' ? 'Avançado' : 'Add-on',
          m.longDescription,
        ]);

      (doc as any).autoTable({
        startY: y,
        head: [['Módulo', 'Tipo', 'Descrição']],
        body: moduleData,
        theme: 'striped',
        headStyles: { fillColor: [10, 15, 29], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 52, fontStyle: 'bold' },
          1: { cellWidth: 22, halign: 'center', textColor: [0, 100, 200] },
        },
        didDrawPage: addWatermark,
      });
      addPageFooter('Página 2 de 3');

      // ── PÁG 3: INVESTIMENTO ────────────────────────────────────────────
      doc.addPage();
      addWatermark();
      doc.setFillColor(10, 15, 29);
      doc.rect(0, 0, 210, 18, 'F');
      doc.setFillColor(0, 163, 255);
      doc.rect(0, 18, 210, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMO DO INVESTIMENTO', 105, 12, { align: 'center' });

      y = 28;
      (doc as any).autoTable({
        startY: y,
        head: [['Componente de Custo', 'Servidor Nuvem (SaaS)', 'Servidor Físico (On-Premise)']],
        body: [
          ['Implementação e Setup Inicial', 'R$ ' + pricing.cloud.setup, 'R$ ' + pricing.local.setup],
          ['Manutenção de Infraestrutura / mês', 'R$ ' + pricing.cloud.maintenance, 'R$ ' + pricing.local.maintenance],
          ['Licenciamento por Colaborador / mês', 'R$ ' + pricing.cloud.perUser, 'R$ ' + pricing.local.perUser],
          ['Volume de Colaboradores Contratados', `${actualCount} usuários`, `${actualCount} usuários`],
          ['INVESTIMENTO MENSAL RECORRENTE', 'R$ ' + calculateMonthlyTotal('cloud').toLocaleString('pt-BR'), 'R$ ' + calculateMonthlyTotal('local').toLocaleString('pt-BR')],
        ],
        theme: 'grid',
        headStyles: { fillColor: [10, 15, 29], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { textColor: [0, 100, 200], fontStyle: 'bold', halign: 'right' },
          2: { fontStyle: 'bold', halign: 'right' },
        },
        didDrawPage: addWatermark,
      });

      y = (doc as any).lastAutoTable.finalY + 12;

      // Nota de validade
      doc.setFillColor(255, 248, 230);
      doc.roundedRect(15, y, 180, 14, 3, 3, 'F');
      doc.setTextColor(160, 100, 0);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('⚠  Esta proposta é válida até ' + validity + '. Após essa data os valores poderão ser revisados.', 105, y + 9, { align: 'center' });
      y += 22;

      // Próximos passos
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(10, 15, 29);
      doc.text('Próximos Passos para Contratação:', 15, y);
      y += 7;
      const steps = ['1. Aprovação desta proposta pela CONTRATANTE', '2. Assinatura do Contrato de Licenciamento', '3. Pagamento da Taxa de Setup', '4. Kickoff de Implantação com a equipe CyberTech'];
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(70, 70, 70);
      steps.forEach(s => { doc.text(s, 15, y); y += 6; });

      addPageFooter('Página 3 de 3');

      doc.save(`Proposta_CyberTech_${propNum}_${clientName.replace(/\s/g, '_')}.pdf`);
      toast({ title: '✅ Proposta Gerada!', description: 'PDF profissional em 3 páginas exportado.' });
    } catch (error) {
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    } finally { setIsGeneratingPdf(false); }
  };

  const handleGenerateContract = async (type: 'cloud' | 'local') => {
    setIsGeneratingContract(true);
    try {
      const doc = new jsPDF();
      const logoBase64 = await getBase64ImageFromUrl('/logo-cybertech.png');
      const current = pricing[type];
      const actualCount = Math.max(1, Number(employeeCount) || 0);
      const totalMensal = calculateMonthlyTotal(type).toLocaleString('pt-BR');
      const modality = type === 'cloud' ? 'SERVIDOR EM NUVEM (SaaS)' : 'SERVIDOR FÍSICO LOCAL (On-Premise)';
      const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      const contractNum = `CTRH-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;

      const addContractWatermark = () => {
        if (logoBase64) {
          doc.setGState(new (doc as any).GState({ opacity: 0.03 }));
          doc.addImage(logoBase64, 'PNG', 35, 80, 140, 140);
          doc.setGState(new (doc as any).GState({ opacity: 1 }));
        }
      };

      const addContractFooter = (page: number, total: number) => {
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.setFont('helvetica', 'normal');
        doc.line(15, 285, 195, 285);
        doc.text(`${contractNum}  |  Página ${page} de ${total}  |  Documento gerado em ${new Date().toLocaleDateString('pt-BR')}`, 105, 290, { align: 'center' });
      };

      let y = 0;

      // ── CABEÇALHO COM BARRA LATERAL AZUL ──────────────────────────────
      addContractWatermark();
      doc.setFillColor(10, 15, 29);
      doc.rect(0, 0, 210, 50, 'F');
      doc.setFillColor(0, 163, 255);
      doc.rect(0, 50, 210, 3, 'F');
      if (logoBase64) doc.addImage(logoBase64, 'PNG', 12, 8, 32, 32);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('CYBERTECH RH', 50, 22);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 220, 255);
      doc.text('Inteligência Digital em Gestão de Pessoal', 50, 30);
      doc.setTextColor(0, 163, 255);
      doc.setFontSize(7.5);
      doc.text(contractNum, 50, 38);
      doc.text(`Emitido em: ${today}`, 130, 38);

      // Título centralizado
      y = 62;
      doc.setTextColor(10, 15, 29);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('INSTRUMENTO PARTICULAR DE CONTRATO', 105, y, { align: 'center' });
      y += 7;
      doc.setFontSize(10);
      doc.setTextColor(0, 100, 180);
      doc.text(`LICENCIAMENTO DE SOFTWARE – MODALIDADE ${type === 'cloud' ? 'NUVEM' : 'LOCAL'}`, 105, y, { align: 'center' });
      y += 5;
      doc.setDrawColor(0, 163, 255);
      doc.setLineWidth(0.8);
      doc.line(15, y, 195, y);
      y += 8;

      // ── QUALIFICAÇÃO DAS PARTES ────────────────────────────────────────
      const clauseTitle = (text: string) => {
        doc.setFillColor(10, 15, 29);
        doc.roundedRect(15, y, 180, 8, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(text, 20, y + 5.5);
        y += 12;
      };

      const clauseBody = (text: string) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(50, 50, 50);
        const lines = doc.splitTextToSize(text, 175);
        doc.text(lines, 15, y);
        y += (lines.length * 4.8) + 5;
      };

      clauseTitle('I – PARTES CONTRATANTES');
      clauseBody(`CONTRATADA: CYBERTECH RH SOLUÇÕES EM TECNOLOGIA LTDA, pessoa jurídica de direito privado, CNPJ nº 00.000.000/0001-00, doravante denominada CONTRATADA.`);
      clauseBody(`CONTRATANTE: ${clientName.toUpperCase()}, ${clientCnpj ? 'CNPJ nº ' + clientCnpj + ',' : ''} doravante denominada CONTRATANTE.`);

      clauseTitle('II – OBJETO DO CONTRATO');
      clauseBody(`O presente instrumento tem por objeto o licenciamento não exclusivo de uso do Software CyberTech RH (HR-HUB PLUS), plataforma de gestão de pessoas, na modalidade ${modality}. Módulos contratados: ${AVAILABLE_MODULES.filter(m => selectedModules.includes(m.id)).map(m => m.label).join(', ')}.`);

      clauseTitle('III – PRAZO E VIGÊNCIA');
      clauseBody(`O prazo de vigência deste contrato é de 12 (doze) meses contados da data de sua assinatura, renovando-se automaticamente por iguais períodos, salvo aviso prévio de rescisão com 30 (trinta) dias de antecedência.`);

      clauseTitle('IV – VALOR E FORMA DE PAGAMENTO');
      clauseBody(`A CONTRATANTE pagará à CONTRATADA: (a) Taxa de Implantação e Setup (valor único): R$ ${current.setup}; (b) Licença mensal por colaborador: R$ ${current.perUser} × ${actualCount} usuários; (c) Taxa de manutenção de infraestrutura: R$ ${current.maintenance}/mês. Total recorrente mensal: R$ ${totalMensal}. O vencimento será todo dia 10 do mês subsequente ao de competência.`);

      addContractFooter(1, 2);

      // ── PÁG 2 ─────────────────────────────────────────────────────────
      doc.addPage();
      addContractWatermark();
      doc.setFillColor(10, 15, 29);
      doc.rect(0, 0, 210, 12, 'F');
      doc.setFillColor(0, 163, 255);
      doc.rect(0, 12, 210, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`CONTRATO ${contractNum} – CONTINUAÇÃO`, 105, 8.5, { align: 'center' });
      y = 22;

      clauseTitle('V – OBRIGAÇÕES DA CONTRATADA (SLA)');
      clauseBody(`A CONTRATADA garante: (a) Disponibilidade mínima de 99,5% ao mês; (b) Suporte técnico via canais digitais em horário comercial (seg-sex, 08h–18h); (c) Atualizações da plataforma sem custo adicional; (d) Backup diário dos dados da CONTRATANTE.`);

      clauseTitle('VI – PROTEÇÃO DE DADOS PESSOAIS – LGPD');
      clauseBody(`As partes comprometem-se a observar a Lei nº 13.709/2018 (LGPD). A CONTRATADA atuará como Operadora, processando dados pessoais somente conforme instruções da CONTRATANTE (Controladora). Dados serão tratados com confidencialidade e não compartilhados com terceiros sem autorização expressa.`);

      clauseTitle('VII – PROPRIEDADE INTELECTUAL E CONFIDENCIALIDADE');
      clauseBody(`O Software é de propriedade exclusiva da CONTRATADA. O presente contrato não implica cessão de direitos. A CONTRATANTE se compromete a não copiar, modificar, sublicenciar ou fazer engenharia reversa do Software, mantendo sigilo sobre informações confidenciais por 5 anos após o término contratual.`);

      clauseTitle('VIII – RESCISÃO');
      clauseBody(`Este contrato poderá ser rescindido: (a) Por mútuo acordo, mediante comunicação formal; (b) Por qualquer das partes, com aviso prévio de 30 dias; (c) Imediatamente por inadimplência superior a 30 dias ou violação grave das cláusulas contratuais.`);

      clauseTitle('IX – DISPOSIÇÕES GERAIS');
      clauseBody(`Este instrumento representa o acordo integral entre as partes, substituindo quaisquer entendimentos anteriores. Eventuais aditivos deverão ser formalizados por escrito. As partes elegem o foro da comarca da sede da CONTRATANTE para dirimir quaisquer litígios, com renúncia expressa a qualquer outro.`);

      // Tabela financeira resumida
      y += 4;
      (doc as any).autoTable({
        startY: y,
        head: [['Resumo Financeiro', 'Valor']],
        body: [
          ['Setup Inicial (único)', 'R$ ' + current.setup],
          ['Manutenção Mensal', 'R$ ' + current.maintenance],
          [`Licenciamento (${actualCount} usuários × R$ ${current.perUser})`, 'R$ ' + (Number(current.perUser) * actualCount).toLocaleString('pt-BR')],
          ['TOTAL MENSAL CONTRATADO', 'R$ ' + totalMensal],
        ],
        theme: 'grid',
        headStyles: { fillColor: [10, 15, 29], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8.5, cellPadding: 4 },
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right', textColor: [0, 100, 200], fontStyle: 'bold' } },
      });
      y = (doc as any).lastAutoTable.finalY + 14;

      // Assinaturas
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      doc.text(`Por estarem justas e acordadas, firmam o presente em 2 (duas) vias de igual teor e forma,`, 15, y);
      y += 5;
      doc.text(`na cidade de ________________________, em ${today}.`, 15, y);
      y += 18;

      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.5);
      doc.line(15, y, 92, y);
      doc.line(118, y, 195, y);
      y += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('CYBERTECH RH (CONTRATADA)', 53, y, { align: 'center' });
      doc.text(clientName.toUpperCase(), 156, y, { align: 'center' });
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(130, 130, 130);
      doc.setFontSize(7.5);
      doc.text('Representante Legal', 53, y, { align: 'center' });
      doc.text('Representante Legal / CONTRATANTE', 156, y, { align: 'center' });
      y += 14;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      doc.text('TESTEMUNHAS:', 15, y);
      y += 6;
      doc.line(15, y, 90, y);
      doc.line(115, y, 195, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(130, 130, 130);
      doc.text('Nome / CPF', 52, y, { align: 'center' });
      doc.text('Nome / CPF', 155, y, { align: 'center' });

      addContractFooter(2, 2);

      doc.save(`Contrato_CyberTech_${contractNum}_${clientName.replace(/\s/g, '_')}.pdf`);
      toast({ title: '✅ Contrato Jurídico Gerado!', description: `Documento oficial em 2 páginas exportado.` });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao gerar Contrato', variant: 'destructive' });
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
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Propostas Dinâmicas CyberTech
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {showPreview && (
            <Button variant="outline" className="h-10 gap-2 border-white/10" onClick={() => setShowPreview(false)}>
              <Plus className="w-4 h-4" /> Nova
            </Button>
          )}
          <Button 
            className="h-10 gap-2 bg-primary shadow-lg shadow-primary/20" 
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
                <Label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest ml-1">Colaboradores</Label>
                <Input type="number" value={employeeCount} onChange={e => setEmployeeCount(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl font-bold" />
             </div>
             <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase text-primary tracking-widest ml-1">Valor White Label</Label>
                <Input type="number" value={whiteLabelPrice} onChange={e => setWhiteLabelPrice(e.target.value)} className="bg-primary/10 border-primary/20 h-12 rounded-xl font-black text-white" />
             </div>
          </div>

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
                  <span className="text-xl font-black text-white">R$ {calculateMonthlyTotal('cloud').toLocaleString('pt-BR')}</span>
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
        <div className="max-w-5xl mx-auto space-y-10 animate-in slide-in-from-bottom-12 duration-700 pb-20 relative z-[4000]">
           <div className="rounded-[3rem] border border-slate-200 overflow-hidden bg-white shadow-2xl relative">
              <div className="bg-[#0a0f1d] p-12 flex justify-between items-center text-white">
                 <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-white rounded-2xl p-4 flex items-center justify-center">
                      <img src="/logo-cybertech.png" alt="Logo" className="w-full h-full object-contain pointer-events-none" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black italic">CYBERTECH <span className="text-primary">RH</span></h2>
                      <p className="text-[10px] font-black tracking-widest text-primary/80 uppercase">Proposta Oficial</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-slate-500">Cliente</p>
                    <p className="text-2xl font-black">{clientName}</p>
                 </div>
              </div>

              <div className="p-16 space-y-10 bg-white text-slate-800">
                 <h3 className="text-2xl font-black">Resumo de Investimento</h3>
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
                          <tr className="border-b"><td className="p-6 bg-slate-50">Colaboradores</td><td className="p-6 text-center text-primary">{employeeCount} Usuários</td><td className="p-6 text-center">{employeeCount} Usuários</td></tr>
                          <tr className="bg-slate-900 text-white text-xl">
                             <td className="p-8 uppercase text-[11px]">Investimento Mensal</td>
                              <td className="p-8 text-center text-primary border-l border-white/10">R$ {calculateMonthlyTotal('cloud').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="p-8 text-center border-l border-white/10">R$ {calculateMonthlyTotal('local').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                       </tbody>
                    </table>
                 </div>
                      <Rocket className="w-5 h-5" /> 
                      Guia do Sistema
                    </Button>
                    <Button variant="outline" className="h-14 px-6 rounded-2xl gap-3 font-black text-slate-600 border-slate-200 hover:bg-slate-50 transition-all" onClick={() => generateServerComparisonPDF(clientName || 'Cliente')}>
                      <Server className="w-5 h-5 text-primary" /> 
                      Comparativo Técnico
                    </Button>
                    <Button variant="outline" className="h-14 px-6 rounded-2xl gap-3 font-black text-slate-600 border-slate-200 hover:bg-slate-50 transition-all" onClick={handleGeneratePdf}>
                      <Download className="w-5 h-5" /> 
                      Exportar PDF
                    </Button>
                    <Button className="h-14 px-6 rounded-2xl bg-primary gap-3 font-black shadow-xl hover:scale-[1.02] transition-all" onClick={() => handleGenerateContract('cloud')}>
                      <FileSignature className="w-5 h-5" /> 
                      Contrato Nuvem
                    </Button>
                    <Button className="h-14 px-6 rounded-2xl bg-slate-900 gap-3 font-black shadow-xl hover:scale-[1.02] transition-all" onClick={() => handleGenerateContract('local')}>
                      <FileSignature className="w-5 h-5" /> 
                      Contrato Físico
                    </Button>
                  </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
