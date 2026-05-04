const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchCristiano() {
  console.log('Buscando por CRISTIANO no banco...');
  
  const { data, error } = await supabase
    .from('employees')
    .select('name, cpf, birth_date')
    .ilike('name', '%CRISTIANO%');

  if (error) {
    console.error('Erro:', error.message);
    return;
  }

  if (data.length === 0) {
    console.log('Nenhum CRISTIANO encontrado.');
    return;
  }

  console.log('\nEncontrado(s):');
  console.table(data);
}

searchCristiano();
