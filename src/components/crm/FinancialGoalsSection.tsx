import { useState, useEffect } from 'react';
import { Target, Plus, Trash2, TrendingUp, Calculator, DollarSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CurrencyInput, formatCurrencyBR } from '@/components/ui/currency-input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  FinancialGoal,
  GoalType,
  GOAL_TYPE_OPTIONS,
  calculateFutureValue,
  calculateRequiredContribution,
  getMonthlyRateEquivalent,
} from '@/types/financial-goal';

interface FinancialGoalsSectionProps {
  clientId: string;
}

export function FinancialGoalsSection({ clientId }: FinancialGoalsSectionProps) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
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

  useEffect(() => {
    if (clientId && user) {
      fetchGoals();
    }
  }, [clientId, user]);

  const fetchGoals = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching goals:', error);
      toast.error('Erro ao carregar metas');
    } else {
      setGoals(data as FinancialGoal[]);
    }
    setLoading(false);
  };

  const handleAddGoal = async () => {
    if (!user || !clientId) return;

    // Validation
    if (newGoal.current_amount > newGoal.target_amount) {
      toast.error('Saldo atual não pode ser maior que o valor da meta');
      return;
    }
    if (newGoal.annual_interest_rate < 0) {
      toast.error('Rentabilidade não pode ser negativa');
      return;
    }

    setSaving('new');
    const { data, error } = await supabase
      .from('financial_goals')
      .insert({
        client_id: clientId,
        user_id: user.id,
        name: newGoal.name,
        goal_type: newGoal.goal_type,
        target_amount: newGoal.target_amount,
        current_amount: newGoal.current_amount,
        monthly_contribution: newGoal.monthly_contribution,
        annual_interest_rate: newGoal.annual_interest_rate,
        deadline_months: newGoal.deadline_months,
      })
      .select()
      .single();

    setSaving(null);

    if (error) {
      console.error('Error adding goal:', error);
      toast.error('Erro ao adicionar meta');
    } else {
      setGoals([...goals, data as FinancialGoal]);
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
      toast.success('Meta adicionada com sucesso!');
    }
  };

  const handleUpdateGoal = async (goalId: string, field: keyof FinancialGoal, value: any) => {
    const goalToUpdate = goals.find(g => g.id === goalId);
    if (!goalToUpdate) return;

    // Optimistic update
    setGoals(goals.map(g => g.id === goalId ? { ...g, [field]: value } : g));

    const { error } = await supabase
      .from('financial_goals')
      .update({ [field]: value })
      .eq('id', goalId);

    if (error) {
      console.error('Error updating goal:', error);
      // Revert on error
      setGoals(goals);
      toast.error('Erro ao atualizar meta');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    setSaving(goalId);
    const { error } = await supabase
      .from('financial_goals')
      .delete()
      .eq('id', goalId);

    setSaving(null);

    if (error) {
      console.error('Error deleting goal:', error);
      toast.error('Erro ao remover meta');
    } else {
      setGoals(goals.filter(g => g.id !== goalId));
      toast.success('Meta removida');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

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
            <div key={goal.id} className="p-5 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Nome da Meta</Label>
                    <Input
                      value={goal.name}
                      onChange={(e) => handleUpdateGoal(goal.id, 'name', e.target.value)}
                      placeholder="Ex: Reserva de emergência..."
                      className="crm-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select 
                      value={goal.goal_type} 
                      onValueChange={(value) => handleUpdateGoal(goal.id, 'goal_type', value)}
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
                  onClick={() => handleDeleteGoal(goal.id)}
                  disabled={saving === goal.id}
                  className="text-destructive hover:text-destructive"
                >
                  {saving === goal.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Values */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-2">
                  <Label>Saldo Inicial</Label>
                  <CurrencyInput
                    value={goal.current_amount}
                    onChange={(value) => handleUpdateGoal(goal.id, 'current_amount', parseFloat(value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Total</Label>
                  <CurrencyInput
                    value={goal.target_amount}
                    onChange={(value) => handleUpdateGoal(goal.id, 'target_amount', parseFloat(value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Aporte Mensal</Label>
                  <CurrencyInput
                    value={goal.monthly_contribution}
                    onChange={(value) => handleUpdateGoal(goal.id, 'monthly_contribution', parseFloat(value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prazo (meses)</Label>
                  <Input
                    type="number"
                    value={goal.deadline_months || ''}
                    onChange={(e) => handleUpdateGoal(goal.id, 'deadline_months', parseInt(e.target.value) || 0)}
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
                    onChange={(e) => handleUpdateGoal(goal.id, 'annual_interest_rate', parseFloat(e.target.value) || 0)}
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
                      {formatCurrencyBR(projectedValue)}
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
                      {formatCurrencyBR(requiredContribution)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      para atingir a meta
                    </p>
                  </div>
                </div>

                {!willReachGoal && goal.target_amount > 0 && (
                  <p className="text-sm text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300 p-2 rounded-lg">
                    ⚠️ Com os aportes atuais, a meta não será atingida no prazo. 
                    Considere aumentar o aporte para {formatCurrencyBR(requiredContribution)}/mês.
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
                <Label>Valor Total</Label>
                <CurrencyInput
                  value={newGoal.target_amount}
                  onChange={(value) => setNewGoal({ ...newGoal, target_amount: parseFloat(value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Saldo Inicial</Label>
                <CurrencyInput
                  value={newGoal.current_amount}
                  onChange={(value) => setNewGoal({ ...newGoal, current_amount: parseFloat(value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Aporte Mensal</Label>
                <CurrencyInput
                  value={newGoal.monthly_contribution}
                  onChange={(value) => setNewGoal({ ...newGoal, monthly_contribution: parseFloat(value) || 0 })}
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
              <Button type="button" onClick={handleAddGoal} disabled={saving === 'new'}>
                {saving === 'new' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Adicionar Meta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
