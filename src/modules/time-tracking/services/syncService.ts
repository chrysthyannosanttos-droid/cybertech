import { supabase } from '@/lib/supabase';
import { calculateWorkDay } from './calculationService';

/**
 * Serviço de Sincronização e Reprocessamento de Batidas
 */
export async function reprocessDay(employeeId: string, date: string) {
  try {
    // 1. Buscar Informações do Funcionário (Jornada)
    const { data: emp, error: empErr } = await supabase
      .from('employees')
      .select('journey_hours, shift_start, tenant_id')
      .eq('id', employeeId)
      .single();

    if (empErr || !emp) throw new Error('Funcionário não encontrado');

    // 2. Buscar Todas as Batidas (Logs) do Dia
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const { data: logs, error: logsErr } = await supabase
      .from('time_entries')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('timestamp', startOfDay)
      .lte('timestamp', endOfDay)
      .order('timestamp', { ascending: true });

    if (logsErr) throw logsErr;

    // 3. Executar Cálculo da Jornada (Core Logic)
    const result = calculateWorkDay(
      logs || [], 
      emp.journey_hours || 8, 
      emp.shift_start || '08:00'
    );

    // 4. Salvar na Tabela time_sheets (UPSERT por dia/employee)
    const { error: sheetErr } = await supabase
      .from('time_sheets')
      .upsert({
        employee_id: employeeId,
        date: date,
        first_entry: result.firstEntry?.toISOString(),
        last_exit: result.lastExit?.toISOString(),
        worked_hours: result.workedHours,
        extra_hours: result.extraHours,
        delay_minutes: result.delayMinutes,
        status: result.status,
        tenant_id: emp.tenant_id
      }, { onConflict: 'employee_id,date' });

    if (sheetErr) throw sheetErr;

    // 5. Atualizar Banco de Horas (Diferença diária)
    // Se o workedHours > journey, hours = extra_hours
    // Se o workedHours < journey (e não for ausência total), hours = -(journey - workedHours)
    let dailyHours = 0;
    if (result.status !== 'ABSENT') {
       dailyHours = result.workedHours - (emp.journey_hours || 8);
    }

    const { error: hbErr } = await supabase
      .from('hour_bank')
      .upsert({
        employee_id: employeeId,
        date: date,
        hours: parseFloat(dailyHours.toFixed(2)),
        tenant_id: emp.tenant_id
      }, { onConflict: 'employee_id,date' });

    if (hbErr) throw hbErr;

    return { success: true, result };
  } catch (error: any) {
    console.error('Erro ao reprocessar dia:', error);
    return { success: false, error: error.message };
  }
}
