/**
 * ============================================================
 * MOTOR CLT BRASILEIRO — CyberTech RH
 * Tabelas 2024 | Rescisão, Férias, Folha, INSS, IRRF, FGTS
 * ============================================================
 */

// ── TABELA INSS 2024 (Progressive) ─────────────────────────
const INSS_TABLE = [
  { max: 1412.00,   rate: 0.075 },
  { max: 2666.68,   rate: 0.09  },
  { max: 4000.03,   rate: 0.12  },
  { max: 7786.02,   rate: 0.14  },
];

// ── TABELA IRRF 2024 ────────────────────────────────────────
const IRRF_TABLE = [
  { max: 2112.00,    rate: 0,      deduction: 0       },
  { max: 2826.65,    rate: 0.075,  deduction: 158.40  },
  { max: 3751.05,    rate: 0.15,   deduction: 370.40  },
  { max: 4664.68,    rate: 0.225,  deduction: 651.73  },
  { max: Infinity,   rate: 0.275,  deduction: 884.96  },
];

// ── INTERFACES ──────────────────────────────────────────────
export interface INSSResult {
  total: number;
  breakdown: Array<{ bracket: string; base: number; rate: number; amount: number }>;
}

export interface PayrollResult {
  baseSalary: number;
  extras: number;
  nightShift: number;
  hazardPay: number;
  unhealthyPay: number;
  bonus: number;
  grossSalary: number;
  inss: number;
  irrf: number;
  fgts: number;
  vtDeduction: number;
  netSalary: number;
  items: PayrollItem[];
}

export interface PayrollItem {
  code: number;
  description: string;
  type: 'EARNING' | 'DEDUCTION' | 'INFO';
  reference?: string;
  amount: number;
}

export interface VacationResult {
  vacationDays: number;
  bonusDays: number;       // Abono pecuniário (1/3 dos dias)
  vacationPay: number;     // Remuneração das férias
  oneThird: number;        // 1/3 constitucional
  bonusPay: number;        // Abono pecuniário em dinheiro
  grossTotal: number;      // Bruto total
  inss: number;
  irrf: number;
  netTotal: number;
}

export interface RescissionItem {
  description: string;
  value: number;
  type: 'CREDIT' | 'DEDUCTION';
}

export interface RescissionResult {
  type: string;
  saldoSalario: number;
  avisoPrevio: number;
  feriasVencidas: number;
  tercoFeriasVencidas: number;
  feriasProporcionais: number;
  tercoFeriasProporcionais: number;
  decimoTerceiroProporcional: number;
  multaFGTS: number;
  totalCreditos: number;
  inss: number;
  irrf: number;
  descontoAvisoPrevio: number;
  totalDescontos: number;
  valorLiquido: number;
  items: RescissionItem[];
  fgtsTotal: number;
}

// ── HELPER: INSS PROGRESSIVO ────────────────────────────────
export function calcINSS(salary: number): INSSResult {
  let total = 0;
  let remaining = salary;
  const breakdown: INSSResult['breakdown'] = [];
  let prevMax = 0;

  for (const bracket of INSS_TABLE) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, bracket.max - prevMax);
    const amount = taxable * bracket.rate;
    breakdown.push({
      bracket: `Até R$ ${bracket.max.toLocaleString('pt-BR')}`,
      base: round(taxable),
      rate: bracket.rate,
      amount: round(amount),
    });
    total += amount;
    remaining -= taxable;
    prevMax = bracket.max;
  }

  return { total: round(Math.min(total, 908.85)), breakdown };
}

// ── HELPER: IRRF ────────────────────────────────────────────
export function calcIRRF(baseIRRF: number): number {
  for (const bracket of IRRF_TABLE) {
    if (baseIRRF <= bracket.max) {
      return round(Math.max(0, baseIRRF * bracket.rate - bracket.deduction));
    }
  }
  return 0;
}

// ── HELPER: FGTS ────────────────────────────────────────────
export function calcFGTS(grossSalary: number): number {
  return round(grossSalary * 0.08);
}

// ── HELPER: Round 2 decimals ────────────────────────────────
export function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── HELPER: Months between dates ────────────────────────────
export function monthsBetween(start: Date, end: Date): number {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

// ── HELPER: Days in month ────────────────────────────────────
export function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

// ═══════════════════════════════════════════════════════════════
// CÁLCULO DE FOLHA DE PAGAMENTO
// ═══════════════════════════════════════════════════════════════
export interface PayrollInput {
  baseSalary: number;
  extraHours?: number;         // Horas extras 50%
  extraHoursHundred?: number;  // Horas extras 100%
  nightShiftHours?: number;    // Adicional noturno (20%)
  hazardPay?: number;          // Periculosidade (fixo em R$)
  unhealthyPay?: number;       // Insalubridade (fixo em R$)
  bonus?: number;              // Gratificação
  absenceDays?: number;        // Faltas
  vtValue?: number;            // Vale Transporte mensal (desconto 6% ou valor)
  vrValue?: number;            // Vale Refeição
  otherDeductions?: number;    // Outros descontos
  dependents?: number;         // Nº dependentes IRRF
}

export function calculatePayroll(input: PayrollInput | number): PayrollResult {
  // Backward compat: accept plain number
  const params: PayrollInput = typeof input === 'number' ? { baseSalary: input } : input;

  const {
    baseSalary,
    extraHours = 0,
    extraHoursHundred = 0,
    nightShiftHours = 0,
    hazardPay = 0,
    unhealthyPay = 0,
    bonus = 0,
    absenceDays = 0,
    vtValue = 0,
    vrValue = 0,
    otherDeductions = 0,
    dependents = 0,
  } = params;

  const items: PayrollItem[] = [];
  const hourlyRate = baseSalary / 220;
  const dailyRate = baseSalary / 30;

  // Salário base
  items.push({ code: 1, description: 'Salário Base', type: 'EARNING', amount: round(baseSalary) });

  // Horas extras 50%
  const extrasValue50 = round(extraHours * hourlyRate * 1.5);
  if (extrasValue50 > 0) items.push({ code: 2, description: `Horas Extras 50% (${extraHours}h)`, type: 'EARNING', amount: extrasValue50 });

  // Horas extras 100%
  const extrasValue100 = round(extraHoursHundred * hourlyRate * 2);
  if (extrasValue100 > 0) items.push({ code: 3, description: `Horas Extras 100% (${extraHoursHundred}h)`, type: 'EARNING', amount: extrasValue100 });

  // Adicional noturno 20%
  const nightValue = round(nightShiftHours * hourlyRate * 0.20);
  if (nightValue > 0) items.push({ code: 100, description: `Adicional Noturno (${nightShiftHours}h)`, type: 'EARNING', amount: nightValue });

  // Periculosidade
  if (hazardPay > 0) items.push({ code: 101, description: 'Periculosidade', type: 'EARNING', amount: round(hazardPay) });

  // Insalubridade
  if (unhealthyPay > 0) items.push({ code: 102, description: 'Insalubridade', type: 'EARNING', amount: round(unhealthyPay) });

  // Gratificação
  if (bonus > 0) items.push({ code: 103, description: 'Gratificação', type: 'EARNING', amount: round(bonus) });

  const extras = extrasValue50 + extrasValue100;
  const grossSalary = round(baseSalary + extras + nightValue + hazardPay + unhealthyPay + bonus);

  // Desconto por faltas
  const absenceDeduction = round(absenceDays * dailyRate);
  if (absenceDeduction > 0) items.push({ code: 200, description: `Desconto Faltas (${absenceDays}d)`, type: 'DEDUCTION', amount: absenceDeduction });

  // INSS
  const inssResult = calcINSS(grossSalary - absenceDeduction);
  items.push({ code: 300, description: 'INSS Previdência', type: 'DEDUCTION', reference: inssResult.breakdown.map(b => `${(b.rate * 100).toFixed(1)}%`).join('/'), amount: inssResult.total });

  // IRRF
  const deductionPerDependent = 189.59;
  const baseIRRF = grossSalary - absenceDeduction - inssResult.total - (dependents * deductionPerDependent);
  const irrfValue = calcIRRF(baseIRRF);
  if (irrfValue > 0) items.push({ code: 400, description: 'IRRF', type: 'DEDUCTION', amount: irrfValue });

  // Vale Transporte (desconto máx 6% do salário base)
  const vtDeduction = vtValue > 0 ? round(Math.min(vtValue, baseSalary * 0.06)) : 0;
  if (vtDeduction > 0) items.push({ code: 500, description: 'Desc. Vale Transporte (6%)', type: 'DEDUCTION', amount: vtDeduction });

  // Vale Refeição (informativo)
  if (vrValue > 0) items.push({ code: 501, description: 'Vale Refeição', type: 'INFO', amount: round(vrValue) });

  // Outros descontos
  if (otherDeductions > 0) items.push({ code: 599, description: 'Outros Descontos', type: 'DEDUCTION', amount: round(otherDeductions) });

  // FGTS (encargo empresa — informativo)
  const fgts = calcFGTS(grossSalary);
  items.push({ code: 900, description: 'FGTS (8%) — Encargo Empresa', type: 'INFO', amount: fgts });

  const totalEarnings = items.filter(i => i.type === 'EARNING').reduce((s, i) => s + i.amount, 0);
  const totalDeductions = items.filter(i => i.type === 'DEDUCTION').reduce((s, i) => s + i.amount, 0);
  const netSalary = round(totalEarnings - totalDeductions);

  return {
    baseSalary,
    extras,
    nightShift: nightValue,
    hazardPay: round(hazardPay),
    unhealthyPay: round(unhealthyPay),
    bonus: round(bonus),
    grossSalary,
    inss: inssResult.total,
    irrf: irrfValue,
    fgts,
    vtDeduction,
    netSalary,
    items,
  };
}

// ═══════════════════════════════════════════════════════════════
// CÁLCULO DE FÉRIAS
// ═══════════════════════════════════════════════════════════════
export interface VacationInput {
  baseSalary: number;
  hazardPay?: number;
  unhealthyPay?: number;
  bonus?: number;
  vacationDays?: number;   // 30, 20 ou 15
  sellBonus?: boolean;     // Abono pecuniário (venda de 10 dias)
  dependents?: number;
}

export function calculateVacations(input: VacationInput): VacationResult {
  const {
    baseSalary,
    hazardPay = 0,
    unhealthyPay = 0,
    bonus = 0,
    vacationDays = 30,
    sellBonus = false,
    dependents = 0,
  } = input;

  const baseRemuneration = baseSalary + hazardPay + unhealthyPay + bonus;
  const dailyRate = baseRemuneration / 30;

  const bonusDays = sellBonus ? 10 : 0;
  const effectiveDays = vacationDays - bonusDays;

  // Remuneração de férias
  const vacationPay = round(dailyRate * effectiveDays);
  const oneThird = round(vacationPay / 3);

  // Abono pecuniário
  const bonusPay = sellBonus ? round(dailyRate * bonusDays * (1 + 1 / 3)) : 0;

  const grossTotal = round(vacationPay + oneThird + bonusPay);

  // INSS sobre férias (não incide INSS sobre 1/3 constitucional)
  const inssBase = vacationPay + bonusPay;
  const inssResult = calcINSS(inssBase);

  // IRRF sobre férias
  const deductionPerDependent = 189.59;
  const baseIRRF = grossTotal - inssResult.total - (dependents * deductionPerDependent);
  const irrfValue = calcIRRF(baseIRRF);

  return {
    vacationDays,
    bonusDays,
    vacationPay,
    oneThird,
    bonusPay,
    grossTotal,
    inss: inssResult.total,
    irrf: irrfValue,
    netTotal: round(grossTotal - inssResult.total - irrfValue),
  };
}

// ═══════════════════════════════════════════════════════════════
// CÁLCULO DE RESCISÃO
// ═══════════════════════════════════════════════════════════════
export type RescissionType = 'SEM_JUSTA_CAUSA' | 'COM_JUSTA_CAUSA' | 'PEDIDO_DEMISSAO' | 'ACORDO' | 'INDENIZADO' | 'TRABALHADO' | 'TERMINO_CONTRATO';

export interface RescissionInput {
  type: RescissionType;
  admissionDate: Date;
  terminationDate: Date;
  lastSalary: number;
  hazardPay?: number;
  unhealthyPay?: number;
  bonus?: number;
  hasVestedVacation?: boolean;  // Férias vencidas (período anterior)
  hasPropVacation?: boolean;    // Férias proporcionais calculadas auto
  noticePeriodWorked?: boolean; // Aviso prévio trabalhado (não desconta)
  fgtsBalance?: number;         // Saldo FGTS (para calcular multa 40%)
  dependents?: number;
}

export function calculateRescission(input: RescissionInput): RescissionResult {
  const {
    type,
    admissionDate,
    terminationDate,
    lastSalary,
    hazardPay = 0,
    unhealthyPay = 0,
    bonus = 0,
    hasVestedVacation = false,
    noticePeriodWorked = false,
    fgtsBalance = 0,
    dependents = 0,
  } = input;

  const baseRemuneration = lastSalary + hazardPay + unhealthyPay + bonus;
  const dailyRate = baseRemuneration / 30;

  // Meses trabalhados
  const totalMonths = monthsBetween(admissionDate, terminationDate);
  const completedMonths = totalMonths;

  // Saldo de salário (dias do mês de demissão)
  const dayOfTermination = terminationDate.getDate();
  const saldoSalario = round(dailyRate * dayOfTermination);

  // Aviso prévio (30 dias base + 3 dias por ano — máx 90 dias)
  const yearsWorked = Math.floor(completedMonths / 12);
  const noticeDays = Math.min(30 + yearsWorked * 3, 90);
  const noticePay = round(baseRemuneration / 30 * noticeDays);

  // Define quem tem direito a aviso prévio
  const hasNoticePay = ['SEM_JUSTA_CAUSA', 'INDENIZADO', 'ACORDO'].includes(type);
  const avisoPrevio = hasNoticePay && !noticePeriodWorked ? noticePay : 0;
  const descontoAvisoPrevio = type === 'PEDIDO_DEMISSAO' && !noticePeriodWorked ? noticePay : 0;

  // Férias vencidas + 1/3 (período anterior completo)
  let feriasVencidas = 0;
  let tercoFeriasVencidas = 0;
  if (hasVestedVacation && !['COM_JUSTA_CAUSA'].includes(type)) {
    feriasVencidas = round(baseRemuneration);
    tercoFeriasVencidas = round(feriasVencidas / 3);
  }

  // Férias proporcionais + 1/3
  const feriesPropMonths = completedMonths % 12;
  let feriasProporcionais = 0;
  let tercoFeriasProporcionais = 0;
  if (!['COM_JUSTA_CAUSA', 'PEDIDO_DEMISSAO'].includes(type) || type === 'ACORDO') {
    feriasProporcionais = round((baseRemuneration / 12) * feriesPropMonths);
    tercoFeriasProporcionais = round(feriasProporcionais / 3);
  } else if (type === 'PEDIDO_DEMISSAO') {
    // Pedido de demissão tem direito apenas a férias proporcionais + 1/3
    feriasProporcionais = round((baseRemuneration / 12) * feriesPropMonths);
    tercoFeriasProporcionais = round(feriasProporcionais / 3);
  }

  // 13º proporcional
  const thirteenthMonths = terminationDate.getMonth() + 1; // Jan=1..Dez=12
  const hasThirteenth = !['COM_JUSTA_CAUSA', 'PEDIDO_DEMISSAO'].includes(type);
  const decimoTerceiroProporcional = hasThirteenth
    ? round((baseRemuneration / 12) * thirteenthMonths)
    : 0;

  // Multa FGTS (40% do saldo de FGTS)
  // Acordo: 20% (art. 484-A CLT)
  let multaFGTS = 0;
  if (type === 'SEM_JUSTA_CAUSA' || type === 'INDENIZADO' || type === 'TRABALHADO') {
    multaFGTS = round(fgtsBalance * 0.40);
  } else if (type === 'ACORDO') {
    multaFGTS = round(fgtsBalance * 0.20);
  }

  // Total fgts acumulado estimado (8% por mês)
  const fgtsTotal = fgtsBalance > 0 ? fgtsBalance : round(lastSalary * 0.08 * completedMonths);

  // Créditos totais
  const totalCreditos = round(
    saldoSalario + avisoPrevio + feriasVencidas + tercoFeriasVencidas +
    feriasProporcionais + tercoFeriasProporcionais + decimoTerceiroProporcional + multaFGTS
  );

  // Base INSS (sem multa FGTS, abono e aviso indenizado)
  const inssBase = saldoSalario + feriasVencidas + tercoFeriasVencidas + feriasProporcionais + decimoTerceiroProporcional;
  const inssResult = calcINSS(inssBase);

  // Base IRRF
  const deductionPerDependent = 189.59;
  const baseIRRF = inssBase - inssResult.total - (dependents * deductionPerDependent);
  const irrfValue = calcIRRF(baseIRRF);

  const totalDescontos = round(inssResult.total + irrfValue + descontoAvisoPrevio);
  const valorLiquido = round(totalCreditos - totalDescontos);

  // Montar demonstrativo
  const items: RescissionItem[] = [
    { description: 'Saldo de Salário', value: saldoSalario, type: 'CREDIT' },
  ];

  if (avisoPrevio > 0) items.push({ description: `Aviso Prévio Indenizado (${noticeDays}d)`, value: avisoPrevio, type: 'CREDIT' });
  if (feriasVencidas > 0) items.push({ description: 'Férias Vencidas', value: feriasVencidas, type: 'CREDIT' });
  if (tercoFeriasVencidas > 0) items.push({ description: '1/3 Férias Vencidas', value: tercoFeriasVencidas, type: 'CREDIT' });
  if (feriasProporcionais > 0) items.push({ description: `Férias Proporcionais (${feriesPropMonths}/12 meses)`, value: feriasProporcionais, type: 'CREDIT' });
  if (tercoFeriasProporcionais > 0) items.push({ description: '1/3 Férias Proporcionais', value: tercoFeriasProporcionais, type: 'CREDIT' });
  if (decimoTerceiroProporcional > 0) items.push({ description: `13º Proporcional (${thirteenthMonths}/12 meses)`, value: decimoTerceiroProporcional, type: 'CREDIT' });
  if (multaFGTS > 0) items.push({ description: `Multa FGTS (${type === 'ACORDO' ? '20' : '40'}%)`, value: multaFGTS, type: 'CREDIT' });

  if (inssResult.total > 0) items.push({ description: 'INSS Previdência', value: inssResult.total, type: 'DEDUCTION' });
  if (irrfValue > 0) items.push({ description: 'IRRF', value: irrfValue, type: 'DEDUCTION' });
  if (descontoAvisoPrevio > 0) items.push({ description: 'Desconto Aviso Prévio (Pedido)', value: descontoAvisoPrevio, type: 'DEDUCTION' });

  return {
    type,
    saldoSalario,
    avisoPrevio,
    feriasVencidas,
    tercoFeriasVencidas,
    feriasProporcionais,
    tercoFeriasProporcionais,
    decimoTerceiroProporcional,
    multaFGTS,
    totalCreditos,
    inss: inssResult.total,
    irrf: irrfValue,
    descontoAvisoPrevio,
    totalDescontos,
    valorLiquido,
    fgtsTotal,
    items,
  };
}
