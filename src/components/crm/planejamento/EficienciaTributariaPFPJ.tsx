import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const fmtMi = (v: number) => `R$ ${(v / 1e6).toFixed(2).replace('.', ',')} mi`;
const axisMi = (v: number) => `${(v / 1e6).toFixed(2).replace('.', ',')} mi`;
const fmtInt = (v: number) => new Intl.NumberFormat('pt-BR').format(v);

/** Ganho tributado só no resgate (fim do prazo), no regime de cada opção. */
export function simulatePFPJ(p: { valor: number; rent: number; anos: number; irPJ: number; ret: number; irPF: number }) {
  const i = Math.pow(1 + p.rent / 100, 1 / 12) - 1;
  const months = Math.round(p.anos * 12);
  const pfBase = p.valor * (1 - p.ret / 100);
  const rows: { m: number; pj: number; pfIsenta: number; pfTrib: number }[] = [];
  for (let m = 0; m <= months; m++) {
    const g = Math.pow(1 + i, m) - 1;
    rows.push({
      m,
      pj: p.valor * (1 + g * (1 - p.irPJ / 100)),
      pfIsenta: pfBase * (1 + g),
      pfTrib: pfBase * (1 + g * (1 - p.irPF / 100)),
    });
  }
  const be = (k: 'pfIsenta' | 'pfTrib') => rows.find((r) => r.m > 0 && r[k] >= r.pj)?.m ?? null;
  return { rows, last: rows[rows.length - 1], beIsenta: be('pfIsenta'), beTrib: be('pfTrib') };
}

function Field({ label, value, suffix, min, max, step, onChange }: { label: string; value: number; suffix: string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-semibold text-foreground">{value}{suffix}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

export function EficienciaTributariaPFPJ() {
  const [valor, setValor] = useState(8_000_000);
  const [valorTxt, setValorTxt] = useState(fmtInt(8_000_000));
  const [rent, setRent] = useState(13);
  const [anos, setAnos] = useState(10);
  const [irPJ, setIrPJ] = useState(34);
  const [ret, setRet] = useState(10);
  const [irPF, setIrPF] = useState(15);
  const [view, setView] = useState<'pfIsenta' | 'pfTrib'>('pfIsenta');

  const sim = useMemo(() => simulatePFPJ({ valor, rent, anos, irPJ, ret, irPF }), [valor, rent, anos, irPJ, ret, irPF]);
  const be = view === 'pfIsenta' ? sim.beIsenta : sim.beTrib;
  const beRow = be != null ? sim.rows[be] : null;
  const data = sim.rows.map((r) => ({ ...r, ano: r.m / 12 }));
  const ticks = Array.from({ length: anos + 1 }, (_, k) => k);

  const cards = [
    { key: 'pj', label: 'Mantendo na PJ', value: sim.last.pj, sub: 'patrimônio no fim do prazo' },
    { key: 'pfTrib', label: 'PF tributada', value: sim.last.pfTrib, sub: `${sim.last.pfTrib - sim.last.pj >= 0 ? '+' : '−'} ${fmtMi(Math.abs(sim.last.pfTrib - sim.last.pj))} · breakeven ${sim.beTrib ? `mês ${sim.beTrib}` : '—'}` },
    { key: 'pfIsenta', label: 'PF isenta', value: sim.last.pfIsenta, sub: `${sim.last.pfIsenta - sim.last.pj >= 0 ? '+' : '−'} ${fmtMi(Math.abs(sim.last.pfIsenta - sim.last.pj))} · breakeven ${sim.beIsenta ? `mês ${sim.beIsenta}` : '—'}` },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">Calculadora · PF ou PJ</p>
        <h3 className="text-lg font-semibold text-foreground mt-1">Eficiência tributária: distribuir e investir na PF ou investir na PJ?</h3>
      </div>

      <div className="rounded-xl border-2 border-foreground/80 bg-card p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Valor a distribuir (R$)</label>
            <Input
              value={valorTxt}
              inputMode="numeric"
              onChange={(e) => {
                const n = Number(e.target.value.replace(/\D/g, '')) || 0;
                setValorTxt(n ? fmtInt(n) : '');
                setValor(n);
              }}
              className="font-semibold"
            />
          </div>
          <Field label="Rentabilidade nominal ao ano" value={rent} suffix="% a.a." min={1} max={30} step={0.5} onChange={setRent} />
          <Field label="Prazo" value={anos} suffix=" anos" min={1} max={30} step={1} onChange={setAnos} />
          <Field label="IR na PJ" value={irPJ} suffix="%" min={0} max={50} step={1} onChange={setIrPJ} />
          <Field label="Retenção na distribuição" value={ret} suffix="%" min={0} max={30} step={1} onChange={setRet} />
          <Field label="IR na PF tributada" value={irPF} suffix="%" min={0} max={27.5} step={0.5} onChange={setIrPF} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {cards.map((c) => {
            const active = c.key === 'pfIsenta';
            return (
              <div key={c.key} className={cn('rounded-lg border p-4', active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border')}>
                <p className={cn('text-xs', active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{c.label}</p>
                <p className="text-2xl font-bold mt-1">{fmtMi(c.value)}</p>
                <p className={cn('text-xs mt-1', active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{c.sub}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="inline-flex rounded-full border border-border p-1">
              {(['pfIsenta', 'pfTrib'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setView(k)}
                  className={cn('px-3 py-1 rounded-full text-xs font-semibold', view === k ? 'bg-primary text-primary-foreground' : 'text-foreground')}
                >
                  {k === 'pfIsenta' ? 'PF isenta' : 'PF tributada'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-5 border-t-2 border-dashed border-muted-foreground" />Mantendo na PJ</span>
              <span className="flex items-center gap-1"><span className="w-5 border-t-2 border-foreground" />{view === 'pfIsenta' ? 'PF isenta' : 'PF tributada'}</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border-2 border-foreground" />Breakeven</span>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="ano" type="number" domain={[0, anos]} ticks={ticks} tickFormatter={(v) => (v === 0 ? 'Hoje' : `Ano ${v}`)} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tickFormatter={axisMi} width={70} domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  formatter={(v: number, n: string) => [fmtMi(v), n === 'pj' ? 'Mantendo na PJ' : n === 'pfIsenta' ? 'PF isenta' : 'PF tributada']}
                  labelFormatter={(v: number) => `Mês ${Math.round(v * 12)}`}
                />
                <Line dataKey="pj" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 4" dot={false} strokeWidth={2} isAnimationActive={false} />
                <Line dataKey={view} stroke="hsl(var(--foreground))" dot={false} strokeWidth={2.5} isAnimationActive={false} />
                {beRow && (
                  <>
                    <ReferenceLine x={beRow.m / 12} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 3" />
                    <ReferenceDot x={beRow.m / 12} y={beRow[view]} r={5} fill="hsl(var(--card))" stroke="hsl(var(--foreground))" strokeWidth={2} label={{ value: `Mês ${beRow.m}`, position: 'top', fontSize: 11, fontWeight: 600 }} />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-4">
        <p className="text-xs font-semibold tracking-[0.15em] uppercase text-foreground">Os {ret}% retidos podem voltar</p>
        <p className="text-sm text-muted-foreground mt-1">
          O estudo considerou o pior caso: {fmtMi(valor * ret / 100).replace(' mi', ' mi')} pagos e não recuperados. Com base na Ata de Distribuição de Lucros, há dois caminhos para recuperar esse valor: compensação retroativa no fim de 2026 ou início de 2027, ou medida judicial.
        </p>
      </div>
    </div>
  );
}
