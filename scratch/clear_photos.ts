import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function clearAllPhotos() {
  console.log('Iniciando limpeza de fotos...')

  // 1. Limpar referências nas tabelas
  const { error: empError } = await supabase
    .from('employees')
    .update({ photo_reference_url: null })
    .not('photo_reference_url', 'is', null)
  
  if (empError) console.error('Erro ao limpar employees:', empError)
  else console.log('Referências de fotos nos funcionários removidas.')

  // 2. Limpar batidas de ponto (que possuem fotos)
  const { error: entryError } = await supabase
    .from('time_entries')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Deleta tudo
  
  if (entryError) console.error('Erro ao limpar time_entries:', entryError)
  else console.log('Histórico de batidas e fotos de ponto removido.')

  console.log('Limpeza concluída.')
}

clearAllPhotos()
