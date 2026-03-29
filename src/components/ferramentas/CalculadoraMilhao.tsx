import { useState, useMemo } from 'react';
import { Target, DollarSign, TrendingUp, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { Card, Button, ToolHeader, ResultCard, InputField, SliderField, fmt, parseNum } from './shared';

export function CalculadoraMilhao() {
  const [aporte, setAporte] = useState('');
  const [tipo, setTipo] = useState<'mensal' | 'anual'>('mensal');
  const [taxa, setTaxa] = useState(7);
  const [calculated, setCalculated] = useState(false);

  const results = useMemo(() => {
    if (!calculated) return null;
    const pmt = parseNum(aporte);
    if (pmt <= 0) return null;
    const target = 1_000_000;
    const monthlyRate = tipo === 'mensal'
      ? Math.pow(1 + taxa / 100, 1 / 12) - 1
      : Math.pow(1 + taxa / 100, 1 / 12) - 1;
    const monthlyAporte = tipo === 'anual' ? pmt / 12 : pmt;

    let balance = 0, totalInvested = 0, totalInterest = 0, months = 0;
    const yearly: { ano: number; investido: number; juros: number }[] = [];

    while (balance < target && months < 1200) {
      const interest = balance * monthlyRate;
      balance += interest + monthlyAporte;
      totalInvested += monthlyAporte;
      totalInterest += interest;
      months++;
      if (months % 12 === 0) {
        yearly.push({ ano: months / 12, investido: Math.round(totalInvested), juros: Math.round(totalInterest) });
      }
    }
    if (months % 12 !== 0) {
      yearly.push({ ano: Math.ceil(months / 12), investido: Math.round(totalInvested), juros: Math.round(totalInterest) });
    }

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    const timeStr = remainingMonths > 0 ? `${years} anos e ${remainingMonths} meses` : `${years} anos`;

    return { months, timeStr, totalInvested, totalInterest, yearly };
  }, [calculated, aporte, tipo, taxa]);

  const COLORS = ['hsl(204, 70%, 53%)', 'hsl(168, 100%, 36%)'];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border">
        <ToolHeader icon={<Target className="w-5 h-5" />} title="Calculadora do Milhão" />
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <Button variant={tipo === 'mensal' ? 'default' : 'outline'} size="sm" onClick={() => setTipo('mensal')}>Mensal</Button>
            <Button variant={tipo === 'anual' ? 'default' : 'outline'} size="sm" onClick={() => setTipo('anual')}>Anual</Button>
          </div>
          <InputField label={`Aporte ${tipo === 'mensal' ? 'Mensal' : 'Anual'}`} prefix="R$" value={aporte} onChange={setAporte} />
          <SliderField label="Taxa de Retorno Anual" value={taxa} min={1} max={30} step={0.5} suffix="% a.a." showValue={`${taxa.toFixed(1).replace('.', ',')}% a.a.`} onChange={setTaxa} />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => { setAporte(''); setCalculated(false); }}>Limpar</Button>
            <Button onClick={() => setCalculated(true)}>Calcular</Button>
          </div>
        </div>
      </Card>
      {results && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ResultCard label="Tempo para o Milhão" value={results.timeStr} colorVar="total" icon={<Clock className="w-5 h-5" />} />
            <ResultCard label="Total Aportado" value={fmt(results.totalInvested)} colorVar="invested" icon={<DollarSign className="w-5 h-5" />} />
            <ResultCard label="Juros Ganhos" value={fmt(results.totalInterest)} colorVar="positive" icon={<TrendingUp className="w-5 h-5" />} />
          </div>
          <Card className="overflow-hidden border-border">
            <ToolHeader icon={null} title="Evolução Anual até R$ 1.000.000" />
            <div className="p-5">
              <ChartContainer config={{ investido: { label: 'Aportado', color: COLORS[0] }, juros: { label: 'Juros', color: COLORS[1] } }} className="w-full h-[300px]">
                <BarChart data={results.yearly}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="ano" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} /><Tooltip formatter={(v: number) => fmt(v)} /><Legend formatter={v => <span className="text-xs text-foreground">{v === 'investido' ? 'Aportado' : 'Juros'}</span>} /><Bar dataKey="investido" stackId="a" fill={COLORS[0]} /><Bar dataKey="juros" stackId="a" fill={COLORS[1]} radius={[4, 4, 0, 0]} /></BarChart>
              </ChartContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
