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
  
  // Design: Padrão Contabilidade Raiz (Grades Pretas e Bordas Definidas)
  doc.setLineWidth(0.3);
  doc.setDrawColor(0);
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");

  const tableWidth = pageWidth - 40; // Espaço para o canhoto vertical

  // --- 1. CANHOTO VERTICAL (DIREITA) ---
  doc.rect(pageWidth - 25, 10, 15, 277);
  doc.setFontSize(7);
  doc.text("DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE RECIBO.", pageWidth - 16, 20, { angle: 270 });
  doc.line(pageWidth - 18, 260, pageWidth - 18, 140); // Linha de assinatura
  doc.setFont("helvetica", "bold");
  doc.text("ASSINATURA DO FUNCIONÁRIO", pageWidth - 20, 160, { angle: 270 });
  doc.setFont("helvetica", "normal");
  doc.text("____/____/________", pageWidth - 18, 275, { angle: 270 });
  doc.text("DATA", pageWidth - 21, 280, { angle: 270 });

  // --- 2. CABEÇALHO EMPREGADOR ---
  doc.rect(10, 10, tableWidth, 25);
  doc.setFontSize(7);
  doc.text("EMPREGADOR", 12, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(employee.storeName?.toUpperCase() || 'EMPRESA CLIENTE LTDA', 15, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Endereço: RUA EXEMPLO, 123 - CENTRO`, 15, 26);
  doc.text(`CNPJ: 00.000.000/0000-00`, 15, 31);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Recibo de Pagamento de Salário", tableWidth - 5, 18, { align: 'right' });
  doc.setFontSize(8);
  doc.text(`Referente ao Mês / Ano: ${month}/${year}`, tableWidth - 5, 25, { align: 'right' });

  // --- 3. DADOS DO FUNCIONÁRIO ---
  doc.rect(10, 35, tableWidth, 15);
  doc.setFontSize(7);
  doc.text("CÓDIGO", 12, 39);
  doc.text("NOME DO FUNCIONÁRIO", 35, 39);
  doc.text("CBO", 125, 39);
  doc.text("FUNÇÃO", 145, 39);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(employee.id.substring(0, 6).toUpperCase(), 12, 46);
  doc.text(employee.name.toUpperCase(), 35, 46);
  doc.text(employee.cbo || '0000-00', 125, 46);
  doc.text(employee.role?.toUpperCase() || 'VENDEDOR(A)', 145, 46);

  // --- 4. TABELA DE VERBAS ---
  const bodyData = result.items.map((item: any) => [
    item.code.toString().padStart(3, '0'),
    item.description.toUpperCase(),
    item.reference || '-',
    item.type === 'EARNING' ? item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',
    item.type === 'DEDUCTION' ? item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''
  ]);

  autoTable(doc, {
    startY: 50,
    head: [['Cód.', 'Descrição', 'Referência', 'Proventos', 'Descontos']],
    body: bodyData,
    theme: 'grid',
    headStyles: { 
      fontSize: 8, 
      fontStyle: 'bold', 
      textColor: 0, 
      lineWidth: 0.2, 
      lineColor: 0, 
      fillColor: [255, 255, 255],
      halign: 'center'
    },
    styles: { 
      fontSize: 8, 
      cellPadding: 2, 
      textColor: 0, 
      font: 'helvetica',
      lineWidth: 0.2,
      lineColor: 0
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'left' },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 30 }
    },
    margin: { left: 10, right: 30 },
    tableWidth: tableWidth
  });

  const finalY = (doc as any).lastAutoTable.finalY || 150;
  const footerStart = 255;

  // Linhas verticais para fechar a grade até o rodapé
  doc.rect(10, finalY, tableWidth, footerStart - finalY);
  doc.line(25, finalY, 25, footerStart); // Coluna Cód
  doc.line(tableWidth - 85, finalY, tableWidth - 85, footerStart); // Coluna Ref
  doc.line(tableWidth - 60, finalY, tableWidth - 60, footerStart); // Coluna Prov
  doc.line(tableWidth - 30, finalY, tableWidth - 30, footerStart); // Coluna Desc

  // --- 5. TOTAIS E MENSAGENS ---
  doc.rect(10, footerStart, tableWidth, 15);
  doc.line(tableWidth - 60, footerStart, tableWidth - 60, footerStart + 15);
  doc.line(tableWidth - 30, footerStart, tableWidth - 30, footerStart + 15);
  
  doc.setFontSize(7);
  doc.text("MENSAGENS", 12, footerStart + 4);
  doc.text("Total dos Vencimentos", tableWidth - 58, footerStart + 5);
  doc.text("Total dos Descontos", tableWidth - 28, footerStart + 5);

  const totalProv = result.items.filter(i => i.type === 'EARNING').reduce((a, b) => a + b.amount, 0);
  const totalDesc = result.items.filter(i => i.type === 'DEDUCTION').reduce((a, b) => a + b.amount, 0);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(totalProv.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), tableWidth - 32, footerStart + 12, { align: 'right' });
  doc.text(totalDesc.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), tableWidth + 8, footerStart + 12, { align: 'right' });

  // Bloco Líquido
  doc.rect(tableWidth - 60, footerStart + 15, 70, 12);
  doc.setFontSize(8);
  doc.text("Líquido a Receber ->", tableWidth - 58, footerStart + 23);
  doc.setFontSize(11);
  doc.text(result.netSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), tableWidth + 8, footerStart + 24, { align: 'right' });

  // --- 6. BASES (RODAPÉ) ---
  const baseLineY = 282;
  doc.line(10, baseLineY, tableWidth + 10, baseLineY);
  const colW = tableWidth / 6;
  const labels = ["Salário Base", "Base Cálc. INSS", "Base Cálc. FGTS", "FGTS do Mês", "Base Cálc. IRRF", "Faixa IRRF"];
  const vals = [result.baseSalary, result.grossSalary, result.grossSalary, result.fgts, result.grossSalary - (result.inss || 0), "0"];

  labels.forEach((l, i) => {
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(l.toUpperCase(), 12 + (i * colW), baseLineY + 4);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const v = typeof vals[i] === 'number' ? vals[i].toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : vals[i];
    doc.text(v, 12 + (i * colW), baseLineY + 11);
    if (i > 0) doc.line(10 + (i * colW), baseLineY, 10 + (i * colW), baseLineY + 15);
  });

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("1ª VIA - EMPREGADOR", 10, 290);

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
