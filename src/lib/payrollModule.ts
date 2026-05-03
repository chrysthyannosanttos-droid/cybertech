import { supabase } from './supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PayrollResult } from './cltEngine';
import { Employee } from '@/types';

export interface ProcessBatchInput {
  tenantId: string;
  employees: Employee[];
  payrollData: Array<{ employeeId: string; payrollResult: PayrollResult; absences: number }>;
  referenceMonth: number;
  referenceYear: number;
  onProgress?: (current: number, total: number) => void;
}

// =======================
// UTILS
// =======================
async function ensureBucket() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some(b => b.name === 'documents');
    if (!exists) {
      try {
        await supabase.storage.createBucket('documents', { public: true, fileSizeLimit: 10485760 });
      } catch (e) {
        console.warn("Could not create bucket 'documents'. It may already exist or require higher permissions.");
      }
    }
  } catch (err: any) {
    console.error('Error ensuring bucket:', err);
  }
}

// =======================
// GERAÇÃO DE HOLERITE (MODELO CONTABILIDADE CLÁSSICO)
// =======================
export async function generatePayslipBlob(
  employee: Employee,
  payroll: PayrollResult,
  month: number,
  year: number
): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

  // Configurações Globais
  doc.setLineWidth(0.2);
  doc.setFont("helvetica", "normal");

  // --- BORDA EXTERNA E ÁREA DE ASSINATURA (CANHOTO) ---
  const tableWidth = pageWidth - 35; // Deixa 25mm para o canhoto
  doc.rect(10, 10, tableWidth, 277); // Corpo principal
  doc.rect(pageWidth - 20, 10, 10, 277); // Canhoto lateral

  // Texto Vertical no Canhoto
  doc.setFontSize(7);
  doc.text('DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE RECIBO', pageWidth - 14, 20, { angle: 270 });
  doc.line(pageWidth - 14, 270, pageWidth - 14, 150); // Linha de assinatura
  doc.text('ASSINATURA DO FUNCIONÁRIO', pageWidth - 16, 170, { angle: 270 });
  doc.text('DATA', pageWidth - 16, 280, { angle: 270 });

  // --- CABEÇALHO ---
  // Linha 1: Empresa e Título
  doc.rect(10, 10, tableWidth, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(employee.storeName?.substring(0, 40) || 'EMPRESA FICTÍCIA LTDA', 12, 16);
  doc.setFontSize(8);
  doc.text('CNPJ: 00.000.000/0000-00', 12, 22);

  doc.setFontSize(11);
  doc.text('Recibo de Pagamento de Salário', tableWidth - 15, 16, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${monthNames[month-1]} / ${year}`, tableWidth - 15, 23, { align: 'right' });

  // --- DADOS DO FUNCIONÁRIO (GRADE) ---
  doc.rect(10, 30, tableWidth, 12);
  doc.setFontSize(7);
  doc.text('Código', 12, 33);
  doc.text('Nome do Funcionário', 28, 33);
  doc.text('CBO', 110, 33);
  doc.text('Cargo', 130, 33);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(employee.id.substring(0, 6).toUpperCase(), 12, 39);
  doc.text(employee.name.toUpperCase(), 28, 39);
  doc.text('0000-00', 110, 39);
  doc.text(employee.role?.toUpperCase() || 'ANALISTA', 130, 39);

  // --- TABELA DE VERBAS ---
  const bodyData = payroll.items.map(item => {
    let provento = ''; let desconto = '';
    if (item.type === 'EARNING') provento = item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    if (item.type === 'DEDUCTION') desconto = item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    
    return [
      item.code.toString().padStart(3, '0'),
      item.description.toUpperCase(),
      item.reference || '-',
      provento,
      desconto
    ];
  });

  autoTable(doc, {
    startY: 42,
    head: [['Cód.', 'Descrição', 'Referência', 'Vencimentos', 'Descontos']],
    body: bodyData,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.5, font: 'helvetica', textColor: [0,0,0] },
    headStyles: { 
      fontStyle: 'bold', 
      halign: 'center', 
      lineWidth: 0.1, 
      lineColor: [0,0,0],
      fillColor: [255,255,255] 
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { halign: 'left' },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 30 }
    },
    margin: { left: 10, right: pageWidth - 10 - tableWidth },
    tableWidth: tableWidth,
    didDrawCell: (data) => {
      // Desenha as linhas verticais manuais para dar o efeito do modelo
      if (data.section === 'body' || data.section === 'head') {
        doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
        doc.line(data.cell.x + data.cell.width, data.cell.y, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 150;
  // Estender as linhas verticais até o rodapé se a tabela for pequena
  const tableBottomY = 250;
  doc.line(10, finalY, 10, tableBottomY);
  doc.line(22, finalY, 22, tableBottomY);
  doc.line(tableWidth - 70, finalY, tableWidth - 70, tableBottomY);
  doc.line(tableWidth - 50, finalY, tableWidth - 50, tableBottomY);
  doc.line(tableWidth - 20, finalY, tableWidth - 20, tableBottomY);
  doc.line(tableWidth + 10, finalY, tableWidth + 10, tableBottomY);

  // --- TOTAIS E VALOR LÍQUIDO ---
  const totalProv = payroll.items.filter(i => i.type === 'EARNING').reduce((a,b) => a + b.amount, 0);
  const totalDesc = payroll.items.filter(i => i.type === 'DEDUCTION').reduce((a,b) => a + b.amount, 0);

  doc.rect(10, tableBottomY, tableWidth, 18);
  doc.line(tableWidth - 70, tableBottomY, tableWidth - 70, tableBottomY + 18);
  
  doc.setFontSize(7);
  doc.text('Total de Vencimentos', tableWidth - 68, tableBottomY + 5);
  doc.text('Total de Descontos', tableWidth - 38, tableBottomY + 5);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(totalProv.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), tableWidth - 42, tableBottomY + 12, { align: 'right' });
  doc.text(totalDesc.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), tableWidth + 8, tableBottomY + 12, { align: 'right' });

  // Bloco Valor Líquido com Seta
  doc.line(tableWidth - 70, tableBottomY + 18, tableWidth + 10, tableBottomY + 18);
  doc.rect(tableWidth - 70, tableBottomY + 18, tableWidth + 80 - (tableWidth - 70), 12); // Corrigindo largura
  doc.setFontSize(7);
  doc.text('Valor Líquido', tableWidth - 68, tableBottomY + 26);
  doc.text('=>', tableWidth - 40, tableBottomY + 26);
  doc.setFontSize(11);
  doc.text(payroll.netSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), tableWidth + 8, tableBottomY + 27, { align: 'right' });

  // --- BASES (RODAPÉ TÉCNICO) ---
  const footerY = 270;
  doc.rect(10, footerY, tableWidth, 17);
  const colWidth = tableWidth / 6;
  
  const bases = [
    { label: 'Salário Base', val: payroll.baseSalary },
    { label: 'Sal. Contr. INSS', val: payroll.grossSalary },
    { label: 'Base Cálc. FGTS', val: payroll.grossSalary },
    { label: 'FGTS do Mês', val: payroll.fgts },
    { label: 'Base Cálc. IRRF', val: payroll.grossSalary - payroll.inss },
    { label: 'Faixa IRRF', val: '00' }
  ];

  bases.forEach((b, i) => {
    doc.setFontSize(6);
    doc.text(b.label, 12 + (i * colWidth), footerY + 5);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const valStr = typeof b.val === 'number' ? b.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : b.val;
    doc.text(valStr, 12 + (i * colWidth), footerY + 12);
    if (i > 0) doc.line(10 + (i * colWidth), footerY, 10 + (i * colWidth), footerY + 17);
  });

  return doc.output('blob');
}

// =======================
// PERSISTÊNCIA DA FOLHA E UPLOAD DE PDF
// =======================
async function uploadAndSavePayroll(
  tenantId: string,
  employee: Employee,
  payroll: PayrollResult,
  pdfBlob: Blob,
  month: number,
  year: number
) {
  const fileName = `holerite_${month}_${year}.pdf`;
  const filePath = `${tenantId}/payrolls/${employee.id}/${fileName}`;
  
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, pdfBlob, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    console.error(`[STORAGE ERROR] ${employee.name}:`, uploadError);
    throw new Error(`Falha no upload do holerite: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

  const { error: dbError } = await supabase
    .from('payrolls')
    .upsert({
      tenant_id: tenantId,
      employee_id: employee.id,
      reference_month: month,
      reference_year: year,
      gross_salary: payroll.grossSalary,
      net_salary: payroll.netSalary,
      inss_deduction: payroll.inss,
      irrf_deduction: payroll.irrf,
      fgts_total: payroll.fgts,
      pdf_url: urlData.publicUrl,
      status: 'GENERATED'
    }, { onConflict: 'employee_id,reference_month,reference_year' });

  if (dbError) {
    console.error(`[DATABASE ERROR] ${employee.name}:`, dbError);
    throw new Error(`Falha ao salvar registro no BD: ${dbError.message}`);
  }

  return urlData.publicUrl;
}

// =======================
// DISPARO AUTOMÁTICO (E-MAIL E WHATSAPP)
// =======================
async function triggerAutoCommunications(tenantId: string, employee: Employee, pdfUrl: string, month: number, year: number) {
  try {
    const [{ data: emailSettings }, { data: waSettings }] = await Promise.all([
      supabase.from('tenant_email_settings').select('*').eq('tenant_id', tenantId).maybeSingle(),
      supabase.from('tenant_whatsapp_settings').select('*').eq('tenant_id', tenantId).maybeSingle()
    ]);

    const monthStr = month.toString().padStart(2, '0');

    if (emailSettings?.auto_send_payroll && employee.email) {
      const { error: fError } = await supabase.functions.invoke('send-payroll-email', {
        body: {
          tenant_id: tenantId,
          employee_email: employee.email,
          employee_name: employee.name,
          pdf_url: pdfUrl,
          month: monthStr,
          year: year.toString()
        }
      });

      if (!fError) {
        await supabase.from('payrolls').update({ 
          sent_email_at: new Date().toISOString(),
          status: 'SENT' 
        }).eq('employee_id', employee.id).eq('reference_month', month).eq('reference_year', year);
      }
    }

    if (waSettings?.auto_send_payroll && waSettings.api_type !== 'none' && employee.phone) {
      const cleanPhone = employee.phone.replace(/\D/g, '');
      const message = `Olá ${employee.name}, seu holerite de ${monthStr}/${year} já está disponível: ${pdfUrl}`;
      
      if (waSettings.api_type === 'evolution') {
        await fetch(`${waSettings.base_url}/message/sendText/${waSettings.instance_id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': waSettings.token },
          body: JSON.stringify({ number: cleanPhone, text: message })
        });
      }

      await supabase.from('payrolls').update({ 
        sent_whatsapp_at: new Date().toISOString(),
        status: 'SENT' 
      }).eq('employee_id', employee.id).eq('reference_month', month).eq('reference_year', year);
    }
  } catch (err) {
    console.error('Erro no disparo automático:', err);
  }
}

// =======================
// GERAÇÃO EM LOTE
// =======================
export async function processBatch({ tenantId, employees, payrollData, referenceMonth, referenceYear, onProgress }: ProcessBatchInput) {
  const results = [];
  const errors = [];
  const total = payrollData.length;

  await ensureBucket();

  for (let i = 0; i < total; i++) {
    const item = payrollData[i];
    const emp = employees.find(e => e.id === item.employeeId);
    
    if (onProgress) onProgress(i + 1, total);
    
    if (!emp) {
      errors.push({ employeeName: 'Desconhecido', error: 'Funcionário não encontrado no banco' });
      continue;
    }

    try {
      const pdfBlob = await generatePayslipBlob(emp, item.payrollResult, referenceMonth, referenceYear);
      const pdfUrl = await uploadAndSavePayroll(tenantId, emp, item.payrollResult, pdfBlob, referenceMonth, referenceYear);
      results.push({ employeeId: emp.id, status: 'success', pdfUrl });
      await triggerAutoCommunications(tenantId, emp, pdfUrl, referenceMonth, referenceYear);

    } catch (e: any) {
      console.error(`Error processing ${emp.name}:`, e);
      errors.push({ employeeName: emp.name, error: e.message || 'Erro desconhecido' });
    }
  }

  return { results, errors };
}
