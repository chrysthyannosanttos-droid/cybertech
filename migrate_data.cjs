const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Data to migrate (copied from mockData.ts)
const MOCK_STORES = [
  { id: 's1', name: 'SUPER ATACADO ANTARES', cnpj: '38.313.674/0001-19', tenantId: 't1' },
  { id: 's2', name: 'SUPER ATACADO MARECHAL', cnpj: '53.427.842/0001-90', tenantId: 't1' },
  { id: 's3', name: 'SUPER VAREJO ATACADO VILLAGE', cnpj: '54.442.568/0001-91', tenantId: 't1' },
  { id: 's4', name: 'SUPER ATACADO GRACILIANO', cnpj: '58.457.885/0001-32', tenantId: 't1' },
  { id: 's5', name: 'SUPER ATACADO PRAIA', cnpj: '54.778.190/0001-00', tenantId: 't1' },
  { id: 's6', name: 'SUPER ATACADO PARIPUEIRA', cnpj: '54.014.369/0001-82', tenantId: 't1' },
];

const MOCK_TENANTS = [
  {
    id: 't1',
    name: 'Super Atacado Group',
    cnpj: '12.345.678/0001-90',
    subscription: {
      status: 'active',
      startDate: '2024-01-15',
      expiryDate: '2026-12-15',
      monthlyFee: 2500,
      additionalCosts: [{ desc: 'Módulo extra de relatórios', value: 300, date: '2025-11-01' }],
    },
    employeeCount: 247,
  },
  {
    id: 't2',
    name: 'Rede Bom Preço',
    cnpj: '98.765.432/0001-10',
    subscription: { status: 'active', startDate: '2024-06-01', expiryDate: '2026-06-01', monthlyFee: 1800, additionalCosts: [] },
    employeeCount: 132,
  },
];

const MOCK_SERVICE_PROVIDERS = [
  {
    id: 'sp1',
    tenant_id: 't1',
    name: 'Limpeza & Cia',
    cnpj: '11.222.333/0001-44',
    email: 'contato@limpezacia.com.br',
    phone: '(11) 99999-8888',
    start_date: '2024-01-01',
    end_date: '2026-03-25',
    contract_value: 5000,
    duties: 'Limpeza das áreas comuns e banheiros',
    observations: 'Frequência: Diária (Seg-Sex)',
    additional_costs: [],
  },
];

async function seed() {
  console.log('🚀 Starting Migration to Supabase...');

  // 1. Tenants
  for (const t of MOCK_TENANTS) {
    console.log(`Migrating Tenant: ${t.name}`);
    const { error } = await supabase.from('tenants').upsert({
      id: t.id,
      name: t.name,
      cnpj: t.cnpj,
      subscription: t.subscription,
      employee_count: t.employeeCount
    });
    if (error) console.error(`Error tenant ${t.id}:`, error.message);
  }

  // 2. Stores
  for (const s of MOCK_STORES) {
    console.log(`Migrating Store: ${s.name}`);
    const { error } = await supabase.from('stores').upsert({
      id: s.id,
      tenant_id: s.tenantId,
      name: s.name,
      cnpj: s.cnpj
    });
    if (error) console.error(`Error store ${s.id}:`, error.message);
  }

  // 3. Service Providers
  for (const sp of MOCK_SERVICE_PROVIDERS) {
    console.log(`Migrating Provider: ${sp.name}`);
    const { error } = await supabase.from('service_providers').upsert(sp);
    if (error) console.error(`Error provider ${sp.id}:`, error.message);
  }

  console.log('✅ Migration Finished!');
}

seed();
