import { ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export function Panel({ title, actions, children, className }: { title: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card overflow-hidden min-w-0', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-primary text-primary-foreground">
        <h3 className="text-sm font-semibold tracking-wide">{title}</h3>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

const parseBR = (s: string) => {
  const clean = s.replace(/[^\d,.-]/g, '');
  const n = clean.includes(',') ? Number(clean.replace(/\./g, '').replace(',', '.')) : Number(clean);
  return Number.isFinite(n) ? n : 0;
};
const fmtBR = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Campo numérico pt-BR: digita livre, grava no blur. */
export function NumField({ value, onCommit, prefix, className }: { value: number; onCommit: (n: number) => void; prefix?: string; className?: string }) {
  const [text, setText] = useState(fmtBR(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(fmtBR(value)); }, [value, focused]);
  return (
    <div className={cn('relative', className)}>
      {prefix && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
      <Input
        inputMode="decimal"
        value={text}
        className={cn('h-8 text-sm', prefix && 'pl-8')}
        onFocus={() => setFocused(true)}
        onChange={e => setText(e.target.value)}
        onBlur={() => { setFocused(false); onCommit(parseBR(text)); }}
      />
    </div>
  );
}

export { parseBR };
