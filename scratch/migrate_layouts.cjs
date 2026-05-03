const { createClient } = require('@supabase/supabase-js');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const supabaseUrl = 'https://ewttnazwsobmylxkrtoh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3dHRuYXp3c29ibXlseGtydG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDQxMTYsImV4cCI6MjA4OTc4MDExNn0.a3Hdss4f41SYKmUkVtvUPMKqeFxjE5cz2FU4HImkcEc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateAll() {
  console.log('🚀 Reiniciando migração de layout...');

  const { data: payrolls, error: pError } = await supabase.from('payrolls').select('*, employees(*)');
  if (pError) return console.error(pError);

  for (const p of payrolls) {
    try {
      console.log(`Convertendo: ${p.employees?.name}`);
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const tableWidth = pageWidth - 40;
      
      doc.setLineWidth(0.3);
      doc.setDrawColor(0);
      doc.setTextColor(0);
      
      // Canhoto Vertical
      doc.rect(pageWidth - 25, 10, 15, 277);
      doc.setFontSize(7);
      doc.text("DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE RECIBO.", pageWidth - 16, 20, { angle: 270 });
      doc.line(pageWidth - 18, 260, pageWidth - 18, 140);

      // Header
      doc.rect(10, 10, tableWidth, 25);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(p.employees?.name?.toUpperCase() || 'EMPRESA', 15, 20);
      doc.setFontSize(12);
      doc.text("Recibo de Pagamento de Salário", tableWidth - 5, 18, { align: 'right' });

      // Dados
      doc.rect(10, 35, tableWidth, 15);
      doc.setFontSize(9);
      doc.text(p.employees?.name?.toUpperCase() || '-', 35, 46);

      // Tabela
      doc.autoTable({
        startY: 50,
        head: [['Cód.', 'Descrição', 'Referência', 'Proventos', 'Descontos']],
        body: [
          ['001', 'SALÁRIO BASE', '30.00', p.gross_salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), ''],
          ['900', 'INSS', '-', '', p.inss_deduction.toLocaleString('pt-BR', { minimumFractionDigits: 2 })],
          ['910', 'IRRF', '-', '', p.irrf_deduction.toLocaleString('pt-BR', { minimumFractionDigits: 2 })]
        ],
        theme: 'grid',
        headStyles: { fontStyle: 'bold', fontSize: 8, textColor: 0, lineWidth: 0.2, fillColor: [255, 255, 255] },
        styles: { fontSize: 8, cellPadding: 2, font: 'helvetica', lineWidth: 0.2, lineColor: 0 }
      });

      const finalY = doc.lastAutoTable.finalY + 10;
      doc.rect(tableWidth - 60, finalY, 70, 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`LÍQUIDO A RECEBER: R$ ${p.net_salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, tableWidth + 8, finalY + 9, { align: 'right' });

      const pdfBuffer = doc.output('arraybuffer');
      const fileName = `holerite_${p.reference_month}_${p.reference_year}.pdf`;
      const filePath = `${p.tenant_id}/payrolls/${p.employee_id}/${fileName}`;

      await supabase.storage.from('documents').upload(filePath, pdfBuffer, { 
        contentType: 'application/pdf', 
        upsert: true 
      });

      console.log(`✅ Sucesso: ${p.employees?.name}`);
    } catch (err) {
      console.error(`❌ Erro em ${p.employees?.name}:`, err.message);
    }
  }
  console.log('🏁 Migração concluída!');
}

migrateAll();
