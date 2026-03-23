const url = 'https://ewttnazwsobmylxkrtoh.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3dHRuYXp3c29ibXlseGtydG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDQxMTYsImV4cCI6MjA4OTc4MDExNn0.a3Hdss4f41SYKmUkVtvUPMKqeFxjE5cz2FU4HImkcEc';

async function test() {
  console.log('--- TESTE DE PERSISTÊNCIA VIA FETCH ---');
  const cpf = '888.888.888-88';
  
  // 1. Inserir
  console.log('Inserindo...');
  const resInsert = await fetch(`${url}/rest/v1/employees`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ name: 'TESTE PERSISTENCIA', cpf: cpf, status: 'ACTIVE', tenant_id: 't1' })
  });

  const dataInsert = await resInsert.json();
  if (!resInsert.ok) {
    console.error('Erro na inserção:', dataInsert);
    return;
  }
  const id = dataInsert[0].id;
  console.log('Inserido com sucesso, ID:', id);

  // 2. Deletar
  console.log('Deletando...');
  const resDelete = await fetch(`${url}/rest/v1/employees?id=eq.${id}`, {
    method: 'DELETE',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });

  if (!resDelete.ok) {
    console.error('Erro na deleção');
    return;
  }
  console.log('Deleção enviada com sucesso.');

  // 3. Verificar
  console.log('Verificando...');
  const resVerify = await fetch(`${url}/rest/v1/employees?id=eq.${id}`, {
    method: 'GET',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const dataVerify = await resVerify.json();
  
  if (dataVerify.length > 0) {
    console.error('FALHA: O registro não foi removido permanentemente.');
  } else {
    console.log('SUCESSO: O registro foi removido e não está mais no banco.');
  }
}

test();
