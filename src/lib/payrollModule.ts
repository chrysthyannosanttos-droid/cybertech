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
export async function generatePayslipBlob(employee: any, result: any, month: number, year: number, tenantInfo?: any): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const tableWidth = pageWidth - (margin * 2);
  
  doc.setLineWidth(0.2);
  doc.setDrawColor(0);
  doc.setTextColor(0);
  
  // --- 1. CABEÇALHO (TRIPLO) ---
  doc.rect(margin, 10, tableWidth, 25);
  doc.line(margin + (tableWidth * 0.35), 10, margin + (tableWidth * 0.35), 35);
  doc.line(margin + (tableWidth * 0.75), 10, margin + (tableWidth * 0.75), 35);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(employee.storeName?.toUpperCase() || 'EMPRESA EXEMPLO LTDA', margin + 2, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`CNPJ: ${employee.cnpj || '00.000.000/0001-90'}`, margin + 2, 20);
  doc.text(`Endereço: ${employee.address || 'Rua das Inovações, 123 - Centro'}`, margin + 2, 24);
  doc.text(`${employee.city || 'São Paulo'} / ${employee.state || 'SP'} - CEP: ${employee.zip || '01000-000'}`, margin + 2, 28);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("HOLERITE", margin + (tableWidth * 0.55), 20, { align: 'center' });
  doc.setFontSize(8);
  doc.text("RECIBO DE PAGAMENTO DE SALÁRIO", margin + (tableWidth * 0.55), 26, { align: 'center' });

  doc.setFontSize(7);
  doc.text("Competência:", margin + (tableWidth * 0.76), 15);
  doc.setFontSize(9);
  doc.text(`${month.toString().padStart(2, '0')}/${year}`, margin + (tableWidth * 0.98), 15, { align: 'right' });
  doc.setFontSize(7);
  doc.text("Pagamento:", margin + (tableWidth * 0.76), 25);
  doc.setFontSize(9);
  doc.text(`31/${month.toString().padStart(2, '0')}/${year}`, margin + (tableWidth * 0.98), 25, { align: 'right' });

  // --- 2. DADOS DO COLABORADOR ---
  doc.rect(margin, 35, tableWidth, 30);
  doc.line(margin, 50, margin + tableWidth, 50);
  doc.line(margin + (tableWidth * 0.6), 35, margin + (tableWidth * 0.6), 65);

  doc.setFontSize(7);
  doc.text("Código:", margin + 2, 40);
  doc.text("Nome do Colaborador:", margin + 2, 45);
  doc.text("CPF:", margin + 2, 55);
  doc.text("Cargo:", margin + 2, 60);
  doc.text("Departamento:", margin + 2, 64);

  doc.setFont("helvetica", "bold");
  doc.text(employee.id.substring(0, 6).toUpperCase(), margin + 35, 40);
  doc.text(employee.name.toUpperCase(), margin + 35, 45);
  doc.text(employee.cpf || '000.000.000-00', margin + 35, 55);
  doc.text(employee.role?.toUpperCase() || 'ANALISTA', margin + 35, 60);
  doc.text(employee.department?.toUpperCase() || 'GERAL', margin + 35, 64);

  doc.setFont("helvetica", "normal");
  doc.text("Admissão:", margin + (tableWidth * 0.6) + 2, 40);
  doc.text("Tipo de Contrato:", margin + (tableWidth * 0.6) + 2, 45);
  doc.text("Banco / Agência:", margin + (tableWidth * 0.6) + 2, 55);
  doc.text("Conta:", margin + (tableWidth * 0.6) + 2, 60);
  doc.text("PIS:", margin + (tableWidth * 0.6) + 2, 64);

  doc.setFont("helvetica", "bold");
  doc.text(employee.admissionDate || '01/01/2024', margin + (tableWidth * 0.85), 40);
  doc.text("CLT", margin + (tableWidth * 0.85), 45);
  doc.text("ITAU / 0001", margin + (tableWidth * 0.85), 55);
  doc.text("00000-0", margin + (tableWidth * 0.85), 60);
  doc.text(employee.pis || '000.00000.00-0', margin + (tableWidth * 0.85), 64);

  // --- 3. TABELAS DE VENCIMENTOS E DESCONTOS ---
  const tableStartY = 70;
  const tableHeight = 110;
  const splitX = margin + (tableWidth / 2);

  doc.rect(margin, tableStartY, tableWidth / 2 - 2, tableHeight);
  doc.rect(splitX + 2, tableStartY, tableWidth / 2 - 2, tableHeight);

  doc.setFillColor(245, 245, 245);
  doc.rect(margin, tableStartY, tableWidth / 2 - 2, 10, 'F');
  doc.rect(splitX + 2, tableStartY, tableWidth / 2 - 2, 10, 'F');
  doc.rect(margin, tableStartY, tableWidth / 2 - 2, 10);
  doc.rect(splitX + 2, tableStartY, tableWidth / 2 - 2, 10);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("VENCIMENTOS", margin + (tableWidth / 4) - 1, tableStartY + 7, { align: 'center' });
  doc.text("DESCONTOS", splitX + (tableWidth / 4) + 1, tableStartY + 7, { align: 'center' });

  const subHeadY = tableStartY + 10;
  doc.setFontSize(7);
  doc.line(margin, subHeadY + 5, margin + (tableWidth / 2 - 2), subHeadY + 5);
  doc.line(splitX + 2, subHeadY + 5, margin + tableWidth, subHeadY + 5);
  
  doc.text("Cód.", margin + 2, subHeadY + 4);
  doc.text("Descrição", margin + 12, subHeadY + 4);
  doc.text("Ref.", margin + (tableWidth / 2) - 35, subHeadY + 4);
  doc.text("Valor", margin + (tableWidth / 2) - 10, subHeadY + 4);

  doc.text("Cód.", splitX + 4, subHeadY + 4);
  doc.text("Descrição", splitX + 14, subHeadY + 4);
  doc.text("Ref.", margin + tableWidth - 35, subHeadY + 4);
  doc.text("Valor", margin + tableWidth - 10, subHeadY + 4);

  let earningsY = subHeadY + 10;
  let deductionsY = subHeadY + 10;
  doc.setFont("helvetica", "normal");

  result.items.forEach((item: any) => {
    const isEarning = item.type === 'EARNING';
    const currentY = isEarning ? earningsY : deductionsY;
    const startX = isEarning ? margin : splitX + 2;
    const endX = isEarning ? margin + (tableWidth / 2 - 2) : margin + tableWidth;

    if (currentY < tableStartY + tableHeight - 15) {
      doc.text(item.code.toString().padStart(3, '0'), startX + 2, currentY);
      doc.text(item.description.toUpperCase().substring(0, 25), startX + 12, currentY);
      doc.text(item.reference?.toString() || '-', endX - 25, currentY, { align: 'right' });
      doc.text(item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), endX - 5, currentY, { align: 'right' });
      if (isEarning) earningsY += 5; else deductionsY += 5;
    }
  });

  const footerY = tableStartY + tableHeight - 8;
  doc.line(margin, footerY, margin + (tableWidth / 2 - 2), footerY);
  doc.line(splitX + 2, footerY, margin + tableWidth, footerY);
  
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL VENCIMENTOS", margin + 2, footerY + 5);
  doc.text("TOTAL DESCONTOS", splitX + 4, footerY + 5);
  
  const totalProv = result.items.filter((i: any) => i.type === 'EARNING').reduce((a: any, b: any) => a + b.amount, 0);
  const totalDesc = result.items.filter((i: any) => i.type === 'DEDUCTION').reduce((a: any, b: any) => a + b.amount, 0);
  
  doc.text(`R$ ${totalProv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + (tableWidth / 2) - 5, footerY + 5, { align: 'right' });
  doc.text(`R$ ${totalDesc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + tableWidth - 5, footerY + 5, { align: 'right' });

  // --- 4. RESUMO ---
  const summaryY = tableStartY + tableHeight + 5;
  const summaryW = tableWidth / 4;
  doc.rect(margin, summaryY, tableWidth, 15);
  [1, 2, 3].forEach(i => doc.line(margin + (summaryW * i), summaryY, margin + (summaryW * i), summaryY + 15));

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("SALÁRIO BASE", margin + 2, summaryY + 4);
  doc.text("TOTAL VENCIMENTOS", margin + summaryW + 2, summaryY + 4);
  doc.text("TOTAL DESCONTOS", margin + (summaryW * 2) + 2, summaryY + 4);
  doc.text("VALOR LÍQUIDO", margin + (summaryW * 3) + 2, summaryY + 4);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`R$ ${result.baseSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 2, summaryY + 11);
  doc.text(`R$ ${totalProv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + summaryW + 2, summaryY + 11);
  doc.text(`R$ ${totalDesc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + (summaryW * 2) + 2, summaryY + 11);
  doc.setFontSize(10);
  doc.text(`R$ ${result.netSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + (summaryW * 3) + 2, summaryY + 11);

  // --- 5. BASES ---
  const bottomY = summaryY + 20;
  doc.rect(margin, bottomY, tableWidth * 0.6, 45);
  doc.line(margin, bottomY + 8, margin + (tableWidth * 0.6), bottomY + 8);
  doc.setFontSize(8);
  doc.text("BASES DE CÁLCULO", margin + 2, bottomY + 6);
  
  const bases = [
    ["INSS", result.grossSalary, "11%", result.inss],
    ["IRRF", result.grossSalary - result.inss, "15%", result.irrf],
    ["FGTS", result.grossSalary, "8%", result.fgts]
  ];

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("Descrição", margin + 2, bottomY + 13);
  doc.text("Base (R$)", margin + 30, bottomY + 13);
  doc.text("Alíquota", margin + 55, bottomY + 13);
  doc.text("Valor (R$)", margin + 85, bottomY + 13);

  bases.forEach((b, i) => {
    const y = bottomY + 20 + (i * 6);
    doc.text(b[0].toString(), margin + 2, y);
    doc.text(b[1].toLocaleString('pt-BR', { minimumFractionDigits: 2 }), margin + 30, y);
    doc.text(b[2].toString(), margin + 55, y);
    doc.text(b[3].toLocaleString('pt-BR', { minimumFractionDigits: 2 }), margin + 85, y);
  });

  // --- 6. INFO ADICIONAL ---
  const sideX = margin + (tableWidth * 0.62);
  doc.rect(sideX, bottomY, tableWidth * 0.38, 45);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("INFORMAÇÕES ADICIONAIS", sideX + 2, bottomY + 6);
  doc.line(sideX, bottomY + 8, margin + tableWidth, bottomY + 8);

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  const infos = [
    ["Salário Base:", `R$ ${result.baseSalary.toLocaleString('pt-BR')}`],
    ["Horas Mensais:", "220:00"],
    ["Dias Trabalhados:", "30"],
    ["Faltas:", "0"]
  ];
  infos.forEach((info, i) => {
    doc.text(info[0], sideX + 2, bottomY + 15 + (i * 6));
    doc.text(info[1], margin + tableWidth - 5, bottomY + 15 + (i * 6), { align: 'right' });
  });

  // --- 7. ASSINATURA ---
  const signY = 275;
  doc.line(margin, signY, margin + (tableWidth * 0.6), signY);
  doc.setFontSize(7);
  doc.text("DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE RECIBO.", margin, signY - 5);
  doc.text("ASSINATURA DO COLABORADOR", margin + (tableWidth * 0.3), signY + 5, { align: 'center' });
  doc.text("DATA: ____ / ____ / ________", margin + (tableWidth * 0.8), signY);

  // --- 8. BRANDING ---
  if (!tenantInfo?.is_whitelabel) {
    doc.setFontSize(6);
    doc.setTextColor(150);
    doc.text("CyberTech RH Hub - Soluções Inteligentes em RH", margin, 292);
  }

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

  // Buscar informações do tenant para branding (White-Label)
  const { data: tenantInfo } = await supabase
    .from('tenants')
    .select('is_whitelabel')
    .eq('id', tenantId)
    .maybeSingle();

  for (let i = 0; i < total; i++) {
    const item = payrollData[i];
    const emp = employees.find(e => e.id === item.employeeId);
    
    if (onProgress) onProgress(i + 1, total);
    
    if (!emp) {
      errors.push({ employeeName: 'Desconhecido', error: 'Funcionário não encontrado no banco' });
      continue;
    }

    try {
      const pdfBlob = await generatePayslipBlob(emp, item.payrollResult, referenceMonth, referenceYear, tenantInfo);
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
