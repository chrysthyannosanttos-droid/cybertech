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
export async function generatePayslipBlob(employee: any, result: any, month: number, year: number): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  
  // Cores Modernas (Fintech Style)
  const primaryColor = [37, 99, 235]; // Azul Principal
  const secondaryColor = [100, 116, 139]; // Cinza Slate
  const textColor = [15, 23, 42]; // Preto Slate
  
  // --- HEADER (MODERNO) ---
  doc.setFillColor(15, 23, 42); // Fundo Escuro para Header
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(employee.storeName?.toUpperCase() || 'CYBERTECH RH SOLUTIONS', margin, 20);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("RECIBO DE PAGAMENTO DE SALÁRIO", margin, 28);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`${monthNames[month - 1].toUpperCase()} / ${year}`, pageWidth - margin, 25, { align: 'right' });

  // --- EMPLOYEE CARD ---
  const cardY = 55;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, cardY, pageWidth - (margin * 2), 22, 3, 3, 'F');
  
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("COLABORADOR", margin + 5, cardY + 7);
  doc.text("FUNÇÃO / CBO", margin + 100, cardY + 7);
  
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(10);
  doc.text(employee.name.toUpperCase(), margin + 5, cardY + 15);
  doc.text(`${employee.role?.toUpperCase() || 'COLABORADOR'} / ${employee.cbo || '0000-00'}`, margin + 100, cardY + 15);

  // --- ITEMS TABLE ---
  const bodyData = result.items.map((item: any) => [
    item.code.toString().padStart(3, '0'),
    item.description.toUpperCase(),
    item.reference || '-',
    item.type === 'EARNING' ? `R$ ${item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
    item.type === 'DEDUCTION' ? `R$ ${item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''
  ]);

  autoTable(doc, {
    startY: cardY + 30,
    head: [['CÓD', 'DESCRIÇÃO', 'REFERÊNCIA', 'VENCIMENTOS', 'DESCONTOS']],
    body: bodyData,
    theme: 'plain',
    headStyles: { 
      fillColor: [241, 245, 249], 
      textColor: [71, 85, 105], 
      fontSize: 7, 
      fontStyle: 'bold',
      cellPadding: 4 
    },
    styles: { 
      fontSize: 8, 
      cellPadding: 4, 
      textColor: [30, 41, 59],
      font: 'helvetica' 
    },
    columnStyles: {
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // --- NET SALARY CARD (DESTACADO) ---
  const netWidth = 70;
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(pageWidth - margin - netWidth, finalY, netWidth, 25, 3, 3, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("VALOR LÍQUIDO A RECEBER", pageWidth - margin - netWidth + 5, finalY + 8);
  
  doc.setFontSize(14);
  doc.text(`R$ ${result.netSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - margin - 5, finalY + 18, { align: 'right' });

  // --- BASES (RODAPÉ TÉCNICO) ---
  const footerY = pageHeight - 60;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  
  const colWidth = (pageWidth - (margin * 2)) / 5;
  const bases = [
    { label: 'SALÁRIO BASE', val: result.baseSalary },
    { label: 'BASE INSS', val: result.grossSalary },
    { label: 'BASE FGTS', val: result.grossSalary },
    { label: 'FGTS MÊS', val: result.fgts },
    { label: 'BASE IRRF', val: result.grossSalary - (result.inss || 0) }
  ];

  bases.forEach((b, i) => {
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(b.label, margin + (i * colWidth), footerY + 10);
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(`R$ ${b.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + (i * colWidth), footerY + 18);
  });

  // --- SIGNATURE AREA ---
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text("DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE RECIBO.", margin, pageHeight - 30);
  
  doc.setDrawColor(37, 99, 235);
  doc.line(margin, pageHeight - 20, margin + 80, pageHeight - 20);
  doc.text("ASSINATURA DO COLABORADOR", margin, pageHeight - 15);
  doc.text(`DATA: ____/____/________`, pageWidth - margin, pageHeight - 15, { align: 'right' });

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
      
      // triggerAutoCommunications removido a pedido do usuário para garantir controle manual
      // await triggerAutoCommunications(tenantId, emp, pdfUrl, referenceMonth, referenceYear);

    } catch (e: any) {
      console.error(`Error processing ${emp.name}:`, e);
      errors.push({ employeeName: emp.name, error: e.message || 'Erro desconhecido' });
    }
  }

  return { results, errors };
}
