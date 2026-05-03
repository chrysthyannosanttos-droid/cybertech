import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts"

// --- POLYFILL PARA DENO 2.0 (CORREÇÃO DO ERRO Deno.writeAll) ---
if (!(Deno as any).writeAll) {
  (Deno as any).writeAll = async (w: any, data: Uint8Array) => {
    let nwritten = 0;
    while (nwritten < data.byteLength) {
      nwritten += await w.write(data.subarray(nwritten));
    }
  };
}

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

    // 2. Tentar Conectar ao SMTP
    const client = new SmtpClient()
    const port = parseInt(settings.smtp_port)
    
    try {
      if (port === 465) {
        await client.connectTLS({
          hostname: settings.smtp_host,
          port: port,
          username: settings.smtp_user,
          password: settings.smtp_pass,
        })
      } else {
        await client.connect({
          hostname: settings.smtp_host,
          port: port,
          username: settings.smtp_user,
          password: settings.smtp_pass,
        })
      }
    } catch (connErr) {
      throw new Error(`Falha de conexão SMTP (${settings.smtp_host}): ${connErr.message}`)
    }

    // 3. Enviar o E-mail
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

    await client.close()
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
