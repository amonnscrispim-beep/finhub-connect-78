import { useState } from 'react';
import { TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, Button, ToolHeader, InputField, SliderField, fmt, parseNum } from './shared';
import { Progress } from '@/components/ui/progress';

export function PatrimonioIdade() {
  const [idade, setIdade] = useState(30);
  const [renda, setRenda] = useState('');
  const [patrimonio, setPatrimonio] = useState('');
  const [calculated, setCalculated] = useState(false);

  const rendaVal = parseNum(renda);
  const patrimonioVal = parseNum(patrimonio);
  const benchmark = (idade * rendaVal * 12) / 10;
  const pct = benchmark > 0 ? Math.min((patrimonioVal / benchmark) * 100, 200) : 0;
  const ok = patrimonioVal >= benchmark;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border">
        <ToolHeader icon={<TrendingUp className="w-5 h-5" />} title="Calculadora Patrimônio por Idade" />
        <div className="p-5 space-y-4">
          <SliderField label="Sua Idade" value={idade} min={18} max={100} step={1} onChange={setIdade} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Renda Mensal Bruta" prefix="R$" value={renda} onChange={setRenda} />
            <InputField label="Patrimônio Atual" prefix="R$" value={patrimonio} onChange={setPatrimonio} />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => { setRenda(''); setPatrimonio(''); setCalculated(false); }}>Limpar</Button>
            <Button onClick={() => setCalculated(true)}>Calcular Meu Benchmark</Button>
          </div>
        </div>
      </Card>
      {calculated && rendaVal > 0 && (
        <Card className="p-6 border-border space-y-4">
          <div className="flex items-center gap-3">
            {ok ? <CheckCircle className="w-8 h-8 text-success" /> : <AlertTriangle className="w-8 h-8 text-warning" />}
            <div>
              <p className="text-lg font-bold text-foreground">{ok ? '✅ Parabéns!' : '⚠️ Atenção'}</p>
              <p className="text-sm text-muted-foreground">{ok ? 'Seu patrimônio está acima do benchmark ideal.' : 'Seu patrimônio está abaixo do benchmark ideal.'}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground uppercase">Benchmark Ideal</p>
              <p className="text-xl font-bold text-color-invested">{fmt(benchmark)}</p>
              <p className="text-xs text-muted-foreground mt-1">Fórmula: (Idade × Renda Anual) ÷ 10</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground uppercase">Seu Patrimônio</p>
              <p className={`text-xl font-bold ${ok ? 'text-success' : 'text-warning'}`}>{fmt(patrimonioVal)}</p>
              <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(0)}% do benchmark</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Progresso</p>
            <Progress value={Math.min(pct, 100)} className="h-3" />
          </div>
        </Card>
      )}
    </div>
  );
}
