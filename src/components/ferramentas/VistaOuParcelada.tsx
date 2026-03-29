import { useState, useMemo } from 'react';
import { ShoppingCart, CheckCircle } from 'lucide-react';
import { Card, Button, ToolHeader, InputField, SliderField, fmt, parseNum } from './shared';

export function VistaOuParcelada() {
  const [precoVista, setPrecoVista] = useState('');
  const [numParcelas, setNumParcelas] = useState('');
  const [valorParcela, setValorParcela] = useState('');
  const [investir, setInvestir] = useState(true);
  const [rendimento, setRendimento] = useState(0.9);
  const [calculated, setCalculated] = useState(false);

  const results = useMemo(() => {
    if (!calculated) return null;
    const pv = parseNum(precoVista);
    const n = Math.round(parseNum(numParcelas));
    const pmt = parseNum(valorParcela);
    if (pv <= 0 || n <= 0 || pmt <= 0) return null;

    const totalParcelado = pmt * n;
    const custoJuros = totalParcelado - pv;

    if (!investir) {
      return { melhor: totalParcelado <= pv ? 'parcelar' : 'vista', pv, totalParcelado, custoJuros, economia: Math.abs(custoJuros), rendimentoGanho: 0 };
    }

    const taxa = rendimento / 100;
    let vp = 0;
    for (let i = 1; i <= n; i++) {
      vp += pmt / Math.pow(1 + taxa, i);
    }

    // Rendimento se investir o valor à vista
    let saldo = pv;
    for (let i = 0; i < n; i++) {
      saldo = saldo * (1 + taxa) - pmt;
    }
    const rendimentoGanho = saldo > 0 ? saldo : 0;
    const melhor = vp < pv ? 'parcelar' : 'vista';
    const economia = Math.abs(vp - pv);

    return { melhor, pv, totalParcelado, custoJuros, economia, rendimentoGanho, vp };
  }, [calculated, precoVista, numParcelas, valorParcela, investir, rendimento]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border">
        <ToolHeader icon={<ShoppingCart className="w-5 h-5" />} title="Compra à Vista ou Parcelada" />
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InputField label="Preço à Vista" prefix="R$" value={precoVista} onChange={setPrecoVista} />
            <InputField label="Nº de Parcelas" prefix="#" value={numParcelas} onChange={setNumParcelas} />
            <InputField label="Valor da Parcela" prefix="R$" value={valorParcela} onChange={setValorParcela} />
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-foreground">Vai investir o dinheiro?</p>
            <div className="flex gap-2">
              <Button variant={investir ? 'default' : 'outline'} size="sm" onClick={() => setInvestir(true)}>Sim</Button>
              <Button variant={!investir ? 'default' : 'outline'} size="sm" onClick={() => setInvestir(false)}>Não</Button>
            </div>
          </div>
          {investir && <SliderField label="Rendimento Mensal" value={rendimento} min={0.1} max={5} step={0.05} showValue={`${rendimento.toFixed(2).replace('.', ',')}% a.m.`} onChange={setRendimento} />}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setCalculated(false)}>Limpar</Button>
            <Button onClick={() => setCalculated(true)}>Calcular Comparativo</Button>
          </div>
        </div>
      </Card>
      {results && (
        <Card className="p-6 border-border">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
            <p className="text-lg font-bold text-foreground">
              Melhor opção: {results.melhor === 'parcelar' ? '💳 Parcelar' : '💰 Pagar à Vista'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground uppercase">Preço à Vista</p>
              <p className="text-xl font-bold text-foreground">{fmt(results.pv)}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground uppercase">Total Parcelado</p>
              <p className="text-xl font-bold text-foreground">{fmt(results.totalParcelado)}</p>
              <p className="text-xs text-muted-foreground">Juros embutidos: {fmt(results.custoJuros)}</p>
            </div>
            <div className="p-4 bg-success/10 rounded-lg border border-success/30">
              <p className="text-xs text-muted-foreground uppercase">Economia</p>
              <p className="text-xl font-bold text-success">{fmt(results.economia)}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
