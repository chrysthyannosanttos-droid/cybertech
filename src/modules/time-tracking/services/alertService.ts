import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

/**
 * Serviço de Alertas Automáticos de Ponto
 */
export async function generateAlerts(tenantId: string, date: string) {
  try {
    // 1. Buscar a folha consolidada do dia
    const { data: sheets, error: sheetErr } = await supabase
      .from('time_sheets')
      .select('*, employees(name)')
      .eq('tenant_id', tenantId)
      .eq('date', date);

    if (sheetErr) throw sheetErr;

    for (const sheet of sheets) {
      const empName = (sheet as any).employees?.name || 'Funcionário';
      
      // Regra 1: Alerta de Falta
      if (sheet.status === 'ABSENT') {
        await createAlert(tenantId, sheet.employee_id, 'ABSENCE', `Falta detectada: ${empName} não registrou batidas em ${date}.`, date);
      }

      // Regra 2: Alerta de Atraso Crítico (> 15 min)
      if (sheet.delay_minutes > 15) {
        await createAlert(tenantId, sheet.employee_id, 'DELAY', `Atraso crítico: ${empName} entrou com ${sheet.delay_minutes} min de atraso.`, date);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao gerar alertas:', error);
    return { success: false };
  }
}

async function createAlert(tenantId: string, employeeId: string, type: string, message: string, date: string) {
  // Verificar se o alerta já existe para evitar duplicidade
  const { data: existing } = await supabase
    .from('alerts')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('date', date)
    .eq('type', type)
    .maybeSingle();

  if (!existing) {
    await supabase.from('alerts').insert({
      tenant_id: tenantId,
      employee_id: employeeId,
      type: type,
      message: message,
      date: date
    });
  }
}
