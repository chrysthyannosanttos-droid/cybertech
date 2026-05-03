import jsPDF from 'jspdf';
import 'jspdf-autotable';

import { downloadPdf } from '@/lib/utils';

export const generateClientGuidePDF = (clientName: string = 'Cliente') => {
  const doc = new jsPDF();
  const primary = [10, 15, 29];
  const accent = [0, 163, 255];

  const addHeader = (title: string) => {
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CYBERTECH RH', 15, 15);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('GUIA DE APRESENTAÇÃO DO SISTEMA', 15, 22);
    doc.setFontSize(10);
    doc.text(title.toUpperCase(), 195, 18, { align: 'right' });
  };

  const addFooter = (page: number) => {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`CyberTech RH - Tecnologia White-Label  |  Página ${page}`, 105, 290, { align: 'center' });
  };

  // --- CAPA ---
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, 210, 297, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text('GUIA DO USUÁRIO', 20, 100);
  doc.setFontSize(42);
  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.text('CYBERTECH RH', 20, 120);
  doc.rect(20, 130, 80, 2, 'F');
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(14);
  doc.text(`Preparado especialmente para:`, 20, 160);
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(clientName.toUpperCase(), 20, 175);
  
  // --- PÁG 1: DASHBOARD ---
  doc.addPage();
  addHeader('Dashboard Estratégico');
  let y = 50;
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFontSize(18);
  doc.text('1. Dashboard de Gestão', 15, y);
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  const dashDesc = [
    'O Dashboard é o centro de inteligência da sua empresa. Nele, o gestor visualiza a saúde da operação em tempo real.',
    '',
    '• Indicadores de Absenteísmo e Turnover automáticos.',
    '• Distribuição de força de trabalho por unidade/loja.',
    '• Alertas de vencimento de exames e documentos.',
    '• Visão financeira de folha e rescisões.'
  ];
  doc.text(dashDesc, 15, y);
  
  // Moldura para imagem (Simulando onde ficaria a foto)
  y += 50;
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(0.5);
  doc.rect(20, y, 170, 90);
  doc.setFontSize(8);
  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.text('[ VISUALIZAÇÃO DO DASHBOARD - INTERFACE EXECUTIVE DARK ]', 105, y + 45, { align: 'center' });
  addFooter(1);

  // --- PÁG 2: FUNCIONÁRIOS ---
  doc.addPage();
  addHeader('Ecossistema de Pessoas');
  y = 50;
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFontSize(18);
  doc.text('2. Gestão de Funcionários', 15, y);
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  const empDesc = [
    'O Prontuário Digital elimina o uso de arquivos físicos e garante que os dados estejam sempre atualizados e seguros.',
    '',
    '• Cadastro completo com histórico de cargos e salários.',
    '• Gestão de dependentes e benefícios.',
    '• Anexos de documentos com busca inteligente.',
    '• Fluxo de admissão e desligamento simplificado.'
  ];
  doc.text(empDesc, 15, y);
  
  y += 50;
  doc.rect(20, y, 170, 90);
  doc.text('[ GESTÃO DE COLABORADORES E PRONTUÁRIOS ]', 105, y + 45, { align: 'center' });
  addFooter(2);

  // --- PÁG 3: PONTO ELETRÔNICO ---
  doc.addPage();
  addHeader('Controle de Jornada');
  y = 50;
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFontSize(18);
  doc.text('3. Ponto Eletrônico Biométrico', 15, y);
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  const pointDesc = [
    'Segurança jurídica e precisão no controle de horas. O sistema utiliza as tecnologias mais modernas do mercado.',
    '',
    '• Reconhecimento Facial: Evita fraudes na batida do ponto.',
    '• Geolocalização (GPS): Monitora onde o ponto foi registrado.',
    '• Espelho de Ponto: Fechamento de mês em poucos minutos.',
    '• App para Colaborador: Transparência total para a equipe.'
  ];
  doc.text(pointDesc, 15, y);
  
  y += 50;
  doc.rect(20, y, 170, 90);
  doc.text('[ MONITORAMENTO DE PONTO EM TEMPO REAL ]', 105, y + 45, { align: 'center' });
  addFooter(3);

  // --- PÁG 4: ARQUIVO E SAÚDE ---
  doc.addPage();
  addHeader('GED e Saúde Ocupacional');
  y = 50;
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFontSize(18);
  doc.text('4. Arquivo Digital e Atestados', 15, y);
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  const healthDesc = [
    'Organização total de documentos e controle de absenteísmo médico.',
    '',
    '• Repositório Cloud: Documentos criptografados e acessíveis.',
    '• Gestão de Atestados: Controle de CID e dias de afastamento.',
    '• Integração com Folha: Atestados lançados refletem no ponto.',
    '• Notificações: Nunca mais perca o prazo de um exame periódico.'
  ];
  doc.text(healthDesc, 15, y);
  
  y += 50;
  doc.rect(20, y, 170, 90);
  doc.text('[ ARQUIVO DIGITAL E GESTÃO MÉDICA ]', 105, y + 45, { align: 'center' });
  addFooter(4);

  // --- PÁG FINAL ---
  doc.addPage();
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, 210, 297, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('CyberTech RH', 105, 100, { align: 'center' });
  doc.setFontSize(12);
  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.text('Transforme seu RH em uma unidade estratégica.', 105, 110, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text('Entre em contato para agendar uma demonstração guiada.', 105, 150, { align: 'center' });

  downloadPdf(doc, `Guia_Demonstracao_CyberTech_${clientName.replace(/\s+/g, '_')}.pdf`);
};
