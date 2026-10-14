import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Panel, NumField } from './shared';
import { BACKTEST_BENCHMARKS, BACKTEST_YEARS, MODEL_LABELS, MONTHS, STRATEGY_COLORS } from './constants';
import { brl, runBacktest } from './calculations';
import type { BacktestParams, ModelKey } from './types';

interface Props {
  params: BacktestParams;
  models: Record<ModelKey, Record<string, number>>;
  onChange: (p: BacktestParams) => void;
}

const kfmt = (v: number) => `R$ ${Math.round(v / 1000).toLocaleString('pt-BR')}k`;

export function BacktestSimulator({ params: p, models, onChange }: Props) {
  const set = (patch: Partial<BacktestParams>) => onChange({ ...p, ...patch });
  const model = models[p.model];
  const result = useMemo(() => runBacktest(p, model), [p, model]);
  const vPort = p.manualPortfolio ?? result.finalPortfolio;
  const vBench = p.manualBenchmark ?? result.finalBenchmark;
  const donut = Object.entries(model).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));

  const Sel = ({ label, value, onValue, options }: { label: string; value: string; onValue: (v: string) => void; options: { v: string; l: string }[] }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onValue}>
        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(o => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
  const monthOpts = MONTHS.map((m, i) => ({ v: String(i), l: m }));
  const yearOpts = BACKTEST_YEARS.map(y => ({ v: String(y), l: String(y) }));

  return (
    <Panel title="Plano de Carteira — Simulador de Backtest">
      <div className="grid gap-3 md:grid-cols-3">
        <Sel label="Local" value={p.location} onValue={v => set({ location: v as any })} options={[{ v: 'onshore', l: 'Onshore' }, { v: 'offshore', l: 'Offshore' }]} />
        <Sel label="Modelo de Carteira" value={p.model} onValue={v => set({ model: v as ModelKey })} options={(Object.keys(MODEL_LABELS) as ModelKey[]).map(k => ({ v: k, l: MODEL_LABELS[k] }))} />
        <Sel label="Tipo de Retorno" value={p.returnType} onValue={v => set({ returnType: v as any })} options={[{ v: 'nominal', l: 'Nominal' }, { v: 'real', l: 'Real (descontando inflação)' }]} />
        <div className="space-y-1"><Label className="text-xs">Patrimônio Inicial</Label><NumField prefix="R$" value={p.initial} onCommit={n => set({ initial: n })} /></div>
        <div className="space-y-1"><Label className="text-xs">Aporte Mensal</Label><NumField prefix="R$" value={p.monthly} onCommit={n => set({ monthly: n })} /></div>
        <Sel label="Benchmark" value={p.benchmark} onValue={v => set({ benchmark: v })} options={BACKTEST_BENCHMARKS.map(b => ({ v: b.label, l: b.label }))} />
        <div className="grid grid-cols-2 gap-2">
          <Sel label="Início (mês)" value={String(p.startMonth)} onValue={v => set({ startMonth: +v })} options={monthOpts} />
          <Sel label="Início (ano)" value={String(p.startYear)} onValue={v => set({ startYear: +v })} options={yearOpts} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Sel label="Fim (mês)" value={String(p.endMonth)} onValue={v => set({ endMonth: +v })} options={monthOpts} />
          <Sel label="Fim (ano)" value={String(p.endYear)} onValue={v => set({ endYear: +v })} options={yearOpts} />
        </div>
        <div className="space-y-1"><Label className="text-xs">Renda passiva (% ao mês)</Label><NumField prefix="%" value={p.passiveRate} onCommit={n => set({ passiveRate: n })} /></div>
      </div>
      {p.startYear * 12 + p.startMonth > p.endYear * 12 + p.endMonth && <p className="text-xs text-destructive mt-2">A data de início deve ser anterior ao fim.</p>}

      <div className="grid gap-4 mt-5 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold">Resultado</div>
            <div className="grid grid-cols-2 gap-6 p-5">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Valor Portfólio</p>
                <p className="text-xl font-bold text-success">{brl(vPort)}</p>
                <p className="text-xs text-muted-foreground mt-2">Renda Passiva Portfólio</p>
                <p className="text-base font-semibold text-success">{brl(vPort * p.passiveRate / 100)}/mês</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Valor Benchmark</p>
                <p className="text-xl font-bold text-foreground">{brl(vBench)}</p>
                <p className="text-xs text-muted-foreground mt-2">Renda Passiva Benchmark</p>
                <p className="text-base font-semibold text-foreground">{brl(vBench * p.passiveRate / 100)}/mês</p>
              </div>
            </div>
            <div className="px-4 pb-4 grid grid-cols-2 gap-2">
              <Input placeholder="Valor final manual (portfólio)" className="h-8 text-xs" defaultValue={p.manualPortfolio ?? ''} onBlur={e => set({ manualPortfolio: e.target.value ? Number(e.target.value.replace(/\./g, '').replace(',', '.')) || null : null })} />
              <Input placeholder="Valor final manual (benchmark)" className="h-8 text-xs" defaultValue={p.manualBenchmark ?? ''} onBlur={e => set({ manualBenchmark: e.target.value ? Number(e.target.value.replace(/\./g, '').replace(',', '.')) || null : null })} />
              {(p.manualPortfolio != null || p.manualBenchmark != null) && (
                <Button type="button" size="sm" variant="ghost" className="col-span-2 h-7 text-xs" onClick={() => set({ manualPortfolio: null, manualBenchmark: null })}>Voltar ao cálculo automático</Button>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold">Alocação {MODEL_LABELS[p.model]}</div>
            <div className="h-64 p-2">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={donut} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {donut.map(d => <Cell key={d.name} fill={STRATEGY_COLORS[d.name] ?? STRATEGY_COLORS.Outros} />)}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [`${v}%`, n]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border overflow-hidden min-w-0">
          <div className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold">Evolução Patrimonial</div>
          <div className="h-[420px] p-3">
            <ResponsiveContainer>
              <AreaChart data={result.points}>
                <defs>
                  <linearGradient id="gPort" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gBench" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} /><stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={40} />
                <YAxis tickFormatter={kfmt} tick={{ fontSize: 10 }} width={80} />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="portfolio" name="Portfólio" stroke="hsl(var(--primary))" fill="url(#gPort)" strokeWidth={2} />
                <Area type="monotone" dataKey="benchmark" name="Benchmark" stroke="hsl(var(--muted-foreground))" fill="url(#gBench)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="px-4 pb-4 text-[10px] text-muted-foreground space-y-0.5">
            <p>*Evolução patrimonial do portfólio é líquida de taxa de administração (1% a.a.); imposto de renda não descontado.</p>
            <p>**Dados de retornos do portfólio são oriundos de backtest com retornos anuais aproximados por classe de ativo no período analisado.</p>
            <p>***Rentabilidade passada não representa garantia de retorno futuro.</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
