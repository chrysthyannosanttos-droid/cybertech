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
  const margin = 12;
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  
  // Estilo Executivo (Preto e Branco / Linhas Finas)
  doc.setLineWidth(0.1);
  doc.setDrawColor(0);
  doc.setTextColor(0);
  
  // --- HEADER (DADOS DA EMPRESA) ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(employee.storeName?.toUpperCase() || 'EMPRESA EXECUTIVA LTDA', margin, margin + 5);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("CNPJ: 00.000.000/0000-00", margin, margin + 10);
  doc.text("ENDEREÇO DA UNIDADE OPERACIONAL", margin, margin + 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("RECIBO DE PAGAMENTO DE SALÁRIO", pageWidth - margin, margin + 5, { align: 'right' });
  doc.setFont("helvetica", "normal");
  doc.text(`REFERÊNCIA: ${monthNames[month - 1].toUpperCase()} / ${year}`, pageWidth - margin, margin + 10, { align: 'right' });

  doc.line(margin, margin + 18, pageWidth - margin, margin + 18);

  // --- DADOS DO FUNCIONÁRIO ---
  const dataY = margin + 25;
  doc.setFontSize(7);
  doc.text("CÓDIGO", margin, dataY);
  doc.text("NOME DO FUNCIONÁRIO", margin + 20, dataY);
  doc.text("CBO", margin + 120, dataY);
  doc.text("CARGO / FUNÇÃO", margin + 140, dataY);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(employee.id.substring(0, 8).toUpperCase(), margin, dataY + 5);
  doc.text(employee.name.toUpperCase(), margin + 20, dataY + 5);
  doc.text(employee.cbo || '0000-00', margin + 120, dataY + 5);
  doc.text(employee.role?.toUpperCase() || 'COLABORADOR', margin + 140, dataY + 5);

  doc.line(margin, dataY + 8, pageWidth - margin, dataY + 8);

  // --- TABELA DE VENCIMENTOS E DESCONTOS ---
  const bodyData = result.items.map((item: any) => [
    item.code.toString().padStart(3, '0'),
    item.description.toUpperCase(),
    item.reference || '-',
    item.type === 'EARNING' ? item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',
    item.type === 'DEDUCTION' ? item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''
  ]);

  autoTable(doc, {
    startY: dataY + 12,
    head: [['Cód.', 'Descrição das Verbas', 'Ref.', 'Vencimentos', 'Descontos']],
    body: bodyData,
    theme: 'plain',
    headStyles: { 
      fontStyle: 'bold', 
      fontSize: 8, 
      textColor: 0,
      lineWidth: 0.1,
      lineColor: 0,
      fillColor: [255, 255, 255]
    },
    styles: { 
      fontSize: 8, 
      cellPadding: 2, 
      textColor: 0,
      font: 'helvetica' 
    },
    columnStyles: {
      0: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'right', fontStyle: 'bold' }
    },
    didDrawCell: (data) => {
      // Linhas verticais discretas entre colunas
      if (data.section === 'body') {
        doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
        doc.line(data.cell.x + data.cell.width, data.cell.y, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 5;

  // --- RESUMO DE TOTAIS ---
  const totalEarning = result.items.filter(i => i.type === 'EARNING').reduce((a, b) => a + b.amount, 0);
  const totalDeduction = result.items.filter(i => i.type === 'DEDUCTION').reduce((a, b) => a + b.amount, 0);

  doc.line(margin, finalY, pageWidth - margin, finalY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL VENCIMENTOS", pageWidth - 80, finalY + 5);
  doc.text("TOTAL DESCONTOS", pageWidth - 45, finalY + 5);
  
  doc.setFont("helvetica", "normal");
  doc.text(totalEarning.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), pageWidth - 55, finalY + 10, { align: 'right' });
  doc.text(totalDeduction.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), pageWidth - margin, finalY + 10, { align: 'right' });

  // --- VALOR LÍQUIDO ---
  doc.rect(pageWidth - 85, finalY + 15, 85 - margin, 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("VALOR LÍQUIDO A RECEBER: ", pageWidth - 82, finalY + 23);
  doc.text(`R$ ${result.netSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - margin - 2, finalY + 23, { align: 'right' });

  // --- BASES DE CÁLCULO ---
  const footerY = pageHeight - 50;
  doc.line(margin, footerY, pageWidth - margin, footerY);
  const colW = (pageWidth - (margin * 2)) / 5;
  const labels = ["Salário Base", "Base INSS", "Base FGTS", "FGTS Mês", "Base IRRF"];
  const values = [result.baseSalary, result.grossSalary, result.grossSalary, result.fgts, result.grossSalary - (result.inss || 0)];

  labels.forEach((label, i) => {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(label, margin + (i * colW), footerY + 5);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`R$ ${values[i].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + (i * colW), footerY + 10);
  });

  // --- ASSINATURA ---
  doc.line(margin, pageHeight - 20, margin + 100, pageHeight - 20);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("ASSINATURA DO FUNCIONÁRIO", margin, pageHeight - 16);
  doc.text(new Date().toLocaleDateString('pt-BR'), pageWidth - margin, pageHeight - 16, { align: 'right' });

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
