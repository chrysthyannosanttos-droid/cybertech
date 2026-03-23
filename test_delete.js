import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDelete() {
  console.log('--- TESTE DE PERSISTÊNCIA DE EXCLUSÃO ---');
  
  const testCpf = '999.999.999-99';
  
  // 1. Limpar se já existir
  await supabase.from('employees').delete().eq('cpf', testCpf);
  
  // 2. Inserir funcionário de teste
  console.log('Inserindo funcionário de teste...');
  const { data: insertData, error: insertError } = await supabase
    .from('employees')
    .insert([{ 
      name: 'TESTE DELECAO', 
      cpf: testCpf, 
      status: 'ACTIVE',
      salary: 1000,
      tenant_id: 't1' // Usando t1 que parece ser o padrão de teste
    }])
    .select()
    .single();

  if (insertError) {
    console.error('Erro ao inserir:', insertError.message);
    return;
  }
  
  const id = insertData.id;
  console.log(`Funcionário inserido com ID: ${id}`);

  // 3. Excluir o funcionário
  console.log('Excluindo funcionário...');
  const { error: deleteError } = await supabase
    .from('employees')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('Erro ao excluir:', deleteError.message);
  } else {
    console.log('Exclusão solicitada com sucesso.');
  }

  // 4. Verificar se ainda existe
  console.log('Verificando se ainda existe no banco...');
  const { data: verifyData, error: verifyError } = await supabase
    .from('employees')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (verifyError) {
    console.error('Erro ao verificar:', verifyError.message);
  } else if (verifyData) {
    console.error('FALHA: O funcionário AINDA EXISTE no banco de dados!');
  } else {
    console.log('SUCESSO: O funcionário foi removido permanentemente.');
  }
}

testDelete();
