import { useState, useMemo } from 'react';
import { Landmark, TrendingUp, DollarSign, Percent } from 'lucide-react';
import { Card, Button, ToolHeader, ResultCard, InputField, SliderField, fmt, parseNum } from './shared';

function getIRRate(days: number) {
  if (days <= 180) return 0.225;
  if (days <= 360) return 0.20;
  if (days <= 720) return 0.175;
  return 0.15;
}

export function SimuladorCDB() {
  const [valorInicial, setValorInicial] = useState('');
  const [aporteMensal, setAporteMensal] = useState('');
  const [tempo, setTempo] = useState(60);
  const [cdi, setCdi] = useState(12.4);
  const [taxaCDB, setTaxaCDB] = useState(100);
  const [calculated, setCalculated] = useState(false);
  const [tab, setTab] = useState<'resumo' | 'detalhes'>('resumo');

  const results = useMemo(() => {
    if (!calculated) return null;
    const pv = parseNum(valorInicial);
    const pmt = parseNum(aporteMensal);
    const taxaAnual = (cdi / 100) * (taxaCDB / 100);
    const taxaMes = Math.pow(1 + taxaAnual, 1 / 12) - 1;

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
    const ganhoLiquido = valorLiquido - totalInvestido;
    const retBruto = totalInvestido > 0 ? ((saldo / totalInvestido) - 1) * 100 : 0;
    const retLiq = totalInvestido > 0 ? ((valorLiquido / totalInvestido) - 1) * 100 : 0;

    return { saldo, totalInvestido, totalJuros, irRate, ir, valorLiquido, ganhoLiquido, retBruto, retLiq };
  }, [calculated, valorInicial, aporteMensal, tempo, cdi, taxaCDB]);

  const eqMes = ((Math.pow(1 + cdi / 100, 1 / 12) - 1) * taxaCDB / 100 * 100).toFixed(2).replace('.', ',');

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border">
        <ToolHeader icon={<Landmark className="w-5 h-5" />} title="Simulador de CDB" />
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Valor Inicial" prefix="R$" value={valorInicial} onChange={setValorInicial} />
            <InputField label="Aporte Mensal" prefix="R$" value={aporteMensal} onChange={setAporteMensal} />
          </div>
          <SliderField label="Tempo (meses)" value={tempo} min={1} max={120} step={1} onChange={setTempo} />
          <SliderField label="CDI Vigente" value={cdi} min={2} max={20} step={0.1} showValue={`${cdi.toFixed(1).replace('.', ',')}% a.a.`} onChange={setCdi} />
          <SliderField label="Taxa do CDB (% do CDI)" value={taxaCDB} min={80} max={130} step={1} showValue={`${taxaCDB}% do CDI (≈ ${eqMes}% a.m.)`} onChange={setTaxaCDB} />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setCalculated(false)}>Limpar</Button>
            <Button onClick={() => setCalculated(true)}>Calcular Investimento</Button>
          </div>
        </div>
      </Card>
      {results && (
        <>
          <div className="flex gap-2 mb-2">
            <Button variant={tab === 'resumo' ? 'default' : 'outline'} size="sm" onClick={() => setTab('resumo')}>Resumo</Button>
            <Button variant={tab === 'detalhes' ? 'default' : 'outline'} size="sm" onClick={() => setTab('detalhes')}>Detalhes</Button>
          </div>
          {tab === 'resumo' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ResultCard label="Valor Bruto" value={fmt(results.saldo)} colorVar="invested" icon={<DollarSign className="w-5 h-5" />} />
              <ResultCard label={`IR (${(results.irRate * 100).toFixed(1)}%)`} value={fmt(results.ir)} colorVar="negative" icon={<Percent className="w-5 h-5" />} />
              <ResultCard label="Ganho Líquido" value={fmt(results.ganhoLiquido)} colorVar="positive" icon={<TrendingUp className="w-5 h-5" />} />
              <Card className="p-5 border-border sm:col-span-3">
                <p className="text-xs text-muted-foreground uppercase mb-1">Valor Líquido Final</p>
                <p className="text-2xl font-bold text-warning">{fmt(results.valorLiquido)}</p>
              </Card>
            </div>
          )}
          {tab === 'detalhes' && (
            <Card className="overflow-hidden border-border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-primary"><th className="px-4 py-2.5 text-left text-xs font-semibold text-primary-foreground uppercase">Métrica</th><th className="px-4 py-2.5 text-right text-xs font-semibold text-primary-foreground uppercase">Valor</th></tr></thead>
                  <tbody>
                    {[
                      ['Valor Bruto', fmt(results.saldo)],
                      ['Total Investido', fmt(results.totalInvestido)],
                      [`IR (${(results.irRate * 100).toFixed(1)}%)`, fmt(results.ir)],
                      ['Valor Líquido', fmt(results.valorLiquido)],
                      ['Retorno Bruto', `${results.retBruto.toFixed(2).replace('.', ',')}%`],
                      ['Retorno Líquido', `${results.retLiq.toFixed(2).replace('.', ',')}%`],
                    ].map(([label, val], i) => (
                      <tr key={label} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                        <td className="px-4 py-2 text-foreground">{label}</td>
                        <td className="px-4 py-2 text-right font-medium text-foreground">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
