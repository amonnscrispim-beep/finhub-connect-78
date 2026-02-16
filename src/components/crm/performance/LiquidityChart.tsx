import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { LiquidityBand } from './types';
import { fmt } from './utils';

interface LiquidityChartProps {
  bands: LiquidityBand[];
  height?: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2, 173 58% 39%))',
  'hsl(var(--chart-3, 197 37% 24%))',
  'hsl(var(--chart-4, 43 74% 66%))',
  'hsl(var(--chart-5, 27 87% 67%))',
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-popover border border-border rounded-lg p-2 shadow-lg text-xs">
      <p className="font-medium text-foreground">{d.label}</p>
      <p className="text-muted-foreground">R$ {fmt(d['valueR$'])}</p>
      <p className="text-muted-foreground">{d.pct.toFixed(1)}%</p>
    </div>
  );
};

const renderCustomLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (!value || value === 0) return null;
  return (
    <text x={x + width / 2} y={y - 6} fill="hsl(var(--foreground))" textAnchor="middle" fontSize={10} fontWeight={600}>
      {typeof value === 'number' ? `${value.toFixed(1)}%` : value}
    </text>
  );
};

export function LiquidityChart({ bands, height = 220 }: LiquidityChartProps) {
  const data = bands.filter(b => b['valueR$'] > 0 || b.pct > 0);
  if (data.length === 0) return <p className="text-xs text-muted-foreground">Sem dados de liquidez.</p>;

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} interval={0} angle={-15} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v: number) => `R$ ${(v / 1000).toFixed(0)}k`} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="valueR$" radius={[4, 4, 0, 0]} maxBarSize={60}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
            <LabelList dataKey="pct" content={renderCustomLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
