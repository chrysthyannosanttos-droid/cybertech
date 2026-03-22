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
  gender: 'M' | 'F' | 'OTHER';
  birthDate: string;
  admissionDate: string;
  department: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
  salary: number;
  cbo?: string;
  contaItau?: string;
  insalubridade?: number;
  periculosidade?: number;
  gratificacao?: number;
  valeTransporte?: number;
  valeRefeicao?: number;
  flexivel?: number;
  mobilidade?: number;
  valeFlexivel?: number; // Added to match "FLEXIVEL" in the user request
  photo_reference_url?: string;
  customFields: Record<string, unknown>;
}

export interface ServiceProvider {
  id: string;
  tenantId: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  startDate: string;
  endDate: string;
  contractValue: number;
  duties?: string;
  observations?: string;
  additionalCosts: Array<{ desc: string; value: number; date: string }>;
  contractUrl?: string;
  contractFileName?: string;
}

export interface Benefit {
  id: string;
  tenantId: string;
  name: string;
  type: 'FIXED_VALUE' | 'PERCENTAGE';
  defaultValue: number;
  isActive: boolean;
}

export interface EmployeeBenefit {
  id: string;
  employeeId: string;
  benefitId: string;
  overrideValue?: number;
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

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  tenantId?: string;
}

export interface Rescission {
  id: string;
  employeeId: string;
  employeeName: string;
  terminationDate: string;
  fgtsValue: number;
  rescissionValue: number;
  type: 'PEDIDO' | 'INDENIZADO' | 'ACORDO' | 'TRABALHADO' | 'JUSTA_CAUSA' | 'TERMINO_CONTRATO';
}
