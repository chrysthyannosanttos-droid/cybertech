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
// GERAÇÃO DE HOLERITE (MODELO PADRÃO BRASILEIRO)
// =======================
export async function generatePayslipBlob(
  employee: Employee,
  payroll: PayrollResult,
  month: number,
  year: number
): Promise<Blob> {
  const doc = new jsPDF();
  const primaryColor = [0, 0, 0];
  const lightGrey = [240, 240, 240];
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- Borda Externa ---
  doc.setDrawColor(0);
  doc.setLineWidth(0.1);
  doc.rect(10, 10, pageWidth - 20, 277);

  // --- CABEÇALHO ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text('RECIBO DE PAGAMENTO DE SALÁRIO', 14, 20);
  
  doc.setFontSize(9);
  doc.text(`REFERÊNCIA: ${month.toString().padStart(2, '0')}/${year}`, pageWidth - 50, 18);
  doc.setFont("helvetica", "normal");
  doc.text(`EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - 50, 23);

  // --- EMPREGADOR ---
  doc.line(10, 30, pageWidth - 10, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text('EMPREGADOR', 14, 35);
  doc.setFontSize(10);
  doc.text(employee.storeName || 'CyberTech RH - Unidade Principal', 14, 42);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text('CNPJ: 00.000.000/0001-00', 14, 47);

  // --- COLABORADOR ---
  doc.line(10, 52, pageWidth - 10, 52);
  doc.setFont("helvetica", "bold");
  doc.text('COLABORADOR', 14, 57);
  doc.setFontSize(10);
  doc.text(`${employee.id.substring(0, 8).toUpperCase()} - ${employee.name.toUpperCase()}`, 14, 64);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`CARGO: ${employee.role || 'Colaborador'}`, 14, 69);

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
    startY: 75,
    head: [['CÓD', 'DESCRIÇÃO DA VERBA', 'REF', 'VENCIMENTOS', 'DESCONTOS']],
    body: bodyData,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, font: 'helvetica' },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'left' },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 35 },
      4: { halign: 'right', cellWidth: 35 }
    },
    margin: { left: 10, right: 10 }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 150;
  const totalProv = payroll.items.filter(i => i.type === 'EARNING').reduce((a,b) => a + b.amount, 0);
  const totalDesc = payroll.items.filter(i => i.type === 'DEDUCTION').reduce((a,b) => a + b.amount, 0);

  // --- TOTAIS ---
  doc.line(10, finalY + 5, pageWidth - 10, finalY + 5);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text('TOTAL DE VENCIMENTOS', 100, finalY + 12);
  doc.text('TOTAL DE DESCONTOS', 100, finalY + 18);
  
  doc.setFont("helvetica", "normal");
  doc.text(totalProv.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 155, finalY + 12, { align: 'right' });
  doc.text(totalDesc.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 195, finalY + 18, { align: 'right' });

  // Valor Líquido
  doc.setFillColor(...lightGrey);
  doc.rect(145, finalY + 25, 50, 15, 'F');
  doc.rect(145, finalY + 25, 50, 15);
  doc.setFont("helvetica", "bold");
  doc.text('LÍQUIDO A RECEBER', 147, finalY + 29);
  doc.setFontSize(12);
  doc.text('R$ ' + payroll.netSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 147, finalY + 36);

  // --- BASES ---
  const baseBoxY = finalY + 45;
  doc.setFontSize(7);
  doc.rect(10, baseBoxY, pageWidth - 20, 12);
  doc.text('SALÁRIO BASE', 12, baseBoxY + 4);
  doc.text('BASE INSS', 50, baseBoxY + 4);
  doc.text('BASE FGTS', 90, baseBoxY + 4);
  doc.text('FGTS MÊS', 130, baseBoxY + 4);
  doc.text('BASE IRRF', 170, baseBoxY + 4);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(payroll.baseSalary.toLocaleString('pt-BR'), 12, baseBoxY + 10);
  doc.text(payroll.grossSalary.toLocaleString('pt-BR'), 50, baseBoxY + 10);
  doc.text(payroll.grossSalary.toLocaleString('pt-BR'), 90, baseBoxY + 10);
  doc.text(payroll.fgts.toLocaleString('pt-BR'), 130, baseBoxY + 10);
  doc.text((payroll.grossSalary - payroll.inss).toLocaleString('pt-BR'), 170, baseBoxY + 10);

  // --- ASSINATURA ---
  doc.setFontSize(7);
  doc.text('DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE RECIBO.', 14, baseBoxY + 25);
  doc.line(100, baseBoxY + 50, 190, baseBoxY + 50);
  doc.text('ASSINATURA DO COLABORADOR', 125, baseBoxY + 55);

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
