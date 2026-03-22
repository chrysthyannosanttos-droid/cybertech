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
  photo_references?: string[]; // Multiple face reference images
  // Work schedule (Jornada)
  jornadaEntrada?: string;      // e.g. "08:00"
  jornadaSaidaAlmoco?: string;  // e.g. "12:00"
  jornadaRetornoAlmoco?: string;// e.g. "13:00"
  jornadaSaida?: string;        // e.g. "17:00"
  geofenceRadius?: number;      // in meters (0 = disabled)
  geofenceLat?: number;
  geofenceLng?: number;
  customFields: Record<string, unknown>;
}

export interface TimeEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  type: 'ENTRY' | 'EXIT' | 'INTERVAL_START' | 'INTERVAL_END';
  timestamp: string;
  latitude?: number;
  longitude?: number;
  photo_url?: string;
  validated: boolean;
  tenant_id: string;
  adjusted?: boolean;
  adjusted_by?: string;
  adjustment_reason?: string;
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
