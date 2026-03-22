import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://syuasinphroaqieewqct.supabase.co';
const supabaseKey = 'sb_publishable_pQ5hU5rU2l04bkgLmRBDAg_NchWmT4t';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('employees').select('cbo').limit(1);
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Column "cbo" is accessible!');
  }
}
check();
