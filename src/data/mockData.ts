import { Tenant, Store, Employee, Certificate } from '@/types';

export const MOCK_STORES: Store[] = [
  { id: 's1', name: 'SUPER ATACADO ANTARES', cnpj: '38.313.674/0001-19', tenantId: 't1' },
  { id: 's2', name: 'SUPER ATACADO MARECHAL', cnpj: '53.427.842/0001-90', tenantId: 't1' },
  { id: 's3', name: 'SUPER VAREJO ATACADO VILLAGE', cnpj: '54.442.568/0001-91', tenantId: 't1' },
  { id: 's4', name: 'SUPER ATACADO GRACILIANO', cnpj: '58.457.885/0001-32', tenantId: 't1' },
  { id: 's5', name: 'SUPER ATACADO PRAIA', cnpj: '54.778.190/0001-00', tenantId: 't1' },
  { id: 's6', name: 'SUPER ATACADO PARIPUEIRA', cnpj: '54.014.369/0001-82', tenantId: 't1' },
];

export const MOCK_TENANTS: Tenant[] = [
  {
    id: 't1',
    name: 'Super Atacado Group',
    cnpj: '12.345.678/0001-90',
    subscription: {
      status: 'active',
      startDate: '2024-01-15',
      expiryDate: '2026-12-15',
      monthlyFee: 2500,
      additionalCosts: [
        { desc: 'Módulo extra de relatórios', value: 300, date: '2025-11-01' },
      ],
    },
    employeeCount: 247,
  },
  {
    id: 't2',
    name: 'Rede Bom Preço',
    cnpj: '98.765.432/0001-10',
    subscription: {
      status: 'active',
      startDate: '2024-06-01',
      expiryDate: '2026-06-01',
      monthlyFee: 1800,
      additionalCosts: [],
    },
    employeeCount: 132,
  },
  {
    id: 't3',
    name: 'Mercado Central Ltda',
    cnpj: '11.222.333/0001-44',
    subscription: {
      status: 'past_due',
      startDate: '2023-03-10',
      expiryDate: '2025-12-10',
      monthlyFee: 1200,
      additionalCosts: [],
    },
    employeeCount: 58,
  },
  {
    id: 't4',
    name: 'Distribuidora Norte',
    cnpj: '55.666.777/0001-88',
    subscription: {
      status: 'suspended',
      startDate: '2024-02-01',
      expiryDate: '2025-02-01',
      monthlyFee: 900,
      additionalCosts: [],
    },
    employeeCount: 23,
  },
];

const firstNames = ['Ana', 'Carlos', 'Maria', 'João', 'Fernanda', 'Pedro', 'Juliana', 'Lucas', 'Patrícia', 'Roberto', 'Camila', 'Marcos', 'Aline', 'Felipe', 'Bruna'];
const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Almeida', 'Rodrigues'];
const roles = ['Operador de Caixa', 'Repositor', 'Gerente', 'Subgerente', 'Fiscal de Loja', 'Açougueiro', 'Padeiro', 'Conferente', 'Auxiliar Administrativo'];

function randomCPF() {
  const n = () => Math.floor(Math.random() * 10);
  return `${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}-${n()}${n()}`;
}

export const MOCK_EMPLOYEES: Employee[] = Array.from({ length: 48 }, (_, i) => {
  const store = MOCK_STORES[i % MOCK_STORES.length];
  const gender = Math.random() > 0.45 ? 'M' as const : 'F' as const;
  const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
  const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
  return {
    id: `e${i + 1}`,
    tenantId: 't1',
    storeId: store.id,
    storeName: store.name,
    name: `${fn} ${ln}`,
    cpf: randomCPF(),
    gender,
    birthDate: `19${80 + Math.floor(Math.random() * 20)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
    role: roles[Math.floor(Math.random() * roles.length)],
    salary: 1500 + Math.floor(Math.random() * 3500),
    customFields: {},
  };
});

const cids = ['J06', 'M54', 'K29', 'R10', 'S62', 'J11', 'G43', 'F32', 'K59', 'M79'];

export const MOCK_CERTIFICATES: Certificate[] = Array.from({ length: 18 }, (_, i) => {
  const emp = MOCK_EMPLOYEES[Math.floor(Math.random() * MOCK_EMPLOYEES.length)];
  return {
    id: `c${i + 1}`,
    employeeId: emp.id,
    employeeName: emp.name,
    date: `2026-${String(Math.floor(Math.random() * 3) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
    cid: cids[Math.floor(Math.random() * cids.length)],
    days: Math.floor(Math.random() * 5) + 1,
  };
});

export const MOCK_MRR_DATA = [
  { month: 'Out', value: 5200 },
  { month: 'Nov', value: 5500 },
  { month: 'Dez', value: 5800 },
  { month: 'Jan', value: 6100 },
  { month: 'Fev', value: 6400 },
  { month: 'Mar', value: 6400 },
];
