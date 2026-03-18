export interface Tenant {
  id: string;
  name: string;
  cnpj: string;
  subscription: {
    status: 'active' | 'past_due' | 'suspended';
    startDate: string;
    expiryDate: string;
    monthlyFee: number;
    additionalCosts: Array<{ desc: string; value: number; date: string }>;
  };
  employeeCount: number;
}

export interface Store {
  id: string;
  name: string;
  cnpj: string;
  tenantId: string;
}

export interface Employee {
  id: string;
  tenantId: string;
  storeId: string;
  storeName: string;
  name: string;
  cpf: string;
  gender: 'M' | 'F';
  birthDate: string;
  role: string;
  salary: number;
  customFields: Record<string, any>;
}

export interface Certificate {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  cid: string;
  days: number;
  fileUrl?: string;
  fileName?: string;
}

export interface PayrollEntry {
  employeeId: string;
  employeeName: string;
  storeName: string;
  salary: number;
  absences: number;
  certificateDays: number;
  deductions: number;
  netSalary: number;
}

export type UserRole = 'superadmin' | 'tenant';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  name: string;
}
