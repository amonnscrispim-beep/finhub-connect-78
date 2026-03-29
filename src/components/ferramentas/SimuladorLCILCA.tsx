import { useState, useMemo } from 'react';
import { Landmark, TrendingUp, DollarSign, CheckCircle } from 'lucide-react';
import { Card, Button, ToolHeader, ResultCard, InputField, SliderField, fmt, parseNum } from './shared';

export function SimuladorLCILCA() {
  const [valorInicial, setValorInicial] = useState('');
  const [aporteMensal, setAporteMensal] = useState('');
  const [tempo, setTempo] = useState(60);
  const [cdi, setCdi] = useState(12.4);
  const [taxaLCI, setTaxaLCI] = useState(90);
  const [calculated, setCalculated] = useState(false);

  const results = useMemo(() => {
    if (!calculated) return null;
    const pv = parseNum(valorInicial);
    const pmt = parseNum(aporteMensal);
    const taxaAnualLCI = (cdi / 100) * (taxaLCI / 100);
    const taxaMesLCI = Math.pow(1 + taxaAnualLCI, 1 / 12) - 1;

    let saldoLCI = pv, totalInvestido = pv, totalJurosLCI = 0;
    for (let m = 1; m <= tempo; m++) {
      const juros = saldoLCI * taxaMesLCI;
      saldoLCI += juros + pmt;
      totalInvestido += pmt;
      totalJurosLCI += juros;
    }

    // CDB equivalente a 100% CDI para comparar
    const taxaMesCDB = Math.pow(1 + cdi / 100, 1 / 12) - 1;
    let saldoCDB = pv, totalJurosCDB = 0;
    let investCDB = pv;
    for (let m = 1; m <= tempo; m++) {
      const juros = saldoCDB * taxaMesCDB;
      saldoCDB += juros + pmt;
      investCDB += pmt;
      totalJurosCDB += juros;
    }
    const irRate = tempo * 30 <= 180 ? 0.225 : tempo * 30 <= 360 ? 0.20 : tempo * 30 <= 720 ? 0.175 : 0.15;
    const irCDB = totalJurosCDB * irRate;
    const liqCDB = saldoCDB - irCDB;

    const vantagem = saldoLCI - liqCDB;

    return { saldoLCI, totalInvestido, totalJurosLCI, liqCDB, irCDB, vantagem };
  }, [calculated, valorInicial, aporteMensal, tempo, cdi, taxaLCI]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border">
        <ToolHeader icon={<Landmark className="w-5 h-5" />} title="Simulador LCI / LCA" />
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Valor Inicial" prefix="R$" value={valorInicial} onChange={setValorInicial} />
            <InputField label="Aporte Mensal" prefix="R$" value={aporteMensal} onChange={setAporteMensal} />
          </div>
          <SliderField label="Tempo (meses)" value={tempo} min={1} max={120} step={1} onChange={setTempo} />
          <SliderField label="CDI Vigente" value={cdi} min={2} max={20} step={0.1} showValue={`${cdi.toFixed(1).replace('.', ',')}% a.a.`} onChange={setCdi} />
          <SliderField label="Taxa LCI/LCA (% do CDI)" value={taxaLCI} min={80} max={130} step={1} showValue={`${taxaLCI}% do CDI`} onChange={setTaxaLCI} />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setCalculated(false)}>Limpar</Button>
            <Button onClick={() => setCalculated(true)}>Calcular Investimento</Button>
          </div>
        </div>
      </Card>
      {results && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ResultCard label="Valor Final LCI/LCA" value={fmt(results.saldoLCI)} colorVar="positive" icon={<DollarSign className="w-5 h-5" />} />
            <Card className="p-5 border-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-md bg-success/10 text-success"><CheckCircle className="w-5 h-5" /></div>
                <span className="text-xs font-medium text-muted-foreground uppercase">IR</span>
              </div>
              <p className="text-xl font-bold text-success">Isento</p>
            </Card>
            <ResultCard label="Total Investido" value={fmt(results.totalInvestido)} colorVar="invested" icon={<TrendingUp className="w-5 h-5" />} />
          </div>
          <Card className="p-5 border-border">
            <p className="text-xs text-muted-foreground uppercase mb-2">Comparação com CDB 100% CDI</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">CDB Líquido (após IR)</p>
                <p className="text-lg font-bold text-foreground">{fmt(results.liqCDB)}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">LCI/LCA (isento)</p>
                <p className="text-lg font-bold text-success">{fmt(results.saldoLCI)}</p>
              </div>
              <div className={`p-3 rounded-lg ${results.vantagem > 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                <p className="text-xs text-muted-foreground">Diferença</p>
                <p className={`text-lg font-bold ${results.vantagem > 0 ? 'text-success' : 'text-destructive'}`}>{fmt(results.vantagem)}</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
