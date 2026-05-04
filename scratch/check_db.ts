import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkData() {
  const { data: tenants, error: tError } = await supabase.from('tenants').select('id, name')
  console.log('Tenants:', tenants)
  
  if (tenants && tenants.length > 0) {
    const { data: employees, error: eError } = await supabase.from('employees').select('count', { count: 'exact', head: true })
    console.log('Total Employees in DB:', employees)
    
    for (const t of tenants) {
      const { data: empCount, error: cError } = await supabase
        .from('employees')
        .select('count', { count: 'exact', head: true })
        .eq('tenant_id', t.id)
      console.log(`Employees for ${t.name} (${t.id}):`, empCount)
    }
  }
}

checkData()
