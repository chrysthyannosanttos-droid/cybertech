const url = 'https://ewttnazwsobmylxkrtoh.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3dHRuYXp3c29ibXlseGtydG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDQxMTYsImV4cCI6MjA4OTc4MDExNn0.a3Hdss4f41SYKmUkVtvUPMKqeFxjE5cz2FU4HImkcEc';

async function checkWillames() {
  const nameQuery = await fetch(`${url}/rest/v1/profiles?name=ilike.*willames*`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const dataName = await nameQuery.json();
  
  const emailQuery = await fetch(`${url}/rest/v1/profiles?email=ilike.*willames*`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const dataEmail = await emailQuery.json();

  console.log('Results by Name:', JSON.stringify(dataName, null, 2));
  console.log('Results by Email:', JSON.stringify(dataEmail, null, 2));
}

checkWillames();
