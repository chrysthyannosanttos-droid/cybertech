const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ewttnazwsobmylxkrtoh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3dHRuYXp3c29ibXlseGtydG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDQxMTYsImV4cCI6MjA4OTc4MDExNn0.a3Hdss4f41SYKmUkVtvUPMKqeFxjE5cz2FU4HImkcEc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearAllPayrolls() {
  console.log('🗑️ Iniciando limpeza total de holerites...');

  // 1. Deletar registros do banco
  const { error: dbError } = await supabase
    .from('payrolls')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta todos

  if (dbError) {
    console.error('❌ Erro ao limpar banco:', dbError.message);
  } else {
    console.log('✅ Banco de dados limpo!');
  }

  // 2. Listar e deletar arquivos do storage (opcional, mas recomendado)
  // Nota: A limpeza de storage em massa via API é mais complexa, 
  // mas o banco limpo já impedirá que os holerites antigos apareçam na UI.
  
  console.log('🏁 Limpeza concluída! Agora você pode gerar novos holerites.');
}

clearAllPayrolls();
