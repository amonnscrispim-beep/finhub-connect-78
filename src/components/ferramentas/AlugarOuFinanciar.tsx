import { useState, useMemo } from 'react';
import { Home, TrendingUp, Building2, PiggyBank, Trophy, Sparkles } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Card, Button, ToolHeader, InputField, SliderField, fmt, parseNum } from './shared';
import { Badge } from '@/components/ui/badge';

type Cenario = 'A' | 'B' | 'C';

interface ScenarioResult {
  patrimonioFinal: number;
  totalPago: number;
  totalInvestido: number;
  jurosGanhos: number;
  valorImovelFinal: number;
  capitalAportado: number;
}

export function AlugarOuFinanciar() {
  const [valorImovel, setValorImovel] = useState('600.000');
  const [aluguel, setAluguel] = useState('2.500');
  const [entrada, setEntrada] = useState('120.000');
  const [custosExtras, setCustosExtras] = useState('30.000');
  const [prazo, setPrazo] = useState(20);
  const [jurosFinanc, setJurosFinanc] = useState(11);
  const [retornoInvest, setRetornoInvest] = useState(10);
  const [valorizacao, setValorizacao] = useState(5);
  const [reajusteAluguel, setReajusteAluguel] = useState(7);

  const data = useMemo(() => {
    const vi = parseNum(valorImovel);
    const al = parseNum(aluguel);
    const ent = parseNum(entrada);
    const extras = parseNum(custosExtras);
    if (vi <= 0 || al <= 0) return null;

    const n = prazo * 12;
    // Taxas mensais equivalentes (compostas)
    const im = Math.pow(1 + jurosFinanc / 100, 1 / 12) - 1;
    const iInv = Math.pow(1 + retornoInvest / 100, 1 / 12) - 1;
    const valorizacaoMensal = Math.pow(1 + valorizacao / 100, 1 / 12) - 1;
    const reajusteAnual = reajusteAluguel / 100;

    // SAC
    const financiado = Math.max(vi - ent, 0);
    const amortizacao = financiado / n;

    // Estado do loop
    let saldoDevedor = financiado;
    let aluguelMes = al;
    let valImovel = vi;

    // Capital inicial (Cenário Alugar recebe entrada + extras como aporte inicial; Financiar = 0)
    let saldoInvestAlugar = ent + extras;
    let saldoInvestFinanciar = 0;

    let aportadoAlugar = ent + extras;
    let aportadoFinanciar = 0;

    let totalAluguelPago = 0;
    let totalParcelasPagas = 0;
    let totalJurosFinanc = 0;

    const parcelasSerie: number[] = [];
    const aluguelSerie: number[] = [];
    const aporteAlugarSerie: number[] = [];
    const aporteFinanciarSerie: number[] = [];
    const imovelSerie: number[] = [];

    let primeiraParcela = 0;
    let pontoVirada: number | null = null;

    for (let m = 1; m <= n; m++) {
      // Reajuste do aluguel a cada 12 meses (mês 13, 25, ...)
      if (m > 1 && (m - 1) % 12 === 0) {
        aluguelMes *= 1 + reajusteAnual;
      }

      // Parcela SAC do mês
      const juros = saldoDevedor * im;
      const parcelaSAC = amortizacao + juros;
      totalJurosFinanc += juros;
      saldoDevedor -= amortizacao;
      if (m === 1) primeiraParcela = parcelaSAC;

      // Orçamento base = o mais caro entre os dois
      const orcamentoMes = Math.max(parcelaSAC, aluguelMes);

      // Aportes (diferença entre orçamento e custo de moradia)
      const aporteAlugar = orcamentoMes - aluguelMes;
      const aporteFinanciar = orcamentoMes - parcelaSAC;

      // Rendimento sobre saldo anterior + aporte do mês
      saldoInvestAlugar = saldoInvestAlugar * (1 + iInv) + aporteAlugar;
      saldoInvestFinanciar = saldoInvestFinanciar * (1 + iInv) + aporteFinanciar;

      aportadoAlugar += aporteAlugar;
      aportadoFinanciar += aporteFinanciar;

      // Valorização do imóvel
      valImovel *= 1 + valorizacaoMensal;

      totalAluguelPago += aluguelMes;
      totalParcelasPagas += parcelaSAC;

      parcelasSerie.push(parcelaSAC);
      aluguelSerie.push(aluguelMes);
      aporteAlugarSerie.push(aporteAlugar);
      aporteFinanciarSerie.push(aporteFinanciar);
      imovelSerie.push(valImovel);

      if (pontoVirada === null && aluguelMes > parcelaSAC) {
        pontoVirada = m;
      }
    }

    const valorImovelFinal = imovelSerie[n - 1] ?? vi;

    // Cenário A: Só Financiar (sem investir a diferença)
    const totalPagoA = ent + extras + totalParcelasPagas;
    const cenarioA: ScenarioResult = {
      patrimonioFinal: valorImovelFinal,
      totalPago: totalPagoA,
      totalInvestido: 0,
      jurosGanhos: 0,
      valorImovelFinal,
      capitalAportado: totalPagoA,
    };

    // Cenário B: Financiar + Investir (fluxo de caixa igualado)
    const cenarioB: ScenarioResult = {
      patrimonioFinal: valorImovelFinal + saldoInvestFinanciar,
      totalPago: ent + extras + totalParcelasPagas,
      totalInvestido: saldoInvestFinanciar,
      jurosGanhos: saldoInvestFinanciar - aportadoFinanciar,
      valorImovelFinal,
      capitalAportado: aportadoFinanciar,
    };

    // Cenário C: Alugar + Investir (fluxo de caixa igualado)
    const cenarioC: ScenarioResult = {
      patrimonioFinal: saldoInvestAlugar,
      totalPago: totalAluguelPago,
      totalInvestido: saldoInvestAlugar,
      jurosGanhos: saldoInvestAlugar - aportadoAlugar,
      valorImovelFinal: 0,
      capitalAportado: aportadoAlugar,
    };

    const cenarios: Array<{ id: Cenario; r: ScenarioResult }> = [
      { id: 'A', r: cenarioA },
      { id: 'B', r: cenarioB },
      { id: 'C', r: cenarioC },
    ];
    const vencedor = cenarios.reduce((a, b) => (b.r.patrimonioFinal > a.r.patrimonioFinal ? b : a)).id;

    // Gráfico de linha (parcela vs aluguel) — pontos anuais (primeiro mês de cada ano)
    const chartData: Array<{ ano: number; parcela: number; aluguel: number }> = [];

    // Tabela MENSAL — uma linha por mês
    const tabelaMensal: Array<{
      mes: number;
      parcela: number;
      aluguel: number;
      aporteFinanciando: number;
      aporteAlugando: number;
      saldoFinanciando: number;
      saldoAlugando: number;
    }> = [];

    let acFin = 0;
    let acAlu = ent + extras;
    for (let m = 0; m < n; m++) {
      acFin = acFin * (1 + iInv) + aporteFinanciarSerie[m];
      acAlu = acAlu * (1 + iInv) + aporteAlugarSerie[m];

      tabelaMensal.push({
        mes: m + 1,
        parcela: parcelasSerie[m],
        aluguel: aluguelSerie[m],
        aporteFinanciando: aporteFinanciarSerie[m],
        aporteAlugando: aporteAlugarSerie[m],
        saldoFinanciando: acFin,
        saldoAlugando: acAlu,
      });

      if (m % 12 === 0) {
        chartData.push({
          ano: m / 12 + 1,
          parcela: Math.round(parcelasSerie[m]),
          aluguel: Math.round(aluguelSerie[m]),
        });
      }
    }

    const anoVirada = pontoVirada ? Math.ceil(pontoVirada / 12) : null;

    return {
      cenarioA, cenarioB, cenarioC, vencedor,
      chartData, tabelaMensal, anoVirada, pontoVirada,
      primeiraParcela, totalJurosFinanc, valorImovelFinal,
    };
  }, [valorImovel, aluguel, entrada, custosExtras, prazo, jurosFinanc, retornoInvest, valorizacao, reajusteAluguel]);

  const limpar = () => {
    setValorImovel(''); setAluguel(''); setEntrada(''); setCustosExtras('');
    setPrazo(20); setJurosFinanc(11); setRetornoInvest(10); setValorizacao(5); setReajusteAluguel(7);
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border">
        <ToolHeader icon={<Home className="w-5 h-5" />} title="Alugar vs. Financiar — Análise de Longo Prazo" />
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <InputField label="Valor do Imóvel" prefix="R$" value={valorImovel} onChange={setValorImovel} />
            <InputField label="Aluguel Equivalente" prefix="R$" value={aluguel} onChange={setAluguel} />
            <InputField label="Entrada" prefix="R$" value={entrada} onChange={setEntrada} />
            <InputField label="Custos Extras (ITBI etc)" prefix="R$" value={custosExtras} onChange={setCustosExtras} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
            <SliderField label="Prazo (anos)" value={prazo} min={1} max={35} step={1} onChange={setPrazo} showValue={`${prazo} anos`} />
            <SliderField label="Juros Financiamento" value={jurosFinanc} min={1} max={20} step={0.25} onChange={setJurosFinanc} showValue={`${jurosFinanc.toFixed(2).replace('.', ',')}% a.a.`} />
            <SliderField label="Retorno Investimentos" value={retornoInvest} min={1} max={20} step={0.25} onChange={setRetornoInvest} showValue={`${retornoInvest.toFixed(2).replace('.', ',')}% a.a.`} />
            <SliderField label="Valorização Imóvel" value={valorizacao} min={0} max={15} step={0.25} onChange={setValorizacao} showValue={`${valorizacao.toFixed(2).replace('.', ',')}% a.a.`} />
            <SliderField label="Reajuste Aluguel (IGPM)" value={reajusteAluguel} min={0} max={20} step={0.25} onChange={setReajusteAluguel} showValue={`${reajusteAluguel.toFixed(2).replace('.', ',')}% a.a.`} />
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={limpar}>Limpar</Button>
          </div>
        </div>
      </Card>

      {data && (
        <>
          {/* O Veredito */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-warning" />
              <h3 className="text-base font-bold text-foreground uppercase tracking-wide">O Veredito — Patrimônio Líquido em {prazo} anos</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ScenarioCard
                titulo="Cenário A"
                subtitulo="Só Financiar"
                icon={<Building2 className="w-5 h-5" />}
                vencedor={data.vencedor === 'A'}
                result={data.cenarioA}
                tipo="financiar"
              />
              <ScenarioCard
                titulo="Cenário B"
                subtitulo="Financiar + Investir"
                icon={<TrendingUp className="w-5 h-5" />}
                vencedor={data.vencedor === 'B'}
                result={data.cenarioB}
                tipo="financiarInvestir"
              />
              <ScenarioCard
                titulo="Cenário C"
                subtitulo="Alugar + Investir"
                icon={<PiggyBank className="w-5 h-5" />}
                vencedor={data.vencedor === 'C'}
                result={data.cenarioC}
                tipo="alugar"
              />
            </div>
          </div>

          {/* Clareza Visual */}
          <Card className="border-border overflow-hidden">
            <div className="px-5 py-3 bg-muted border-b border-border flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Por que esse cenário venceu?</h3>
            </div>
            <div className="p-5 space-y-8">
              {/* Gráfico do Efeito Tesoura */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-1">Efeito Tesoura — Parcela SAC vs. Aluguel</h4>
                <p className="text-xs text-muted-foreground mb-4">A parcela do financiamento (SAC) começa alta e cai todo mês. O aluguel começa baixo e sobe com a inflação. Em algum ponto, eles se cruzam.</p>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="ano" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} label={{ value: 'Anos', position: 'insideBottom', offset: -5, fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number) => fmt(v)}
                        labelFormatter={(l) => `Ano ${l}`}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {data.anoVirada && (
                        <ReferenceLine x={data.anoVirada} stroke="hsl(var(--warning))" strokeDasharray="4 4" label={{ value: 'Ponto de virada', fill: 'hsl(var(--warning))', fontSize: 10, position: 'top' }} />
                      )}
                      <Line type="monotone" dataKey="parcela" name="Parcela SAC" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="aluguel" name="Aluguel" stroke="hsl(var(--destructive))" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex justify-center">
                  {data.pontoVirada ? (
                    <Badge variant="secondary" className="text-xs">
                      📍 Ponto de Virada: a partir do mês {data.pontoVirada} (ano {data.anoVirada}) o aluguel se torna mais caro que a parcela.
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Neste cenário, o aluguel nunca supera a parcela do financiamento dentro do prazo.
                    </Badge>
                  )}
                </div>
              </div>

              {/* Composição do Patrimônio */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-1">Composição do Patrimônio Final</h4>
                <p className="text-xs text-muted-foreground mb-4">De onde vem o dinheiro no final do prazo em cada cenário.</p>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          cenario: 'A · Só Financiar',
                          'Imóvel': Math.round(data.cenarioA.valorImovelFinal),
                          'Capital Investido': 0,
                          'Juros Ganhos': 0,
                        },
                        {
                          cenario: 'B · Financiar + Investir',
                          'Imóvel': Math.round(data.cenarioB.valorImovelFinal),
                          'Capital Investido': Math.round(data.cenarioB.capitalAportado),
                          'Juros Ganhos': Math.round(Math.max(data.cenarioB.jurosGanhos, 0)),
                        },
                        {
                          cenario: 'C · Alugar + Investir',
                          'Imóvel': 0,
                          'Capital Investido': Math.round(data.cenarioC.capitalAportado),
                          'Juros Ganhos': Math.round(Math.max(data.cenarioC.jurosGanhos, 0)),
                        },
                      ]}
                      margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="cenario" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number) => fmt(v)}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Imóvel" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Capital Investido" stackId="a" fill="hsl(var(--muted-foreground))" />
                      <Bar dataKey="Juros Ganhos" stackId="a" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tabela de Evolução Anual — Aportes Igualados */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-1">Evolução Anual — Fluxo de Caixa Igualado</h4>
                <p className="text-xs text-muted-foreground mb-4">Ambos os cenários gastam o mesmo orçamento mensal (o maior entre parcela e aluguel). A diferença é investida — provando que o inquilino realmente aporta a diferença.</p>
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr className="text-left">
                        <th className="px-3 py-2 font-semibold text-muted-foreground">Ano</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Parcela SAC</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Aluguel</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Aportes Financiando</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Aportes Alugando</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Saldo Invest. (Financ.)</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Saldo Invest. (Aluga)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.tabelaAnual.map((r) => (
                        <tr key={r.ano} className="border-t border-border hover:bg-muted/40">
                          <td className="px-3 py-2 font-medium text-foreground">{r.ano}</td>
                          <td className="px-3 py-2 text-right text-foreground">{fmt(r.parcela)}</td>
                          <td className="px-3 py-2 text-right text-foreground">{fmt(r.aluguel)}</td>
                          <td className="px-3 py-2 text-right text-foreground">{fmt(r.aporteFinanciando)}</td>
                          <td className="px-3 py-2 text-right text-foreground">{fmt(r.aporteAlugando)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-primary">{fmt(r.saldoFinanciando)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-success">{fmt(r.saldoAlugando)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function ScenarioCard({ titulo, subtitulo, icon, vencedor, result, tipo }: {
  titulo: string;
  subtitulo: string;
  icon: React.ReactNode;
  vencedor: boolean;
  result: ScenarioResult;
  tipo: 'financiar' | 'financiarInvestir' | 'alugar';
}) {
  return (
    <Card className={`p-5 border-2 transition-all ${vencedor ? 'border-success bg-success/5 shadow-md' : 'border-border'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-md ${vencedor ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>{icon}</div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{titulo}</p>
            <p className="text-sm font-semibold text-foreground">{subtitulo}</p>
          </div>
        </div>
        {vencedor && <Badge className="bg-success text-success-foreground hover:bg-success">Vencedor</Badge>}
      </div>

      <div className="mb-4">
        <p className="text-[10px] text-muted-foreground uppercase font-medium">Patrimônio Líquido Final</p>
        <p className={`text-2xl font-bold ${vencedor ? 'text-success' : 'text-foreground'}`}>{fmt(result.patrimonioFinal)}</p>
      </div>

      <div className="space-y-1.5 pt-3 border-t border-border text-xs">
        {tipo !== 'alugar' && (
          <Row label="Valor do imóvel (futuro)" value={fmt(result.valorImovelFinal)} />
        )}
        <Row label="Total pago (parcelas/aluguel)" value={fmt(result.totalPago)} />
        <Row label="Capital aportado em investimentos" value={fmt(result.capitalAportado - (tipo === 'financiar' ? result.totalPago : 0))} hidden={tipo === 'financiar'} />
        <Row label="Total investido (com juros)" value={fmt(result.totalInvestido)} hidden={tipo === 'financiar'} />
        <Row label="Juros compostos ganhos" value={fmt(Math.max(result.jurosGanhos, 0))} positive hidden={tipo === 'financiar'} />
      </div>
    </Card>
  );
}

function Row({ label, value, positive, hidden }: { label: string; value: string; positive?: boolean; hidden?: boolean }) {
  if (hidden) return null;
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${positive ? 'text-success' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}
