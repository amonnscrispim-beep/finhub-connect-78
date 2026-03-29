import { useState, useMemo } from 'react';
import { Percent } from 'lucide-react';
import { Card, Button, ToolHeader, InputField, SliderField, fmt, parseNum } from './shared';

const IOF_TABLE = [96,93,90,86,83,80,76,73,70,66,63,60,56,53,50,46,43,40,36,33,30,26,23,20,16,13,10,6,3,0];

export function IOFCaixinha() {
  const [valor, setValor] = useState('');
  const [diaResgate, setDiaResgate] = useState(15);
  const [cdi, setCdi] = useState(10.75);
  const [calculated, setCalculated] = useState(false);

  const results = useMemo(() => {
    if (!calculated) return null;
    const v = parseNum(valor);
    if (v <= 0) return null;
    const cdiDiario = Math.pow(1 + cdi / 100, 1 / 252) - 1;
    const rendBruto = v * (Math.pow(1 + cdiDiario, diaResgate) - 1);
    const aliquota = IOF_TABLE[diaResgate - 1] ?? 0;
    const iofDescontado = rendBruto * (aliquota / 100);
    const valorLiquido = v + rendBruto - iofDescontado;

    return { rendBruto, aliquota, iofDescontado, valorLiquido };
  }, [calculated, valor, diaResgate, cdi]);

  const getColor = (aliq: number) => {
    if (aliq >= 70) return 'text-destructive bg-destructive/10 border-destructive/30';
    if (aliq >= 30) return 'text-warning bg-warning/10 border-warning/30';
    return 'text-success bg-success/10 border-success/30';
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border">
        <ToolHeader icon={<Percent className="w-5 h-5" />} title="Calculadora de IOF da Caixinha" />
        <div className="p-5 space-y-4">
          <InputField label="Valor Investido" prefix="R$" value={valor} onChange={setValor} />
          <SliderField label="Dia do Resgate" value={diaResgate} min={1} max={30} step={1} onChange={setDiaResgate} />
          <SliderField label="CDI Anual" value={cdi} min={6} max={15} step={0.25} showValue={`${cdi.toFixed(2).replace('.', ',')}% a.a.`} onChange={setCdi} />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setCalculated(false)}>Limpar</Button>
            <Button onClick={() => setCalculated(true)}>Calcular Impostos</Button>
          </div>
        </div>
      </Card>
      {results && (
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border text-center ${getColor(results.aliquota)}`}>
            <p className="text-sm font-medium">Alíquota IOF no Dia {diaResgate}</p>
            <p className="text-3xl font-bold">{results.aliquota}%</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 border-border">
              <p className="text-xs text-muted-foreground uppercase">Rendimento Bruto</p>
              <p className="text-lg font-bold text-color-invested">{fmt(results.rendBruto)}</p>
            </Card>
            <Card className="p-4 border-border">
              <p className="text-xs text-muted-foreground uppercase">IOF Descontado</p>
              <p className="text-lg font-bold text-destructive">{fmt(results.iofDescontado)}</p>
            </Card>
            <Card className="p-4 border-border">
              <p className="text-xs text-muted-foreground uppercase">Valor Líquido</p>
              <p className="text-lg font-bold text-success">{fmt(results.valorLiquido)}</p>
            </Card>
          </div>
          <Card className="overflow-hidden border-border">
            <ToolHeader icon={null} title="Tabela de IOF por Dia" />
            <div className="p-4 grid grid-cols-6 sm:grid-cols-10 gap-1.5">
              {IOF_TABLE.map((aliq, i) => (
                <div key={i} className={`p-2 rounded text-center text-xs font-medium border ${i + 1 === diaResgate ? 'ring-2 ring-ring' : ''} ${getColor(aliq)}`}>
                  <p className="font-bold">{i + 1}</p>
                  <p>{aliq}%</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
