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
      const tableWidth = pageWidth - 35;
      
      // Desenha o modelo clássico simplificado para migração
      doc.rect(10, 10, tableWidth, 277);
      doc.rect(pageWidth - 20, 10, 10, 277);
      doc.setFont("helvetica", "bold");
      doc.text(p.employees?.store_name || 'CyberTech RH', 12, 16);
      doc.text('RECIBO DE PAGAMENTO', tableWidth - 15, 16, { align: 'right' });
      doc.text(`${p.reference_month}/${p.reference_year}`, tableWidth - 15, 23, { align: 'right' });

      doc.autoTable({
        startY: 40,
        head: [['Cód', 'Descrição', 'Ref', 'Vencimentos', 'Descontos']],
        body: [
          ['001', 'SALARIO BASE', '30 d', p.gross_salary.toFixed(2), ''],
          ['900', 'INSS', '11%', '', p.inss_deduction.toFixed(2)],
          ['910', 'IRRF', '-', '', p.irrf_deduction.toFixed(2)]
        ],
        theme: 'grid',
        tableWidth: tableWidth
      });

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
