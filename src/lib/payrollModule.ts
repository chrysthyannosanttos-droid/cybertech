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
// GERAÇÃO DE HOLERITE (PDF FRONTEND)
// =======================
export async function generatePayslipBlob(
  employee: Employee,
  payroll: PayrollResult,
  month: number,
  year: number
): Promise<Blob> {
  const doc = new jsPDF();
  const primaryColor = [22, 22, 22];
  const accentColor = [0, 102, 204];
  const lightGrey = [245, 245, 245];

  // --- Marca d'água ---
  doc.setTextColor(230, 230, 230);
  doc.setFontSize(50);
  doc.setFont("helvetica", "bold");
  doc.text('ORIGINAL - CYBERTECH RH', 105, 160, { 
    angle: 45, 
    align: 'center'
  });


  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.1);
  doc.rect(10, 10, 190, 277);

  doc.setFillColor(...primaryColor);
  doc.rect(10, 10, 190, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text('RECIBO DE PAGAMENTO', 14, 22);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`REFERÊNCIA: ${month.toString().padStart(2, '0')}/${year}`, 140, 20);
  doc.text(`DATA DE EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}`, 140, 25);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text('EMPREGADOR', 14, 42);
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.5);
  doc.line(14, 44, 40, 44);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(employee.storeName || 'CyberTech RH - Unidade Principal', 14, 52);
  doc.setFontSize(9);
  doc.text('CNPJ: 00.000.000/0001-00', 14, 57);
  
  doc.setFillColor(...lightGrey);
  doc.rect(110, 40, 85, 25, 'F');
  doc.setFont("helvetica", "bold");
  doc.text('COLABORADOR', 114, 46);
  doc.setFont("helvetica", "normal");
  doc.text(`NOME: ${employee.name}`, 114, 52);
  doc.text(`CARGO: ${employee.role || 'Colaborador'}`, 114, 57);
  doc.text(`ID: ${employee.id.substring(0, 8).toUpperCase()}`, 114, 62);

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
    startY: 75,
    head: [['CÓD', 'DESCRIÇÃO DA VERBA', 'REF', 'VENCIMENTOS', 'DESCONTOS']],
    body: bodyData,
    theme: 'striped',
    styles: { 
      fontSize: 8, 
      cellPadding: 3,
      font: 'helvetica'
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
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 35 },
      4: { halign: 'right', cellWidth: 35 }
    },
    margin: { left: 14, right: 14 }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 150;
  const totalProv = payroll.items.filter(i => i.type === 'EARNING').reduce((a,b) => a + b.amount, 0);
  const totalDesc = payroll.items.filter(i => i.type === 'DEDUCTION').reduce((a,b) => a + b.amount, 0);

  doc.setDrawColor(230, 230, 230);
  doc.line(14, finalY + 5, 196, finalY + 5);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text('TOTAL VENCIMENTOS', 100, finalY + 12);
  doc.setFont("helvetica", "normal");
  doc.text('R$ ' + totalProv.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 140, finalY + 12, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text('TOTAL DESCONTOS', 100, finalY + 18);
  doc.setFont("helvetica", "normal");
  doc.text('R$ ' + totalDesc.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 140, finalY + 18, { align: 'right' });

  doc.setFillColor(...accentColor);
  doc.rect(145, finalY + 5, 51, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('VALOR LÍQUIDO A RECEBER', 150, finalY + 11);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text('R$ ' + payroll.netSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 150, finalY + 19);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  const baseBoxY = finalY + 30;
  
  doc.setFillColor(240, 240, 240);
  doc.rect(14, baseBoxY, 182, 12, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.text('SALÁRIO BASE', 16, baseBoxY + 5);
  doc.text('BASE INSS', 55, baseBoxY + 5);
  doc.text('BASE FGTS', 95, baseBoxY + 5);
  doc.text('FGTS MÊS', 135, baseBoxY + 5);
  doc.text('BASE IRRF', 170, baseBoxY + 5);

  doc.setFont("helvetica", "normal");
  doc.text('R$ ' + payroll.baseSalary.toLocaleString('pt-BR'), 16, baseBoxY + 10);
  doc.text('R$ ' + payroll.grossSalary.toLocaleString('pt-BR'), 55, baseBoxY + 10);
  doc.text('R$ ' + payroll.grossSalary.toLocaleString('pt-BR'), 95, baseBoxY + 10);
  doc.text('R$ ' + payroll.fgts.toLocaleString('pt-BR'), 135, baseBoxY + 10);
  doc.text('R$ ' + (payroll.grossSalary - payroll.inss).toLocaleString('pt-BR'), 170, baseBoxY + 10);

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE RECIBO.', 14, baseBoxY + 30);
  
  doc.setDrawColor(0, 0, 0);
  doc.line(100, baseBoxY + 55, 180, baseBoxY + 55);
  doc.text('ASSINATURA DO COLABORADOR', 120, baseBoxY + 60);

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
  // 1. Upload to Supabase Storage (Buckets need to exist)
  const ext = 'pdf';
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

  // 2. Insert into DB
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
    // 1. Busca configurações
    const [{ data: emailSettings }, { data: waSettings }] = await Promise.all([
      supabase.from('tenant_email_settings').select('*').eq('tenant_id', tenantId).maybeSingle(),
      supabase.from('tenant_whatsapp_settings').select('*').eq('tenant_id', tenantId).maybeSingle()
    ]);

    const monthStr = month.toString().padStart(2, '0');

    // 2. Disparo E-mail (VIA EDGE FUNCTION REAL)
    if (emailSettings?.auto_send_payroll && employee.email) {
      console.log(`[AUTO-EMAIL] Disparando para ${employee.email}...`);
      
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
      } else {
        console.error('Erro ao disparar e-mail via Edge Function:', fError);
      }
    }

    // 3. Disparo WhatsApp (API REAL)
    if (waSettings?.auto_send_payroll && waSettings.api_type !== 'none' && employee.phone) {
      const cleanPhone = employee.phone.replace(/\D/g, '');
      const message = `Olá ${employee.name}, seu holerite de ${monthStr}/${year} já está disponível: ${pdfUrl}`;
      
      console.log(`[AUTO-WHATSAPP] Enviando via ${waSettings.api_type} para ${cleanPhone}...`);

      if (waSettings.api_type === 'evolution') {
        // Exemplo de integração Evolution API
        await fetch(`${waSettings.base_url}/message/sendText/${waSettings.instance_id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': waSettings.token },
          body: JSON.stringify({ number: cleanPhone, text: message })
        }).catch(err => console.error('Erro Evolution API:', err));
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
      // 1. Gera PDF do Holerite no Front
      const pdfBlob = await generatePayslipBlob(emp, item.payrollResult, referenceMonth, referenceYear);
      
      // 2. Salva e Faz Upload
      const pdfUrl = await uploadAndSavePayroll(tenantId, emp, item.payrollResult, pdfBlob, referenceMonth, referenceYear);

      results.push({ employeeId: emp.id, status: 'success', pdfUrl });
      
      // 3. Disparo Automático (Se configurado)
      await triggerAutoCommunications(tenantId, emp, pdfUrl, referenceMonth, referenceYear);

    } catch (e: any) {
      console.error(`Error processing ${emp.name}:`, e);
      errors.push({ employeeName: emp.name, error: e.message || 'Erro desconhecido' });
    }
  }

  return { results, errors };
}
