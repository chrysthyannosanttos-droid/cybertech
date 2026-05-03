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
      const tableWidth = pageWidth - 42;
      const borderColor = [180, 180, 180];
      
      doc.setLineWidth(0.1);
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setTextColor(30, 41, 59);
      
      // Canhoto Vertical
      doc.rect(pageWidth - 22, 10, 12, 277);
      doc.setFontSize(6.5);
      doc.text("DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE RECIBO.", pageWidth - 16, 20, { angle: 270 });
      doc.line(pageWidth - 17, 260, pageWidth - 17, 140);

      // Header
      doc.rect(10, 10, tableWidth, 24);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(p.employees?.name?.toUpperCase() || 'EMPRESA', 15, 19);
      doc.setFontSize(12);
      doc.text("Recibo de Pagamento de Salário", tableWidth - 5, 18, { align: 'right' });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Referente ao Mês/Ano: ${p.reference_month}/${p.reference_year}`, tableWidth - 5, 26, { align: 'right' });

      // Dados
      doc.rect(10, 34, tableWidth, 14);
      doc.setFontSize(9);
      doc.text(p.employees?.name?.toUpperCase() || '-', 32, 44);

      // Tabela
      doc.autoTable({
        startY: 48,
        head: [['Cód.', 'Descrição das Verbas', 'Referência', 'Proventos', 'Descontos']],
        body: [
          ['001', 'SALÁRIO BASE', '30.00', p.gross_salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), ''],
          ['900', 'INSS', '-', '', p.inss_deduction.toLocaleString('pt-BR', { minimumFractionDigits: 2 })],
          ['910', 'IRRF', '-', '', p.irrf_deduction.toLocaleString('pt-BR', { minimumFractionDigits: 2 })]
        ],
        theme: 'plain',
        headStyles: { fontStyle: 'bold', fontSize: 7.5, textColor: [30, 41, 59], lineWidth: 0.1, lineColor: borderColor, fillColor: [248, 250, 252] },
        styles: { fontSize: 8, cellPadding: 2.5, font: 'helvetica', lineWidth: 0.1, lineColor: borderColor },
        didDrawCell: (data) => {
          if (data.section === 'body') {
            doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
            doc.line(data.cell.x + data.cell.width, data.cell.y, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
          }
        }
      });

      const finalY = doc.lastAutoTable.finalY + 10;
      doc.rect(tableWidth - 64, finalY, 74, 14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`LÍQUIDO A RECEBER: R$ ${p.net_salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, tableWidth + 7, finalY + 9, { align: 'right' });

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
