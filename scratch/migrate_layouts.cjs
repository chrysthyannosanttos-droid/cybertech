const { createClient } = require('@supabase/supabase-js');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

const supabaseUrl = 'https://ewttnazwsobmylxkrtoh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3dHRuYXp3c29ibXlseGtydG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDQxMTYsImV4cCI6MjA4OTc4MDExNn0.a3Hdss4f41SYKmUkVtvUPMKqeFxjE5cz2FU4HImkcEc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateAll() {
  console.log('🚀 Iniciando migração para o novo layout contábil detalhado...');

  // Busca dados incluindo o objeto branding do tenant para checar whitelabel
  const { data: payrolls, error: pError } = await supabase
    .from('payrolls')
    .select('*, employees(*), tenants(branding)');
  
  if (pError) return console.error('Erro ao buscar payrolls:', pError);

  for (const p of payrolls) {
    try {
      console.log(`Convertendo: ${p.employees?.name} (${p.reference_month}/${p.reference_year})`);
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;
      const tableWidth = pageWidth - (margin * 2);
      
      doc.setLineWidth(0.2);
      doc.setDrawColor(0);
      doc.setTextColor(0);
      
      // --- CABEÇALHO CONTÁBIL ---
      doc.rect(margin, 10, tableWidth, 25);
      doc.line(margin + (tableWidth * 0.4), 10, margin + (tableWidth * 0.4), 35);
      doc.line(margin + (tableWidth * 0.75), 10, margin + (tableWidth * 0.75), 35);
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(p.employees?.store_name?.toUpperCase() || 'EMPRESA CLIENTE', margin + 2, 16);
      
      doc.setFontSize(14);
      doc.text("HOLERITE", margin + (tableWidth * 0.57), 22, { align: 'center' });
      
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("Competência:", margin + (tableWidth * 0.77), 16);
      doc.setFont("helvetica", "bold");
      doc.text(`${p.reference_month}/${p.reference_year}`, margin + tableWidth - 2, 16, { align: 'right' });

      // --- DADOS DO FUNCIONÁRIO ---
      doc.rect(margin, 35, tableWidth, 20);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("NOME DO FUNCIONÁRIO:", margin + 2, 40);
      doc.setFont("helvetica", "bold");
      doc.text(p.employees?.name?.toUpperCase() || '-', margin + 35, 40);
      
      doc.setFont("helvetica", "normal");
      doc.text("CARGO:", margin + 2, 48);
      doc.text(p.employees?.role?.toUpperCase() || 'GERAL', margin + 35, 48);

      // --- TABELA DE PROVENTOS E DESCONTOS ---
      const tableStartY = 60;
      const colWidth = (tableWidth / 2) - 1;
      
      // Grades da tabela
      doc.rect(margin, tableStartY, colWidth, 100); // Proventos
      doc.rect(margin + colWidth + 2, tableStartY, colWidth, 100); // Descontos
      
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, tableStartY, colWidth, 8, 'F');
      doc.rect(margin + colWidth + 2, tableStartY, colWidth, 8, 'F');
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("DESCRIÇÃO / PROVENTOS", margin + (colWidth / 2), tableStartY + 5.5, { align: 'center' });
      doc.text("DESCRIÇÃO / DESCONTOS", margin + colWidth + 2 + (colWidth / 2), tableStartY + 5.5, { align: 'center' });

      // Itens (Simulados conforme o padrão)
      doc.setFont("helvetica", "normal");
      let lineY = tableStartY + 15;
      
      // Proventos
      doc.text("SALÁRIO BASE", margin + 2, lineY);
      doc.text(p.gross_salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), margin + colWidth - 2, lineY, { align: 'right' });
      
      // Descontos
      doc.text("INSS", margin + colWidth + 4, lineY);
      doc.text(p.inss_deduction.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), margin + tableWidth - 2, lineY, { align: 'right' });
      
      lineY += 6;
      if (p.irrf_deduction > 0) {
        doc.text("IRRF", margin + colWidth + 4, lineY);
        doc.text(p.irrf_deduction.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), margin + tableWidth - 2, lineY, { align: 'right' });
      }

      // --- TOTALIZADORES ---
      const totalY = 160;
      doc.rect(margin, totalY, tableWidth, 20);
      doc.line(margin + (tableWidth * 0.6), totalY, margin + (tableWidth * 0.6), totalY + 20);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("VALOR LÍQUIDO A RECEBER:", margin + 2, totalY + 12);
      doc.setFontSize(14);
      doc.text(`R$ ${p.net_salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + tableWidth - 5, totalY + 13, { align: 'right' });

      // --- BRANDING CONDICIONAL (BASEADO NO OBJETO BRANDING) ---
      const isWhiteLabel = p.tenants?.branding?.is_whitelabel === true;
      if (!isWhiteLabel) {
        doc.setFontSize(6);
        doc.setTextColor(180);
        doc.setFont("helvetica", "italic");
        doc.text("Documento processado via CyberTech RH Hub - www.cybertech.com.br", margin, 290);
      }

      const pdfBuffer = doc.output('arraybuffer');
      const fileName = `holerite_${p.reference_month}_${p.reference_year}.pdf`;
      const filePath = `${p.tenant_id}/payrolls/${p.employee_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, pdfBuffer, { 
        contentType: 'application/pdf', 
        upsert: true 
      });

      if (uploadError) throw uploadError;

      console.log(`✅ Sucesso: ${p.employees?.name}`);
    } catch (err) {
      console.error(`❌ Erro em ${p.employees?.name}:`, err.message);
    }
  }
  console.log('🏁 Migração de layouts concluída com sucesso!');
}

migrateAll();
