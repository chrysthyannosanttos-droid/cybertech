import { Employee } from '@/types';
import { MOCK_BENEFITS, MOCK_EMPLOYEE_BENEFITS } from '@/data/mockData';

export const calcEmployeeCost = (emp: Employee) => {
  let cost = emp.salary || 0;
  const empBenefits = MOCK_EMPLOYEE_BENEFITS.filter(eb => eb.employeeId === emp.id);
  empBenefits.forEach(eb => {
    const b = MOCK_BENEFITS.find(b => b.id === eb.benefitId);
    if (!b) return;
    const val = eb.overrideValue || b.defaultValue;
    if (b.type === 'FIXED_VALUE') {
      cost += val;
    } else if (b.type === 'PERCENTAGE') {
      cost += emp.salary * val;
    }
  });
  return cost;
};
