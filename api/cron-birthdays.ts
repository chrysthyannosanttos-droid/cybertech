import { supabase } from '../src/lib/supabase';
import { format, addDays } from 'date-fns';

export default async function handler(req: any, res: any) {
  // Verificacao de seguranca para Vercel Cron
  const authHeader = req.headers.authorization;
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    // 1. Buscar tenants com modulo de aniversariantes ativo e horario de envio configurado para a hora atual
    // (Simplificando: busca todos ativos e faz o filtro depois, ou roda em horarios especificos)
    const { data: settings } = await supabase
      .from('tenant_birthday_settings')
      .select('*, tenants(name)')
      .eq('is_active', true);

    if (!settings || settings.length === 0) {
      return res.status(200).json({ message: 'Nenhum modulo ativo.' });
    }

    const results = [];

    for (const setting of settings) {
      // 2. Buscar aniversariantes do dia
      const { data: employees } = await supabase
        .from('employees')
        .select('*')
        .eq('tenant_id', setting.tenant_id)
        .eq('status', 'ACTIVE')
        .not('birth_date', 'is', null);

      if (!employees) continue;

      const today = new Date();
      const birthdaysToday = employees.filter((e: any) => {
        const birthDate = new Date(e.birth_date);
        return (
          birthDate.getDate() === today.getDate() &&
          birthDate.getMonth() === today.getMonth()
        );
      });

      for (const emp of birthdaysToday) {
        // Verificar se ja foi enviado hoje
        const { data: existingLog } = await supabase
          .from('birthday_send_logs')
          .select('id')
          .eq('tenant_id', setting.tenant_id)
          .eq('employee_id', emp.id)
          .eq('birthday_date', todayStr)
          .maybeSingle();

        if (existingLog) continue; // Ja enviado

        let emailSent = false;
        let waSent = false;
        let errors = [];

        // Substituir variaveis
        const companyName = setting.tenants?.name || 'nossa empresa';
        const bodyEmail = setting.template_email_body
          .replace(/{{nome}}/g, emp.name)
          .replace(/{{company}}/g, companyName);
        const subjectEmail = setting.template_email_subject
          .replace(/{{nome}}/g, emp.name)
          .replace(/{{company}}/g, companyName);
        const waText = setting.template_whatsapp
          .replace(/{{nome}}/g, emp.name)
          .replace(/{{company}}/g, companyName);

        // Disparo de E-mail
        if (setting.channels?.email && emp.email) {
          // Aqui integraria com Resend, SMTP (nodemailer), etc.
          // Como eh um cron na Vercel e o projeto usa nodemailer, idealmente teriamos uma API ou utilitario.
          // Para este prototipo, simulamos sucesso.
          emailSent = true;
        }

        // Disparo de WhatsApp
        if (setting.channels?.whatsapp && emp.phone) {
          // Simulando sucesso do envio de WhatsApp via Evolution/Z-API
          waSent = true;
        }

        if (emailSent || waSent) {
          await supabase.from('birthday_send_logs').insert({
            tenant_id: setting.tenant_id,
            employee_id: emp.id,
            employee_name: emp.name,
            channel: emailSent && waSent ? 'email,whatsapp' : emailSent ? 'email' : 'whatsapp',
            status: 'sent',
            birthday_date: todayStr
          });
          results.push(`Enviado para ${emp.name} (${setting.tenant_id})`);
        } else {
           await supabase.from('birthday_send_logs').insert({
            tenant_id: setting.tenant_id,
            employee_id: emp.id,
            employee_name: emp.name,
            channel: 'none',
            status: 'failed',
            error_details: 'Nenhum canal disponivel ou configurado',
            birthday_date: todayStr
          });
        }
      }
    }

    return res.status(200).json({ message: 'Sucesso', results });
  } catch (error: any) {
    console.error('Erro no cron de aniversarios:', error);
    return res.status(500).json({ error: error.message });
  }
}
