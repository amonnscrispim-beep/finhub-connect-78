import { 
  AmortizationSystem, 
  InterestPeriod,
  ExtraAmortizationType
} from '@/types/client';

// ============================================
// TYPES
// ============================================

export interface ExtraAmortization {
  id: string;
  afterInstallments: number[];
  amount: number;
  type: ExtraAmortizationType;
}

export interface InstallmentRow {
  number: number;
  date: string;
  initialBalance: number;
  payment: number;
  interest: number;
  amortization: number;
  finalBalance: number;
  extraAmortization?: number;
  monthlyFees?: number;
}

export interface SimulationSummary {
  principalValue: number;
  totalPayment: number;
  totalInterest: number;
  totalFees: number;
  totalCorrection: number;
  interestRate: number;
  interestPeriod: InterestPeriod;
  installmentsCount: number;
  firstInstallmentValue: number;
  lastInstallmentValue: number;
  lastInstallmentDate: string;
  system: AmortizationSystem;
}

export interface AuditLog {
  monthlyRate: number;
  monthlyRatePercent: string;
  rateConversionMethod: string;
  installmentDetails: AuditInstallmentDetail[];
}

export interface AuditInstallmentDetail {
  number: number;
  balanceBefore: number;
  interest: number;
  amortization: number;
  payment: number;
  balanceAfter: number;
  extraAmortization?: number;
  balanceAfterExtra?: number;
  note?: string;
}

// ============================================
// RATE CONVERSION (Banking Standard - Compound Interest ONLY)
// ============================================

/**
 * Convert annual rate to monthly effective rate using compound interest equivalence
 * Formula: i_m = (1 + i_a)^(1/12) - 1
 * NEVER use i_a/12 (simple division)
 */
export function annualToMonthlyRate(annualRate: number): number {
  const annualDecimal = annualRate / 100;
  return Math.pow(1 + annualDecimal, 1 / 12) - 1;
}

/**
 * Get monthly rate from input rate based on period
 */
export function getMonthlyRate(rate: number, period: InterestPeriod): number {
  if (period === 'a.m.') {
    return rate / 100;
  }
  // a.a. -> convert using compound interest
  return annualToMonthlyRate(rate);
}

// ============================================
// DATE UTILITIES
// ============================================

export function formatMonthYear(month: number, year: number): string {
  return `${String(month).padStart(2, '0')}/${year}`;
}

export function addMonths(month: number, year: number, monthsToAdd: number): { month: number; year: number } {
  const totalMonths = (year * 12 + month - 1) + monthsToAdd;
  return {
    month: (totalMonths % 12) + 1,
    year: Math.floor(totalMonths / 12)
  };
}

// ============================================
// PRICE SYSTEM CALCULATIONS
// ============================================

/**
 * Calculate PMT (fixed payment) for PRICE system
 * Formula: PMT = PV * [ i * (1+i)^n ] / [ (1+i)^n - 1 ]
 */
export function calculatePMT(pv: number, rate: number, n: number): number {
  if (rate === 0) return pv / n;
  if (n <= 0) return pv;
  const factor = Math.pow(1 + rate, n);
  return pv * (rate * factor) / (factor - 1);
}

// ============================================
// SCHEDULE GENERATION WITHOUT EXTRAS (Clean baseline)
// ============================================

export function generateSchedule(
  principalValue: number,
  monthlyRate: number,
  installmentsCount: number,
  startMonth: number,
  startYear: number,
  system: AmortizationSystem,
  monthlyFees: number = 0
): InstallmentRow[] {
  const schedule: InstallmentRow[] = [];
  let balance = principalValue;

  if (system === 'PRICE') {
    const pmt = calculatePMT(principalValue, monthlyRate, installmentsCount);
    
    for (let i = 1; i <= installmentsCount; i++) {
      const { month, year } = addMonths(startMonth, startYear, i);
      const interest = balance * monthlyRate;
      let amortization = pmt - interest;
      
      // Last installment: adjust to zero balance exactly
      if (i === installmentsCount || amortization >= balance) {
        amortization = balance;
      }
      
      const newBalance = Math.max(0, balance - amortization);
      const payment = amortization + interest + monthlyFees;
      
      schedule.push({
        number: i,
        date: formatMonthYear(month, year),
        initialBalance: balance,
        payment,
        interest,
        amortization,
        finalBalance: newBalance,
        monthlyFees: monthlyFees > 0 ? monthlyFees : undefined
      });
      
      balance = newBalance;
      if (balance <= 0.01) break;
    }
  } else {
    // SAC: Constant amortization
    const constantAmortization = principalValue / installmentsCount;
    
    for (let i = 1; i <= installmentsCount; i++) {
      const { month, year } = addMonths(startMonth, startYear, i);
      const interest = balance * monthlyRate;
      let amortization = constantAmortization;
      
      // Last installment: adjust to zero balance exactly
      if (i === installmentsCount || amortization >= balance) {
        amortization = balance;
      }
      
      const newBalance = Math.max(0, balance - amortization);
      const payment = amortization + interest + monthlyFees;
      
      schedule.push({
        number: i,
        date: formatMonthYear(month, year),
        initialBalance: balance,
        payment,
        interest,
        amortization,
        finalBalance: newBalance,
        monthlyFees: monthlyFees > 0 ? monthlyFees : undefined
      });
      
      balance = newBalance;
      if (balance <= 0.01) break;
    }
  }

  return schedule;
}

// ============================================
// SCHEDULE WITH EXTRA AMORTIZATIONS
// Completely separate logic for PRAZO vs PARCELA modes
// ============================================

export interface GenerateScheduleWithExtrasResult {
  schedule: InstallmentRow[];
  audit: AuditLog;
}

export function generateScheduleWithExtras(
  principalValue: number,
  monthlyRate: number,
  installmentsCount: number,
  startMonth: number,
  startYear: number,
  system: AmortizationSystem,
  extraAmortizations: ExtraAmortization[],
  monthlyFees: number = 0
): InstallmentRow[] {
  const result = generateScheduleWithExtrasAndAudit(
    principalValue,
    monthlyRate,
    installmentsCount,
    startMonth,
    startYear,
    system,
    extraAmortizations,
    monthlyFees
  );
  return result.schedule;
}

export function generateScheduleWithExtrasAndAudit(
  principalValue: number,
  monthlyRate: number,
  installmentsCount: number,
  startMonth: number,
  startYear: number,
  system: AmortizationSystem,
  extraAmortizations: ExtraAmortization[],
  monthlyFees: number = 0
): GenerateScheduleWithExtrasResult {
  const schedule: InstallmentRow[] = [];
  const auditDetails: AuditInstallmentDetail[] = [];
  
  // Original values - CRITICAL for PRAZO mode
  const originalAmortizationSAC = principalValue / installmentsCount;
  const originalPMT = system === 'PRICE' ? calculatePMT(principalValue, monthlyRate, installmentsCount) : 0;
  
  // Create audit log
  const audit: AuditLog = {
    monthlyRate,
    monthlyRatePercent: (monthlyRate * 100).toFixed(6) + '%',
    rateConversionMethod: 'Compound: i_m = (1 + i_a)^(1/12) - 1',
    installmentDetails: auditDetails
  };

  // Build map of extras by installment number
  const extraMap = new Map<number, { amount: number; type: ExtraAmortizationType }>();
  extraAmortizations.forEach(extra => {
    extra.afterInstallments.forEach(num => {
      const existing = extraMap.get(num);
      if (existing) {
        existing.amount += extra.amount;
        existing.type = extra.type; // Last type wins if mixed
      } else {
        extraMap.set(num, { amount: extra.amount, type: extra.type });
      }
    });
  });

  let balance = principalValue;
  let installmentNumber = 0;
  
  // Current values (may change in PARCELA mode)
  let currentAmortizationSAC = originalAmortizationSAC;
  let currentPMT = originalPMT;
  
  // Track remaining installments for PARCELA mode
  let targetTotalInstallments = installmentsCount; // For PARCELA, this stays fixed
  
  const maxIterations = 1000;
  
  while (balance > 0.01 && installmentNumber < maxIterations) {
    installmentNumber++;
    
    const { month, year } = addMonths(startMonth, startYear, installmentNumber);
    
    // Step 1: Calculate interest on current balance
    const interest = balance * monthlyRate;
    
    // Step 2: Calculate amortization based on system and current values
    let amortization: number;
    let payment: number;

    if (system === 'PRICE') {
      amortization = currentPMT - interest;
      if (amortization > balance) {
        amortization = balance;
      }
      if (amortization < 0) {
        // Edge case: interest exceeds PMT (shouldn't happen normally)
        amortization = 0;
      }
      payment = amortization + interest + monthlyFees;
    } else {
      // SAC
      amortization = Math.min(currentAmortizationSAC, balance);
      payment = amortization + interest + monthlyFees;
    }

    // Step 3: Calculate balance after paying this installment
    let balanceAfterPayment = Math.max(0, balance - amortization);
    
    // Create the row
    const row: InstallmentRow = {
      number: installmentNumber,
      date: formatMonthYear(month, year),
      initialBalance: balance,
      payment,
      interest,
      amortization,
      finalBalance: balanceAfterPayment,
      monthlyFees: monthlyFees > 0 ? monthlyFees : undefined
    };

    // Audit entry
    const auditEntry: AuditInstallmentDetail = {
      number: installmentNumber,
      balanceBefore: balance,
      interest,
      amortization,
      payment,
      balanceAfter: balanceAfterPayment
    };

    // Step 4: Check for extra amortization AFTER paying this installment
    const extra = extraMap.get(installmentNumber);
    if (extra && balanceAfterPayment > 0.01) {
      const extraAmount = Math.min(extra.amount, balanceAfterPayment);
      row.extraAmortization = extraAmount;
      
      const balanceAfterExtra = Math.max(0, balanceAfterPayment - extraAmount);
      row.finalBalance = balanceAfterExtra;
      
      auditEntry.extraAmortization = extraAmount;
      auditEntry.balanceAfterExtra = balanceAfterExtra;
      
      // Step 5: Recalculate based on MODE
      if (extra.type === 'prazo') {
        // ===== MODE PRAZO: Keep original amortization/PMT, schedule ends earlier =====
        auditEntry.note = 'PRAZO: Mantendo amortização/PMT original, prazo reduz naturalmente';
        
        // For SAC: Keep using originalAmortizationSAC
        // For PRICE: Keep using originalPMT
        // Just let the loop continue with original values until balance zeros out
        
        if (system === 'SAC') {
          currentAmortizationSAC = originalAmortizationSAC;
        }
        // For PRICE, currentPMT is already set to originalPMT
        
      } else {
        // ===== MODE PARCELA: Keep same number of remaining installments, recalculate payment =====
        const installmentsPaid = installmentNumber;
        const remainingInstallments = Math.max(1, targetTotalInstallments - installmentsPaid);
        
        auditEntry.note = `PARCELA: Recalculando para ${remainingInstallments} parcelas restantes`;
        
        if (system === 'SAC') {
          // New constant amortization for remaining balance over remaining installments
          const newAmortization = balanceAfterExtra / remainingInstallments;
          currentAmortizationSAC = newAmortization;
          auditEntry.note += ` | Nova amortização base: R$ ${newAmortization.toFixed(2)}`;
        } else {
          // PRICE: Recalculate PMT for new balance and remaining installments
          if (balanceAfterExtra > 0 && remainingInstallments > 0) {
            const newPMT = calculatePMT(balanceAfterExtra, monthlyRate, remainingInstallments);
            currentPMT = newPMT;
            auditEntry.note += ` | Novo PMT: R$ ${newPMT.toFixed(2)}`;
          }
        }
      }
      
      balanceAfterPayment = balanceAfterExtra;
    }

    auditDetails.push(auditEntry);
    schedule.push(row);
    balance = balanceAfterPayment;
    
    if (balance <= 0.01) break;
  }

  // Adjust last installment for rounding (ensure exactly zero)
  if (schedule.length > 0) {
    const lastRow = schedule[schedule.length - 1];
    if (lastRow.finalBalance > 0 && lastRow.finalBalance < 1) {
      lastRow.amortization += lastRow.finalBalance;
      lastRow.payment += lastRow.finalBalance;
      lastRow.finalBalance = 0;
    }
  }

  return { schedule, audit };
}

// ============================================
// SUMMARY CALCULATION
// ============================================

export function calculateSummary(
  schedule: InstallmentRow[],
  principalValue: number,
  interestRate: number,
  interestPeriod: InterestPeriod,
  system: AmortizationSystem
): SimulationSummary {
  let totalPayment = 0;
  let totalInterest = 0;
  let totalFees = 0;
  
  for (const row of schedule) {
    totalPayment += row.payment + (row.extraAmortization || 0);
    totalInterest += row.interest;
    totalFees += row.monthlyFees || 0;
  }
  
  return {
    principalValue,
    totalPayment,
    totalInterest,
    totalFees,
    totalCorrection: 0,
    interestRate,
    interestPeriod,
    installmentsCount: schedule.length,
    firstInstallmentValue: schedule[0]?.payment || 0,
    lastInstallmentValue: schedule[schedule.length - 1]?.payment || 0,
    lastInstallmentDate: schedule[schedule.length - 1]?.date || '',
    system
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function parseInstallmentSequence(input: string, maxInstallment: number): number[] {
  const result: Set<number> = new Set();
  
  const parts = input.split(',').map(p => p.trim()).filter(p => p);
  
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(n => parseInt(n.trim(), 10));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
          if (i >= 1 && i <= maxInstallment) {
            result.add(i);
          }
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= maxInstallment) {
        result.add(num);
      }
    }
  }
  
  return Array.from(result).sort((a, b) => a - b);
}

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function formatPercentage(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value) + '%';
}

// ============================================
// TEST CASE WITH DETAILED AUDIT
// Case: PV 200.000 | SAC | 60 parcelas | 15% a.a. | amortização 20.000 após parcela 5
// ============================================

export function runTestCase(): { 
  base: { schedule: InstallmentRow[]; summary: SimulationSummary }; 
  prazo: { schedule: InstallmentRow[]; summary: SimulationSummary; audit: AuditLog }; 
  parcela: { schedule: InstallmentRow[]; summary: SimulationSummary; audit: AuditLog };
} {
  const pv = 200000;
  const annualRate = 15;
  const monthlyRate = annualToMonthlyRate(annualRate);
  const n = 60;
  const startMonth = 1;
  const startYear = 2025;
  
  console.log('=== TEST CASE: PV 200.000 | SAC | 60 parcelas | 15% a.a. ===');
  console.log('Monthly rate (compound):', (monthlyRate * 100).toFixed(6) + '%');
  console.log('Formula: i_m = (1 + 0.15)^(1/12) - 1 =', monthlyRate);
  
  // Without extras
  const scheduleBase = generateSchedule(pv, monthlyRate, n, startMonth, startYear, 'SAC');
  const summaryBase = calculateSummary(scheduleBase, pv, annualRate, 'a.a.', 'SAC');
  
  console.log('\n--- SEM AMORTIZAÇÃO EXTRA ---');
  console.log('Parcelas:', summaryBase.installmentsCount);
  console.log('Total a pagar:', formatCurrencyBRL(summaryBase.totalPayment));
  console.log('Total juros:', formatCurrencyBRL(summaryBase.totalInterest));
  console.log('1ª parcela:', formatCurrencyBRL(summaryBase.firstInstallmentValue));
  console.log('Última parcela:', formatCurrencyBRL(summaryBase.lastInstallmentValue));
  console.log('Parcela 5:', formatCurrencyBRL(scheduleBase[4]?.payment || 0));
  console.log('Parcela 6:', formatCurrencyBRL(scheduleBase[5]?.payment || 0));
  
  // With PRAZO mode
  const extrasPrazo: ExtraAmortization[] = [{
    id: 'test1',
    afterInstallments: [5],
    amount: 20000,
    type: 'prazo'
  }];
  
  const resultPrazo = generateScheduleWithExtrasAndAudit(pv, monthlyRate, n, startMonth, startYear, 'SAC', extrasPrazo);
  const summaryPrazo = calculateSummary(resultPrazo.schedule, pv, annualRate, 'a.a.', 'SAC');
  
  console.log('\n--- MODO PRAZO (reduz parcelas, mantém amortização) ---');
  console.log('Parcelas:', summaryPrazo.installmentsCount);
  console.log('Total a pagar:', formatCurrencyBRL(summaryPrazo.totalPayment));
  console.log('Total juros:', formatCurrencyBRL(summaryPrazo.totalInterest));
  console.log('Economia juros:', formatCurrencyBRL(summaryBase.totalInterest - summaryPrazo.totalInterest));
  console.log('Parcelas eliminadas:', summaryBase.installmentsCount - summaryPrazo.installmentsCount);
  console.log('Parcela 6 (após extra):', formatCurrencyBRL(resultPrazo.schedule[5]?.payment || 0));
  
  // Audit parcela 5
  const audit5Prazo = resultPrazo.audit.installmentDetails.find(a => a.number === 5);
  if (audit5Prazo) {
    console.log('\n  AUDIT Parcela 5 (PRAZO):');
    console.log('    Saldo antes:', formatCurrencyBRL(audit5Prazo.balanceBefore));
    console.log('    Juros:', formatCurrencyBRL(audit5Prazo.interest));
    console.log('    Amortização:', formatCurrencyBRL(audit5Prazo.amortization));
    console.log('    Parcela:', formatCurrencyBRL(audit5Prazo.payment));
    console.log('    Saldo após pagamento:', formatCurrencyBRL(audit5Prazo.balanceAfter));
    console.log('    Amortização extra:', formatCurrencyBRL(audit5Prazo.extraAmortization || 0));
    console.log('    Saldo após extra:', formatCurrencyBRL(audit5Prazo.balanceAfterExtra || 0));
    console.log('    Nota:', audit5Prazo.note);
  }
  
  // With PARCELA mode
  const extrasParcela: ExtraAmortization[] = [{
    id: 'test2',
    afterInstallments: [5],
    amount: 20000,
    type: 'parcela'
  }];
  
  const resultParcela = generateScheduleWithExtrasAndAudit(pv, monthlyRate, n, startMonth, startYear, 'SAC', extrasParcela);
  const summaryParcela = calculateSummary(resultParcela.schedule, pv, annualRate, 'a.a.', 'SAC');
  
  console.log('\n--- MODO PARCELA (mantém prazo, reduz valor) ---');
  console.log('Parcelas:', summaryParcela.installmentsCount);
  console.log('Total a pagar:', formatCurrencyBRL(summaryParcela.totalPayment));
  console.log('Total juros:', formatCurrencyBRL(summaryParcela.totalInterest));
  console.log('Economia juros:', formatCurrencyBRL(summaryBase.totalInterest - summaryParcela.totalInterest));
  console.log('Parcela 6 SEM extra:', formatCurrencyBRL(scheduleBase[5]?.payment || 0));
  console.log('Parcela 6 COM extra (modo parcela):', formatCurrencyBRL(resultParcela.schedule[5]?.payment || 0));
  console.log('Redução da parcela 6:', formatCurrencyBRL((scheduleBase[5]?.payment || 0) - (resultParcela.schedule[5]?.payment || 0)));
  
  // Audit parcela 5
  const audit5Parcela = resultParcela.audit.installmentDetails.find(a => a.number === 5);
  if (audit5Parcela) {
    console.log('\n  AUDIT Parcela 5 (PARCELA):');
    console.log('    Saldo antes:', formatCurrencyBRL(audit5Parcela.balanceBefore));
    console.log('    Juros:', formatCurrencyBRL(audit5Parcela.interest));
    console.log('    Amortização:', formatCurrencyBRL(audit5Parcela.amortization));
    console.log('    Parcela:', formatCurrencyBRL(audit5Parcela.payment));
    console.log('    Saldo após pagamento:', formatCurrencyBRL(audit5Parcela.balanceAfter));
    console.log('    Amortização extra:', formatCurrencyBRL(audit5Parcela.extraAmortization || 0));
    console.log('    Saldo após extra:', formatCurrencyBRL(audit5Parcela.balanceAfterExtra || 0));
    console.log('    Nota:', audit5Parcela.note);
  }
  
  // Audit parcelas 6,7,8 for PARCELA mode
  console.log('\n  AUDIT Parcelas 6,7,8 (PARCELA mode):');
  for (let i = 6; i <= 8; i++) {
    const audit = resultParcela.audit.installmentDetails.find(a => a.number === i);
    if (audit) {
      console.log(`    Parcela ${i}: Saldo=${formatCurrencyBRL(audit.balanceBefore)}, Juros=${formatCurrencyBRL(audit.interest)}, Amort=${formatCurrencyBRL(audit.amortization)}, Pmt=${formatCurrencyBRL(audit.payment)}, SaldoFinal=${formatCurrencyBRL(audit.balanceAfter)}`);
    }
  }

  return {
    base: { schedule: scheduleBase, summary: summaryBase },
    prazo: { schedule: resultPrazo.schedule, summary: summaryPrazo, audit: resultPrazo.audit },
    parcela: { schedule: resultParcela.schedule, summary: summaryParcela, audit: resultParcela.audit }
  };
}
