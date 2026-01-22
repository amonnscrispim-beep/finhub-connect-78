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
  totalCorrection: number; // Reserved for future inflation correction
  interestRate: number;
  interestPeriod: InterestPeriod;
  installmentsCount: number;
  firstInstallmentValue: number;
  lastInstallmentValue: number;
  lastInstallmentDate: string;
  system: AmortizationSystem;
}

// ============================================
// RATE CONVERSION (Banking Standard)
// ============================================

/**
 * Convert annual rate to monthly effective rate using compound interest
 * Formula: i_m = (1 + i_a)^(1/12) - 1
 */
export function annualToMonthlyRate(annualRate: number): number {
  return Math.pow(1 + annualRate / 100, 1 / 12) - 1;
}

/**
 * Get monthly rate from input rate based on period
 */
export function getMonthlyRate(rate: number, period: InterestPeriod): number {
  if (period === 'a.m.') {
    return rate / 100;
  }
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

/**
 * Calculate remaining installments given balance and PMT for PRICE
 * Solving for n: n = ln(PMT / (PMT - balance * rate)) / ln(1 + rate)
 */
function calculateRemainingInstallmentsPRICE(balance: number, pmt: number, rate: number): number {
  if (rate === 0) return Math.ceil(balance / pmt);
  const numerator = pmt / (pmt - balance * rate);
  if (numerator <= 0) return 1;
  return Math.ceil(Math.log(numerator) / Math.log(1 + rate));
}

// ============================================
// SCHEDULE GENERATION WITHOUT EXTRAS
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
      
      // Last installment adjustment
      if (i === installmentsCount) {
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
    }
  } else {
    // SAC: Constant amortization
    const constantAmortization = principalValue / installmentsCount;
    
    for (let i = 1; i <= installmentsCount; i++) {
      const { month, year } = addMonths(startMonth, startYear, i);
      const interest = balance * monthlyRate;
      let amortization = constantAmortization;
      
      // Last installment adjustment
      if (i === installmentsCount) {
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
    }
  }

  return schedule;
}

// ============================================
// SCHEDULE GENERATION WITH EXTRA AMORTIZATIONS
// Banking Standard Implementation
// ============================================

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
  const schedule: InstallmentRow[] = [];
  let balance = principalValue;
  
  // Original values (important for PRAZO mode)
  const originalAmortizationSAC = principalValue / installmentsCount;
  let currentPMT = system === 'PRICE' ? calculatePMT(principalValue, monthlyRate, installmentsCount) : 0;
  let remainingInstallments = installmentsCount;

  // Create a map of extra amortizations by installment number
  const extraMap = new Map<number, { amount: number; type: ExtraAmortizationType }>();
  extraAmortizations.forEach(extra => {
    extra.afterInstallments.forEach(num => {
      const existing = extraMap.get(num);
      if (existing) {
        existing.amount += extra.amount;
        // If mixed types, prioritize the current one (last wins)
        existing.type = extra.type;
      } else {
        extraMap.set(num, { amount: extra.amount, type: extra.type });
      }
    });
  });

  let installmentNumber = 0;
  let currentAmortizationSAC = originalAmortizationSAC;
  
  // Safety limit to prevent infinite loops
  const maxIterations = 1000;
  
  while (balance > 0.01 && installmentNumber < maxIterations) {
    installmentNumber++;
    remainingInstallments = Math.max(1, remainingInstallments);
    
    const { month, year } = addMonths(startMonth, startYear, installmentNumber);
    
    const interest = balance * monthlyRate;
    let amortization: number;
    let payment: number;

    if (system === 'PRICE') {
      // PRICE: Use current PMT
      amortization = currentPMT - interest;
      // Ensure we don't amortize more than balance
      if (amortization > balance) {
        amortization = balance;
      }
      payment = amortization + interest + monthlyFees;
    } else {
      // SAC: Use current constant amortization
      amortization = Math.min(currentAmortizationSAC, balance);
      payment = amortization + interest + monthlyFees;
    }

    let newBalance = Math.max(0, balance - amortization);
    
    const row: InstallmentRow = {
      number: installmentNumber,
      date: formatMonthYear(month, year),
      initialBalance: balance,
      payment,
      interest,
      amortization,
      finalBalance: newBalance,
      monthlyFees: monthlyFees > 0 ? monthlyFees : undefined
    };

    // Check for extra amortization AFTER paying this installment
    const extra = extraMap.get(installmentNumber);
    if (extra && newBalance > 0) {
      const extraAmount = Math.min(extra.amount, newBalance);
      row.extraAmortization = extraAmount;
      const balanceAfterExtra = Math.max(0, newBalance - extraAmount);
      row.finalBalance = balanceAfterExtra;
      
      // Recalculate based on amortization type
      if (extra.type === 'prazo') {
        // MODE A: REDUCE TERM - Keep original amortization/PMT pattern
        // For SAC: Keep using originalAmortizationSAC
        // For PRICE: Keep using currentPMT
        // The schedule naturally ends earlier
        
        if (system === 'SAC') {
          // Keep original amortization, installments reduce naturally
          currentAmortizationSAC = originalAmortizationSAC;
          // Calculate new remaining installments based on balance
          remainingInstallments = Math.ceil(balanceAfterExtra / originalAmortizationSAC);
        } else {
          // PRICE: Keep same PMT, calculate new N
          if (balanceAfterExtra > 0) {
            remainingInstallments = calculateRemainingInstallmentsPRICE(balanceAfterExtra, currentPMT, monthlyRate);
          }
        }
      } else {
        // MODE B: REDUCE PAYMENT - Keep same number of remaining installments
        // Recalculate new amortization/PMT for remaining balance
        
        const installmentsPaid = installmentNumber;
        const originalRemaining = installmentsCount - installmentsPaid;
        const newRemaining = Math.max(1, originalRemaining);
        remainingInstallments = newRemaining;
        
        if (system === 'SAC') {
          // New constant amortization for remaining balance
          currentAmortizationSAC = balanceAfterExtra / newRemaining;
        } else {
          // PRICE: Recalculate PMT for new balance and remaining installments
          if (balanceAfterExtra > 0 && newRemaining > 0) {
            currentPMT = calculatePMT(balanceAfterExtra, monthlyRate, newRemaining);
          }
        }
      }
      
      newBalance = balanceAfterExtra;
    }

    schedule.push(row);
    balance = newBalance;
    remainingInstallments--;
    
    if (balance <= 0.01) break;
  }

  // Adjust last installment for rounding
  if (schedule.length > 0) {
    const lastRow = schedule[schedule.length - 1];
    if (lastRow.finalBalance > 0 && lastRow.finalBalance < 1) {
      lastRow.amortization += lastRow.finalBalance;
      lastRow.payment += lastRow.finalBalance;
      lastRow.finalBalance = 0;
    }
  }

  return schedule;
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
    totalCorrection: 0, // Reserved for future inflation correction feature
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

/**
 * Parse installment sequence string (e.g., "5,8,12,20-30")
 */
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

/**
 * Format currency in Brazilian Real
 */
export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value) + '%';
}

// ============================================
// TEST CASE VALIDATION (Development only)
// Case: PV 200.000 | SAC | 60 parcelas | 15% a.a. | amortização 20.000 após parcela 5
// ============================================

export function runTestCase(): void {
  const pv = 200000;
  const annualRate = 15;
  const monthlyRate = annualToMonthlyRate(annualRate);
  const n = 60;
  const startMonth = 1;
  const startYear = 2025;
  
  console.log('=== TEST CASE: PV 200.000 | SAC | 60 parcelas | 15% a.a. ===');
  console.log('Monthly rate:', (monthlyRate * 100).toFixed(4) + '%');
  
  // Without extras
  const scheduleBase = generateSchedule(pv, monthlyRate, n, startMonth, startYear, 'SAC');
  const summaryBase = calculateSummary(scheduleBase, pv, annualRate, 'a.a.', 'SAC');
  
  console.log('\n--- SEM AMORTIZAÇÃO EXTRA ---');
  console.log('Parcelas:', summaryBase.installmentsCount);
  console.log('Total a pagar:', formatCurrencyBRL(summaryBase.totalPayment));
  console.log('Total juros:', formatCurrencyBRL(summaryBase.totalInterest));
  console.log('1ª parcela:', formatCurrencyBRL(summaryBase.firstInstallmentValue));
  console.log('Última parcela:', formatCurrencyBRL(summaryBase.lastInstallmentValue));
  
  // With PRAZO mode
  const extrasPrazo: ExtraAmortization[] = [{
    id: 'test1',
    afterInstallments: [5],
    amount: 20000,
    type: 'prazo'
  }];
  
  const schedulePrazo = generateScheduleWithExtras(pv, monthlyRate, n, startMonth, startYear, 'SAC', extrasPrazo);
  const summaryPrazo = calculateSummary(schedulePrazo, pv, annualRate, 'a.a.', 'SAC');
  
  console.log('\n--- MODO PRAZO (reduz parcelas) ---');
  console.log('Parcelas:', summaryPrazo.installmentsCount);
  console.log('Total a pagar:', formatCurrencyBRL(summaryPrazo.totalPayment));
  console.log('Total juros:', formatCurrencyBRL(summaryPrazo.totalInterest));
  console.log('Economia juros:', formatCurrencyBRL(summaryBase.totalInterest - summaryPrazo.totalInterest));
  console.log('Parcelas eliminadas:', summaryBase.installmentsCount - summaryPrazo.installmentsCount);
  
  // With PARCELA mode
  const extrasParcela: ExtraAmortization[] = [{
    id: 'test2',
    afterInstallments: [5],
    amount: 20000,
    type: 'parcela'
  }];
  
  const scheduleParcela = generateScheduleWithExtras(pv, monthlyRate, n, startMonth, startYear, 'SAC', extrasParcela);
  const summaryParcela = calculateSummary(scheduleParcela, pv, annualRate, 'a.a.', 'SAC');
  
  console.log('\n--- MODO PARCELA (reduz valor) ---');
  console.log('Parcelas:', summaryParcela.installmentsCount);
  console.log('Total a pagar:', formatCurrencyBRL(summaryParcela.totalPayment));
  console.log('Total juros:', formatCurrencyBRL(summaryParcela.totalInterest));
  console.log('Economia juros:', formatCurrencyBRL(summaryBase.totalInterest - summaryParcela.totalInterest));
  console.log('Nova 6ª parcela:', formatCurrencyBRL(scheduleParcela[5]?.payment || 0));
}
