import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { FAROL_COLORS } from '@/lib/farol-colors';

const DONUT_CENTER_BG = '#0B1929';

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

// Use shared FAROL palette so donut, legend, and pill tabs always match.
const COLORS = FAROL_COLORS;

const BTG_NAVY = '#0B2859';
const CARD_BORDER = '#e8e8e8';
const CARD_SHADOW = '0 2px 12px rgba(11,40,89,0.08)';

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Active slice renderer — slight outward offset for hover emphasis
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#ffffff"
        strokeWidth={3}
      />
    </g>
  );
};

export function FarolDonut({ acoes, fiis, rendaFixa, internacional, total, title }: FarolInput) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const slices = useMemo<FarolSlice[]>(() => {
    const classified = acoes + fiis + rendaFixa + internacional;
    const oportunidades = Math.max(0, total - classified);
    const denom = classified + oportunidades;
    const safePct = (v: number) => (denom > 0 ? (v / denom) * 100 : 0);
    const all: FarolSlice[] = [
      { letter: 'F', name: 'Fundos Imobiliários', value: fiis, pct: safePct(fiis), color: COLORS.F },
      { letter: 'A', name: 'Ações Brasil', value: acoes, pct: safePct(acoes), color: COLORS.A },
      { letter: 'R', name: 'Renda Fixa', value: rendaFixa, pct: safePct(rendaFixa), color: COLORS.R },
      { letter: 'O', name: 'Oportunidades', value: oportunidades, pct: safePct(oportunidades), color: COLORS.O },
      { letter: 'L', name: 'Lá Fora / Internacional', value: internacional, pct: safePct(internacional), color: COLORS.L },
    ];
    // Hide categories with no allocation — they reappear automatically when value > 0.
    return all.filter(s => s.value > 0);
  }, [acoes, fiis, rendaFixa, internacional, total]);

  const totalValue = slices.reduce((s, x) => s + x.value, 0);
  const active = hoverIdx !== null ? slices[hoverIdx] : null;
  const hasData = totalValue > 0;

  return (
    <div
      className="rounded-lg bg-white animate-fade-in"
      style={{ border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p
              className="text-[11px] font-semibold mb-1"
              style={{ color: BTG_NAVY, letterSpacing: '1.5px' }}
            >
              MÉTODO FAROL
            </p>
            <h3 className="text-lg font-bold text-black leading-tight">{title}</h3>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">
              Valor total investido
            </p>
            <p className="text-2xl font-bold leading-tight" style={{ color: BTG_NAVY }}>
              R$ {formatBRL(totalValue)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Donut */}
          <div
            className="relative mx-auto"
            style={{ width: '100%', maxWidth: 320, height: 280 }}
            onMouseLeave={() => {
              setHoverIdx(null);
              setTooltipPos(null);
            }}
          >
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={95}
                    outerRadius={120}
                    paddingAngle={1}
                    stroke="#ffffff"
                    strokeWidth={2}
                    activeIndex={hoverIdx ?? -1}
                    activeShape={renderActiveShape}
                    isAnimationActive
                    animationDuration={800}
                    animationEasing="ease-out"
                    onMouseEnter={(_, idx, e: any) => {
                      setHoverIdx(idx);
                      if (e?.nativeEvent) {
                        const rect = (e.currentTarget as Element)?.closest('.recharts-wrapper')?.getBoundingClientRect();
                        if (rect) {
                          setTooltipPos({
                            x: e.nativeEvent.clientX - rect.left,
                            y: e.nativeEvent.clientY - rect.top,
                          });
                        }
                      }
                    }}
                    onMouseMove={(_, idx, e: any) => {
                      if (e?.nativeEvent) {
                        const rect = (e.currentTarget as Element)?.closest('.recharts-wrapper')?.getBoundingClientRect();
                        if (rect) {
                          setTooltipPos({
                            x: e.nativeEvent.clientX - rect.left,
                            y: e.nativeEvent.clientY - rect.top,
                          });
                        }
                      }
                    }}
                  >
                    {slices.map((s) => (
                      <Cell key={s.letter} fill={s.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-500">
                Sem dados de alocação
              </div>
            )}

            {/* Center label */}
            {hasData && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] uppercase tracking-[1.5px] text-gray-500 font-medium mb-1">
                  Total
                </span>
                <span className="text-2xl font-bold leading-tight" style={{ color: BTG_NAVY }}>
                  R$ {formatBRL(totalValue)}
                </span>
              </div>
            )}

            {/* Elegant tooltip on hover */}
            {hasData && active && tooltipPos && (
              <div
                className="absolute pointer-events-none z-10 rounded-md px-3 py-2 text-xs animate-fade-in"
                style={{
                  left: tooltipPos.x + 12,
                  top: tooltipPos.y + 12,
                  backgroundColor: BTG_NAVY,
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(11,40,89,0.25)',
                  whiteSpace: 'nowrap',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: active.color }}
                  />
                  <span className="font-semibold">{active.name}</span>
                </div>
                <div className="text-white/80">
                  {active.pct.toFixed(1)}% · R$ {formatBRL(active.value)}
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="space-y-1">
            {slices.map((s, i) => (
              <div
                key={s.letter}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                className="flex items-center justify-between gap-3 px-2 py-2 rounded-md cursor-default transition-colors"
                style={{
                  backgroundColor: hoverIdx === i ? 'rgba(11,40,89,0.04)' : 'transparent',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="inline-block w-3.5 h-3.5 rounded-[4px] shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-sm text-gray-700 truncate">
                    <span className="font-semibold mr-1" style={{ color: BTG_NAVY }}>
                      {s.letter}
                    </span>
                    {s.name}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold" style={{ color: BTG_NAVY }}>
                    {s.pct.toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-gray-500">R$ {formatBRL(s.value)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
