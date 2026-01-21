import { 
  AmortizationSystem, 
  ExtraAmortization, 
  InstallmentRow, 
  SimulationSummary,
  InterestPeriod,
  AmortizationType
} from '@/types/debt-simulation';

// Convert annual rate to monthly effective rate
export function annualToMonthlyRate(annualRate: number): number {
  return Math.pow(1 + annualRate / 100, 1 / 12) - 1;
}

// Get monthly rate from input
export function getMonthlyRate(rate: number, period: InterestPeriod): number {
  if (period === 'a.m.') {
    return rate / 100;
  }
  return annualToMonthlyRate(rate);
}

// Format date as MM/YYYY
export function formatMonthYear(month: number, year: number): string {
  return `${String(month).padStart(2, '0')}/${year}`;
}

// Add months to a date
export function addMonths(month: number, year: number, monthsToAdd: number): { month: number; year: number } {
  const totalMonths = (year * 12 + month - 1) + monthsToAdd;
  return {
    month: (totalMonths % 12) + 1,
    year: Math.floor(totalMonths / 12)
  };
}

// Calculate PRICE PMT
export function calculatePMT(pv: number, rate: number, n: number): number {
  if (rate === 0) return pv / n;
  return pv * (rate / (1 - Math.pow(1 + rate, -n)));
}

// Generate amortization schedule without extra amortizations
export function generateSchedule(
  principalValue: number,
  monthlyRate: number,
  installmentsCount: number,
  startMonth: number,
  startYear: number,
  system: AmortizationSystem
): InstallmentRow[] {
  const schedule: InstallmentRow[] = [];
  let balance = principalValue;

  if (system === 'PRICE') {
    const pmt = calculatePMT(principalValue, monthlyRate, installmentsCount);
    
    for (let i = 1; i <= installmentsCount; i++) {
      const { month, year } = addMonths(startMonth, startYear, i);
      const interest = balance * monthlyRate;
      const amortization = pmt - interest;
      const newBalance = Math.max(0, balance - amortization);
      
      schedule.push({
        number: i,
        date: formatMonthYear(month, year),
        initialBalance: balance,
        payment: pmt,
        interest,
        amortization,
        finalBalance: newBalance
      });
      
      balance = newBalance;
    }
  } else {
    // SAC
    const constantAmortization = principalValue / installmentsCount;
    
    for (let i = 1; i <= installmentsCount; i++) {
      const { month, year } = addMonths(startMonth, startYear, i);
      const interest = balance * monthlyRate;
      const payment = constantAmortization + interest;
      const newBalance = Math.max(0, balance - constantAmortization);
      
      schedule.push({
        number: i,
        date: formatMonthYear(month, year),
        initialBalance: balance,
        payment,
        interest,
        amortization: constantAmortization,
        finalBalance: newBalance
      });
      
      balance = newBalance;
    }
  }

  return schedule;
}

// Generate schedule with extra amortizations
export function generateScheduleWithExtras(
  principalValue: number,
  monthlyRate: number,
  installmentsCount: number,
  startMonth: number,
  startYear: number,
  system: AmortizationSystem,
  extraAmortizations: ExtraAmortization[]
): InstallmentRow[] {
  const schedule: InstallmentRow[] = [];
  let balance = principalValue;
  let remainingInstallments = installmentsCount;
  let currentPMT = system === 'PRICE' 
    ? calculatePMT(principalValue, monthlyRate, installmentsCount) 
    : 0;
  const constantAmortization = system === 'SAC' ? principalValue / installmentsCount : 0;

  // Create a map of extra amortizations by installment number
  const extraMap = new Map<number, { amount: number; type: AmortizationType }>();
  extraAmortizations.forEach(extra => {
    extra.afterInstallments.forEach(num => {
      const existing = extraMap.get(num);
      if (existing) {
        existing.amount += extra.amount;
      } else {
        extraMap.set(num, { amount: extra.amount, type: extra.type });
      }
    });
  });

  let installmentNumber = 0;
  
  while (balance > 0.01 && installmentNumber < 1000) { // Safety limit
    installmentNumber++;
    const { month, year } = addMonths(startMonth, startYear, installmentNumber);
    
    let interest = balance * monthlyRate;
    let amortization: number;
    let payment: number;

    if (system === 'PRICE') {
      payment = Math.min(currentPMT, balance + interest);
      amortization = payment - interest;
    } else {
      // For SAC, we need to recalculate based on remaining installments
      amortization = balance / remainingInstallments;
      payment = amortization + interest;
    }

    const newBalance = Math.max(0, balance - amortization);
    
    const row: InstallmentRow = {
      number: installmentNumber,
      date: formatMonthYear(month, year),
      initialBalance: balance,
      payment,
      interest,
      amortization,
      finalBalance: newBalance
    };

    // Check for extra amortization after this installment
    const extra = extraMap.get(installmentNumber);
    if (extra && newBalance > 0) {
      const extraAmount = Math.min(extra.amount, newBalance);
      row.extraAmortization = extraAmount;
      row.finalBalance = Math.max(0, newBalance - extraAmount);
      
      // Recalculate based on amortization type
      if (extra.type === 'prazo') {
        // Reduce installments, keep payment similar
        if (system === 'PRICE' && row.finalBalance > 0) {
          // Calculate new N with same PMT
          const newN = Math.ceil(
            Math.log(currentPMT / (currentPMT - row.finalBalance * monthlyRate)) / 
            Math.log(1 + monthlyRate)
          );
          remainingInstallments = Math.max(1, newN);
        } else if (system === 'SAC') {
          // Recalculate remaining installments
          const currentAmort = balance / remainingInstallments;
          remainingInstallments = Math.max(1, Math.ceil(row.finalBalance / currentAmort));
        }
      } else {
        // Reduce payment, keep installments
        if (system === 'PRICE' && row.finalBalance > 0) {
          // Recalculate PMT for remaining balance and installments
          currentPMT = calculatePMT(row.finalBalance, monthlyRate, remainingInstallments - 1);
        }
        // For SAC, it naturally recalculates
      }
    }

    schedule.push(row);
    balance = row.finalBalance;
    remainingInstallments = Math.max(1, remainingInstallments - 1);
    
    if (balance <= 0.01) break;
  }

  return schedule;
}

// Calculate summary from schedule
export function calculateSummary(
  schedule: InstallmentRow[],
  principalValue: number,
  interestRate: number,
  interestPeriod: InterestPeriod,
  system: AmortizationSystem
): SimulationSummary {
  const totalPayment = schedule.reduce((sum, row) => sum + row.payment + (row.extraAmortization || 0), 0);
  const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);
  
  return {
    principalValue,
    totalPayment,
    totalInterest,
    totalFees: 0,
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

// Parse installment sequence string (e.g., "5,8,12,20-30")
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

// Format currency BRL
export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Format percentage
export function formatPercentage(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value) + '%';
}
