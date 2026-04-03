/**
 * Motor de Cálculo de Folha de Pagamento — Legado
 * Re-exports do cltEngine.ts para compatibilidade com código existente
 */
export { calculatePayroll, calcINSS, calcIRRF, calcFGTS } from './cltEngine';
export type { PayrollResult as PayrollCalculation } from './cltEngine';
