import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calculator, Plus, Trash2, Save, TrendingDown, DollarSign, Calendar, Percent, ChevronDown, ChevronUp } from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useDebtSimulations } from '@/hooks/useDebtSimulations';
import {
  DebtSimulation,
  ExtraAmortization,
  SimulationFormData,
  InstallmentRow,
  SimulationSummary,
  DEBT_TYPES,
  AMORTIZATION_SYSTEMS,
  INTEREST_PERIODS,
  AmortizationType
} from '@/types/debt-simulation';
import {
  getMonthlyRate,
  generateSchedule,
  generateScheduleWithExtras,
  calculateSummary,
  parseInstallmentSequence,
  formatCurrencyBRL,
  formatPercentage,
  formatMonthYear
} from '@/lib/amortization-calculator';

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' }
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => currentYear - 10 + i);

const CHART_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b'];

interface DebtSimulatorModuleProps {
  clientId: string;
}

export function DebtSimulatorModule({ clientId }: DebtSimulatorModuleProps) {
  const { simulations, addSimulation, updateSimulation, deleteSimulation, isAdding, isLoading } = useDebtSimulations(clientId);
  
  const [activeSimulationId, setActiveSimulationId] = useState<string | null>(null);
  const [showAmortizationModal, setShowAmortizationModal] = useState(false);
  const [showScheduleTable, setShowScheduleTable] = useState(false);
  
  const [formData, setFormData] = useState<SimulationFormData>({
    name: 'Nova Simulação',
    debtType: 'Financiamento',
    principalValue: 0,
    startMonth: new Date().getMonth() + 1,
    startYear: currentYear,
    amortizationSystem: 'PRICE',
    interestRate: 0,
    interestPeriod: 'a.a.',
    installmentsCount: 12
  });

  const [extraAmortizations, setExtraAmortizations] = useState<ExtraAmortization[]>([]);
  
  // Amortization modal state
  const [amortInstallmentsInput, setAmortInstallmentsInput] = useState('');
  const [amortAmount, setAmortAmount] = useState(0);
  const [amortType, setAmortType] = useState<AmortizationType>('prazo');

  // Calculate schedules
  const monthlyRate = useMemo(() => 
    getMonthlyRate(formData.interestRate, formData.interestPeriod), 
    [formData.interestRate, formData.interestPeriod]
  );

  const scheduleWithoutExtras = useMemo(() => {
    if (formData.principalValue <= 0 || formData.installmentsCount <= 0) return [];
    return generateSchedule(
      formData.principalValue,
      monthlyRate,
      formData.installmentsCount,
      formData.startMonth,
      formData.startYear,
      formData.amortizationSystem
    );
  }, [formData, monthlyRate]);

  const scheduleWithExtras = useMemo(() => {
    if (formData.principalValue <= 0 || formData.installmentsCount <= 0 || extraAmortizations.length === 0) {
      return scheduleWithoutExtras;
    }
    return generateScheduleWithExtras(
      formData.principalValue,
      monthlyRate,
      formData.installmentsCount,
      formData.startMonth,
      formData.startYear,
      formData.amortizationSystem,
      extraAmortizations
    );
  }, [formData, monthlyRate, extraAmortizations, scheduleWithoutExtras]);

  const summaryWithoutExtras = useMemo(() => {
    if (scheduleWithoutExtras.length === 0) return null;
    return calculateSummary(
      scheduleWithoutExtras,
      formData.principalValue,
      formData.interestRate,
      formData.interestPeriod,
      formData.amortizationSystem
    );
  }, [scheduleWithoutExtras, formData]);

  const summaryWithExtras = useMemo(() => {
    if (scheduleWithExtras.length === 0 || extraAmortizations.length === 0) return null;
    return calculateSummary(
      scheduleWithExtras,
      formData.principalValue,
      formData.interestRate,
      formData.interestPeriod,
      formData.amortizationSystem
    );
  }, [scheduleWithExtras, formData, extraAmortizations]);

  const savings = useMemo(() => {
    if (!summaryWithoutExtras || !summaryWithExtras) return null;
    return {
      totalSaved: summaryWithoutExtras.totalPayment - summaryWithExtras.totalPayment,
      interestSaved: summaryWithoutExtras.totalInterest - summaryWithExtras.totalInterest,
      installmentsReduced: summaryWithoutExtras.installmentsCount - summaryWithExtras.installmentsCount
    };
  }, [summaryWithoutExtras, summaryWithExtras]);

  // Pie chart data
  const pieDataWithoutExtras = useMemo(() => {
    if (!summaryWithoutExtras) return [];
    return [
      { name: 'Financiado', value: summaryWithoutExtras.principalValue },
      { name: 'Juros', value: summaryWithoutExtras.totalInterest },
      { name: 'Taxas/Seguros', value: summaryWithoutExtras.totalFees },
      { name: 'Correção', value: summaryWithoutExtras.totalCorrection }
    ].filter(d => d.value > 0);
  }, [summaryWithoutExtras]);

  const pieDataWithExtras = useMemo(() => {
    if (!summaryWithExtras) return [];
    return [
      { name: 'Financiado', value: summaryWithExtras.principalValue },
      { name: 'Juros', value: summaryWithExtras.totalInterest },
      { name: 'Taxas/Seguros', value: summaryWithExtras.totalFees },
      { name: 'Correção', value: summaryWithExtras.totalCorrection }
    ].filter(d => d.value > 0);
  }, [summaryWithExtras]);

  // Bar chart data (sample first 12 installments)
  const barData = useMemo(() => {
    const schedule = extraAmortizations.length > 0 ? scheduleWithExtras : scheduleWithoutExtras;
    return schedule.slice(0, 24).map(row => ({
      parcela: row.number,
      Amortização: row.amortization,
      Juros: row.interest
    }));
  }, [scheduleWithoutExtras, scheduleWithExtras, extraAmortizations]);

  const handleAddAmortization = () => {
    const installments = parseInstallmentSequence(amortInstallmentsInput, formData.installmentsCount);
    if (installments.length === 0 || amortAmount <= 0) return;
    
    const newAmort: ExtraAmortization = {
      id: crypto.randomUUID(),
      afterInstallments: installments,
      amount: amortAmount,
      type: amortType
    };
    
    setExtraAmortizations(prev => [...prev, newAmort]);
    setShowAmortizationModal(false);
    setAmortInstallmentsInput('');
    setAmortAmount(0);
  };

  const handleRemoveAmortization = (id: string) => {
    setExtraAmortizations(prev => prev.filter(a => a.id !== id));
  };

  const handleSaveSimulation = async () => {
    await addSimulation({
      clientId,
      name: formData.name,
      debtType: formData.debtType,
      principalValue: formData.principalValue,
      startMonth: formData.startMonth,
      startYear: formData.startYear,
      amortizationSystem: formData.amortizationSystem,
      interestRate: formData.interestRate,
      interestPeriod: formData.interestPeriod,
      installmentsCount: formData.installmentsCount,
      extraAmortizations
    });
  };

  const handleLoadSimulation = (sim: DebtSimulation) => {
    setFormData({
      name: sim.name,
      debtType: sim.debtType,
      principalValue: sim.principalValue,
      startMonth: sim.startMonth,
      startYear: sim.startYear,
      amortizationSystem: sim.amortizationSystem,
      interestRate: sim.interestRate,
      interestPeriod: sim.interestPeriod,
      installmentsCount: sim.installmentsCount
    });
    setExtraAmortizations(sim.extraAmortizations);
    setActiveSimulationId(sim.id);
  };

  const handleDeleteSimulation = async (id: string) => {
    await deleteSimulation(id);
    if (activeSimulationId === id) {
      setActiveSimulationId(null);
    }
  };

  const renderSummaryCard = (summary: SimulationSummary, title: string) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Valor Financiado:</span>
          <span className="font-medium">{formatCurrencyBRL(summary.principalValue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total a Pagar:</span>
          <span className="font-medium">{formatCurrencyBRL(summary.totalPayment)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total de Juros:</span>
          <span className="font-medium text-destructive">{formatCurrencyBRL(summary.totalInterest)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Taxa de Juros:</span>
          <span className="font-medium">{formatPercentage(summary.interestRate)} {summary.interestPeriod}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Parcelas:</span>
          <span className="font-medium">{summary.installmentsCount}x</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">1ª Parcela:</span>
          <span className="font-medium">{formatCurrencyBRL(summary.firstInstallmentValue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Última Parcela:</span>
          <span className="font-medium">{formatCurrencyBRL(summary.lastInstallmentValue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Data Final:</span>
          <span className="font-medium">{summary.lastInstallmentDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Sistema:</span>
          <Badge variant="outline">{summary.system}</Badge>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Saved Simulations */}
      {simulations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Simulações Salvas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {simulations.map(sim => (
                <div key={sim.id} className="flex items-center gap-1">
                  <Button
                    variant={activeSimulationId === sim.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleLoadSimulation(sim)}
                  >
                    {sim.name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDeleteSimulation(sim.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Parâmetros da Dívida
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sim-name">Nome da Simulação</Label>
              <Input
                id="sim-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Financiamento Casa"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={formData.debtType}
                onValueChange={(v) => setFormData(prev => ({ ...prev, debtType: v as typeof formData.debtType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEBT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor Financiado (R$)</Label>
              <CurrencyInput
                value={formData.principalValue}
                onChange={(v) => setFormData(prev => ({ ...prev, principalValue: parseFloat(v) || 0 }))}
                placeholder="R$ 0,00"
              />
            </div>

            <div className="space-y-2">
              <Label>Data de Início</Label>
              <div className="flex gap-2">
                <Select
                  value={String(formData.startMonth)}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, startMonth: parseInt(v) }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => (
                      <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(formData.startYear)}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, startYear: parseInt(v) }))}
                >
                  <SelectTrigger className="w-24">
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

            <div className="space-y-2">
              <Label>Sistema de Amortização</Label>
              <Select
                value={formData.amortizationSystem}
                onValueChange={(v) => setFormData(prev => ({ ...prev, amortizationSystem: v as typeof formData.amortizationSystem }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AMORTIZATION_SYSTEMS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Taxa de Juros</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={formData.interestRate || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, interestRate: parseFloat(e.target.value) || 0 }))}
                  placeholder="0,00"
                  className="flex-1"
                />
                <Select
                  value={formData.interestPeriod}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, interestPeriod: v as typeof formData.interestPeriod }))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTEREST_PERIODS.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quantidade de Parcelas</Label>
              <Input
                type="number"
                value={formData.installmentsCount || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, installmentsCount: parseInt(e.target.value) || 0 }))}
                placeholder="12"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={() => setShowAmortizationModal(true)} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" /> Amortizar
            </Button>
            <Button onClick={handleSaveSimulation} disabled={isAdding} size="sm">
              <Save className="h-4 w-4 mr-1" /> Salvar Simulação
            </Button>
          </div>

          {/* Extra Amortizations List */}
          {extraAmortizations.length > 0 && (
            <div className="border rounded-lg p-3 space-y-2">
              <h4 className="text-sm font-medium">Amortizações Extras Planejadas:</h4>
              {extraAmortizations.map(a => (
                <div key={a.id} className="flex items-center justify-between text-sm bg-muted/50 rounded p-2">
                  <span>
                    Após parcela(s) <strong>{a.afterInstallments.join(', ')}</strong>: {formatCurrencyBRL(a.amount)} ({a.type === 'prazo' ? 'reduzir prazo' : 'reduzir parcela'})
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveAmortization(a.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {summaryWithoutExtras && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderSummaryCard(summaryWithoutExtras, 'Sem Amortização Extra')}
            {summaryWithExtras && renderSummaryCard(summaryWithExtras, 'Com Amortização Extra')}
          </div>

          {/* Savings */}
          {savings && savings.totalSaved > 0 && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <TrendingDown className="h-5 w-5" />
                  <span className="font-semibold">Economia com Amortização Extra</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Com a amortização realizada, o financiamento será quitado em <strong>{summaryWithExtras?.lastInstallmentDate}</strong>, 
                  eliminando <strong>{savings.installmentsReduced} parcelas</strong>, 
                  com economia estimada de <strong className="text-primary">{formatCurrencyBRL(savings.totalSaved)}</strong>.
                </p>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center">
                    <DollarSign className="h-4 w-4 mx-auto text-muted-foreground" />
                    <p className="text-lg font-bold text-primary">{formatCurrencyBRL(savings.totalSaved)}</p>
                    <p className="text-xs text-muted-foreground">Total Economizado</p>
                  </div>
                  <div className="text-center">
                    <Percent className="h-4 w-4 mx-auto text-muted-foreground" />
                    <p className="text-lg font-bold text-primary">{formatCurrencyBRL(savings.interestSaved)}</p>
                    <p className="text-xs text-muted-foreground">Juros Economizados</p>
                  </div>
                  <div className="text-center">
                    <Calendar className="h-4 w-4 mx-auto text-muted-foreground" />
                    <p className="text-lg font-bold text-primary">{savings.installmentsReduced}</p>
                    <p className="text-xs text-muted-foreground">Parcelas Eliminadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pie Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Composição do Total</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="without">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="without">Sem Extra</TabsTrigger>
                    <TabsTrigger value="with" disabled={!summaryWithExtras}>Com Extra</TabsTrigger>
                  </TabsList>
                  <TabsContent value="without" className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieDataWithoutExtras}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
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
                  </TabsContent>
                  <TabsContent value="with" className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieDataWithExtras}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieDataWithExtras.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrencyBRL(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Composição das Parcelas</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="parcela" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrencyBRL(value)} />
                    <Legend />
                    <Bar dataKey="Amortização" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="Juros" stackId="a" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Schedule Table Toggle */}
          <Card>
            <CardHeader className="pb-2">
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto"
                onClick={() => setShowScheduleTable(!showScheduleTable)}
              >
                <CardTitle className="text-sm font-medium">Cronograma de Parcelas</CardTitle>
                {showScheduleTable ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CardHeader>
            {showScheduleTable && (
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Nº</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Saldo Inicial</TableHead>
                        <TableHead className="text-right">Parcela</TableHead>
                        <TableHead className="text-right">Juros</TableHead>
                        <TableHead className="text-right">Amortização</TableHead>
                        <TableHead className="text-right">Amort. Extra</TableHead>
                        <TableHead className="text-right">Saldo Final</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(extraAmortizations.length > 0 ? scheduleWithExtras : scheduleWithoutExtras).map(row => (
                        <TableRow key={row.number}>
                          <TableCell>{row.number}</TableCell>
                          <TableCell>{row.date}</TableCell>
                          <TableCell className="text-right">{formatCurrencyBRL(row.initialBalance)}</TableCell>
                          <TableCell className="text-right">{formatCurrencyBRL(row.payment)}</TableCell>
                          <TableCell className="text-right text-destructive">{formatCurrencyBRL(row.interest)}</TableCell>
                          <TableCell className="text-right">{formatCurrencyBRL(row.amortization)}</TableCell>
                          <TableCell className="text-right text-primary">
                            {row.extraAmortization ? formatCurrencyBRL(row.extraAmortization) : '-'}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrencyBRL(row.finalBalance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            )}
          </Card>
        </div>
      )}

      {/* Amortization Modal */}
      <Dialog open={showAmortizationModal} onOpenChange={setShowAmortizationModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Amortização Extra</DialogTitle>
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
                Use vírgulas para separar ou hífen para intervalos (ex: "5,8,12,20-30")
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
              <Label>Tipo de amortização</Label>
              <Select value={amortType} onValueChange={(v) => setAmortType(v as AmortizationType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prazo">Amortizar por prazo (reduz número de parcelas)</SelectItem>
                  <SelectItem value="parcela">Amortizar por parcela (reduz valor da parcela)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAmortizationModal(false)}>Cancelar</Button>
            <Button onClick={handleAddAmortization}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
