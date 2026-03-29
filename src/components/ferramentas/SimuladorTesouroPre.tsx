import { useState, useMemo } from 'react';
import { LineChart as LineChartIcon, TrendingUp, DollarSign, Percent } from 'lucide-react';
import { Card, Button, ToolHeader, ResultCard, InputField, SliderField, fmt, parseNum } from './shared';

function getIRRate(days: number) {
  if (days <= 180) return 0.225;
  if (days <= 360) return 0.20;
  if (days <= 720) return 0.175;
  return 0.15;
}

export function SimuladorTesouroPre() {
  const [valorInicial, setValorInicial] = useState('');
  const [aporteMensal, setAporteMensal] = useState('');
  const [tempo, setTempo] = useState(360);
  const [taxa, setTaxa] = useState(10);
  const [calculated, setCalculated] = useState(false);

  const results = useMemo(() => {
    if (!calculated) return null;
    const pv = parseNum(valorInicial);
    const pmt = parseNum(aporteMensal);
    const taxaMes = Math.pow(1 + taxa / 100, 1 / 12) - 1;
    let saldo = pv, totalInvestido = pv, totalJuros = 0;
    for (let m = 1; m <= tempo; m++) {
      const juros = saldo * taxaMes;
      saldo += juros + pmt;
      totalInvestido += pmt;
      totalJuros += juros;
    }
    const irRate = getIRRate(tempo * 30);
    const ir = totalJuros * irRate;
    const valorLiquido = saldo - ir;
    const retBruto = totalInvestido > 0 ? ((saldo / totalInvestido) - 1) * 100 : 0;
    const retLiq = totalInvestido > 0 ? ((valorLiquido / totalInvestido) - 1) * 100 : 0;

    return { saldo, totalInvestido, totalJuros, irRate, ir, valorLiquido, retBruto, retLiq };
  }, [calculated, valorInicial, aporteMensal, tempo, taxa]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border">
        <ToolHeader icon={<LineChartIcon className="w-5 h-5" />} title="Simulador Tesouro Prefixado" />
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Valor Inicial" prefix="R$" value={valorInicial} onChange={setValorInicial} />
            <InputField label="Aporte Mensal" prefix="R$" value={aporteMensal} onChange={setAporteMensal} />
          </div>
          <SliderField label="Tempo (meses)" value={tempo} min={1} max={600} step={1} onChange={setTempo} />
          <SliderField label="Taxa ao Ano" value={taxa} min={1} max={20} step={0.1} showValue={`${taxa.toFixed(1).replace('.', ',')}% a.a.`} onChange={setTaxa} />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setCalculated(false)}>Limpar</Button>
            <Button onClick={() => setCalculated(true)}>Calcular Investimento</Button>
          </div>
        </div>
      </Card>
      {results && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ResultCard label="Valor Bruto" value={fmt(results.saldo)} colorVar="invested" icon={<DollarSign className="w-5 h-5" />} />
          <ResultCard label={`IR (${(results.irRate * 100).toFixed(1)}%)`} value={fmt(results.ir)} colorVar="negative" icon={<Percent className="w-5 h-5" />} />
          <ResultCard label="Ganho Líquido" value={fmt(results.valorLiquido - results.totalInvestido)} colorVar="positive" icon={<TrendingUp className="w-5 h-5" />} />
          <Card className="p-5 border-border">
            <p className="text-xs text-muted-foreground uppercase mb-1">Valor Líquido Final</p>
            <p className="text-2xl font-bold text-warning">{fmt(results.valorLiquido)}</p>
            <p className="text-xs text-muted-foreground mt-1">Retorno: {results.retLiq.toFixed(2).replace('.', ',')}%</p>
          </Card>
        </div>
      )}
    </div>
  );
}
