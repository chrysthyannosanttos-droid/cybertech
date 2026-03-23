const url = 'https://ewttnazwsobmylxkrtoh.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3dHRuYXp3c29ibXlseGtydG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDQxMTYsImV4cCI6MjA4OTc4MDExNn0.a3Hdss4f41SYKmUkVtvUPMKqeFxjE5cz2FU4HImkcEc';

async function findEmp() {
  const res = await fetch(`${url}/rest/v1/employees?select=tenant_id&limit=1`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const data = await res.json();
  console.log('Found Tenant ID:', data[0]?.tenant_id);
}

findEmp();
