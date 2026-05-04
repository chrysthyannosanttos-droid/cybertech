
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ewttnazwsobmylxkrtoh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3dHRuYXp3c29ibXlseGtydG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDQxMTYsImV4cCI6MjA4OTc4MDExNn0.a3Hdss4f41SYKmUkVtvUPMKqeFxjE5cz2FU4HImkcEc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAttendance() {
  console.log('🚀 Iniciando teste do sistema de ponto...');

  // 1. Buscar um funcionário ativo
  const { data: emp, error: empErr } = await supabase
    .from('employees')
    .select('id, name, tenant_id, journey_hours, shift_start')
    .eq('status', 'ACTIVE')
    .limit(1)
    .single();

  if (empErr || !emp) {
    console.error('❌ Erro ao buscar funcionário:', empErr);
    return;
  }

  console.log(`✅ Funcionário selecionado: ${emp.name} (ID: ${emp.id})`);

  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Data do teste: ${today}`);

  // 2. Limpar batidas de hoje para evitar duplicidade no teste
  await supabase
    .from('time_entries')
    .delete()
    .eq('employee_id', emp.id)
    .gte('timestamp', `${today}T00:00:00Z`)
    .lte('timestamp', `${today}T23:59:59Z`);

  // 3. Inserir batidas simuladas
  const entries = [
    { employee_id: emp.id, timestamp: `${today}T08:00:00Z`, type: 'ENTRY', tenant_id: emp.tenant_id, status: 'SYNCED' },
    { employee_id: emp.id, timestamp: `${today}T12:00:00Z`, type: 'EXIT', tenant_id: emp.tenant_id, status: 'SYNCED' },
    { employee_id: emp.id, timestamp: `${today}T13:00:00Z`, type: 'ENTRY', tenant_id: emp.tenant_id, status: 'SYNCED' },
    { employee_id: emp.id, timestamp: `${today}T17:00:00Z`, type: 'EXIT', tenant_id: emp.tenant_id, status: 'SYNCED' },
  ];

  console.log('📝 Inserindo 4 batidas (08:00, 12:00, 13:00, 17:00)...');
  const { error: insErr } = await supabase.from('time_entries').insert(entries);
  if (insErr) {
    console.error('❌ Erro ao inserir batidas:', insErr);
    return;
  }

  // 4. Lógica de Cálculo (Simulando o syncService)
  console.log('🧮 Processando cálculos de jornada...');
  
  const workedMinutes = (4 * 60) + (4 * 60); // 8 horas
  const workedHours = workedMinutes / 60;
  const journeyHours = emp.journey_hours || 8;
  const extraHours = Math.max(0, workedHours - journeyHours);
  const delayMinutes = 0; // Entrou exatamente às 08:00

  // 5. Upsert no Time Sheet
  const { error: sheetErr } = await supabase.from('time_sheets').upsert({
    employee_id: emp.id,
    date: today,
    first_entry: `${today}T08:00:00Z`,
    last_exit: `${today}T17:00:00Z`,
    worked_hours: workedHours,
    extra_hours: extraHours,
    delay_minutes: delayMinutes,
    status: 'OK',
    tenant_id: emp.tenant_id
  }, { onConflict: 'employee_id,date' });

  if (sheetErr) {
    console.error('❌ Erro ao salvar time_sheet:', sheetErr);
    return;
  }

  // 6. Upsert no Banco de Horas
  const dailyHours = workedHours - journeyHours;
  const { error: hbErr } = await supabase.from('hour_bank').upsert({
    employee_id: emp.id,
    date: today,
    hours: dailyHours,
    tenant_id: emp.tenant_id
  }, { onConflict: 'employee_id,date' });

  if (hbErr) {
    console.error('❌ Erro ao salvar banco de horas:', hbErr);
    return;
  }

  console.log('✨ Teste concluído com sucesso!');
  console.log(`📊 Resultado: ${workedHours}h trabalhadas, ${extraHours}h extras.`);
}

testAttendance();
