import { supabase } from './src/lib/supabase';

async function checkTables() {
  const { data, error } = await supabase.from('tenant_whatsapp_settings').select('*').limit(1);
  if (error) {
    console.log('Table tenant_whatsapp_settings does not exist or error:', error.message);
  } else {
    console.log('Table exists!');
  }
}

checkTables();
