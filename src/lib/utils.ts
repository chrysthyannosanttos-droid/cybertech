import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isValidCPF(cpf: string) {
  const cleanCPF = cpf.replace(/[^\d]+/g, '');
  if (cleanCPF.length !== 11 || !!cleanCPF.match(/(\d)\1{10}/)) return false;
  const split = cleanCPF.split('');
  let v1 = 0, v2 = 0;
  for (let i = 0, p = 10; i < 9; i++, p--) v1 += parseInt(split[i]) * p;
  v1 = ((v1 * 10) % 11) % 10;
  if (parseInt(split[9]) !== v1) return false;
  for (let i = 0, p = 11; i < 10; i++, p--) v2 += parseInt(split[i]) * p;
  v2 = ((v2 * 10) % 11) % 10;
  return parseInt(split[10]) === v2;
}

export function formatCPF(cpf: string) {
  const v = cpf.replace(/\D/g, '');
  return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function parseNumeric(val: any) {
  if (val === undefined || val === null || val === '') return 0;
  
  // Converte para string e remove espaços e R$
  let s = String(val).replace('R$', '').replace(/\s/g, '');
  
  // Lógica inteligente para detectar separadores
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } 
  else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  
  let num = Number(s);
  
  // REGRA DE SEGURANÇA (IA DE IMPORTAÇÃO):
  // Se o número for absurdamente grande (ex: 141200) e não tiver vírgula original no Excel,
  // ou se passar de 30.000,00 (limite de segurança comum), dividimos por 100.
  // Isso resolve o problema de salários de 8 dígitos importados erroneamente.
  if (!isNaN(num) && num > 30000) {
    num = num / 100;
  }
  
  return isNaN(num) ? 0 : num;
}

export function parseExcelDate(val: any) {
  if (!val) return null;
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    const date = new Date((val - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    const parts = val.split(/[/-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) return val;
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return null;
}
