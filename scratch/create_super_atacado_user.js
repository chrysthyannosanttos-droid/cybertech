import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createSuperAtacadoUser() {
  console.log('Buscando empresa Super Atacado...');
  
  // 1. Buscar Tenant
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name')
    .ilike('name', '%Super Atacado%');

  if (!tenants || tenants.length === 0) {
    console.error('Empresa Super Atacado nao encontrada!');
    return;
  }

  const tenantId = tenants[0].id;
  console.log(`Empresa encontrada: ${tenants[0].name} (ID: ${tenantId})`);

  // 2. Criar Funcionário
  console.log('Criando funcionario dedicado...');
  const { data: emp, error } = await supabase
    .from('employees')
    .insert([{
      name: 'Joao Silva - Super Atacado',
      cpf: '12345678900',
      birth_date: '1990-01-01',
      admission_date: new Date().toISOString().split('T')[0],
      department: 'OPERACIONAL',
      role: 'AUXILIAR DE ESTOQUE',
      tenant_id: tenantId,
      status: 'ACTIVE'
    }])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar funcionario:', error);
  } else {
    console.log(`Funcionario criado com sucesso! ID: ${emp.id}`);
    console.log('CPF para Login:', '12345678900');
  }
}

createSuperAtacadoUser();
