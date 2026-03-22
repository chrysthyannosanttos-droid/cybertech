import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://syuasinphroaqieewqct.supabase.co';
const supabaseKey = 'sb_publishable_pQ5hU5rU2l04bkgLmRBDAg_NchWmT4t';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking tables...');
  
  const { error: err1 } = await supabase.from('certificates').select('id').limit(1);
  console.log('Certificates:', err1 ? `FAIL: ${err1.message}` : 'OK');
  
  const { error: err2 } = await supabase.from('rescissions').select('id').limit(1);
  console.log('Rescissions:', err2 ? `FAIL: ${err2.message}` : 'OK');

  const { error: err3 } = await supabase.from('employees').select('cbo').limit(1);
  console.log('Employees.cbo:', err3 ? `FAIL: ${err3.message}` : 'OK');
}

check();
