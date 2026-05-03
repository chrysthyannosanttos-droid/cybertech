import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { tenant_id, employee_email, employee_name, pdf_url, month, year } = await req.json()

    // 1. Buscar configurações SMTP do Tenant
    const { data: settings, error: sError } = await supabase
      .from('tenant_email_settings')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single()

    if (sError || !settings) {
      throw new Error('Configurações SMTP não encontradas para esta unidade.')
    }

    // 2. Configurar o Cliente SMTP
    const client = new SmtpClient()
    
    await client.connectTLS({
      hostname: settings.smtp_host,
      port: settings.smtp_port,
      username: settings.smtp_user,
      password: settings.smtp_pass,
    })

    // 3. Enviar o E-mail
    await client.send({
      from: `${settings.from_name} <${settings.from_email}>`,
      to: employee_email,
      subject: `Holerite Disponível - ${month}/${year} - ${employee_name}`,
      content: `
        Olá ${employee_name},
        
        Seu holerite referente ao mês ${month}/${year} já está disponível para consulta.
        
        Você pode visualizá-lo e baixá-lo através do link abaixo:
        ${pdfUrl}
        
        Atenciosamente,
        Departamento de RH - ${settings.from_name}
      `,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0066cc;">Holerite Disponível</h2>
          <p>Olá <strong>${employee_name}</strong>,</p>
          <p>Seu holerite referente ao mês <strong>${month}/${year}</strong> já está disponível para consulta.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${pdfUrl}" style="background-color: #0066cc; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Visualizar Holerite (PDF)</a>
          </div>
          <hr style="border: 0; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #666;">Este é um e-mail automático enviado pelo sistema CyberTech RH.</p>
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
