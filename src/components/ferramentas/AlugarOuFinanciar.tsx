import { useState, useMemo } from 'react';
import { Home, CheckCircle } from 'lucide-react';
import { Card, Button, ToolHeader, InputField, SliderField, fmt, parseNum } from './shared';

export function AlugarOuFinanciar() {
  const [valorImovel, setValorImovel] = useState('');
  const [aluguel, setAluguel] = useState('');
  const [entrada, setEntrada] = useState('');
  const [custosExtras, setCustosExtras] = useState('');
  const [prazo, setPrazo] = useState(15);
  const [jurosFinanc, setJurosFinanc] = useState(11);
  const [retornoInvest, setRetornoInvest] = useState(5);
  const [valorizacao, setValorizacao] = useState(5);
  const [reajusteAluguel, setReajusteAluguel] = useState(9.27);
  const [calculated, setCalculated] = useState(false);

  const results = useMemo(() => {
    if (!calculated) return null;
    const vi = parseNum(valorImovel);
    const al = parseNum(aluguel);
    const ent = parseNum(entrada);
    const extras = parseNum(custosExtras);
    if (vi <= 0 || al <= 0) return null;

    const financiado = vi - ent + extras;
    const n = prazo * 12;
    const im = jurosFinanc / 100 / 12;
    const parcela = financiado * (im * Math.pow(1 + im, n)) / (Math.pow(1 + im, n) - 1);
    const custoTotalFinanc = parcela * n + ent + extras;
    const valorFinalImovel = vi * Math.pow(1 + valorizacao / 100, prazo);

    // Alugar: paga aluguel + investe a diferença
    const investMensal = retornoInvest / 100 / 12;
    let saldoInvest = ent + extras; // investe o que seria entrada
    let custoTotalAluguel = 0;
    let aluguelAtual = al;
    for (let m = 1; m <= n; m++) {
      if (m > 1 && m % 12 === 1) aluguelAtual *= 1 + reajusteAluguel / 100;
      custoTotalAluguel += aluguelAtual;
      const diff = parcela - aluguelAtual;
      if (diff > 0) saldoInvest = (saldoInvest + diff) * (1 + investMensal);
      else saldoInvest = saldoInvest * (1 + investMensal);
    }

    const patrimFinanc = valorFinalImovel;
    const patrimAluguel = saldoInvest;
    const melhorOpcao = patrimAluguel > patrimFinanc ? 'alugar' : 'financiar';

    return { parcela, custoTotalFinanc, custoTotalAluguel, valorFinalImovel, saldoInvest, melhorOpcao, patrimFinanc, patrimAluguel };
  }, [calculated, valorImovel, aluguel, entrada, custosExtras, prazo, jurosFinanc, retornoInvest, valorizacao, reajusteAluguel]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border">
        <ToolHeader icon={<Home className="w-5 h-5" />} title="Alugar ou Financiar Imóvel" />
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <InputField label="Valor do Imóvel" prefix="R$" value={valorImovel} onChange={setValorImovel} />
            <InputField label="Aluguel Equivalente" prefix="R$" value={aluguel} onChange={setAluguel} />
            <InputField label="Entrada" prefix="R$" value={entrada} onChange={setEntrada} />
            <InputField label="Custos Extras (ITBI etc)" prefix="R$" value={custosExtras} onChange={setCustosExtras} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SliderField label="Prazo (anos)" value={prazo} min={1} max={30} step={1} onChange={setPrazo} />
            <SliderField label="Juros Financiamento" value={jurosFinanc} min={1} max={30} step={0.5} suffix="% a.a." showValue={`${jurosFinanc.toFixed(1).replace('.', ',')}% a.a.`} onChange={setJurosFinanc} />
            <SliderField label="Retorno Investimentos" value={retornoInvest} min={1} max={20} step={0.5} suffix="% a.a." showValue={`${retornoInvest.toFixed(1).replace('.', ',')}% a.a.`} onChange={setRetornoInvest} />
            <SliderField label="Valorização Imóvel" value={valorizacao} min={0} max={15} step={0.5} suffix="% a.a." showValue={`${valorizacao.toFixed(1).replace('.', ',')}% a.a.`} onChange={setValorizacao} />
            <SliderField label="Reajuste Aluguel (IGPM)" value={reajusteAluguel} min={-5} max={20} step={0.5} suffix="% a.a." showValue={`${reajusteAluguel.toFixed(2).replace('.', ',')}% a.a.`} onChange={setReajusteAluguel} />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setCalculated(false)}>Limpar</Button>
            <Button onClick={() => setCalculated(true)}>Calcular Melhor Opção</Button>
          </div>
        </div>
      </Card>
      {results && (
        <div className="space-y-4">
          <Card className="p-6 border-border">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
              <p className="text-lg font-bold text-foreground">
                Melhor opção: {results.melhorOpcao === 'alugar' ? '🏠 Alugar e Investir' : '🏗️ Financiar'}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg border ${results.melhorOpcao === 'financiar' ? 'border-success bg-success/5' : 'border-border bg-muted'}`}>
                <p className="text-xs text-muted-foreground uppercase font-bold mb-2">Financiar</p>
                <p className="text-sm text-muted-foreground">Parcela mensal: <span className="font-bold text-foreground">{fmt(results.parcela)}</span></p>
                <p className="text-sm text-muted-foreground">Custo total: <span className="font-bold text-foreground">{fmt(results.custoTotalFinanc)}</span></p>
                <p className="text-sm text-muted-foreground">Patrimônio final: <span className="font-bold text-success">{fmt(results.patrimFinanc)}</span></p>
              </div>
              <div className={`p-4 rounded-lg border ${results.melhorOpcao === 'alugar' ? 'border-success bg-success/5' : 'border-border bg-muted'}`}>
                <p className="text-xs text-muted-foreground uppercase font-bold mb-2">Alugar + Investir</p>
                <p className="text-sm text-muted-foreground">Custo total aluguel: <span className="font-bold text-foreground">{fmt(results.custoTotalAluguel)}</span></p>
                <p className="text-sm text-muted-foreground">Patrimônio investido: <span className="font-bold text-success">{fmt(results.patrimAluguel)}</span></p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
