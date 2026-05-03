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
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  
  // Design: Classic Premium (Grey Borders & Professional Typography)
  const borderColor = [180, 180, 180];
  const darkTextColor = [30, 41, 59];
  const tableWidth = pageWidth - 42;

  doc.setLineWidth(0.1);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);

  // --- 1. CANHOTO VERTICAL (DIREITA) ---
  doc.rect(pageWidth - 22, 10, 12, 277);
  doc.setFontSize(6.5);
  doc.setTextColor(100);
  doc.text("DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE RECIBO.", pageWidth - 16, 20, { angle: 270 });
  
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(pageWidth - 17, 260, pageWidth - 17, 140);
  doc.text("ASSINATURA DO FUNCIONÁRIO", pageWidth - 19, 160, { angle: 270 });
  doc.text("DATA: ____/____/________", pageWidth - 19, 275, { angle: 270 });

  // --- 2. CABEÇALHO EMPREGADOR ---
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.rect(10, 10, tableWidth, 24);
  
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("EMPREGADOR", 12, 13);
  
  doc.setFontSize(11);
  doc.text(employee.storeName?.toUpperCase() || 'CYBERTECH SOLUCOES RH', 15, 19);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("CNPJ: 00.000.000/0000-00", 15, 24);
  doc.text("ENDEREÇO OPERACIONAL COMPLETO DA UNIDADE", 15, 28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Recibo de Pagamento de Salário", tableWidth - 5, 18, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Referente ao Mês/Ano: ${month.toString().padStart(2, '0')}/${year}`, tableWidth - 5, 26, { align: 'right' });

  // --- 3. DADOS DO FUNCIONÁRIO ---
  doc.rect(10, 34, tableWidth, 14);
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("CÓDIGO", 12, 38);
  doc.text("NOME DO FUNCIONÁRIO", 32, 38);
  doc.text("CBO", 125, 38);
  doc.text("FUNÇÃO", 145, 38);

  doc.setFontSize(9);
  doc.text(employee.id.substring(0, 6).toUpperCase(), 12, 44);
  doc.text(employee.name.toUpperCase(), 32, 44);
  doc.text(employee.cbo || '0000-00', 125, 44);
  doc.text(employee.role?.toUpperCase() || 'COLABORADOR', 145, 44);

  // --- 4. TABELA DE VERBAS ---
  const bodyData = result.items.map((item: any) => [
    item.code.toString().padStart(3, '0'),
    item.description.toUpperCase(),
    item.reference || '-',
    item.type === 'EARNING' ? item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',
    item.type === 'DEDUCTION' ? item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''
  ]);

  autoTable(doc, {
    startY: 48,
    head: [['Cód.', 'Descrição das Verbas', 'Referência', 'Proventos', 'Descontos']],
    body: bodyData,
    theme: 'plain',
    headStyles: { 
      fontSize: 7.5, 
      fontStyle: 'bold', 
      textColor: darkTextColor, 
      lineWidth: 0.1, 
      lineColor: borderColor, 
      fillColor: [248, 250, 252],
      halign: 'center'
    },
    styles: { 
      fontSize: 8, 
      cellPadding: 2.5, 
      textColor: [50, 50, 50], 
      font: 'helvetica',
      lineWidth: 0.1,
      lineColor: borderColor
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { halign: 'left' },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 32 }
    },
    margin: { left: 10, right: 32 },
    tableWidth: tableWidth
  });

  const finalY = (doc as any).lastAutoTable.finalY || 150;
  const footerStart = 250;

  // Linhas verticais de fechamento
  doc.line(10, finalY, 10, footerStart);
  doc.line(22, finalY, 22, footerStart);
  doc.line(tableWidth - 89, finalY, tableWidth - 89, footerStart);
  doc.line(tableWidth - 64, finalY, tableWidth - 64, footerStart);
  doc.line(tableWidth - 32, finalY, tableWidth - 32, footerStart);
  doc.line(tableWidth + 10, finalY, tableWidth + 10, footerStart);

  // --- 5. TOTAIS E LÍQUIDO ---
  doc.rect(10, footerStart, tableWidth, 18);
  doc.line(tableWidth - 64, footerStart, tableWidth - 64, footerStart + 18);
  doc.line(tableWidth - 32, footerStart, tableWidth - 32, footerStart + 18);
  
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("MENSAGENS", 12, footerStart + 4);
  doc.text("TOTAL VENCIMENTOS", tableWidth - 62, footerStart + 6);
  doc.text("TOTAL DESCONTOS", tableWidth - 30, footerStart + 6);

  const totalProv = result.items.filter(i => i.type === 'EARNING').reduce((a, b) => a + b.amount, 0);
  const totalDesc = result.items.filter(i => i.type === 'DEDUCTION').reduce((a, b) => a + b.amount, 0);

  doc.setFontSize(9);
  doc.text(totalProv.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), tableWidth - 35, footerStart + 13, { align: 'right' });
  doc.text(totalDesc.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), tableWidth + 7, footerStart + 13, { align: 'right' });

  // Bloco Valor Líquido
  doc.setFillColor(248, 250, 252);
  doc.rect(tableWidth - 64, footerStart + 18, 74, 14, 'FD');
  doc.setFontSize(8);
  doc.text("LÍQUIDO A RECEBER ->", tableWidth - 61, footerStart + 27);
  doc.setFontSize(12);
  doc.text(`R$ ${result.netSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, tableWidth + 7, footerStart + 28, { align: 'right' });

  // --- 6. BASES DE CÁLCULO (RODAPÉ) ---
  const baseLineY = 278;
  doc.line(10, baseLineY, tableWidth + 10, baseLineY);
  const colW = tableWidth / 6;
  const labels = ["Salário Base", "Base Calc. INSS", "Base Calc. FGTS", "FGTS do Mês", "Base Calc. IRRF", "Faixa IRRF"];
  const vals = [result.baseSalary, result.grossSalary, result.grossSalary, result.fgts, result.grossSalary - (result.inss || 0), "0"];

  labels.forEach((l, i) => {
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text(l.toUpperCase(), 12 + (i * colW), baseLineY + 5);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const v = typeof vals[i] === 'number' ? vals[i].toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : vals[i];
    doc.text(v, 12 + (i * colW), baseLineY + 12);
    if (i > 0) doc.line(10 + (i * colW), baseLineY, 10 + (i * colW), baseLineY + 16);
  });

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("1ª VIA - EMPREGADOR", 10, 290);
  doc.text("CyberTech RH Hub - Excelência em Gestão", pageWidth - 32, 290, { align: 'right' });

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
