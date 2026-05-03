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
// GERAÇÃO DE HOLERITE (PDF FRONTEND - REDESIGN)
// =======================
export async function generatePayslipBlob(
  employee: Employee,
  payroll: PayrollResult,
  month: number,
  year: number
): Promise<Blob> {
  const doc = new jsPDF();
  
  // Cores da Marca
  const primaryColor = [30, 41, 59]; // Slate 800
  const accentColor = [31, 180, 243]; // CyberTech Blue
  const secondaryColor = [71, 85, 105]; // Slate 600
  const lightBg = [248, 250, 252]; // Slate 50
  const borderColor = [226, 232, 240]; // Slate 200

  // Margens e Dimensões
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // --- Marca d'água Sutil ---
  doc.setTextColor(248, 248, 248);
  doc.setFontSize(45);
  doc.setFont("helvetica", "bold");
  doc.text('ORIGINAL - CYBERTECH RH', 105, 160, { 
    angle: 45, 
    align: 'center'
  });

  // --- FUNDO E BORDA EXTERNA ---
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.1);
  doc.rect(10, 10, pageWidth - 20, 277);

  // --- CABEÇALHO (BANNER) ---
  doc.setFillColor(...primaryColor);
  doc.rect(10, 10, pageWidth - 20, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text('RECIBO DE PAGAMENTO DE SALÁRIO', 16, 22);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`REFERÊNCIA`, pageWidth - 50, 19);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`${month.toString().padStart(2, '0')}/${year}`, pageWidth - 50, 25);

  // --- BLOCOS DE INFO (EMPREGADOR / COLABORADOR) ---
  doc.setTextColor(...primaryColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text('FONTE PAGADORA (EMPREGADOR)', 16, 45);
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.5);
  doc.line(16, 47, 40, 47);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(employee.storeName || 'CyberTech RH - Unidade Principal', 16, 55);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...secondaryColor);
  doc.text('CNPJ: 00.000.000/0001-00', 16, 60);

  // Colaborador (Box)
  doc.setFillColor(...lightBg);
  doc.roundedRect(110, 42, 85, 28, 2, 2, 'F');
  doc.setDrawColor(...borderColor);
  doc.rect(110, 42, 85, 28);
  
  doc.setTextColor(...primaryColor);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text('COLABORADOR', 114, 48);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.text(`NOME: ${employee.name.toUpperCase()}`, 114, 55);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`CARGO: ${employee.role || 'Colaborador'}`, 114, 61);
  doc.text(`CÓDIGO: ${employee.id.substring(0, 8).toUpperCase()}`, 114, 66);

  // --- TABELA DE VERBAS ---
  const bodyData = payroll.items.map(item => {
    let provento = ''; let desconto = '';
    if (item.type === 'EARNING') provento = 'R$ ' + item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    if (item.type === 'DEDUCTION') desconto = 'R$ ' + item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    
    return [
      item.code.toString().padStart(3, '0'),
      item.description.toUpperCase(),
      item.reference || '-',
      provento,
      desconto
    ];
  });

  autoTable(doc, {
    startY: 80,
    head: [['CÓD', 'DESCRIÇÃO DA VERBA', 'REFERÊNCIA', 'VENCIMENTOS', 'DESCONTOS']],
    body: bodyData,
    theme: 'grid',
    styles: { 
      fontSize: 7.5, 
      cellPadding: 2.5,
      font: 'helvetica',
      lineColor: [240, 240, 240]
    },
    headStyles: { 
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'left' },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 35 },
      4: { halign: 'right', cellWidth: 35 }
    },
    margin: { left: 16, right: 16 }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 150;
  const totalProv = payroll.items.filter(i => i.type === 'EARNING').reduce((a,b) => a + b.amount, 0);
  const totalDesc = payroll.items.filter(i => i.type === 'DEDUCTION').reduce((a,b) => a + b.amount, 0);

  // --- SEÇÃO DE TOTAIS ---
  const totalBoxY = finalY + 12;
  
  doc.setFontSize(8);
  doc.setTextColor(...secondaryColor);
  doc.setFont("helvetica", "bold");
  doc.text('TOTAL DE VENCIMENTOS', 100, totalBoxY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0,0,0);
  doc.text('R$ ' + totalProv.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 140, totalBoxY, { align: 'right' });

  doc.setFontSize(8);
  doc.setTextColor(...secondaryColor);
  doc.setFont("helvetica", "bold");
  doc.text('TOTAL DE DESCONTOS', 100, totalBoxY + 7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0,0,0);
  doc.text('R$ ' + totalDesc.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 140, totalBoxY + 7, { align: 'right' });

  // Valor Líquido (Destaque)
  doc.setFillColor(...accentColor);
  doc.roundedRect(145, totalBoxY - 8, 51, 20, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text('VALOR LÍQUIDO A RECEBER', 149, totalBoxY - 2);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text('R$ ' + payroll.netSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 149, totalBoxY + 8);

  // --- RODAPÉ DE BASES ---
  const footerY = totalBoxY + 25;
  doc.setFillColor(...lightBg);
  doc.rect(16, footerY, 180, 15, 'F');
  doc.setDrawColor(...borderColor);
  doc.rect(16, footerY, 180, 15);
  
  const colWidth = 180 / 5;
  const bases = [
    { label: 'SALÁRIO BASE', val: payroll.baseSalary },
    { label: 'BASE INSS', val: payroll.grossSalary },
    { label: 'BASE FGTS', val: payroll.grossSalary },
    { label: 'FGTS MÊS', val: payroll.fgts },
    { label: 'BASE IRRF', val: payroll.grossSalary - payroll.inss }
  ];

  bases.forEach((b, i) => {
    doc.setFontSize(6);
    doc.setTextColor(...secondaryColor);
    doc.setFont("helvetica", "bold");
    doc.text(b.label, 16 + (i * colWidth) + 3, footerY + 5);
    doc.setFontSize(8);
    doc.setTextColor(0,0,0);
    doc.text('R$ ' + b.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 16 + (i * colWidth) + 3, footerY + 11);
    if (i < 4) {
      doc.setDrawColor(...borderColor);
      doc.line(16 + ((i+1) * colWidth), footerY, 16 + ((i+1) * colWidth), footerY + 15);
    }
  });

  // --- MENSAGEM E ASSINATURA ---
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "normal");
  doc.text('Declaro ter recebido a importância líquida discriminada neste recibo, conferida e achada conforme.', 16, footerY + 25);
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(100, footerY + 50, 190, footerY + 50);
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('ASSINATURA DO COLABORADOR', 125, footerY + 55);
  doc.text(new Date().toLocaleDateString('pt-BR'), 16, footerY + 55);

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
