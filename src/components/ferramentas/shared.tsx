import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type ReactNode } from 'react';

export const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export const fmtPct = (v: number) => `${v.toFixed(2).replace('.', ',')}%`;

export const parseNum = (s: string) => {
  const cleaned = s.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

export function ToolHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="px-5 py-3 flex items-center gap-2 bg-primary">
      <span className="text-primary-foreground">{icon}</span>
      <h2 className="text-primary-foreground font-semibold text-sm uppercase tracking-wide">{title}</h2>
    </div>
  );
}

export function ResultCard({ label, value, colorVar, icon }: { label: string; value: string; colorVar: 'positive' | 'invested' | 'total' | 'negative'; icon: ReactNode }) {
  const colorMap = {
    positive: 'text-success',
    invested: 'text-[hsl(var(--color-invested))]',
    total: 'text-warning',
    negative: 'text-destructive',
  };
  const bgMap = {
    positive: 'bg-success/10',
    invested: 'bg-[hsl(var(--color-invested))]/10',
    total: 'bg-warning/10',
    negative: 'bg-destructive/10',
  };
  return (
    <Card className="p-5 border-border">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-md ${bgMap[colorVar]} ${colorMap[colorVar]}`}>{icon}</div>
        <span className="text-xs font-medium text-muted-foreground uppercase">{label}</span>
      </div>
      <p className={`text-xl font-bold ${colorMap[colorVar]}`}>{value}</p>
    </Card>
  );
}

export function InputField({ label, prefix, value, onChange }: { label: string; prefix: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>
        <input
          className="w-full h-10 rounded-md border border-input bg-background pl-8 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export function SliderField({ label, value, min, max, step, suffix, onChange, showValue }: {
  label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (v: number) => void; showValue?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <span className="text-sm font-semibold text-foreground">{showValue ?? `${value}${suffix ?? ''}`}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

export { Card, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Slider };
