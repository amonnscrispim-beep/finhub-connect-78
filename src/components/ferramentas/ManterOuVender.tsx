import { useState, useMemo } from 'react';
import { Home, TrendingUp, Building2, Trophy, Sparkles, Coins } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, ToolHeader, InputField, SliderField, fmt, parseNum } from './shared';
import { Badge } from '@/components/ui/badge';

interface ScenarioResult {
  patrimonioFinal: number;
  valorImovelBruto: number;
  custosVenda: number;
  valorImovelLiquido: number;
  saldoAlugueisInvest: number;
  totalAluguelRecebido: number;
}

export function ManterOuVender() {
  const [valorAtual, setValorAtual] = useState('800.000');
  const [valorOriginal, setValorOriginal] = useState('500.000');
  const [aluguelLiquido, setAluguelLiquido] = useState('3.500');
  const [prazo, setPrazo] = useState(20);
  const [valorizacao, setValorizacao] = useState(5);
  const [reajusteAluguel, setReajusteAluguel] = useState(7);
  const [retornoInvest, setRetornoInvest] = useState(10);

  const data = useMemo(() => {
    const va = parseNum(valorAtual);
    const vo = parseNum(valorOriginal);
    const al = parseNum(aluguelLiquido);
    if (va <= 0 || al <= 0) return null;

    const n = prazo * 12;
    const iInv = Math.pow(1 + retornoInvest / 100, 1 / 12) - 1;
    const valorizacaoMensal = Math.pow(1 + valorizacao / 100, 1 / 12) - 1;
    const reajusteAnual = reajusteAluguel / 100;

    // ===== CENÁRIO B: vender hoje =====
    const corretagemVendaHoje = va * 0.06;
    const lucroHoje = Math.max(0, va - vo - corretagemVendaHoje);
    const irHoje = lucroHoje * 0.15;
    const capitalLiquidoInicial = va - corretagemVendaHoje - irHoje;

    // ===== Loop mês a mês =====
    let valImovel = va;
    let aluguelMes = al;
    let saldoAlugueisInvest = 0;
    let saldoVender = capitalLiquidoInicial;
    let totalAluguelRecebido = 0;

    const tabelaMensal: {
      mes: number;
      valorImovel: number;
      aluguel: number;
      saldoAlugueis: number;
      patrimonioA: number;
      patrimonioB: number;
    }[] = [];
    const chartData: { ano: number; manter: number; vender: number }[] = [
      { ano: 0, manter: va, vender: capitalLiquidoInicial },
    ];

    for (let m = 1; m <= n; m++) {
      // Reajuste do aluguel a cada 12 meses
      if (m > 1 && (m - 1) % 12 === 0) {
        aluguelMes = aluguelMes * (1 + reajusteAnual);
      }
      // Valorização mensal do imóvel
      valImovel = valImovel * (1 + valorizacaoMensal);

      // Cenário A: investe o aluguel
      saldoAlugueisInvest = saldoAlugueisInvest * (1 + iInv) + aluguelMes;
      totalAluguelRecebido += aluguelMes;

      // Cenário B: capital líquido cresce a juros compostos
      saldoVender = saldoVender * (1 + iInv);

      // Patrimônio A (líquido com custos de venda no mês corrente)
      const corretagemA = valImovel * 0.06;
      const lucroA = Math.max(0, valImovel - vo - corretagemA);
      const irA = lucroA * 0.15;
      const valorImovelLiquidoA = valImovel - corretagemA - irA;
      const patrimonioA = valorImovelLiquidoA + saldoAlugueisInvest;

      tabelaMensal.push({
        mes: m,
        valorImovel: valImovel,
        aluguel: aluguelMes,
        saldoAlugueis: saldoAlugueisInvest,
        patrimonioA,
        patrimonioB: saldoVender,
      });

      if (m % 12 === 0) {
        chartData.push({ ano: m / 12, manter: patrimonioA, vender: saldoVender });
      }
    }

    // Resultado final Cenário A
    const valorImovelFinal = valImovel;
    const corretagemFinal = valorImovelFinal * 0.06;
    const lucroFinal = Math.max(0, valorImovelFinal - vo - corretagemFinal);
    const irFinal = lucroFinal * 0.15;
    const custosVendaFinal = corretagemFinal + irFinal;
    const valorImovelLiquidoFinal = valorImovelFinal - custosVendaFinal;

    const cenarioA: ScenarioResult = {
      patrimonioFinal: valorImovelLiquidoFinal + saldoAlugueisInvest,
      valorImovelBruto: valorImovelFinal,
      custosVenda: custosVendaFinal,
      valorImovelLiquido: valorImovelLiquidoFinal,
      saldoAlugueisInvest,
      totalAluguelRecebido,
    };

    const cenarioB = {
      patrimonioFinal: saldoVender,
      capitalLiquidoInicial,
      corretagemVendaHoje,
      irHoje,
    };

    const vencedor: 'A' | 'B' = cenarioA.patrimonioFinal >= cenarioB.patrimonioFinal ? 'A' : 'B';
    const diferenca = Math.abs(cenarioA.patrimonioFinal - cenarioB.patrimonioFinal);

    return { cenarioA, cenarioB, tabelaMensal, chartData, vencedor, diferenca };
  }, [valorAtual, valorOriginal, aluguelLiquido, prazo, valorizacao, reajusteAluguel, retornoInvest]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="overflow-hidden border-border">
        <ToolHeader
          icon={<Building2 className="w-4 h-4" />}
          title="Manter Imóvel Alugado vs. Vender para Investir"
        />
        <div className="p-5">
          <p className="text-sm text-muted-foreground">
            Compare o resultado de manter um imóvel já quitado gerando aluguel versus vendê-lo hoje
            (descontando corretagem e IR sobre ganho de capital) e investir o capital líquido.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Inputs */}
        <Card className="lg:col-span-1 p-5 border-border space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Premissas da Simulação
          </h3>

          <InputField label="Valor Atual do Imóvel" prefix="R$" value={valorAtual} onChange={setValorAtual} />
          <InputField label="Valor Original de Compra" prefix="R$" value={valorOriginal} onChange={setValorOriginal} />
          <InputField label="Aluguel Líquido Mensal" prefix="R$" value={aluguelLiquido} onChange={setAluguelLiquido} />

          <SliderField
            label="Prazo de Análise"
            value={prazo}
            min={1}
            max={35}
            step={1}
            onChange={setPrazo}
            showValue={`${prazo} anos`}
          />
          <SliderField
            label="Valorização do Imóvel (a.a.)"
            value={valorizacao}
            min={0}
            max={20}
            step={0.5}
            suffix="%"
            onChange={setValorizacao}
          />
          <SliderField
            label="Reajuste Anual do Aluguel"
            value={reajusteAluguel}
            min={0}
            max={20}
            step={0.5}
            suffix="%"
            onChange={setReajusteAluguel}
          />
          <SliderField
            label="Retorno dos Investimentos (a.a.)"
            value={retornoInvest}
            min={0}
            max={25}
            step={0.5}
            suffix="%"
            onChange={setRetornoInvest}
          />
        </Card>

        {/* Resultados */}
        <div className="lg:col-span-2 space-y-4">
          {data && (
            <>
              {/* Cards Veredito */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ResultBlock
                  vencedor={data.vencedor === 'A'}
                  title="Cenário A — Manter & Alugar"
                  icon={<Home className="w-4 h-4" />}
                  total={data.cenarioA.patrimonioFinal}
                  rows={[
                    { label: 'Valor do imóvel (bruto)', value: data.cenarioA.valorImovelBruto },
                    { label: 'Custos de venda (6% + 15% IR)', value: -data.cenarioA.custosVenda, negative: true },
                    { label: 'Valor do imóvel (líquido)', value: data.cenarioA.valorImovelLiquido, strong: true },
                    { label: 'Aluguéis investidos (saldo)', value: data.cenarioA.saldoAlugueisInvest },
                    { label: 'Total de aluguel recebido', value: data.cenarioA.totalAluguelRecebido, muted: true },
                  ]}
                />
                <ResultBlock
                  vencedor={data.vencedor === 'B'}
                  title="Cenário B — Vender & Investir"
                  icon={<Coins className="w-4 h-4" />}
                  total={data.cenarioB.patrimonioFinal}
                  rows={[
                    { label: 'Valor de venda (bruto)', value: parseNum(valorAtual) },
                    { label: 'Corretagem (6%)', value: -data.cenarioB.corretagemVendaHoje, negative: true },
                    { label: 'IR sobre ganho (15%)', value: -data.cenarioB.irHoje, negative: true },
                    { label: 'Capital líquido investido', value: data.cenarioB.capitalLiquidoInicial, strong: true },
                  ]}
                />
              </div>

              {/* Veredito */}
              <Card className="p-4 border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10 text-success">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Veredito</p>
                    <p className="text-sm font-semibold text-foreground">
                      {data.vencedor === 'A' ? 'Manter o imóvel alugado' : 'Vender e investir'} é a melhor decisão
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-success">
                    +{fmt(data.diferenca)}
                  </Badge>
                </div>
              </Card>

              {/* Gráfico de evolução */}
              <Card className="p-5 border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Evolução do Patrimônio Líquido (anual)
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="ano" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} label={{ value: 'Anos', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', fontSize: 12 }}
                      formatter={(v: number) => fmt(v)}
                      labelFormatter={(l) => `Ano ${l}`}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="manter" name="Manter & Alugar" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="vender" name="Vender & Investir" stroke="hsl(var(--success))" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Tabela mensal */}
              <Card className="border-border">
                <div className="p-5 pb-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Evolução Mensal — Fluxo de Caixa Detalhado
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Todos os {data.tabelaMensal.length} meses da simulação. Role para explorar.
                  </p>
                </div>
                <div className="max-h-[500px] overflow-y-auto border-t border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted z-10">
                      <tr className="border-b border-border">
                        <th className="text-left p-2 font-medium text-muted-foreground">Mês</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Valor Imóvel</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Aluguel Recebido</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Saldo Alugueis Investidos</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Patrim. Total (A)</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Patrim. Total (B)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.tabelaMensal.map((row) => (
                        <tr key={row.mes} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="p-2 font-medium text-foreground">{row.mes}</td>
                          <td className="p-2 text-right text-foreground">{fmt(row.valorImovel)}</td>
                          <td className="p-2 text-right text-foreground">{fmt(row.aluguel)}</td>
                          <td className="p-2 text-right text-foreground">{fmt(row.saldoAlugueis)}</td>
                          <td className="p-2 text-right font-semibold text-primary">{fmt(row.patrimonioA)}</td>
                          <td className="p-2 text-right font-semibold text-success">{fmt(row.patrimonioB)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface ResultRow {
  label: string;
  value: number;
  negative?: boolean;
  strong?: boolean;
  muted?: boolean;
}

function ResultBlock({
  title,
  icon,
  total,
  rows,
  vencedor,
}: {
  title: string;
  icon: React.ReactNode;
  total: number;
  rows: ResultRow[];
  vencedor: boolean;
}) {
  return (
    <Card className={`p-5 border-2 ${vencedor ? 'border-success bg-success/5' : 'border-border'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${vencedor ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
            {icon}
          </div>
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        </div>
        {vencedor && <Badge className="bg-success text-success-foreground hover:bg-success">Vencedor</Badge>}
      </div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">Patrimônio líquido final</p>
      <p className={`text-2xl font-bold mb-3 ${vencedor ? 'text-success' : 'text-foreground'}`}>{fmt(total)}</p>
      <div className="space-y-1.5 pt-3 border-t border-border">
        {rows.map((r, i) => (
          <div key={i} className="flex justify-between text-xs">
            <span className={r.muted ? 'text-muted-foreground' : 'text-muted-foreground'}>{r.label}</span>
            <span
              className={`tabular-nums ${
                r.negative ? 'text-destructive' : r.strong ? 'font-semibold text-foreground' : 'text-foreground'
              }`}
            >
              {fmt(r.value)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
