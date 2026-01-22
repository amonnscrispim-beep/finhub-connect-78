import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calculator, Plus, Trash2, TrendingDown, ChevronDown, ChevronUp, Copy, Bug, AlertTriangle } from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  DebtInfo,
  DebtSimulationData,
  DebtExtraAmortization,
  InterestPeriod,
  ExtraAmortizationType
} from '@/types/client';
import {
  getMonthlyRate,
  generateSchedule,
  generateScheduleWithExtrasAndAudit,
  calculateSummary,
  parseInstallmentSequence,
  formatCurrencyBRL,
  formatPercentage,
  runTestCase
} from '@/lib/amortization-calculator';
import type { InstallmentRow, SimulationSummary, AuditLog } from '@/lib/amortization-calculator';

const MONTHS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Fev' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Abr' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Ago' },
  { value: 9, label: 'Set' },
  { value: 10, label: 'Out' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dez' }
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => currentYear - 10 + i);

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

interface DebtSimulatorInlineProps {
  debt: DebtInfo;
  onSimulationChange: (simulation: DebtSimulationData) => void;
}

export function DebtSimulatorInline({ debt, onSimulationChange }: DebtSimulatorInlineProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAmortizationModal, setShowAmortizationModal] = useState(false);
  const [showScheduleTable, setShowScheduleTable] = useState(false);
  const [showAuditPanel, setShowAuditPanel] = useState(false);
  const [hasSimulated, setHasSimulated] = useState(false);
  
  // Initialize simulation data from debt or defaults
  const getDefaultSimulation = (): DebtSimulationData => {
    const installments = debt.term 
      ? (debt.termUnit === 'anos' ? debt.term * 12 : debt.term)
      : 12;
    
    return {
      principalValue: debt.simulation?.principalValue || 0,
      startMonth: debt.simulation?.startMonth || new Date().getMonth() + 1,
      startYear: debt.simulation?.startYear || currentYear,
      interestRate: debt.simulation?.interestRate || debt.cetPercentage || 0,
      interestPeriod: debt.simulation?.interestPeriod || 'a.a.',
      installmentsCount: debt.simulation?.installmentsCount || installments,
      extraAmortizations: debt.simulation?.extraAmortizations || []
    };
  };

  const [simData, setSimData] = useState<DebtSimulationData>(getDefaultSimulation);
  const [auditLog, setAuditLog] = useState<AuditLog | null>(null);
  
  // Amortization modal state
  const [amortInstallmentsInput, setAmortInstallmentsInput] = useState('');
  const [amortAmount, setAmortAmount] = useState(0);
  const [amortType, setAmortType] = useState<ExtraAmortizationType>('prazo');

  // Sync with debt changes
  useEffect(() => {
    if (debt.term) {
      const installments = debt.termUnit === 'anos' ? debt.term * 12 : debt.term;
      if (!simData.installmentsCount || simData.installmentsCount === 12) {
        setSimData(prev => ({ ...prev, installmentsCount: installments }));
      }
    }
  }, [debt.term, debt.termUnit]);

  // Check if simulation is ready
  const canSimulate = useMemo(() => {
    return (
      simData.principalValue > 0 &&
      simData.interestRate > 0 &&
      simData.installmentsCount > 0 &&
      debt.amortizationSystem &&
      simData.startMonth &&
      simData.startYear
    );
  }, [simData, debt.amortizationSystem]);

  // Calculate monthly rate
  const monthlyRate = useMemo(() => 
    getMonthlyRate(simData.interestRate, simData.interestPeriod), 
    [simData.interestRate, simData.interestPeriod]
  );

  // Generate baseline schedule (without extras)
  const scheduleWithoutExtras = useMemo(() => {
    if (!canSimulate || !hasSimulated) return [];
    return generateSchedule(
      simData.principalValue,
      monthlyRate,
      simData.installmentsCount,
      simData.startMonth,
      simData.startYear,
      debt.amortizationSystem as 'SAC' | 'PRICE'
    );
  }, [simData, monthlyRate, debt.amortizationSystem, canSimulate, hasSimulated]);

  // Generate schedule with extras and get audit
  const { scheduleWithExtras, currentAudit } = useMemo(() => {
    if (!canSimulate || !hasSimulated || simData.extraAmortizations.length === 0) {
      return { scheduleWithExtras: scheduleWithoutExtras, currentAudit: null };
    }
    const result = generateScheduleWithExtrasAndAudit(
      simData.principalValue,
      monthlyRate,
      simData.installmentsCount,
      simData.startMonth,
      simData.startYear,
      debt.amortizationSystem as 'SAC' | 'PRICE',
      simData.extraAmortizations
    );
    return { scheduleWithExtras: result.schedule, currentAudit: result.audit };
  }, [simData, monthlyRate, debt.amortizationSystem, canSimulate, hasSimulated, scheduleWithoutExtras]);

  // Update audit log when calculation changes
  useEffect(() => {
    setAuditLog(currentAudit);
  }, [currentAudit]);

  // Summary without extras
  const summaryWithoutExtras = useMemo(() => {
    if (scheduleWithoutExtras.length === 0) return null;
    return calculateSummary(
      scheduleWithoutExtras,
      simData.principalValue,
      simData.interestRate,
      simData.interestPeriod,
      debt.amortizationSystem as 'SAC' | 'PRICE'
    );
  }, [scheduleWithoutExtras, simData, debt.amortizationSystem]);

  // Summary with extras
  const summaryWithExtras = useMemo(() => {
    if (scheduleWithExtras.length === 0 || simData.extraAmortizations.length === 0) return null;
    return calculateSummary(
      scheduleWithExtras,
      simData.principalValue,
      simData.interestRate,
      simData.interestPeriod,
      debt.amortizationSystem as 'SAC' | 'PRICE'
    );
  }, [scheduleWithExtras, simData, debt.amortizationSystem]);

  // Calculate savings with proper logic for each mode
  const savings = useMemo(() => {
    if (!summaryWithoutExtras || !summaryWithExtras || simData.extraAmortizations.length === 0) return null;
    
    const primaryMode = simData.extraAmortizations[0].type;
    const firstExtraInstallment = simData.extraAmortizations[0].afterInstallments[0] || 1;
    
    // For payment reduction: compare installment AFTER the extra amortization
    // The new payment starts at installment (firstExtraInstallment + 1)
    const installmentAfterExtra = firstExtraInstallment; // Index in array
    const basePaymentAfter = scheduleWithoutExtras[installmentAfterExtra]?.payment || 0;
    const newPaymentAfter = scheduleWithExtras[installmentAfterExtra]?.payment || 0;
    
    // For PARCELA mode, the payment should decrease
    // For PRAZO mode, the payment stays similar (based on original amortization)
    let paymentReduction = 0;
    
    if (primaryMode === 'parcela') {
      // In PARCELA mode, payment should be lower after amortization
      paymentReduction = basePaymentAfter - newPaymentAfter;
      
      // Sanity check: if payment reduction is <= 0 for PARCELA mode, something is wrong
      if (paymentReduction <= 0) {
        console.warn('BUG: Payment reduction is 0 or negative in PARCELA mode!');
        console.log('Base payment after:', basePaymentAfter);
        console.log('New payment after:', newPaymentAfter);
      }
    } else {
      // In PRAZO mode, payment might be similar or slightly lower due to reduced interest
      paymentReduction = 0; // Not the primary benefit
    }
    
    return {
      totalSaved: summaryWithoutExtras.totalPayment - summaryWithExtras.totalPayment,
      interestSaved: summaryWithoutExtras.totalInterest - summaryWithExtras.totalInterest,
      installmentsReduced: summaryWithoutExtras.installmentsCount - summaryWithExtras.installmentsCount,
      paymentReduction,
      basePaymentAfter,
      newPaymentAfter,
      mode: primaryMode
    };
  }, [summaryWithoutExtras, summaryWithExtras, simData.extraAmortizations, scheduleWithoutExtras, scheduleWithExtras]);

  // Check for calculation errors
  const calculationError = useMemo(() => {
    if (!savings) return null;
    if (savings.mode === 'parcela' && savings.paymentReduction <= 0) {
      return 'ERRO: Modo "Reduzir Parcela" deveria reduzir o valor da parcela, mas a redução é R$ 0,00. Verifique os dados de entrada.';
    }
    if (savings.mode === 'prazo' && savings.installmentsReduced <= 0) {
      return 'ERRO: Modo "Reduzir Prazo" deveria reduzir o número de parcelas, mas não reduziu. Verifique os dados de entrada.';
    }
    return null;
  }, [savings]);

  // Pie chart data
  const pieDataWithoutExtras = useMemo(() => {
    if (!summaryWithoutExtras) return [];
    return [
      { name: 'Financiado', value: summaryWithoutExtras.principalValue },
      { name: 'Juros', value: summaryWithoutExtras.totalInterest }
    ].filter(d => d.value > 0);
  }, [summaryWithoutExtras]);

  // Bar chart data
  const barData = useMemo(() => {
    const schedule = simData.extraAmortizations.length > 0 ? scheduleWithExtras : scheduleWithoutExtras;
    return schedule.slice(0, 24).map(row => ({
      parcela: row.number,
      Amortização: row.amortization,
      Juros: row.interest
    }));
  }, [scheduleWithoutExtras, scheduleWithExtras, simData.extraAmortizations]);

  const handleSimulate = () => {
    setHasSimulated(true);
    onSimulationChange(simData);
    
    // Log test case for debugging
    console.log('Running amortization test case...');
    runTestCase();
  };

  const handleUseCETAsRate = () => {
    if (debt.cetPercentage) {
      setSimData(prev => ({ ...prev, interestRate: debt.cetPercentage!, interestPeriod: 'a.a.' }));
    }
  };

  const handleAddAmortization = () => {
    const installments = parseInstallmentSequence(amortInstallmentsInput, simData.installmentsCount);
    if (installments.length === 0 || amortAmount <= 0) return;
    
    const newAmort: DebtExtraAmortization = {
      id: crypto.randomUUID(),
      afterInstallments: installments,
      amount: amortAmount,
      type: amortType
    };
    
    const updated = { ...simData, extraAmortizations: [...simData.extraAmortizations, newAmort] };
    setSimData(updated);
    onSimulationChange(updated);
    setShowAmortizationModal(false);
    setAmortInstallmentsInput('');
    setAmortAmount(0);
  };

  const handleRemoveAmortization = (id: string) => {
    const updated = { ...simData, extraAmortizations: simData.extraAmortizations.filter(a => a.id !== id) };
    setSimData(updated);
    onSimulationChange(updated);
  };

  const renderSummaryCard = (summary: SimulationSummary, title: string) => (
    <div className="p-3 bg-background rounded-lg border space-y-2 text-xs">
      <h5 className="font-medium text-sm">{title}</h5>
      <div className="grid grid-cols-2 gap-1">
        <span className="text-muted-foreground">Valor Financiado:</span>
        <span className="font-medium text-right">{formatCurrencyBRL(summary.principalValue)}</span>
        <span className="text-muted-foreground">Total a Pagar:</span>
        <span className="font-medium text-right">{formatCurrencyBRL(summary.totalPayment)}</span>
        <span className="text-muted-foreground">Total de Juros:</span>
        <span className="font-medium text-right text-destructive">{formatCurrencyBRL(summary.totalInterest)}</span>
        <span className="text-muted-foreground">Parcelas:</span>
        <span className="font-medium text-right">{summary.installmentsCount}x</span>
        <span className="text-muted-foreground">1ª Parcela:</span>
        <span className="font-medium text-right">{formatCurrencyBRL(summary.firstInstallmentValue)}</span>
        <span className="text-muted-foreground">Última Parcela:</span>
        <span className="font-medium text-right">{formatCurrencyBRL(summary.lastInstallmentValue)}</span>
        <span className="text-muted-foreground">Data Final:</span>
        <span className="font-medium text-right">{summary.lastInstallmentDate}</span>
      </div>
    </div>
  );

  // Render audit panel
  const renderAuditPanel = () => {
    if (!auditLog) return null;
    
    const firstExtra = simData.extraAmortizations[0];
    const extraInstallment = firstExtra?.afterInstallments[0] || 5;
    
    // Get relevant installments for audit (around the extra amortization)
    const relevantInstallments = auditLog.installmentDetails.filter(
      a => a.number >= extraInstallment - 1 && a.number <= extraInstallment + 3
    );
    
    return (
      <div className="p-3 bg-muted/50 rounded-lg border border-dashed text-xs space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Bug className="h-4 w-4" />
          <span className="font-medium">Detalhes do Cálculo (Auditoria)</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-muted-foreground">Taxa mensal (i_m):</span>
            <span className="font-mono ml-2">{auditLog.monthlyRatePercent}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Conversão:</span>
            <span className="font-mono ml-2 text-[10px]">{auditLog.rateConversionMethod}</span>
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="text-muted-foreground font-medium">Parcelas {extraInstallment - 1} a {extraInstallment + 3}:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-1">Nº</th>
                  <th className="text-right p-1">Saldo Inicial</th>
                  <th className="text-right p-1">Juros</th>
                  <th className="text-right p-1">Amort.</th>
                  <th className="text-right p-1">Parcela</th>
                  <th className="text-right p-1">Saldo Final</th>
                  <th className="text-right p-1">Extra</th>
                  <th className="text-left p-1">Nota</th>
                </tr>
              </thead>
              <tbody>
                {relevantInstallments.map(row => (
                  <tr key={row.number} className={row.extraAmortization ? 'bg-primary/10' : ''}>
                    <td className="p-1">{row.number}</td>
                    <td className="text-right p-1">{formatCurrencyBRL(row.balanceBefore)}</td>
                    <td className="text-right p-1">{formatCurrencyBRL(row.interest)}</td>
                    <td className="text-right p-1">{formatCurrencyBRL(row.amortization)}</td>
                    <td className="text-right p-1">{formatCurrencyBRL(row.payment)}</td>
                    <td className="text-right p-1">{formatCurrencyBRL(row.balanceAfter)}</td>
                    <td className="text-right p-1 text-primary">
                      {row.extraAmortization ? formatCurrencyBRL(row.extraAmortization) : '-'}
                    </td>
                    <td className="text-left p-1 max-w-[150px] truncate" title={row.note}>
                      {row.note || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {savings && (
          <div className="pt-2 border-t space-y-1">
            <p className="text-muted-foreground font-medium">Validação ({savings.mode === 'prazo' ? 'PRAZO' : 'PARCELA'}):</p>
            {savings.mode === 'parcela' && (
              <>
                <div>Parcela após amortização (base): <span className="font-mono">{formatCurrencyBRL(savings.basePaymentAfter)}</span></div>
                <div>Parcela após amortização (nova): <span className="font-mono">{formatCurrencyBRL(savings.newPaymentAfter)}</span></div>
                <div>Redução: <span className="font-mono text-primary">{formatCurrencyBRL(savings.paymentReduction)}</span></div>
              </>
            )}
            {savings.mode === 'prazo' && (
              <>
                <div>Parcelas originais: <span className="font-mono">{summaryWithoutExtras?.installmentsCount}</span></div>
                <div>Parcelas com amortização: <span className="font-mono">{summaryWithExtras?.installmentsCount}</span></div>
                <div>Parcelas eliminadas: <span className="font-mono text-primary">{savings.installmentsReduced}</span></div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!debt.amortizationSystem) {
    return (
      <div className="text-xs text-muted-foreground italic p-2 bg-muted/30 rounded">
        Defina o sistema de amortização (SAC/PRICE) acima para habilitar a simulação.
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between p-2 h-auto">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Calculator className="h-4 w-4" />
            Simulação ({debt.amortizationSystem})
          </span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-2">
        {/* Simulation Inputs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Valor Financiado (R$)</Label>
            <CurrencyInput
              value={simData.principalValue}
              onChange={(v) => setSimData(prev => ({ ...prev, principalValue: parseFloat(v) || 0 }))}
              placeholder="R$ 0,00"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Data de Início</Label>
            <div className="flex gap-1">
              <Select
                value={String(simData.startMonth)}
                onValueChange={(v) => setSimData(prev => ({ ...prev, startMonth: parseInt(v) }))}
              >
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(simData.startYear)}
                onValueChange={(v) => setSimData(prev => ({ ...prev, startYear: parseInt(v) }))}
              >
                <SelectTrigger className="h-8 text-xs w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Nº de Parcelas</Label>
            <Input
              type="number"
              value={simData.installmentsCount || ''}
              onChange={(e) => setSimData(prev => ({ ...prev, installmentsCount: parseInt(e.target.value) || 0 }))}
              placeholder="Ex: 360"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1 col-span-2 md:col-span-3">
            <Label className="text-xs">Taxa de Juros</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                step="0.01"
                value={simData.interestRate || ''}
                onChange={(e) => setSimData(prev => ({ ...prev, interestRate: parseFloat(e.target.value) || 0 }))}
                placeholder="Ex: 10.5"
                className="h-8 text-sm flex-1"
              />
              <Select
                value={simData.interestPeriod}
                onValueChange={(v) => setSimData(prev => ({ ...prev, interestPeriod: v as InterestPeriod }))}
              >
                <SelectTrigger className="h-8 text-xs w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a.a.">a.a.</SelectItem>
                  <SelectItem value="a.m.">a.m.</SelectItem>
                </SelectContent>
              </Select>
              {debt.cetPercentage && !simData.interestRate && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleUseCETAsRate}
                  className="h-8 text-xs whitespace-nowrap"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Usar CET ({debt.cetPercentage}%)
                </Button>
              )}
            </div>
            {simData.interestPeriod === 'a.a.' && simData.interestRate > 0 && (
              <p className="text-[10px] text-muted-foreground">
                Taxa mensal equivalente: {formatPercentage(monthlyRate * 100, 4)} (conversão por juros compostos)
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button 
            type="button" 
            size="sm" 
            onClick={handleSimulate} 
            disabled={!canSimulate}
            className="h-8"
          >
            <Calculator className="h-3 w-3 mr-1" />
            {hasSimulated ? 'Recalcular' : 'Simular'}
          </Button>
          {hasSimulated && (
            <>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAmortizationModal(true)}
                className="h-8"
              >
                <Plus className="h-3 w-3 mr-1" />
                Amortizar
              </Button>
              {simData.extraAmortizations.length > 0 && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowAuditPanel(!showAuditPanel)}
                  className="h-8"
                >
                  <Bug className="h-3 w-3 mr-1" />
                  {showAuditPanel ? 'Ocultar Auditoria' : 'Ver Auditoria'}
                </Button>
              )}
            </>
          )}
        </div>

        {/* Extra Amortizations List */}
        {simData.extraAmortizations.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">Amortizações Extras:</Label>
            {simData.extraAmortizations.map(a => (
              <div key={a.id} className="flex items-center justify-between text-xs bg-muted/50 rounded p-2">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={a.type === 'prazo' ? 'default' : 'secondary'} 
                    className="text-[10px]"
                  >
                    {a.type === 'prazo' ? 'Reduz Prazo' : 'Reduz Parcela'}
                  </Badge>
                  <span>
                    Após parcela(s) <strong>{a.afterInstallments.join(', ')}</strong>: {formatCurrencyBRL(a.amount)}
                  </span>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={() => handleRemoveAmortization(a.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Calculation Error Alert */}
        {calculationError && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
            <p className="text-xs text-destructive">{calculationError}</p>
          </div>
        )}

        {/* Audit Panel */}
        {showAuditPanel && auditLog && renderAuditPanel()}

        {/* Results */}
        {hasSimulated && summaryWithoutExtras && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {renderSummaryCard(summaryWithoutExtras, 'Sem Amortização Extra')}
              {summaryWithExtras && renderSummaryCard(summaryWithExtras, 'Com Amortização Extra')}
            </div>

            {/* Savings */}
            {savings && (savings.totalSaved > 0 || savings.interestSaved > 0) && !calculationError && (
              <div className="p-3 bg-primary/5 border border-primary/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-primary">
                    <TrendingDown className="h-4 w-4" />
                    <span className="font-semibold text-sm">Economia com Amortização Extra</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {savings.mode === 'prazo' ? 'Reduz Prazo' : 'Reduz Parcela'}
                  </Badge>
                </div>
                
                {savings.mode === 'prazo' ? (
                  <p className="text-xs text-muted-foreground">
                    Financiamento quitado em <strong>{summaryWithExtras?.lastInstallmentDate}</strong>, 
                    eliminando <strong>{savings.installmentsReduced} parcelas</strong>, 
                    economia de <strong className="text-primary">{formatCurrencyBRL(savings.totalSaved)}</strong>.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Prazo mantido até <strong>{summaryWithExtras?.lastInstallmentDate}</strong>, 
                    parcela reduzida de {formatCurrencyBRL(savings.basePaymentAfter)} para{' '}
                    <strong>{formatCurrencyBRL(savings.newPaymentAfter)}</strong>{' '}
                    (economia de <strong className="text-primary">{formatCurrencyBRL(savings.paymentReduction)}</strong>/mês), 
                    economia total de juros: <strong className="text-primary">{formatCurrencyBRL(savings.interestSaved)}</strong>.
                  </p>
                )}
                
                <div className="grid grid-cols-4 gap-2 mt-2">
                  <div className="text-center">
                    <p className="text-sm font-bold text-primary">{formatCurrencyBRL(savings.totalSaved)}</p>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-primary">{formatCurrencyBRL(savings.interestSaved)}</p>
                    <p className="text-[10px] text-muted-foreground">Juros</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-primary">
                      {savings.mode === 'prazo' ? savings.installmentsReduced : '-'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Parcelas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-primary">
                      {savings.mode === 'parcela' ? formatCurrencyBRL(savings.paymentReduction) : '-'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Redução/mês</p>
                  </div>
                </div>
              </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Pie Chart */}
              <div className="p-2 bg-background rounded-lg border">
                <h5 className="text-xs font-medium mb-2">Composição do Total</h5>
                <div className="h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieDataWithoutExtras}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieDataWithoutExtras.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrencyBRL(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="p-2 bg-background rounded-lg border">
                <h5 className="text-xs font-medium mb-2">Composição das Parcelas</h5>
                <div className="h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="parcela" tick={{ fontSize: 8 }} />
                      <YAxis tick={{ fontSize: 8 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrencyBRL(value)} />
                      <Bar dataKey="Amortização" stackId="a" fill="hsl(var(--primary))" />
                      <Bar dataKey="Juros" stackId="a" fill="hsl(var(--destructive))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Schedule Table Toggle */}
            <Collapsible open={showScheduleTable} onOpenChange={setShowScheduleTable}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between p-2 h-auto">
                  <span className="text-xs font-medium">Cronograma de Parcelas</span>
                  {showScheduleTable ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ScrollArea className="h-[250px] mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-10">Nº</TableHead>
                        <TableHead className="text-xs">Data</TableHead>
                        <TableHead className="text-xs text-right">Saldo</TableHead>
                        <TableHead className="text-xs text-right">Parcela</TableHead>
                        <TableHead className="text-xs text-right">Juros</TableHead>
                        <TableHead className="text-xs text-right">Amort.</TableHead>
                        <TableHead className="text-xs text-right">Extra</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(simData.extraAmortizations.length > 0 ? scheduleWithExtras : scheduleWithoutExtras).map(row => (
                        <TableRow key={row.number} className={row.extraAmortization ? 'bg-primary/5' : ''}>
                          <TableCell className="text-xs">{row.number}</TableCell>
                          <TableCell className="text-xs">{row.date}</TableCell>
                          <TableCell className="text-xs text-right">{formatCurrencyBRL(row.initialBalance)}</TableCell>
                          <TableCell className="text-xs text-right">{formatCurrencyBRL(row.payment)}</TableCell>
                          <TableCell className="text-xs text-right text-destructive">{formatCurrencyBRL(row.interest)}</TableCell>
                          <TableCell className="text-xs text-right">{formatCurrencyBRL(row.amortization)}</TableCell>
                          <TableCell className="text-xs text-right text-primary">
                            {row.extraAmortization ? formatCurrencyBRL(row.extraAmortization) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Amortization Modal */}
        <Dialog open={showAmortizationModal} onOpenChange={setShowAmortizationModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Amortização Extra</DialogTitle>
              <DialogDescription>
                Configure uma amortização extra para simular o impacto no financiamento.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Amortizar após pagamento das parcelas</Label>
                <Input
                  value={amortInstallmentsInput}
                  onChange={(e) => setAmortInstallmentsInput(e.target.value)}
                  placeholder="Ex: 5,8,12 ou 20-30"
                />
                <p className="text-xs text-muted-foreground">
                  Use vírgulas para separar ou hífen para intervalos
                </p>
              </div>
              <div className="space-y-2">
                <Label>Valor a ser amortizado (R$)</Label>
                <CurrencyInput
                  value={amortAmount}
                  onChange={(v) => setAmortAmount(parseFloat(v) || 0)}
                  placeholder="R$ 0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Modo de amortização</Label>
                <Select value={amortType} onValueChange={(v) => setAmortType(v as ExtraAmortizationType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prazo">Reduzir PRAZO (mantém parcela, quita antes)</SelectItem>
                    <SelectItem value="parcela">Reduzir PARCELA (mantém prazo, parcela menor)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="p-2 bg-muted/50 rounded text-xs">
                  {amortType === 'prazo' ? (
                    <p><strong>Modo PRAZO:</strong> O valor da parcela permanece o mesmo (baseado na amortização/PMT original). O financiamento termina mais cedo, reduzindo o total de juros pagos.</p>
                  ) : (
                    <p><strong>Modo PARCELA:</strong> O prazo total permanece o mesmo. A parcela mensal é recalculada com base no novo saldo devedor, resultando em prestações menores.</p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAmortizationModal(false)}>Cancelar</Button>
              <Button type="button" onClick={handleAddAmortization}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CollapsibleContent>
    </Collapsible>
  );
}
