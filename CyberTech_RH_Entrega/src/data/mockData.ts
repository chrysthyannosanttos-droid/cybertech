import { Tenant, Store, Employee, Certificate, Benefit, EmployeeBenefit, User, ServiceProvider, AuditLog, Rescission } from '@/types';

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
export const ROLES = [
  'FISCAL PREVENCAO DE PERDAS',
  'CONFERENTE DE CARGAS E DESCARGA',
  'BALCONISTA DE FRIOS',
  'BALCONISTA DE ACOUGUE',
  'FISCAL DE PREVENCAO DE PERDAS',
  'ASSISTENTE DE MARKETING',
  'REPOSITOR DE HORTI',
  'ESTOQUISTA',
  'TESOUREIRA',
  'GERENTE FINANCEIRO',
  'OPERADOR DE HIPERMERCADO',
  'ASSISTENTE DE PRECIFICAÇÃO',
  'JOVEM APRENDIZ',
  'COMPRADOR',
  'FISCAL DE CAIXA',
  'SUPERVISOR DE LOJA',
  'AUX DE COZINHA',
  'ANALISTA FISCAL',
  'REPOSITOR DE FRIOS',
  'ANALISTA DE RECURSOS HUMANOS',
  'GERENTE DE COMPRAS',
  'SUPERVISOR DE HORTI',
  'ANALISTA DE TECNOLOGIA DA INFORMAÇÃO',
  'BALCONISTA DE PADARIA',
  'REPOSITOR',
  'COZINHEIRO SENIOR',
  'OPERADOR DE CÂMARA FRIA',
  'COMPRADOR SENIOR',
  'ATENDIMENTO AO CLIENTE',
  'ANALISTA ADMINISTRATIVO',
  'SUPERVISOR DE FRIOS',
  'AUXILIAR DE PADARIA',
  'CHAPEIRO',
  'BALCONISTA DE RESTAURANTE',
  'REPOSITORA',
  'FISCAL PREVENÇÃO DE PERDAS',
  'AÇOUGUEIRO',
  'SEGURANÇA',
  'BALCONISTA AÇOUGUE',
  'PADEIRO',
  'TÉCNICO DE MANUTENÇÃO',
  'ASSISTENTE DE TI',
  'AUX. DE COZINHA',
  'MOTORISTA',
  'SUPERVISOR DE LOGÍSTICA',
  'COZINHEIRO',
  'JOVEM APRENDIZ ADMINISTRATIVO',
  'CONFEITEIRO',
  'GERENTE DE LOJA',
  'BALCONISTA DE AÇOUGUE',
  'PADEIRO/PASTELEIRO',
  'COMPRADOR SÊNIOR',
  'SUB GERENTE',
  'GERENTE DE AÇOUGUE',
  'REPOSITOR HORTI',
  'ASSISTENTE DE CADASTRO',
  'AUXILIAR DE CONFEITARIA',
  'ASSISTENTE FISCAL',
  'BALCONISTA DE FRIOS/NGS'
];
const departments = ['Vendas', 'Açougue', 'Padaria', 'Estoque', 'Frente de Caixa', 'Administrativo', 'Gerência'];

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
    admissionDate: `202${Math.floor(Math.random() * 4)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
    department: departments[Math.floor(Math.random() * departments.length)],
    role: ROLES[Math.floor(Math.random() * ROLES.length)],
    status: Math.random() > 0.1 ? 'ACTIVE' : 'INACTIVE',
    salary: 1500 + Math.floor(Math.random() * 3500),
    cbo: '4211-25',
    contaItau: '00000-0',
    insalubridade: Math.random() > 0.5 ? 260.40 : 0,
    periculosidade: Math.random() > 0.8 ? (1500 + Math.floor(Math.random() * 3500)) * 0.3 : 0,
    gratificacao: Math.floor(Math.random() * 500),
    valeTransporte: 250,
    valeRefeicao: 450,
    flexivel: Math.floor(Math.random() * 200),
    mobilidade: Math.floor(Math.random() * 100),
    valeFlexivel: Math.floor(Math.random() * 150),
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

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Administrador TI', email: 'admin@superatacado.com', role: 'superadmin' },
  { id: 'u2', name: 'João Silva', email: 'joao.hr@superatacado.com', role: 'tenant', tenantId: 't1' },
];

export const MOCK_MRR_DATA = [
  { month: 'Out', value: 5200 },
  { month: 'Nov', value: 5500 },
  { month: 'Dez', value: 5800 },
  { month: 'Jan', value: 6100 },
  { month: 'Fev', value: 6400 },
  { month: 'Mar', value: 6400 },
];

export const MOCK_BENEFITS: Benefit[] = [
  { id: 'b1', tenantId: 't1', name: 'Vale Transporte', type: 'FIXED_VALUE', defaultValue: 250, isActive: true },
  { id: 'b2', tenantId: 't1', name: 'Vale Refeição', type: 'FIXED_VALUE', defaultValue: 450, isActive: true },
  { id: 'b3', tenantId: 't1', name: 'Insalubridade', type: 'PERCENTAGE', defaultValue: 0.20, isActive: true },
  { id: 'b4', tenantId: 't1', name: 'Periculosidade', type: 'PERCENTAGE', defaultValue: 0.30, isActive: true },
  { id: 'b5', tenantId: 't1', name: 'Plano de Saúde', type: 'FIXED_VALUE', defaultValue: 150, isActive: true },
];

export const MOCK_EMPLOYEE_BENEFITS: EmployeeBenefit[] = [];

// Generate random benefits for employees
MOCK_EMPLOYEES.forEach(emp => {
  if (Math.random() > 0.2) {
    MOCK_EMPLOYEE_BENEFITS.push({ id: `eb_${emp.id}_b1`, employeeId: emp.id, benefitId: 'b1' });
  }
  if (Math.random() > 0.1) {
    MOCK_EMPLOYEE_BENEFITS.push({ id: `eb_${emp.id}_b2`, employeeId: emp.id, benefitId: 'b2' });
  }
  if (emp.role === 'Açougueiro') {
    MOCK_EMPLOYEE_BENEFITS.push({ id: `eb_${emp.id}_b3`, employeeId: emp.id, benefitId: 'b3' });
  }
});

export const MOCK_SERVICE_PROVIDERS: ServiceProvider[] = [
  {
    id: 'sp1',
    tenantId: 't1',
    name: 'Limpeza & Cia',
    cnpj: '11.222.333/0001-44',
    email: 'contato@limpezacia.com.br',
    phone: '(11) 99999-8888',
    startDate: '2024-01-01',
    endDate: '2026-03-25', // Near expiry for testing alert
    contractValue: 5000,
    duties: 'Limpeza das áreas comuns e banheiros',
    observations: 'Frequência: Diária (Seg-Sex)',
    additionalCosts: [],
  },
  {
    id: 'sp2',
    tenantId: 't1',
    name: 'Segurança Total',
    cnpj: '55.666.777/0001-88',
    email: 'comercial@segurancatotal.com',
    phone: '(11) 97777-6666',
    startDate: '2024-02-01',
    endDate: '2025-12-31',
    contractValue: 12000,
    duties: 'Monitoramento 24h e vigilância armada',
    observations: 'Equipamentos inclusos: 5 câmeras e sensores de movimento',
    additionalCosts: [
      { desc: 'Taxa extra de instalação', value: 500, date: '2025-01-10' },
    ],
  },
];

export const MOCK_RESCISSIONS: Rescission[] = [];

export const getAuditLogs = (): AuditLog[] => {
  const logs = localStorage.getItem('audit_logs');
  return logs ? JSON.parse(logs) : [];
};

export const addAuditLog = (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
  const logs = getAuditLogs();
  const newLog: AuditLog = {
    ...log,
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem('audit_logs', JSON.stringify([newLog, ...logs]));
};

