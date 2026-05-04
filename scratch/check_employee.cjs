const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontrados no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmployee() {
  const cpf = '11122180411';
  console.log(`Buscando dados para o CPF: ${cpf}...`);
  
  const { data, error } = await supabase
    .from('employees')
    .select('name, birth_date, cpf')
    .ilike('cpf', `%${cpf}%`)
    .single();

  if (error) {
    console.error('Erro ao buscar funcionário:', error.message);
    
    // Se não encontrar pelo CPF formatado, tenta listar os primeiros 5 para referência
    console.log('\nListando alguns funcionários para conferência:');
    const { data: list } = await supabase.from('employees').select('name, cpf, birth_date').limit(5);
    console.table(list);
    return;
  }

  console.log('\n✅ Funcionário encontrado:');
  console.log('Nome no Banco:', data.name);
  console.log('Data de Nascimento no Banco:', data.birth_date);
  console.log('CPF no Banco:', data.cpf);
}

checkEmployee();
