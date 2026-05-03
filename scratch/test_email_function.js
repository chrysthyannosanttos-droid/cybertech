import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ewttnazwsobmylxkrtoh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3dHRuYXp3c29ibXlseGtydG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDQxMTYsImV4cCI6MjA4OTc4MDExNn0.a3Hdss4f41SYKmUkVtvUPMKqeFxjE5cz2FU4HImkcEc'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testEmail() {
  console.log('--- TESTE DE ENVIO DE E-MAIL ---')
  
  try {
    const { data, error } = await supabase.functions.invoke('send-payroll-email', {
      body: {
        tenant_id: 'ewttnazwsobmylxkrtoh',
        employee_email: 'chrysthyannosanttos@gmail.com', // Tente um email real aqui se quiser
        employee_name: 'TESTE SUPABASE',
        pdf_url: 'https://ewttnazwsobmylxkrtoh.supabase.co/storage/v1/object/public/documents/teste.pdf',
        month: '05',
        year: '2026'
      }
    })

    if (error) {
      console.error('❌ ERRO NA CHAMADA:', error)
      const details = await error.context?.json()
      console.log('DETALHES DO ERRO:', details)
    } else {
      console.log('✅ RESPOSTA DO SERVIDOR:', data)
    }
  } catch (err) {
    console.error('💥 ERRO FATAL NO TESTE:', err.message)
  }
}

testEmail()
