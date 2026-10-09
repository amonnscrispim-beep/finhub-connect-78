import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import type { ConhecerClienteData } from './conhecer/types';
import { previewMerge, type MergeStatus } from './conhecer/merge';

interface Props {
  open: boolean; onOpenChange: (o: boolean) => void;
  current: ConhecerClienteData; submitted: Record<string, any>; onMerge: () => void;
}

const STATUS: Record<MergeStatus, { label: string; cls: string }> = {
  add: { label: 'Será adicionado', cls: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30' },
  keep: { label: 'Já existe', cls: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30' },
  update: { label: 'Atualizado', cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30' },
};

const MONEY_HINT = /(Income|Value|Salary|Cost|Capacity|PL|Revenue|ProLabore|Distribution|Accumulated|Contrib|fgts)/i;

function show(key: string, v: unknown): string {
  if (Array.isArray(v)) {
    return v.map((x: any) => typeof x === 'string' ? x
      : x.name !== undefined ? [x.name, x.age && `${x.age} anos`, x.educationPhase].filter(Boolean).join(' · ')
      : [x.type, x.totalValue && `R$ ${Number(x.totalValue).toLocaleString('pt-BR')}`].filter(Boolean).join(' · ')).join('; ');
  }
  if (key === 'birthDate' && typeof v === 'string') return v.split('-').reverse().join('/');
  const n = Number(v);
  if (MONEY_HINT.test(key) && !isNaN(n) && n > 0) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: key.includes('USD') ? 'USD' : 'BRL' }).format(n);
  }
  return String(v);
}

export function FormSubmissionPreview({ open, onOpenChange, current, submitted, onMerge }: Props) {
  const rows = previewMerge(current, submitted);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Respostas do cliente</SheetTitle>
          <SheetDescription>Revise antes de mesclar. Dados que você já preencheu não serão substituídos (exceto o nome).</SheetDescription>
        </SheetHeader>
        <div className="flex flex-wrap gap-2 my-4">
          {(Object.keys(STATUS) as MergeStatus[]).map((s) => <span key={s} className={`text-xs px-2 py-0.5 rounded border ${STATUS[s].cls}`}>{STATUS[s].label}</span>)}
        </div>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.key} className={`rounded-md border p-2.5 ${STATUS[r.status].cls}`}>
              <div className="flex justify-between gap-2 text-xs font-medium"><span>{r.label}</span><span>{STATUS[r.status].label}</span></div>
              <p className="text-sm text-foreground mt-1 whitespace-pre-wrap break-words">{show(r.key, r.value)}</p>
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-muted-foreground">O cliente não preencheu nenhum campo.</p>}
        </div>
        <Button type="button" className="w-full mt-4" onClick={onMerge}>Mesclar Dados</Button>
      </SheetContent>
    </Sheet>
  );
}
