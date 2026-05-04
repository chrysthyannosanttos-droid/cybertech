const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addDeviceInfoColumn() {
  console.log('Tentando adicionar a coluna device_info à tabela time_entries...');
  
  // Como não podemos rodar ALTER TABLE diretamente via cliente JS do Supabase sem uma função RPC,
  // Vou verificar se a coluna existe primeiro.
  // Note: Se falhar, o ideal é rodar via SQL Editor no Supabase, mas vou tentar via RPC se houver.
  
  // Na ausência de RPC para migrações, vou instruir o usuário ou tentar uma estratégia alternativa.
  // Mas espera, eu posso tentar fazer um insert pra ver se falha mesmo (confirmar o erro).
  
  console.log('Executando comando SQL para adicionar a coluna...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: 'ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS device_info JSONB;'
  });

  if (error) {
    if (error.message.includes('function exec_sql() does not exist')) {
      console.error('\n⚠️ A função "exec_sql" não existe no Supabase.');
      console.log('Por favor, execute o seguinte comando no SQL Editor do seu painel Supabase:');
      console.log('\nALTER TABLE time_entries ADD COLUMN IF NOT EXISTS device_info JSONB;\n');
    } else {
      console.error('Erro ao executar SQL:', error.message);
    }
    return;
  }

  console.log('✅ Coluna device_info adicionada com sucesso!');
}

addDeviceInfoColumn();
