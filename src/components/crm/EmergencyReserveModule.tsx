import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, AlertCircle, TrendingUp, Calendar, Wallet, ShieldCheck, ShieldX, ShieldOff } from 'lucide-react';
import { EMERGENCY_RESERVE_STATUS_OPTIONS } from '@/types/client';

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
  { value: 12, label: 'Dezembro' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear + i);

export interface EmergencyReserveData {
  status: string; // 'HAS' | 'NONE' | 'NOT_PRIORITY' | ''
  note: string;
  startMonth: number | null;
  startYear: number | null;
  monthlyLivingCost: number | null;
  coverageMonths: number | null;
  contributionsCount: number | null;
  currentReserve: number;
}

interface EmergencyReserveModuleProps {
  data: EmergencyReserveData;
  onChange: (field: keyof EmergencyReserveData, value: string | number | null) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

function addMonths(month: number, year: number, monthsToAdd: number): { month: number; year: number } {
  const totalMonths = (year * 12) + month - 1 + monthsToAdd;
  return {
    month: (totalMonths % 12) + 1,
    year: Math.floor(totalMonths / 12),
  };
}

export function EmergencyReserveModule({ data, onChange }: EmergencyReserveModuleProps) {
  const calculations = useMemo(() => {
    const monthlyLivingCost = data.monthlyLivingCost || 0;
    const coverageMonths = data.coverageMonths || 6;
    const currentReserve = data.currentReserve || 0;
    const contributionsCount = data.contributionsCount || 12;
    const startMonth = data.startMonth || new Date().getMonth() + 1;
    const startYear = data.startYear || currentYear;

    const requiredReserve = monthlyLivingCost * coverageMonths;
    const needToContribute = Math.max(0, requiredReserve - currentReserve);
    const monthlyContribution = contributionsCount > 0 ? needToContribute / contributionsCount : 0;
    const isReserveOk = needToContribute === 0;
    
    const lastContribution = addMonths(startMonth, startYear, Math.max(0, contributionsCount - 1));

    return {
      requiredReserve,
      needToContribute,
      monthlyContribution,
      isReserveOk,
      firstMonth: startMonth,
      firstYear: startYear,
      lastMonth: lastContribution.month,
      lastYear: lastContribution.year,
      coverageMonths,
    };
  }, [data]);

  const getMonthName = (month: number) => MONTHS.find(m => m.value === month)?.label || '';

  const renderStatusIcon = () => {
    switch (data.status) {
      case 'HAS':
        return <ShieldCheck className="w-5 h-5 text-green-500" />;
      case 'NONE':
        return <ShieldX className="w-5 h-5 text-amber-500" />;
      case 'NOT_PRIORITY':
        return <ShieldOff className="w-5 h-5 text-muted-foreground" />;
      default:
        return <Wallet className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-4 border border-border">
      <h4 className="font-medium text-foreground flex items-center gap-2">
        {renderStatusIcon()}
        Reserva de Emergência
      </h4>

      {/* Status Selection */}
      <div className="space-y-2">
        <Label>Status da Reserva de Emergência</Label>
        <Select 
          value={data.status || ''} 
          onValueChange={(value) => onChange('status', value)}
        >
          <SelectTrigger className="crm-input w-full md:w-[320px]">
            <SelectValue placeholder="Selecione o status..." />
          </SelectTrigger>
          <SelectContent>
            {EMERGENCY_RESERVE_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Option 1: HAS - Client already has reserve */}
      {data.status === 'HAS' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reserva atual (R$)</Label>
            <CurrencyInput 
              value={data.currentReserve?.toString() || ''} 
              onChange={(value) => onChange('currentReserve', value ? parseFloat(value) : 0)} 
            />
          </div>
          <Card className="border-green-500/50 bg-green-500/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium">Reserva registrada</span>
              </div>
              <p className="text-lg font-semibold text-foreground mt-2">
                {formatCurrency(data.currentReserve || 0)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Option 2: NONE - Client building reserve - Show full simulator */}
      {data.status === 'NONE' && (
        <>
          {/* Input fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Data de início</Label>
              <div className="flex gap-2">
                <Select 
                  value={data.startMonth?.toString() || ''} 
                  onValueChange={(value) => onChange('startMonth', value ? parseInt(value) : null)}
                >
                  <SelectTrigger className="crm-input flex-1">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={data.startYear?.toString() || ''} 
                  onValueChange={(value) => onChange('startYear', value ? parseInt(value) : null)}
                >
                  <SelectTrigger className="crm-input w-24">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Custo de vida mensal</Label>
              <CurrencyInput 
                value={data.monthlyLivingCost?.toString() || ''} 
                onChange={(value) => onChange('monthlyLivingCost', value ? parseFloat(value) : null)} 
              />
            </div>

            <div className="space-y-2">
              <Label>Cobertura desejada (meses)</Label>
              <Input 
                type="number" 
                min={1}
                max={24}
                value={data.coverageMonths?.toString() || ''} 
                onChange={(e) => onChange('coverageMonths', e.target.value ? parseInt(e.target.value) : null)} 
                placeholder="Ex: 6"
                className="crm-input" 
              />
              <p className="text-xs text-muted-foreground">Sugestão: 3 a 12 meses</p>
            </div>

            <div className="space-y-2">
              <Label>Qtd. de aportes (N)</Label>
              <Input 
                type="number" 
                min={1}
                value={data.contributionsCount?.toString() || ''} 
                onChange={(e) => onChange('contributionsCount', e.target.value ? parseInt(e.target.value) : null)} 
                placeholder="Ex: 12"
                className="crm-input" 
              />
            </div>
          </div>

          {/* Current reserve (editable) */}
          <div className="space-y-2">
            <Label>Reserva atual (R$)</Label>
            <CurrencyInput 
              value={data.currentReserve?.toString() || ''} 
              onChange={(value) => onChange('currentReserve', value ? parseFloat(value) : 0)} 
            />
            <p className="text-xs text-muted-foreground">Valor já acumulado pelo cliente</p>
          </div>

          {/* Results cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className={calculations.isReserveOk ? 'border-green-500/50 bg-green-500/10' : 'border-amber-500/50 bg-amber-500/10'}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {calculations.isReserveOk ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                  )}
                  <span className="text-sm font-medium">
                    {calculations.isReserveOk ? 'Reserva OK' : 'O que fazer?'}
                  </span>
                </div>
                {calculations.isReserveOk ? (
                  <p className="text-sm text-muted-foreground">Sua reserva de emergência está completa!</p>
                ) : (
                  <p className="text-lg font-semibold text-foreground">
                    Aportar {formatCurrency(calculations.monthlyContribution)}/mês
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">Reserva Necessária</span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {formatCurrency(calculations.requiredReserve)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {calculations.coverageMonths} meses de cobertura
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">Período de Aportes</span>
                </div>
                {data.startMonth && data.startYear && !calculations.isReserveOk ? (
                  <>
                    <p className="text-sm text-foreground">
                      Primeiro: {getMonthName(calculations.firstMonth)}/{calculations.firstYear}
                    </p>
                    <p className="text-sm text-foreground">
                      Último: {getMonthName(calculations.lastMonth)}/{calculations.lastYear}
                    </p>
                  </>
                ) : calculations.isReserveOk ? (
                  <p className="text-sm text-muted-foreground">Nenhum aporte necessário</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Defina a data de início</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Descrição</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3">Período de cobertura</td>
                  <td className="py-2 px-3 text-right font-medium">{calculations.coverageMonths} meses</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3">Reserva necessária</td>
                  <td className="py-2 px-3 text-right font-medium">{formatCurrency(calculations.requiredReserve)}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3">Reserva atual</td>
                  <td className="py-2 px-3 text-right font-medium">{formatCurrency(data.currentReserve)}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3">Falta aportar</td>
                  <td className={`py-2 px-3 text-right font-medium ${calculations.needToContribute > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    {formatCurrency(calculations.needToContribute)}
                  </td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3">Quantidade de aportes</td>
                  <td className="py-2 px-3 text-right font-medium">{data.contributionsCount || 12}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium">Aporte mensal</td>
                  <td className={`py-2 px-3 text-right font-bold ${calculations.isReserveOk ? 'text-green-600' : 'text-primary'}`}>
                    {formatCurrency(calculations.monthlyContribution)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Option 3: NOT_PRIORITY - Show only note field */}
      {data.status === 'NOT_PRIORITY' && (
        <div className="space-y-2">
          <Label>Observação do consultor (opcional)</Label>
          <Textarea 
            value={data.note || ''} 
            onChange={(e) => onChange('note', e.target.value)} 
            placeholder="Ex: Cliente prefere focar em quitar dívidas antes, ou considera que não precisa de reserva por ter estabilidade no emprego..."
            className="crm-input min-h-[80px]"
          />
        </div>
      )}

      {/* Prompt to select status if not selected */}
      {!data.status && (
        <p className="text-sm text-muted-foreground italic">
          Selecione o status da reserva de emergência para ver as opções disponíveis.
        </p>
      )}
    </div>
  );
}
