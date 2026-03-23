const url = 'https://ewttnazwsobmylxkrtoh.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3dHRuYXp3c29ibXlseGtydG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDQxMTYsImV4cCI6MjA4OTc4MDExNn0.a3Hdss4f41SYKmUkVtvUPMKqeFxjE5cz2FU4HImkcEc';

async function testUserSync() {
  console.log('--- TESTE DE SINCRONIZAÇÃO DE USUÁRIOS ---');
  const testEmail = 'user.test@cybertech.com';
  
  // 1. Limpar anterior
  await fetch(`${url}/rest/v1/profiles?email=eq.${testEmail}`, {
    method: 'DELETE',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });

  // 2. Tentar inserir com os NOVOS campos
  console.log('Inserindo usuário com permissões granulares...');
  const resInsert = await fetch(`${url}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: "00000000-0000-0000-0000-000000000000", // UUID fictício
      email: testEmail,
      name: 'USUARIO TESTE SYNC',
      password: '123',
      role: 'tenant',
      can_edit_employees: true,
      can_delete_employees: false,
      permissions: ['dashboard', 'employees']
    })
  });

  const dataInsert = await resInsert.json();
  if (!resInsert.ok) {
    if (dataInsert.code === '42703') {
      console.error('ERRO: A coluna can_edit_employees NÃO EXISTE no banco. Você rodou o SQL?');
    } else {
      console.error('Erro na inserção:', dataInsert);
    }
    return;
  }
  console.log('Usuário inserido com sucesso.');

  // 3. Buscar e validar
  console.log('Buscando e validando campos...');
  const resGet = await fetch(`${url}/rest/v1/profiles?email=eq.${testEmail}`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const dataGet = await resGet.json();
  const profile = dataGet[0];

  if (profile) {
    console.log('Campos retornados:');
    console.log('- Email:', profile.email);
    console.log('- Pode Editar:', profile.can_edit_employees);
    console.log('- Pode Deletar:', profile.can_delete_employees);
    console.log('- Permissões:', profile.permissions);
    
    if (profile.can_edit_employees === true) {
      console.log('✅ SUCESSO: Sincronização e permissões funcionando!');
    } else {
      console.error('❌ FALHA: Campo can_edit_employees não retornou o valor esperado.');
    }
  } else {
    console.error('❌ FALHA: Usuário não encontrado no banco.');
  }

  // 4. Limpar
  await fetch(`${url}/rest/v1/profiles?email=eq.${testEmail}`, {
    method: 'DELETE',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
}

testUserSync();
