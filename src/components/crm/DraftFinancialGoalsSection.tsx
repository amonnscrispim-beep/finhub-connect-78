import { useState } from 'react';
import { Target, Plus, Trash2, TrendingUp, Calculator, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  GoalType,
  GOAL_TYPE_OPTIONS,
  calculateFutureValue,
  calculateRequiredContribution,
  formatCurrency,
  getMonthlyRateEquivalent,
} from '@/types/financial-goal';

// Draft goal type (no id, client_id, user_id, timestamps)
export interface DraftGoal {
  tempId: string;
  name: string;
  goal_type: GoalType;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
  annual_interest_rate: number;
  deadline_months: number;
}

interface DraftFinancialGoalsSectionProps {
  draftGoals: DraftGoal[];
  onGoalsChange: (goals: DraftGoal[]) => void;
}

const generateTempId = () => Math.random().toString(36).substring(2, 15);

export function DraftFinancialGoalsSection({ draftGoals, onGoalsChange }: DraftFinancialGoalsSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  
  // New goal form
  const [newGoal, setNewGoal] = useState({
    name: '',
    goal_type: 'Outros' as GoalType,
    target_amount: 0,
    current_amount: 0,
    monthly_contribution: 0,
    annual_interest_rate: 10,
    deadline_months: 12,
  });

  const handleAddGoal = () => {
    // Validation
    if (newGoal.current_amount > newGoal.target_amount) {
      return; // Could add toast here
    }
    if (newGoal.annual_interest_rate < 0) {
      return;
    }

    const draft: DraftGoal = {
      tempId: generateTempId(),
      ...newGoal,
    };
    
    onGoalsChange([...draftGoals, draft]);
    setNewGoal({
      name: '',
      goal_type: 'Outros',
      target_amount: 0,
      current_amount: 0,
      monthly_contribution: 0,
      annual_interest_rate: 10,
      deadline_months: 12,
    });
    setModalOpen(false);
  };

  const handleUpdateGoal = (tempId: string, field: keyof DraftGoal, value: any) => {
    onGoalsChange(draftGoals.map(g => 
      g.tempId === tempId ? { ...g, [field]: value } : g
    ));
  };

  const handleDeleteGoal = (tempId: string) => {
    onGoalsChange(draftGoals.filter(g => g.tempId !== tempId));
  };

  return (
    <div className="space-y-4">
      {draftGoals.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma meta financeira cadastrada</p>
          <p className="text-sm">Clique abaixo para adicionar uma meta</p>
        </div>
      ) : (
        draftGoals.map((goal) => {
          const projectedValue = calculateFutureValue(
            goal.current_amount,
            goal.monthly_contribution,
            goal.annual_interest_rate,
            goal.deadline_months
          );
          
          const progressPercent = goal.target_amount > 0 
            ? Math.min(100, (projectedValue / goal.target_amount) * 100)
            : 0;
          
          const willReachGoal = projectedValue >= goal.target_amount;
          
          const requiredContribution = calculateRequiredContribution(
            goal.current_amount,
            goal.target_amount,
            goal.annual_interest_rate,
            goal.deadline_months
          );
          
          const monthlyRateEquiv = getMonthlyRateEquivalent(goal.annual_interest_rate);

          return (
            <div key={goal.tempId} className="p-5 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Nome da Meta</Label>
                    <Input
                      value={goal.name}
                      onChange={(e) => handleUpdateGoal(goal.tempId, 'name', e.target.value)}
                      placeholder="Ex: Reserva de emergência..."
                      className="crm-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select 
                      value={goal.goal_type} 
                      onValueChange={(value) => handleUpdateGoal(goal.tempId, 'goal_type', value)}
                    >
                      <SelectTrigger className="crm-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GOAL_TYPE_OPTIONS.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteGoal(goal.tempId)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Values */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-2">
                  <Label>Saldo Inicial (R$)</Label>
                  <Input
                    type="number"
                    value={goal.current_amount || ''}
                    onChange={(e) => handleUpdateGoal(goal.tempId, 'current_amount', parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="crm-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Total (R$)</Label>
                  <Input
                    type="number"
                    value={goal.target_amount || ''}
                    onChange={(e) => handleUpdateGoal(goal.tempId, 'target_amount', parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="crm-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Aporte Mensal (R$)</Label>
                  <Input
                    type="number"
                    value={goal.monthly_contribution || ''}
                    onChange={(e) => handleUpdateGoal(goal.tempId, 'monthly_contribution', parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="crm-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prazo (meses)</Label>
                  <Input
                    type="number"
                    value={goal.deadline_months || ''}
                    onChange={(e) => handleUpdateGoal(goal.tempId, 'deadline_months', parseInt(e.target.value) || 0)}
                    placeholder="12"
                    className="crm-input"
                  />
                </div>
              </div>

              {/* Interest Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Rentabilidade Estimada (% a.a.)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={goal.annual_interest_rate || ''}
                    onChange={(e) => handleUpdateGoal(goal.tempId, 'annual_interest_rate', parseFloat(e.target.value) || 0)}
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
                    <span className={`font-medium ${willReachGoal ? 'text-green-600' : 'text-yellow-600'}`}>
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
                    <p className={`text-lg font-bold ${willReachGoal ? 'text-green-600' : 'text-foreground'}`}>
                      {formatCurrency(projectedValue)}
                    </p>
                    {willReachGoal && (
                      <p className="text-xs text-green-600 mt-1">✓ Meta será atingida!</p>
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

                {!willReachGoal && goal.target_amount > 0 && (
                  <p className="text-sm text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300 p-2 rounded-lg">
                    ⚠️ Com os aportes atuais, a meta não será atingida no prazo. 
                    Considere aumentar o aporte para {formatCurrency(requiredContribution)}/mês.
                  </p>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Add Goal Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Nova Meta
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Nova Meta Financeira
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nome da Meta</Label>
                <Input
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  placeholder="Ex: Casa própria"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select 
                  value={newGoal.goal_type} 
                  onValueChange={(value) => setNewGoal({ ...newGoal, goal_type: value as GoalType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor Total (R$)</Label>
                <Input
                  type="number"
                  value={newGoal.target_amount || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, target_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="100000"
                />
              </div>
              <div className="space-y-2">
                <Label>Saldo Inicial (R$)</Label>
                <Input
                  type="number"
                  value={newGoal.current_amount || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, current_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="5000"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Aporte Mensal (R$)</Label>
                <Input
                  type="number"
                  value={newGoal.monthly_contribution || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, monthly_contribution: parseFloat(e.target.value) || 0 })}
                  placeholder="1000"
                />
              </div>
              <div className="space-y-2">
                <Label>Rentabilidade (% a.a.)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={newGoal.annual_interest_rate || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, annual_interest_rate: parseFloat(e.target.value) || 0 })}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label>Prazo (meses)</Label>
                <Input
                  type="number"
                  value={newGoal.deadline_months || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, deadline_months: parseInt(e.target.value) || 0 })}
                  placeholder="60"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleAddGoal}>
                Adicionar Meta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
