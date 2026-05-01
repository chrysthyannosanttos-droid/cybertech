
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ewttnazwsobmylxkrtoh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3dHRuYXp3c29ibXlseGtydG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDQxMTYsImV4cCI6MjA4OTc4MDExNn0.a3Hdss4f41SYKmUkVtvUPMKqeFxjE5cz2FU4HImkcEc';

const supabase = createClient(supabaseUrl, supabaseKey);

const guessGender = (name) => {
  if (!name) return 'M';
  const firstName = name.trim().split(' ')[0].toLowerCase();
  
  if (
    firstName.endsWith('a') || 
    firstName.endsWith('ia') || 
    firstName.endsWith('ana') || 
    firstName.endsWith('ine') || 
    firstName.endsWith('ele') ||
    ['beatriz', 'iris', 'alice'].includes(firstName)
  ) {
    return 'F';
  }
  return 'M';
};

async function updateGenders() {
  console.log('Buscando colaboradores...');
  const { data: employees, error } = await supabase.from('employees').select('id, name');

  if (error) {
    console.error('Erro ao buscar:', error);
    process.exit(1);
  }

  console.log(`Processando ${employees.length} registros...`);

  for (const emp of employees) {
    const gender = guessGender(emp.name);
    const { error: updateError } = await supabase
      .from('employees')
      .update({ gender })
      .eq('id', emp.id);

    if (updateError) {
      console.error(`Erro ao atualizar ${emp.name}:`, updateError);
    } else {
      console.log(`[OK] ${emp.name} -> ${gender}`);
    }
  }

  console.log('Atualização concluída!');
  process.exit(0);
}

updateGenders();
