import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const body = await req.json()
    const { tenant_id, employee_email, employee_name, pdf_url, month, year } = body

    console.log(`[DEBUG] Iniciando tentativa de envio para: ${employee_email}`)

    // 1. Buscar configurações SMTP
    let { data: settings } = await supabase
      .from('tenant_email_settings')
      .select('*')
      .eq('tenant_id', tenant_id)
      .maybeSingle()

    if (!settings) {
      const { data: fallback } = await supabase.from('tenant_email_settings').select('*').limit(1).maybeSingle()
      settings = fallback
    }

    if (!settings) throw new Error('Nenhuma configuração SMTP encontrada no banco de dados.')

    console.log(`[DEBUG] Usando SMTP Host: ${settings.smtp_host} | Porta: ${settings.smtp_port} | Usuário: ${settings.smtp_user}`)

    // 2. Tentar Conectar ao SMTP
    const client = new SmtpClient()
    const port = parseInt(settings.smtp_port)
    
    try {
      if (port === 465) {
        // Conexão Segura Direta (SSL/TLS)
        await client.connectTLS({
          hostname: settings.smtp_host,
          port: port,
          username: settings.smtp_user,
          password: settings.smtp_pass,
        })
      } else {
        // Conexão com STARTTLS (Porta 587)
        await client.connect({
          hostname: settings.smtp_host,
          port: port,
          username: settings.smtp_user,
          password: settings.smtp_pass,
        })
      }
    } catch (connErr) {
      console.error(`[SMTP CONN ERROR] Falha ao conectar ao host ${settings.smtp_host}:`, connErr.message)
      throw new Error(`Falha de conexão com o servidor de e-mail (${settings.smtp_host}). Verifique se o Host e a Porta estão corretos. Erro: ${connErr.message}`)
    }

    // 3. Tentar Enviar
    try {
      await client.send({
        from: `${settings.from_name} <${settings.from_email}>`,
        to: employee_email,
        subject: `Holerite Disponível - ${month}/${year} - ${employee_name}`,
        content: `Olá ${employee_name}, seu holerite de ${month}/${year} está disponível: ${pdf_url}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #0066cc;">Holerite Disponível</h2>
            <p>Olá <strong>${employee_name}</strong>,</p>
            <p>Seu holerite referente ao mês <strong>${month}/${year}</strong> já está disponível para consulta.</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${pdf_url}" style="background-color: #0066cc; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Visualizar Holerite (PDF)</a>
            </div>
          </div>
        `,
      })
    } catch (sendErr) {
      console.error('[SMTP SEND ERROR] Falha no disparo do e-mail:', sendErr.message)
      throw new Error(`O servidor de e-mail recusou o envio. Verifique se o Usuário e a Senha de App estão corretos. Erro: ${sendErr.message}`)
    }

    await client.close()
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('[FINAL ERROR]', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
