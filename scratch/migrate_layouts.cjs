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
      const margin = 12;
      const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      
      doc.setLineWidth(0.1);
      doc.setDrawColor(0);
      doc.setTextColor(0);
      
      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(p.employees?.name?.toUpperCase() || 'EMPRESA', margin, margin + 5);
      doc.setFontSize(10);
      doc.text("RECIBO DE PAGAMENTO DE SALÁRIO", pageWidth - margin, margin + 5, { align: 'right' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`REFERÊNCIA: ${p.reference_month}/${p.reference_year}`, pageWidth - margin, margin + 10, { align: 'right' });
      doc.line(margin, margin + 18, pageWidth - margin, margin + 18);

      // Tabela Simplificada para Histórico
      doc.autoTable({
        startY: margin + 25,
        head: [['Cód.', 'Descrição das Verbas', 'Ref.', 'Vencimentos', 'Descontos']],
        body: [
          ['001', 'SALÁRIO BASE', '30.00', p.gross_salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), ''],
          ['900', 'INSS', '-', '', p.inss_deduction.toLocaleString('pt-BR', { minimumFractionDigits: 2 })],
          ['910', 'IRRF', '-', '', p.irrf_deduction.toLocaleString('pt-BR', { minimumFractionDigits: 2 })]
        ],
        theme: 'plain',
        headStyles: { fontStyle: 'bold', fontSize: 8, textColor: 0, lineWidth: 0.1, fillColor: [255, 255, 255] },
        styles: { fontSize: 8, cellPadding: 2, font: 'helvetica' },
        didDrawCell: (data) => {
          if (data.section === 'body') {
            doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
            doc.line(data.cell.x + data.cell.width, data.cell.y, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
          }
        }
      });

      const finalY = doc.lastAutoTable.finalY + 10;
      doc.rect(pageWidth - 85, finalY, 85 - margin, 12);
      doc.setFont("helvetica", "bold");
      doc.text(`VALOR LÍQUIDO: R$ ${p.net_salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - margin - 2, finalY + 8, { align: 'right' });

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
