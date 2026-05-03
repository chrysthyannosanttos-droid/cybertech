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

  const drawMockupBase = (y: number) => {
    // Window Frame
    doc.setFillColor(30, 35, 50);
    doc.roundedRect(20, y, 170, 90, 2, 2, 'F');
    // Inner Background
    doc.setFillColor(15, 20, 35);
    doc.rect(20, y + 5, 170, 85, 'F');
    // Sidebar
    doc.setFillColor(10, 15, 29);
    doc.rect(20, y + 5, 30, 85, 'F');
    // Logo in Sidebar
    doc.setFillColor(0, 163, 255);
    doc.circle(35, y + 15, 4, 'F');
    // Sidebar items
    doc.setFillColor(40, 45, 60);
    for (let i = 0; i < 5; i++) {
      doc.rect(25, y + 25 + (i * 8), 20, 3, 'F');
    }
    // Header
    doc.setFillColor(20, 25, 40);
    doc.rect(50, y + 5, 140, 12, 'F');
    // User avatar in header
    doc.setFillColor(40, 45, 60);
    doc.circle(180, y + 11, 3, 'F');
    doc.rect(160, y + 10, 15, 2, 'F');
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
  
  y += 50;
  drawMockupBase(y);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Dashboard Estratégico', 55, y + 22);
  
  doc.setFillColor(25, 30, 45);
  doc.roundedRect(55, y + 26, 42, 15, 1, 1, 'F');
  doc.roundedRect(100, y + 26, 42, 15, 1, 1, 'F');
  doc.roundedRect(145, y + 26, 42, 15, 1, 1, 'F');
  
  doc.setFillColor(40, 45, 60); doc.rect(58, y + 29, 20, 2, 'F'); 
  doc.setFillColor(0, 163, 255); doc.rect(58, y + 33, 15, 4, 'F');
  
  doc.setFillColor(40, 45, 60); doc.rect(103, y + 29, 20, 2, 'F'); 
  doc.setFillColor(34, 197, 94); doc.rect(103, y + 33, 15, 4, 'F');
  
  doc.setFillColor(40, 45, 60); doc.rect(148, y + 29, 20, 2, 'F'); 
  doc.setFillColor(239, 68, 68); doc.rect(148, y + 33, 15, 4, 'F');
  
  doc.setFillColor(25, 30, 45);
  doc.roundedRect(55, y + 45, 132, 40, 1, 1, 'F');
  doc.setFillColor(0, 163, 255);
  const barHeights = [10, 15, 8, 22, 18, 25, 30, 12, 16];
  barHeights.forEach((h, i) => {
    doc.rect(65 + (i * 12), y + 80, 6, -h, 'F');
  });
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
  drawMockupBase(y);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('Gestão de Colaboradores', 55, y + 22);
  
  doc.setFillColor(20, 25, 40);
  doc.rect(55, y + 26, 90, 6, 'F');
  for(let i=0; i<6; i++) {
    doc.setFillColor(25, 30, 45);
    doc.rect(55, y + 34 + (i * 8), 90, 6, 'F');
    doc.setFillColor(100, 100, 120);
    doc.circle(60, y + 37 + (i * 8), 2, 'F');
    doc.setFillColor(200, 200, 200);
    doc.rect(65, y + 36 + (i * 8), 20, 2, 'F');
    doc.setFillColor(100, 100, 120);
    doc.rect(95, y + 36 + (i * 8), 15, 2, 'F');
    doc.setFillColor(34, 197, 94);
    doc.rect(130, y + 36 + (i * 8), 10, 2, 'F');
  }
  
  doc.setFillColor(25, 30, 45);
  doc.roundedRect(148, y + 26, 39, 56, 1, 1, 'F');
  doc.setFillColor(100, 100, 120);
  doc.circle(167, y + 36, 6, 'F'); 
  doc.setFillColor(200, 200, 200);
  doc.rect(157, y + 46, 20, 3, 'F'); 
  doc.setFillColor(100, 100, 120);
  doc.rect(162, y + 51, 10, 2, 'F'); 
  doc.rect(152, y + 58, 30, 2, 'F');
  doc.rect(152, y + 62, 25, 2, 'F');
  doc.rect(152, y + 66, 28, 2, 'F');
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
  drawMockupBase(y);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('Espelho de Ponto', 55, y + 22);
  
  doc.setFillColor(25, 30, 45);
  doc.roundedRect(55, y + 26, 60, 12, 1, 1, 'F');
  doc.roundedRect(120, y + 26, 67, 12, 1, 1, 'F');
  
  doc.setFillColor(20, 25, 40);
  doc.rect(55, y + 42, 132, 6, 'F');
  for(let i=0; i<5; i++) {
    doc.setFillColor(25, 30, 45);
    doc.rect(55, y + 50 + (i * 7), 132, 5, 'F');
    doc.setFillColor(150, 150, 150);
    doc.rect(58, y + 51.5 + (i * 7), 10, 2, 'F');
    doc.setFillColor(0, 163, 255);
    doc.rect(80, y + 51.5 + (i * 7), 8, 2, 'F');
    doc.rect(95, y + 51.5 + (i * 7), 8, 2, 'F');
    doc.rect(110, y + 51.5 + (i * 7), 8, 2, 'F');
    doc.rect(125, y + 51.5 + (i * 7), 8, 2, 'F');
    doc.setFillColor(i % 3 === 0 ? 239 : 34, i % 3 === 0 ? 68 : 197, i % 3 === 0 ? 68 : 94);
    doc.rect(170, y + 51.5 + (i * 7), 12, 2, 'F');
  }
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
  drawMockupBase(y);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('Arquivo Digital', 55, y + 22);

  for(let i=0; i<4; i++) {
    doc.setFillColor(25, 30, 45);
    doc.roundedRect(55 + (i * 34), y + 28, 30, 25, 1, 1, 'F');
    doc.setFillColor(0, 163, 255);
    doc.rect(65 + (i * 34), y + 33, 10, 8, 'F');
    doc.setFillColor(150, 150, 150);
    doc.rect(60 + (i * 34), y + 46, 20, 2, 'F');
  }

  doc.setTextColor(255, 255, 255);
  doc.text('Documentos Recentes', 55, y + 62);
  for(let i=0; i<3; i++) {
    doc.setFillColor(25, 30, 45);
    doc.rect(55, y + 66 + (i * 8), 132, 6, 'F');
    doc.setFillColor(239, 68, 68); 
    doc.rect(58, y + 68 + (i * 8), 3, 3, 'F');
    doc.setFillColor(200, 200, 200);
    doc.rect(65, y + 68.5 + (i * 8), 30, 2, 'F');
    doc.setFillColor(100, 100, 100);
    doc.rect(160, y + 68.5 + (i * 8), 15, 2, 'F');
  }
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

