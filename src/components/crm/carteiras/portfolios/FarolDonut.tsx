import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export interface FarolSlice {
  key: string;     // farol code (F, A, R, O, L) or class key
  label: string;   // display label
  pct: number;     // 0-100 of total portfolio
  value: number;   // R$ slice value
  color: string;   // hex or hsl string
}

interface Props {
  slices: FarolSlice[];
  total: number;          // total invested (R$)
  centerLabel?: string;   // shown when no hover
}

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

/**
 * Interactive donut chart in FAROL/Finclass style.
 * On hover over a slice the center shows the slice's % and R$.
 * Otherwise it shows the total invested.
 */
export function FarolDonut({ slices, total, centerLabel = 'Valor investido' }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const data = useMemo(
    () => slices.filter(s => s.pct > 0).map(s => ({ ...s, name: s.label })),
    [slices],
  );

  const active = hover !== null ? data[hover] : null;

  return (
    <div className="relative w-full aspect-square max-w-[220px] mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data.length ? data : [{ name: 'empty', pct: 1, value: 0, color: 'hsl(240 22% 15%)' }]}
            dataKey="pct"
            innerRadius="68%"
            outerRadius="100%"
            paddingAngle={data.length > 1 ? 2 : 0}
            stroke="none"
            isAnimationActive={false}
            onMouseLeave={() => setHover(null)}
          >
            {(data.length ? data : [{ color: 'hsl(240 22% 15%)' }]).map((entry: any, i: number) => (
              <Cell
                key={i}
                fill={entry.color}
                opacity={hover === null || hover === i ? 1 : 0.35}
                onMouseEnter={() => setHover(i)}
                style={{ cursor: data.length ? 'pointer' : 'default', transition: 'opacity 150ms' }}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
        {active ? (
          <>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {active.label}
            </span>
            <span className="text-xl font-bold text-foreground leading-tight">
              {active.pct.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground">{formatBRL(active.value)}</span>
          </>
        ) : (
          <>
            <span className="text-base sm:text-lg font-bold text-foreground leading-tight">
              {formatBRL(total)}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">
              {centerLabel}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
