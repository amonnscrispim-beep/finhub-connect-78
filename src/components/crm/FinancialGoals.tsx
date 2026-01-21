import { useState, useEffect, useMemo } from 'react';
import { Target, Plus, Trash2, TrendingUp, Calculator, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput, formatCurrencyBR } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  annualInterestRate: number; // % a.a.
  deadline: number; // months
}

interface FinancialGoalsProps {
  goals: FinancialGoal[];
  onGoalsChange: (goals: FinancialGoal[]) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

// Compound interest calculation: FV = P * (1 + r)^n + PMT * [((1 + r)^n - 1) / r]
const calculateFutureValue = (
  currentAmount: number,
  monthlyContribution: number,
  annualRate: number,
  months: number
): number => {
  if (months <= 0) return currentAmount;
  
  // Convert annual rate to monthly rate (compound)
  const monthlyRate = Math.pow(1 + annualRate / 100, 1/12) - 1;
  
  if (monthlyRate === 0) {
    return currentAmount + (monthlyContribution * months);
  }
  
  // Future value of current amount (compound)
  const fvPresent = currentAmount * Math.pow(1 + monthlyRate, months);
  
  // Future value of monthly contributions (compound)
  const fvContributions = monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  
  return fvPresent + fvContributions;
};

// Calculate required monthly contribution to reach target
const calculateRequiredContribution = (
  currentAmount: number,
  targetAmount: number,
  annualRate: number,
  months: number
): number => {
  if (months <= 0) return 0;
  
  const monthlyRate = Math.pow(1 + annualRate / 100, 1/12) - 1;
  
  // Future value of current amount
  const fvPresent = currentAmount * Math.pow(1 + monthlyRate, months);
  
  // How much we need from contributions
  const needed = targetAmount - fvPresent;
  
  if (needed <= 0) return 0;
  
  if (monthlyRate === 0) {
    return needed / months;
  }
  
  // PMT = FV * r / ((1 + r)^n - 1)
  return needed * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1);
};

export function FinancialGoals({ goals, onGoalsChange }: FinancialGoalsProps) {
  const addGoal = () => {
    const newGoal: FinancialGoal = {
      id: generateId(),
      name: '',
      targetAmount: 0,
      currentAmount: 0,
      monthlyContribution: 0,
      annualInterestRate: 10,
      deadline: 12,
    };
    onGoalsChange([...goals, newGoal]);
  };

  const removeGoal = (goalId: string) => {
    onGoalsChange(goals.filter(g => g.id !== goalId));
  };

  const updateGoal = (goalId: string, field: keyof FinancialGoal, value: string | number) => {
    onGoalsChange(goals.map(g => 
      g.id === goalId ? { ...g, [field]: value } : g
    ));
  };

  const formatCurrency = formatCurrencyBR;

  return (
    <div className="space-y-4">
      {goals.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma meta financeira cadastrada</p>
          <p className="text-sm">Clique abaixo para adicionar uma meta</p>
        </div>
      ) : (
        goals.map((goal) => {
          const projectedValue = calculateFutureValue(
            goal.currentAmount,
            goal.monthlyContribution,
            goal.annualInterestRate,
            goal.deadline
          );
          
          const progressPercent = goal.targetAmount > 0 
            ? Math.min(100, (projectedValue / goal.targetAmount) * 100)
            : 0;
          
          const willReachGoal = projectedValue >= goal.targetAmount;
          
          const requiredContribution = calculateRequiredContribution(
            goal.currentAmount,
            goal.targetAmount,
            goal.annualInterestRate,
            goal.deadline
          );
          
          const monthlyRateEquiv = ((Math.pow(1 + goal.annualInterestRate / 100, 1/12) - 1) * 100).toFixed(4);

          return (
            <div key={goal.id} className="p-5 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <Label>Nome da Meta</Label>
                  <Input
                    value={goal.name}
                    onChange={(e) => updateGoal(goal.id, 'name', e.target.value)}
                    placeholder="Ex: Reserva de emergência, Casa própria..."
                    className="crm-input"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeGoal(goal.id)}
                  className="text-destructive hover:text-destructive ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Values */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-2">
                  <Label>Valor Atual</Label>
                  <CurrencyInput
                    value={goal.currentAmount}
                    onChange={(value) => updateGoal(goal.id, 'currentAmount', parseFloat(value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta</Label>
                  <CurrencyInput
                    value={goal.targetAmount}
                    onChange={(value) => updateGoal(goal.id, 'targetAmount', parseFloat(value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Aporte Mensal</Label>
                  <CurrencyInput
                    value={goal.monthlyContribution}
                    onChange={(value) => updateGoal(goal.id, 'monthlyContribution', parseFloat(value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prazo (meses)</Label>
                  <Input
                    type="number"
                    value={goal.deadline || ''}
                    onChange={(e) => updateGoal(goal.id, 'deadline', parseInt(e.target.value) || 0)}
                    placeholder="12"
                    className="crm-input"
                  />
                </div>
              </div>

              {/* Interest Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Taxa de Juros (% a.a.)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={goal.annualInterestRate || ''}
                    onChange={(e) => updateGoal(goal.id, 'annualInterestRate', parseFloat(e.target.value) || 0)}
                    placeholder="10.0"
                    className="crm-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Equivalente Mensal</Label>
                  <div className="px-3 py-2 bg-muted rounded-lg text-sm text-muted-foreground">
                    {monthlyRateEquiv}% a.m. (juros compostos)
                  </div>
                </div>
              </div>

              {/* Projections Card */}
              <div className="p-4 rounded-lg bg-card border border-border space-y-3">
                <div className="flex items-center gap-2 text-primary">
                  <Calculator className="w-4 h-4" />
                  <span className="font-medium">Projeção (Juros Compostos)</span>
                </div>
                
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progresso Projetado</span>
                    <span className={`font-medium ${willReachGoal ? 'text-success' : 'text-warning'}`}>
                      {progressPercent.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={progressPercent} 
                    className="h-3"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  {/* Projected Value */}
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <TrendingUp className="w-3 h-3" />
                      Valor Projetado
                    </div>
                    <p className={`text-lg font-bold ${willReachGoal ? 'text-success' : 'text-foreground'}`}>
                      {formatCurrency(projectedValue)}
                    </p>
                    {willReachGoal && (
                      <p className="text-xs text-success mt-1">✓ Meta será atingida!</p>
                    )}
                  </div>

                  {/* Required Contribution */}
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <DollarSign className="w-3 h-3" />
                      Aporte Necessário
                    </div>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(requiredContribution)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      para atingir a meta
                    </p>
                  </div>
                </div>

                {!willReachGoal && goal.targetAmount > 0 && (
                  <p className="text-sm text-warning bg-warning/10 p-2 rounded-lg">
                    ⚠️ Com os aportes atuais, a meta não será atingida no prazo. 
                    Considere aumentar o aporte para {formatCurrency(requiredContribution)}/mês.
                  </p>
                )}
              </div>
            </div>
          );
        })
      )}

      <Button
        type="button"
        variant="outline"
        onClick={addGoal}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        Adicionar Meta Financeira
      </Button>
    </div>
  );
}
