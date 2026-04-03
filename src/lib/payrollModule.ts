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
  
  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text('RECIBO DE PAGAMENTO DE SALÁRIO', 14, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Referência: ${month.toString().padStart(2, '0')}/${year}`, 14, 28);
  
  // Empregador Info (Simulado)
  doc.setLineWidth(0.5);
  doc.rect(14, 32, 182, 16);
  doc.setFont("helvetica", "bold");
  doc.text('Empregador:', 16, 38);
  doc.setFont("helvetica", "normal");
  doc.text(employee.storeName || 'Empresa Padrão', 42, 38);
  
  // Funcioário Info
  doc.rect(14, 50, 182, 22);
  doc.setFont("helvetica", "bold");
  doc.text('Código:', 16, 56); doc.setFont("helvetica", "normal"); doc.text(employee.id.substring(0, 8), 35, 56);
  doc.setFont("helvetica", "bold");
  doc.text('Nome:', 16, 62); doc.setFont("helvetica", "normal"); doc.text(employee.name, 30, 62);
  doc.setFont("helvetica", "bold");
  doc.text('Cargo:', 16, 68); doc.setFont("helvetica", "normal"); doc.text(employee.role || 'Não informado', 30, 68);
  doc.setFont("helvetica", "bold");
  doc.text('Admissão:', 130, 62); doc.setFont("helvetica", "normal"); 
  doc.text(new Date(employee.admissionDate || new Date()).toLocaleDateString('pt-BR'), 152, 62);

  // Tabela de Vencimentos e Descontos
  const bodyData = payroll.items.map(item => {
    let provento = ''; let desconto = '';
    if (item.type === 'EARNING') provento = item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    if (item.type === 'DEDUCTION') desconto = item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    
    return [
      item.code.toString(),
      item.description,
      item.reference || '-',
      provento,
      desconto
    ];
  });

  autoTable(doc, {
    startY: 75,
    head: [['Cód.', 'Descrição', 'Ref.', 'Proventos', 'Descontos']],
    body: bodyData,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [20, 20, 20] },
    columnStyles: {
      0: { cellWidth: 15 },
      2: { cellWidth: 20 },
      3: { halign: 'right' },
      4: { halign: 'right' }
    }
  });

  // Totais
  const finalY = (doc as any).lastAutoTable.finalY || 150;
  
  doc.rect(14, finalY + 5, 182, 20);
  const totalProv = payroll.items.filter(i => i.type === 'EARNING').reduce((a,b) => a + b.amount, 0);
  const totalDesc = payroll.items.filter(i => i.type === 'DEDUCTION').reduce((a,b) => a + b.amount, 0);
  
  doc.setFont("helvetica", "bold");
  doc.text('Total Vencimentos:', 16, finalY + 12); 
  doc.setFont("helvetica", "normal");
  doc.text('R$ ' + totalProv.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 50, finalY + 12);
  
  doc.setFont("helvetica", "bold");
  doc.text('Total Descontos:', 110, finalY + 12); 
  doc.setFont("helvetica", "normal");
  doc.text('R$ ' + totalDesc.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 140, finalY + 12);
  
  doc.setFont("helvetica", "bold");
  doc.text('Valor Líquido ===>', 14, finalY + 20);
  doc.setFontSize(12);
  doc.text('R$ ' + payroll.netSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 50, finalY + 20);
  
  // Rodapé (Bases)
  doc.setFontSize(8);
  doc.rect(14, finalY + 30, 182, 15);
  doc.setFont("helvetica", "bold");
  doc.text('Salário Base', 16, finalY + 35); doc.setFont("helvetica", "normal"); doc.text(payroll.baseSalary.toLocaleString('pt-BR'), 16, finalY + 40);
  doc.setFont("helvetica", "bold");
  doc.text('Base INSS', 55, finalY + 35); doc.setFont("helvetica", "normal"); doc.text(payroll.grossSalary.toLocaleString('pt-BR'), 55, finalY + 40);
  doc.setFont("helvetica", "bold");
  doc.text('Base FGTS', 95, finalY + 35); doc.setFont("helvetica", "normal"); doc.text(payroll.grossSalary.toLocaleString('pt-BR'), 95, finalY + 40);
  doc.setFont("helvetica", "bold");
  doc.text('FGTS Mês', 135, finalY + 35); doc.setFont("helvetica", "normal"); doc.text(payroll.fgts.toLocaleString('pt-BR'), 135, finalY + 40);
  doc.setFont("helvetica", "bold");
  doc.text('Base IRRF', 170, finalY + 35); doc.setFont("helvetica", "normal"); doc.text((payroll.grossSalary - payroll.inss).toLocaleString('pt-BR'), 170, finalY + 40);

  // Buffer
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

  if (uploadError) throw new Error(`Falha no upload do holerite: ${uploadError.message}`);

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

  if (dbError) throw new Error(`Falha ao salvar registro no BD: ${dbError.message}`);

  return urlData.publicUrl;
}

// =======================
// GERAÇÃO EM LOTE
// =======================
export async function processBatch({ tenantId, employees, payrollData, referenceMonth, referenceYear }: ProcessBatchInput) {
  const results = [];
  const errors = [];

  for (const item of payrollData) {
    const emp = employees.find(e => e.id === item.employeeId);
    if (!emp) continue;

    try {
      // 1. Gera PDF do Holerite no Front
      const pdfBlob = await generatePayslipBlob(emp, item.payrollResult, referenceMonth, referenceYear);
      
      // 2. Salva e Faz Upload
      const pdfUrl = await uploadAndSavePayroll(tenantId, emp, item.payrollResult, pdfBlob, referenceMonth, referenceYear);

      results.push({ employeeId: emp.id, status: 'success', pdfUrl });
    } catch (e: any) {
      errors.push({ employeeName: emp.name, error: e.message });
    }
  }

  return { results, errors };
}

// =======================
// MOCK EMAIL AUTOMÁTICO (PLUGÁVEL NO FUTURO)
// =======================
export async function sendPayslipEmailMock(employeeName: string, employeeEmail: string, pdfUrl: string) {
  // Isso será substituído por uma Edge Function da Vercel/Supabase
  console.log(`[EMAIL DISPARADO] Para: ${employeeEmail} (Holerite: ${pdfUrl})`);
  return new Promise(resolve => setTimeout(resolve, 800)); // Simulando latência da rede
}
