/**
 * Motor de Cálculo de Folha de Pagamento
 * Calcula Salários, INSS, IRRF e FGTS com base nas tabelas brasileiras 2024 (Simplificado)
 */

export interface PayrollCalculation {
  baseSalary: number;
  inss: number;
  irrf: number;
  fgts: number;
  netSalary: number;
  items: Array<{
    code: number;
    description: string;
    type: 'EARNING' | 'DEDUCTION';
    amount: number;
  }>;
}

export const calculatePayroll = (salary: number): PayrollCalculation => {
  const items: PayrollCalculation['items'] = [];
  
  // Provento: Salário Base
  items.push({ code: 1, description: 'Salário Base', type: 'EARNING', amount: salary });

  // Cálculo INSS 2024 (Simplificado)
  let inss = 0;
  if (salary <= 1412) inss = salary * 0.075;
  else if (salary <= 2666.68) inss = salary * 0.09;
  else if (salary <= 4000.03) inss = salary * 0.12;
  else inss = Math.min(salary * 0.14, 908.85); // Teto aproximado

  items.push({ code: 300, description: 'INSS', type: 'DEDUCTION', amount: Math.round(inss * 100) / 100 });

  // Cálculo IRRF (Simplificado - sem considerar dependentes)
  const baseIrrf = salary - inss;
  let irrf = 0;
  if (baseIrrf > 4664.68) irrf = baseIrrf * 0.275 - 896;
  else if (baseIrrf > 3751.06) irrf = baseIrrf * 0.225 - 651;
  else if (baseIrrf > 2826.66) irrf = baseIrrf * 0.15 - 370;
  else if (baseIrrf > 2112) irrf = baseIrrf * 0.075 - 158;

  if (irrf > 0) {
    items.push({ code: 400, description: 'IRRF', type: 'DEDUCTION', amount: Math.round(irrf * 100) / 100 });
  }

  // FGTS (Provento informativo / Encargo empresa)
  const fgts = salary * 0.08;

  const totalEarnings = salary;
  const totalDeductions = inss + irrf;
  const netSalary = totalEarnings - totalDeductions;

  return {
    baseSalary: salary,
    inss,
    irrf,
    fgts,
    netSalary: Math.round(netSalary * 100) / 100,
    items
  };
};
