import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

const DEFAULT_USERS = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'cristiano',
    name: 'Cristiano Admin',
    password: '91126395',
    role: 'superadmin',
    must_change_password: false,
    permissions: null,
    can_edit_employees: true,
    can_delete_employees: true
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'teste',
    name: 'Usuário Teste',
    password: '123',
    role: 'tenant',
    tenant_id: 't1', 
    must_change_password: true,
    permissions: ["dashboard", "employees", "certificates", "payroll", "reports", "service-providers", "rescissions", "stores"]
  }
];

async function seedUsers() {
  console.log('Seeding users...');
  
  // Primeiro garantir que a empresa t1 existe para o usuário teste
  const { error: tError } = await supabase.from('tenants').upsert({
    id: 't1',
    name: 'Empresa Matriz',
    cnpj: '00.000.000/0001-00',
    subscription: { status: 'active', startDate: '2024-01-01', expiryDate: '2027-01-01', monthlyFee: 0, additionalCosts: [] }
  });

  if (tError) {
    console.error('Error seeding tenant:', tError);
  }

  for (const u of DEFAULT_USERS) {
    const { error } = await supabase.from('profiles').upsert({
        id: u.id,
        email: u.email,
        name: u.name,
        password: u.password,
        role: u.role,
        tenant_id: u.tenant_id || null,
        permissions: u.permissions,
        must_change_password: u.must_change_password,
        can_edit_employees: u.can_edit_employees || false,
        can_delete_employees: u.can_delete_employees || false
    }, { onConflict: 'email' });

    if (error) {
      console.error(`Error seeding user ${u.email}:`, error);
    } else {
      console.log(`User ${u.email} seeded successfully.`);
    }
  }
}

seedUsers();
