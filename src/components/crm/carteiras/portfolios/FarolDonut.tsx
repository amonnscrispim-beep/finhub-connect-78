import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';

export interface FarolInput {
  /** R$ em Ações Brasileiras */
  acoes: number;
  /** R$ em Fundos Imobiliários */
  fiis: number;
  /** R$ em Renda Fixa */
  rendaFixa: number;
  /** R$ em Internacional */
  internacional: number;
  /** Valor total investido (referência para calcular Oportunidades como resíduo) */
  total: number;
  /** Título exibido (ex.: "Conservador") */
  title: string;
}

interface FarolSlice {
  letter: 'F' | 'A' | 'R' | 'O' | 'L';
  name: string;
  value: number;
  pct: number;
  color: string;
}

const COLORS = {
  F: 'hsl(210 90% 55%)',   // azul - Fundos Imobiliários
  A: 'hsl(145 65% 42%)',   // verde - Ações Brasil
  R: 'hsl(42 90% 50%)',    // dourado - Renda Fixa
  O: 'hsl(8 75% 55%)',     // coral/vermelho - Oportunidades
  L: 'hsl(270 55% 55%)',   // roxo - Lá Fora / Internacional
};

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function FarolDonut({ acoes, fiis, rendaFixa, internacional, total, title }: FarolInput) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const slices = useMemo<FarolSlice[]>(() => {
    const classified = acoes + fiis + rendaFixa + internacional;
    const oportunidades = Math.max(0, total - classified);
    const denom = classified + oportunidades;
    const safePct = (v: number) => (denom > 0 ? (v / denom) * 100 : 0);
    return [
      { letter: 'F', name: 'Fundos Imobiliários', value: fiis, pct: safePct(fiis), color: COLORS.F },
      { letter: 'A', name: 'Ações Brasil', value: acoes, pct: safePct(acoes), color: COLORS.A },
      { letter: 'R', name: 'Renda Fixa', value: rendaFixa, pct: safePct(rendaFixa), color: COLORS.R },
      { letter: 'O', name: 'Oportunidades', value: oportunidades, pct: safePct(oportunidades), color: COLORS.O },
      { letter: 'L', name: 'Lá Fora / Internacional', value: internacional, pct: safePct(internacional), color: COLORS.L },
    ];
  }, [acoes, fiis, rendaFixa, internacional, total]);

  const totalValue = slices.reduce((s, x) => s + x.value, 0);
  const active = hoverIdx !== null ? slices[hoverIdx] : null;

  const hasData = totalValue > 0;

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Método FAROL</p>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Valor total investido</p>
            <p className="text-lg font-semibold text-foreground">R$ {formatBRL(totalValue)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* Donut */}
          <div className="relative h-[220px]">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={2}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                    onMouseEnter={(_, idx) => setHoverIdx(idx)}
                    onMouseLeave={() => setHoverIdx(null)}
                  >
                    {slices.map((s, i) => (
                      <Cell key={s.letter} fill={s.color} opacity={hoverIdx === null || hoverIdx === i ? 1 : 0.35} />
                    ))}
                  </Pie>
                  <Tooltip
                    cursor={false}
                    content={() => null}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Sem dados de alocação
              </div>
            )}

            {/* Center label */}
            {hasData && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {active ? (
                  <>
                    <span className="text-[10px] font-bold tracking-wider" style={{ color: active.color }}>
                      {active.letter} — {active.name}
                    </span>
                    <span className="text-2xl font-bold text-foreground leading-tight">
                      {active.pct.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      R$ {formatBRL(active.value)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</span>
                    <span className="text-xl font-bold text-foreground leading-tight">
                      R$ {formatBRL(totalValue)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">passe o mouse</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="space-y-1.5">
            {slices.map((s, i) => (
              <div
                key={s.letter}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-md transition-colors cursor-default ${
                  hoverIdx === i ? 'bg-muted' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded text-[11px] font-bold text-white shrink-0"
                    style={{ backgroundColor: s.color }}
                  >
                    {s.letter}
                  </span>
                  <span className="text-xs text-foreground truncate">{s.name}</span>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold text-foreground">{s.pct.toFixed(1)}%</div>
                  <div className="text-[10px] text-muted-foreground">R$ {formatBRL(s.value)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
