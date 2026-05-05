import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTerminalUser() {
  console.log('Criando usuário de terminal...')

  const userData = {
    email: 'ponto',
    password: '123',
    name: 'Ponto Eletrônico',
    role: 'terminal',
    tenant_id: 't1774631821158', // Super Atacado
    permissions: ['attendance'],
    app_permissions: { 'ponto': true },
    must_change_password: false,
    can_edit_employees: false,
    can_delete_employees: false
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(userData, { onConflict: 'email' })
    .select()

  if (error) {
    console.error('Erro ao criar usuário:', error.message)
  } else {
    console.log('Usuário "ponto" criado com sucesso!', data)
  }
}

createTerminalUser()
