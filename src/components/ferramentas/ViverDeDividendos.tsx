import { useState, useMemo } from 'react';
import { PiggyBank, DollarSign, Clock, TrendingUp } from 'lucide-react';
import { Card, Button, ToolHeader, ResultCard, InputField, SliderField, fmt, parseNum } from './shared';

export function ViverDeDividendos() {
  const [rendaMensal, setRendaMensal] = useState('');
  const [aporteMensal, setAporteMensal] = useState('');
  const [dy, setDy] = useState(8.5);
  const [retornoReal, setRetornoReal] = useState(5);
  const [calculated, setCalculated] = useState(false);

  const results = useMemo(() => {
    if (!calculated) return null;
    const renda = parseNum(rendaMensal);
    const aporte = parseNum(aporteMensal);
    if (renda <= 0 || aporte <= 0) return null;

    const patrimonioNecessario = (renda * 12) / (dy / 100);
    const retMes = Math.pow(1 + retornoReal / 100, 1 / 12) - 1;

    let saldo = 0, meses = 0;
    while (saldo < patrimonioNecessario && meses < 1200) {
      saldo = (saldo + aporte) * (1 + retMes);
      meses++;
    }

    const anos = Math.floor(meses / 12);
    const mesesRest = meses % 12;
    const tempoStr = mesesRest > 0 ? `${anos} anos e ${mesesRest} meses` : `${anos} anos`;
    const totalAportado = aporte * meses;

    return { patrimonioNecessario, tempoStr, meses, totalAportado, rendaMensalFinal: renda };
  }, [calculated, rendaMensal, aporteMensal, dy, retornoReal]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border">
        <ToolHeader icon={<PiggyBank className="w-5 h-5" />} title="Quanto Preciso para Viver de Dividendos" />
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Renda Mensal Desejada" prefix="R$" value={rendaMensal} onChange={setRendaMensal} />
            <InputField label="Aporte Mensal" prefix="R$" value={aporteMensal} onChange={setAporteMensal} />
          </div>
          <SliderField label="Dividend Yield Anual" value={dy} min={3} max={20} step={0.5} showValue={`${dy.toFixed(1).replace('.', ',')}% a.a.`} onChange={setDy} />
          <SliderField label="Retorno Real Anual" value={retornoReal} min={0.5} max={15} step={0.5} showValue={`${retornoReal.toFixed(1).replace('.', ',')}% a.a.`} onChange={setRetornoReal} />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setCalculated(false)}>Limpar</Button>
            <Button onClick={() => setCalculated(true)}>Calcular Simulação</Button>
          </div>
        </div>
      </Card>
      {results && (
        <div className="space-y-4">
          <Card className="p-6 border-border border-warning/30 bg-warning/5">
            <p className="text-xs text-muted-foreground uppercase mb-1">Patrimônio Necessário</p>
            <p className="text-3xl font-bold text-warning">{fmt(results.patrimonioNecessario)}</p>
            <p className="text-sm text-muted-foreground mt-1">Para gerar {fmt(results.rendaMensalFinal)}/mês com DY de {dy.toFixed(1).replace('.', ',')}%</p>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ResultCard label="Tempo Estimado" value={results.tempoStr} colorVar="positive" icon={<Clock className="w-5 h-5" />} />
            <ResultCard label="Total Aportado" value={fmt(results.totalAportado)} colorVar="invested" icon={<DollarSign className="w-5 h-5" />} />
            <ResultCard label="Renda Mensal" value={fmt(results.rendaMensalFinal)} colorVar="total" icon={<TrendingUp className="w-5 h-5" />} />
          </div>
        </div>
      )}
    </div>
  );
}
