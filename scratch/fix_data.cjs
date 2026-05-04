const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCristiano() {
  console.log('Atualizando data de nascimento de CRISTIANO BENTO DOS SANTOS...');
  
  const { data, error } = await supabase
    .from('employees')
    .update({ birth_date: '1998-10-10' })
    .eq('cpf', '111.221.804-11');

  if (error) {
    console.error('Erro ao atualizar:', error.message);
    return;
  }

  console.log('✅ Sucesso! Agora você pode tentar a validação novamente com a data 10/10/1998.');
}

fixCristiano();
