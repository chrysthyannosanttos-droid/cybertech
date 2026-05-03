import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateServerComparisonPDF = (clientName: string = 'Cliente') => {
  const doc = new jsPDF();
  const primaryColor = [10, 15, 29]; // Dark Blue CyberTech
  const accentColor = [0, 102, 255]; // Electric Blue

  // --- CABEÇALHO ---
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('CYBERTECH RH', 20, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('TECNOLOGIA EM GESTÃO DE PESSOAL', 20, 32);

  doc.setFontSize(12);
  doc.text('COMPARATIVO TÉCNICO DE INFRAESTRUTURA', 110, 25, { align: 'left' });

  // --- CORPO ---
  let y = 55;
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(16);
  doc.text(`Análise de Viabilidade: ${clientName}`, 20, y);
  
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Este documento apresenta as diferenças técnicas e operacionais entre as modalidades de servidor.', 20, y);

  // --- TABELA COMPARATIVA ---
  y += 15;
  (doc as any).autoTable({
    startY: y,
    head: [['Característica', 'Nuvem (SaaS)', 'Local (On-Premise)']],
    body: [
      ['Investimento Inicial', 'Zero / Baixo (Setup)', 'Alto (Hardware + Licença)'],
      ['Manutenção Hardware', 'Inclusa (CyberTech)', 'Responsabilidade do Cliente'],
      ['Segurança & Backup', 'Backups Diários Automáticos', 'Manual por conta do Cliente'],
      ['Acesso Externo', 'Nativo e Criptografado', 'Requer VPN / Config. de Rede'],
      ['Escalabilidade', 'Imediata (Mais usuários)', 'Limitada ao Hardware físico'],
      ['Atualizações', 'Automáticas e Transparentes', 'Requer intervenção técnica'],
      ['Custo de Energia/TI', 'Incluso na mensalidade', 'Custo adicional do Cliente'],
    ],
    headStyles: { fillColor: accentColor, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: 20, right: 20 }
  });

  y = (doc as any).lastAutoTable.finalY + 20;

  // --- DETALHAMENTO TÉCNICO ---
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Por que escolher a Nuvem (Cloud)?', 20, y);

  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const cloudText = [
    '• Disponibilidade (SLA): Garantia de 99.9% de disponibilidade sem interrupções.',
    '• Foco no Negócio: Sua equipe foca no RH, nós focamos na tecnologia e servidores.',
    '• Segurança LGPD: Dados armazenados em Datacenters de nível mundial com criptografia de ponta.',
    '• Redução de Custos: Elimine gastos com servidores físicos, no-breaks, ar-condicionado e técnicos de TI.'
  ];
  doc.text(cloudText, 25, y);

  y += 35;
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Considerações sobre Servidor Local', 20, y);

  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const localText = [
    '• Recomendado apenas para ambientes com internet extremamente limitada.',
    '• Exige infraestrutura física dedicada e equipe de suporte local.',
    '• Risco de perda de dados caso não haja uma política de backup rigorosa do cliente.'
  ];
  doc.text(localText, 25, y);

  // --- RODAPÉ ---
  const pageHeight = doc.internal.pageSize.height;
  doc.setFillColor(240, 240, 240);
  doc.rect(0, pageHeight - 25, 210, 25, 'F');
  
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Documento gerado automaticamente pelo Sistema Comercial CyberTech RH', 105, pageHeight - 15, { align: 'center' });
  doc.text('© 2026 CyberTech RH - Todos os direitos reservados.', 105, pageHeight - 10, { align: 'center' });

  // SALVAR
  doc.save(`CyberTech_Comparativo_Infraestrutura_${clientName.replace(/\s+/g, '_')}.pdf`);
};
