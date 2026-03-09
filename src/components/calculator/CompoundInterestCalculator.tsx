import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Calculator, TrendingUp, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface Row {
  month: number;
  interest: number;
  totalInvested: number;
  totalInterest: number;
  accumulated: number;
}

export function CompoundInterestCalculator() {
  const [initialValue, setInitialValue] = useState('');
  const [rate, setRate] = useState('');
  const [rateType, setRateType] = useState<'MENSAL' | 'ANUAL'>('ANUAL');
  const [period, setPeriod] = useState('');
  const [periodType, setPeriodType] = useState<'ANOS' | 'MESES'>('ANOS');
  const [monthlyInvestment, setMonthlyInvestment] = useState('');
  const [calculated, setCalculated] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const parseNum = (s: string) => {
    const cleaned = s.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const results = useMemo(() => {
    if (!calculated) return null;
    const pv = parseNum(initialValue);
    const r = parseNum(rate) / 100;
    const months = periodType === 'ANOS' ? Math.round(parseNum(period) * 12) : Math.round(parseNum(period));
    const pmt = parseNum(monthlyInvestment);
    const monthlyRate = rateType === 'ANUAL' ? Math.pow(1 + r, 1 / 12) - 1 : r;

    if (months <= 0) return null;

    const rows: Row[] = [];
    let balance = pv;
    let totalInvested = pv;
    let totalInterest = 0;

    for (let m = 1; m <= months; m++) {
      const interest = balance * monthlyRate;
      balance = balance + interest + pmt;
      totalInvested += pmt;
      totalInterest += interest;
      rows.push({
        month: m,
        interest: Math.round(interest * 100) / 100,
        totalInvested: Math.round(totalInvested * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
        accumulated: Math.round(balance * 100) / 100,
      });
    }

    return { rows, totalInterest, totalInvested, totalFinal: balance };
  }, [calculated, initialValue, rate, rateType, period, periodType, monthlyInvestment]);

  const handleClear = useCallback(() => {
    setInitialValue('');
    setRate('');
    setPeriod('');
    setMonthlyInvestment('');
    setCalculated(false);
    setExpanded(false);
  }, []);

  const handleCalculate = useCallback(() => {
    setCalculated(true);
    setExpanded(false);
  }, []);

  const visibleRows = results ? (expanded ? results.rows : results.rows.slice(0, 9)) : [];

  const donutData = results
    ? [
        { name: 'Total Investido', value: Math.round(results.totalInvested * 100) / 100 },
        { name: 'Total em Juros', value: Math.round(results.totalInterest * 100) / 100 },
      ]
    : [];

  const barData = results
    ? results.rows.filter((_, i) => {
        const total = results.rows.length;
        if (total <= 24) return true;
        const step = Math.max(1, Math.floor(total / 24));
        return i % step === 0 || i === total - 1;
      }).map((r) => ({
        label: `${r.month}`,
        investido: r.totalInvested,
        juros: r.totalInterest,
      }))
    : [];

  const COLORS = ['hsl(210, 40%, 55%)', 'hsl(160, 50%, 45%)'];

  return (
    <div className="space-y-6">
      {/* 1. SIMULADOR */}
      <Card className="overflow-hidden border-border">
        <div className="px-5 py-3 flex items-center gap-2" style={{ backgroundColor: '#1e2530' }}>
          <Calculator className="w-5 h-5 text-white" />
          <h2 className="text-white font-semibold text-sm uppercase tracking-wide">Simulador de Juros Compostos</h2>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <InputField label="Valor Inicial" prefix="R$" value={initialValue} onChange={setInitialValue} />
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Taxa de Juros</label>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                <input
                  className="w-full h-10 rounded-md border border-input bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
              </div>
              <Select value={rateType} onValueChange={(v) => setRateType(v as 'MENSAL' | 'ANUAL')}>
                <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MENSAL">Mensal</SelectItem>
                  <SelectItem value="ANUAL">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Período</label>
            <div className="flex gap-1.5">
              <input
                className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
              <Select value={periodType} onValueChange={(v) => setPeriodType(v as 'ANOS' | 'MESES')}>
                <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANOS">Anos</SelectItem>
                  <SelectItem value="MESES">Meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <InputField label="Investimento Mensal" prefix="R$" value={monthlyInvestment} onChange={setMonthlyInvestment} />
        </div>
        <div className="px-5 pb-5 flex gap-3 justify-end">
          <Button variant="outline" onClick={handleClear}>Limpar</Button>
          <Button onClick={handleCalculate} className="bg-primary text-primary-foreground">Calcular</Button>
        </div>
      </Card>

      {results && (
        <>
          {/* 2. RESULTADO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ResultCard label="Total em Juros" value={results.totalInterest} color="hsl(210, 40%, 55%)" icon={<TrendingUp className="w-5 h-5" />} />
            <ResultCard label="Valor Total Investido" value={results.totalInvested} color="hsl(160, 50%, 45%)" icon={<DollarSign className="w-5 h-5" />} />
            <ResultCard label="Valor Total Final" value={results.totalFinal} color="hsl(45, 80%, 50%)" icon={<DollarSign className="w-5 h-5" />} />
          </div>

          {/* 3. GRÁFICOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="overflow-hidden border-border">
              <div className="px-5 py-3" style={{ backgroundColor: '#1e2530' }}>
                <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Distribuição</h3>
              </div>
              <div className="p-5 flex justify-center">
                <ChartContainer config={{ investido: { label: 'Investido', color: COLORS[0] }, juros: { label: 'Juros', color: COLORS[1] } }} className="w-[280px] h-[280px] aspect-square">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={3}>
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend formatter={(value) => <span className="text-xs text-foreground">{value}</span>} />
                  </PieChart>
                </ChartContainer>
              </div>
            </Card>

            <Card className="overflow-hidden border-border">
              <div className="px-5 py-3" style={{ backgroundColor: '#1e2530' }}>
                <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Evolução Mensal</h3>
              </div>
              <div className="p-5">
                <ChartContainer config={{ investido: { label: 'Investido', color: COLORS[0] }, juros: { label: 'Juros', color: COLORS[1] } }} className="w-full h-[280px]">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="fill-muted-foreground" />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend formatter={(value) => <span className="text-xs text-foreground">{value === 'investido' ? 'Investido' : 'Juros'}</span>} />
                    <Bar dataKey="investido" stackId="a" fill={COLORS[0]} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="juros" stackId="a" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            </Card>
          </div>

          {/* 4. TABELA */}
          <Card className="overflow-hidden border-border">
            <div className="px-5 py-3" style={{ backgroundColor: '#1e2530' }}>
              <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Tabela Detalhada</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border" style={{ backgroundColor: '#1e2530' }}>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase">Meses</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-white uppercase">Juros</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-white uppercase">Total Investido</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-white uppercase">Total Juros</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-white uppercase">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, i) => (
                    <tr key={row.month} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                      <td className="px-4 py-2 text-foreground">{row.month}</td>
                      <td className="px-4 py-2 text-right text-foreground">{fmt(row.interest)}</td>
                      <td className="px-4 py-2 text-right text-foreground">{fmt(row.totalInvested)}</td>
                      <td className="px-4 py-2 text-right text-foreground">{fmt(row.totalInterest)}</td>
                      <td className="px-4 py-2 text-right font-medium text-foreground">{fmt(row.accumulated)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {results.rows.length > 9 && (
              <div className="p-3 flex justify-center border-t border-border">
                <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="text-muted-foreground">
                  {expanded ? <><ChevronUp className="w-4 h-4 mr-1" /> Ler Menos</> : <><ChevronDown className="w-4 h-4 mr-1" /> Ler Mais</>}
                </Button>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function InputField({ label, prefix, value, onChange }: { label: string; prefix: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>
        <input
          className="w-full h-10 rounded-md border border-input bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function ResultCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <Card className="p-5 border-border">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-md" style={{ backgroundColor: `${color}20`, color }}>{icon}</div>
        <span className="text-xs font-medium text-muted-foreground uppercase">{label}</span>
      </div>
      <p className="text-xl font-bold" style={{ color }}>{fmt(value)}</p>
    </Card>
  );
}
