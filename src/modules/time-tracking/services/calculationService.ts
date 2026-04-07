import { differenceInMinutes, parse, format, isAfter } from 'date-fns';

export interface WorkDayResult {
  workedHours: number;
  extraHours: number;
  delayMinutes: number;
  firstEntry: Date | null;
  lastExit: Date | null;
  status: 'OK' | 'ABSENT' | 'LATE';
}

/**
 * Motor de Cálculo de Jornada
 * @param entries Batidas do dia em ordem cronológica
 * @param journeyHours Carga horária esperada (ex: 8)
 * @param shiftStart Horário de entrada esperado (ex: '08:00')
 */
export function calculateWorkDay(
  entries: any[], 
  journeyHours: number = 8, 
  shiftStart: string = '08:00'
): WorkDayResult {
  if (!entries || entries.length === 0) {
    return {
      workedHours: 0,
      extraHours: 0,
      delayMinutes: 0,
      firstEntry: null,
      lastExit: null,
      status: 'ABSENT'
    };
  }

  // Ordenar batidas por data
  const sorted = [...entries].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const firstEntry = new Date(sorted[0].timestamp);
  const lastExit = sorted.length > 1 ? new Date(sorted[sorted.length - 1].timestamp) : null;

  // 1. Cálculo de Atraso (Comparando apenas o horário HH:mm)
  let delayMinutes = 0;
  const expectedStart = parse(shiftStart, 'HH:mm', firstEntry);
  if (isAfter(firstEntry, expectedStart)) {
    delayMinutes = differenceInMinutes(firstEntry, expectedStart);
    // Tolerância CLT (geralmente 10 min por dia, mas aqui calculamos bruto)
    if (delayMinutes <= 5) delayMinutes = 0; 
  }

  // 2. Cálculo de Horas Trabalhadas (Pares de Entrada/Saída)
  let totalMinutes = 0;
  for (let i = 0; i < sorted.length; i += 2) {
    const entry = new Date(sorted[i].timestamp);
    const exit = sorted[i + 1] ? new Date(sorted[i + 1].timestamp) : null;
    
    if (entry && exit) {
      totalMinutes += differenceInMinutes(exit, entry);
    }
  }

  const workedHours = totalMinutes / 60;
  const journeyMinutes = journeyHours * 60;
  
  // 3. Cálculo de Extras
  let extraHours = 0;
  if (totalMinutes > journeyMinutes) {
    extraHours = (totalMinutes - journeyMinutes) / 60;
  }

  // 4. Status
  let status: 'OK'|'ABSENT'|'LATE' = 'OK';
  if (delayMinutes > 10) status = 'LATE';

  return {
    workedHours: parseFloat(workedHours.toFixed(2)),
    extraHours: parseFloat(extraHours.toFixed(2)),
    delayMinutes,
    firstEntry,
    lastExit,
    status
  };
}
