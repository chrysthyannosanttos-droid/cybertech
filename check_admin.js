import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function checkAdmin() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'cristiano')
    .maybeSingle();

  if (error) {
    console.error('Error fetching admin:', error);
    return;
  }

  if (data) {
    console.log('Admin found:', JSON.stringify(data, null, 2));
  } else {
    console.log('Admin user "cristiano" NOT found in the new database.');
  }
}

checkAdmin();
