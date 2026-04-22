import { useState, useMemo } from 'react';
import { Home, TrendingUp, Building2, Trophy, Sparkles, Coins, Zap, Wallet } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, ToolHeader, InputField, SliderField, fmt, parseNum } from './shared';
import { Badge } from '@/components/ui/badge';

export function ManterOuVender() {
  const [valorAtual, setValorAtual] = useState('800.000');
  const [valorOriginal, setValorOriginal] = useState('500.000');
  const [aluguelLiquido, setAluguelLiquido] = useState('3.500');
  const [aporteMensal, setAporteMensal] = useState('0');
  const [iptuPctAA, setIptuPctAA] = useState(1);
  const [prazo, setPrazo] = useState(20);
  const [valorizacao, setValorizacao] = useState(5);
  const [reajusteAluguel, setReajusteAluguel] = useState(7);
  const [retornoInvest, setRetornoInvest] = useState(10);

  const data = useMemo(() => {
    const va = parseNum(valorAtual);
    const vo = parseNum(valorOriginal);
    const al = parseNum(aluguelLiquido);
    const aporte = parseNum(aporteMensal);
    if (va <= 0 || al <= 0) return null;

    const n = prazo * 12;
    const iInv = Math.pow(1 + retornoInvest / 100, 1 / 12) - 1;
    const valorizacaoMensal = Math.pow(1 + valorizacao / 100, 1 / 12) - 1;
    const reajusteAnual = reajusteAluguel / 100;
    const iptuMensalPct = (iptuPctAA / 100) / 12;

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
    let totalIptuPago = 0;

    // Raio-X do 1º Ano
    let aluguelAno1 = 0;
    let iptuAno1 = 0;
    let valorImovelInicio = va;
    let rendimentoFiisAno1 = 0;
    const saldoVenderInicio = capitalLiquidoInicial;

    const tabelaMensal: {
      mes: number;
      valorImovel: number;
      aluguel: number;
      iptu: number;
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

      // IPTU/Manutenção mensal sobre o valor do imóvel
      const iptuMes = valImovel * iptuMensalPct;

      // Cenário A: recebe aluguel, paga IPTU, reinveste líquido + aporte extra
      const fluxoLiquidoMes = aluguelMes - iptuMes + aporte;
      saldoAlugueisInvest = saldoAlugueisInvest * (1 + iInv) + fluxoLiquidoMes;
      totalAluguelRecebido += aluguelMes;
      totalIptuPago += iptuMes;

      // Cenário B: capital líquido cresce + aporte mensal
      const saldoVenderAntes = saldoVender;
      saldoVender = saldoVender * (1 + iInv) + aporte;

      // Acúmulos do 1º ano
      if (m <= 12) {
        aluguelAno1 += aluguelMes;
        iptuAno1 += iptuMes;
        rendimentoFiisAno1 += saldoVenderAntes * iInv;
      }

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
        iptu: iptuMes,
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

    const cenarioA = {
      patrimonioFinal: valorImovelLiquidoFinal + saldoAlugueisInvest,
      valorImovelBruto: valorImovelFinal,
      custosVenda: custosVendaFinal,
      valorImovelLiquido: valorImovelLiquidoFinal,
      saldoAlugueisInvest,
      totalAluguelRecebido,
      totalIptuPago,
    };

    const cenarioB = {
      patrimonioFinal: saldoVender,
      capitalLiquidoInicial,
      corretagemVendaHoje,
      irHoje,
    };

    const vencedor: 'A' | 'B' = cenarioA.patrimonioFinal >= cenarioB.patrimonioFinal ? 'A' : 'B';
    const diferenca = Math.abs(cenarioA.patrimonioFinal - cenarioB.patrimonioFinal);

    // ===== Raio-X do 1º Ano =====
    const valorizacaoAno1 = valorImovel12(va, valorizacaoMensal) - valorImovelInicio;
    const resultadoAnualA = valorizacaoAno1 + aluguelAno1 - iptuAno1;
    const resultadoAnualB = rendimentoFiisAno1;
    const vencedorAno1: 'A' | 'B' = resultadoAnualA >= resultadoAnualB ? 'A' : 'B';
    const diferencaAno1 = Math.abs(resultadoAnualA - resultadoAnualB);

    const raioX = {
      A: { valorizacao: valorizacaoAno1, aluguel: aluguelAno1, iptu: iptuAno1, total: resultadoAnualA },
      B: { capitalInvestido: saldoVenderInicio, rendimento: rendimentoFiisAno1, total: resultadoAnualB },
      vencedor: vencedorAno1,
      diferenca: diferencaAno1,
    };

    return { cenarioA, cenarioB, tabelaMensal, chartData, vencedor, diferenca, raioX };
  }, [valorAtual, valorOriginal, aluguelLiquido, aporteMensal, iptuPctAA, prazo, valorizacao, reajusteAluguel, retornoInvest]);

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
            Compare manter um imóvel quitado gerando aluguel (líquido de IPTU/manutenção) versus vendê-lo
            (descontando corretagem e IR sobre ganho de capital) e investir o capital líquido em FIIs/Renda Fixa.
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
          <InputField label="Aporte Mensal Extra (opcional)" prefix="R$" value={aporteMensal} onChange={setAporteMensal} />

          <SliderField
            label="IPTU + Manutenção (a.a. sobre imóvel)"
            value={iptuPctAA}
            min={0}
            max={5}
            step={0.1}
            suffix="%"
            onChange={setIptuPctAA}
          />
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
            label="Rentab. Investimentos/FIIs (a.a.)"
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
              {/* ===== RAIO-X DO 1º ANO (Dark Premium) ===== */}
              <Card className="p-5 border-border bg-slate-900 text-slate-100 dark:bg-slate-950">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-100">
                    Raio-X do 1º Ano
                  </h3>
                  <Badge variant="secondary" className="ml-auto bg-slate-800 text-slate-300 border-slate-700">
                    Curto Prazo
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Impacto financeiro imediato nos primeiros 12 meses.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* A — Manter */}
                  <DarkRaioXCard
                    title="Opção A — Manter Imóvel"
                    icon={<Home className="w-4 h-4" />}
                    vencedor={data.raioX.vencedor === 'A'}
                    rows={[
                      { label: 'Valorização do imóvel', value: data.raioX.A.valorizacao, positive: true },
                      { label: 'Aluguel recebido (12m)', value: data.raioX.A.aluguel, positive: true },
                      { label: 'IPTU + Manutenção', value: -data.raioX.A.iptu, negative: true },
                    ]}
                    total={data.raioX.A.total}
                  />
                  {/* B — Vender */}
                  <DarkRaioXCard
                    title="Opção B — Vender & Investir"
                    icon={<Coins className="w-4 h-4" />}
                    vencedor={data.raioX.vencedor === 'B'}
                    rows={[
                      { label: 'Capital líquido investido', value: data.raioX.B.capitalInvestido, muted: true },
                      { label: 'Rendimento FIIs/Invest. (12m)', value: data.raioX.B.rendimento, positive: true },
                    ]}
                    total={data.raioX.B.total}
                  />
                </div>

                <div className="mt-4 p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Conclusão Curto Prazo</p>
                  <p className="text-sm text-slate-100">
                    No cenário atual, a{' '}
                    <span className="font-bold text-amber-400">
                      Opção {data.raioX.vencedor} ({data.raioX.vencedor === 'A' ? 'Manter' : 'Vender & Investir'})
                    </span>{' '}
                    gera um ganho adicional de{' '}
                    <span className="font-bold text-emerald-400">{fmt(data.raioX.diferenca)}</span> por ano em
                    comparação com a Opção {data.raioX.vencedor === 'A' ? 'B' : 'A'}.
                  </p>
                </div>
              </Card>

              {/* ===== Projeção de Longo Prazo ===== */}
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
                    { label: 'Total aluguel recebido', value: data.cenarioA.totalAluguelRecebido, muted: true },
                    { label: 'Total IPTU/manutenção pago', value: -data.cenarioA.totalIptuPago, muted: true },
                  ]}
                />
                <ResultBlock
                  vencedor={data.vencedor === 'B'}
                  title="Cenário B — Vender & Investir"
                  icon={<Wallet className="w-4 h-4" />}
                  total={data.cenarioB.patrimonioFinal}
                  rows={[
                    { label: 'Valor de venda (bruto)', value: parseNum(valorAtual) },
                    { label: 'Corretagem (6%)', value: -data.cenarioB.corretagemVendaHoje, negative: true },
                    { label: 'IR sobre ganho (15%)', value: -data.cenarioB.irHoje, negative: true },
                    { label: 'Investimento inicial líquido (após impostos/corretagem)', value: data.cenarioB.capitalLiquidoInicial, strong: true },
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
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Veredito Longo Prazo ({prazo} anos)
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {data.vencedor === 'A' ? 'Manter o imóvel alugado' : 'Vender e investir'} é a melhor decisão
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-success">
                    +{fmt(data.diferenca)}
                  </Badge>
                </div>
              </Card>

              {/* Gráfico */}
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
                        <th className="text-right p-2 font-medium text-muted-foreground">Aluguel</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">IPTU/Manut.</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Saldo Investido (A)</th>
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
                          <td className="p-2 text-right text-destructive">{fmt(row.iptu)}</td>
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

// Helper: valor do imóvel após 12 meses de valorização composta mensal
function valorImovel12(va: number, valorizacaoMensal: number) {
  return va * Math.pow(1 + valorizacaoMensal, 12);
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
          <div key={i} className="flex justify-between text-xs gap-2">
            <span className="text-muted-foreground">{r.label}</span>
            <span
              className={`tabular-nums whitespace-nowrap ${
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

interface DarkRow {
  label: string;
  value: number;
  positive?: boolean;
  negative?: boolean;
  muted?: boolean;
}

function DarkRaioXCard({
  title,
  icon,
  rows,
  total,
  vencedor,
}: {
  title: string;
  icon: React.ReactNode;
  rows: DarkRow[];
  total: number;
  vencedor: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-4 border ${
        vencedor
          ? 'border-amber-400/60 bg-gradient-to-br from-slate-800 to-slate-900 shadow-[0_0_20px_-5px_rgba(251,191,36,0.3)]'
          : 'border-slate-700 bg-slate-800/50'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${vencedor ? 'bg-amber-400/20 text-amber-400' : 'bg-slate-700 text-slate-300'}`}>
            {icon}
          </div>
          <h4 className="text-sm font-semibold text-slate-100">{title}</h4>
        </div>
        {vencedor && (
          <Badge className="bg-amber-400 text-slate-900 hover:bg-amber-400 text-[10px]">Melhor</Badge>
        )}
      </div>
      <div className="space-y-1.5 mb-3">
        {rows.map((r, i) => (
          <div key={i} className="flex justify-between text-xs gap-2">
            <span className={r.muted ? 'text-slate-500' : 'text-slate-400'}>{r.label}</span>
            <span
              className={`tabular-nums whitespace-nowrap font-medium ${
                r.negative ? 'text-rose-400' : r.positive ? 'text-emerald-400' : 'text-slate-300'
              }`}
            >
              {fmt(r.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="pt-3 border-t border-slate-700">
        <p className="text-[10px] text-slate-500 uppercase tracking-wide">Resultado líquido (12m)</p>
        <p className={`text-xl font-bold ${vencedor ? 'text-amber-400' : 'text-slate-100'}`}>{fmt(total)}</p>
      </div>
    </div>
  );
}
