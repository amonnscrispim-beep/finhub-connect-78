import { useRef, useState } from 'react';
import { Upload, Loader2, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { guessStrategy, guessType } from './calculations';
import type { ConsolidatedAsset } from './types';

const uid = () => crypto.randomUUID();

const num = (v: unknown) => {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').replace(/[^\d,.-]/g, '');
  const n = s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s);
  return Number.isFinite(n) ? n : 0;
};

function fromSheet(rows: Record<string, unknown>[]): ConsolidatedAsset[] {
  const pick = (r: Record<string, unknown>, keys: string[]) => {
    const k = Object.keys(r).find(k => keys.some(x => k.toLowerCase().includes(x)));
    return k ? r[k] : undefined;
  };
  return rows.map(r => {
    const name = String(pick(r, ['ativo', 'nome', 'ticker', 'produto']) ?? '').trim();
    const rawType = String(pick(r, ['tipo', 'classe']) ?? '');
    const rate = String(pick(r, ['taxa', 'rentab', 'indexador']) ?? '');
    const value = num(pick(r, ['valor', 'saldo', 'posição', 'posicao', 'total']));
    const type = guessType(rawType, name);
    const stratRaw = String(pick(r, ['estratégia', 'estrategia']) ?? '');
    return {
      id: uid(), name, type, rate: rate || null, value,
      strategy: stratRaw || guessStrategy(type, rate),
      maturity: (pick(r, ['vencimento']) as string) ? String(pick(r, ['vencimento'])) : null,
    };
  }).filter(a => a.name && a.value > 0);
}

interface Props {
  clientId: string;
  onImport: (assets: ConsolidatedAsset[]) => void;
  onAdd: () => void;
}

export function PortfolioUpload({ clientId, onImport, onAdd }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const handle = async (file: File) => {
    setBusy(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      let assets: ConsolidatedAsset[] = [];
      if (['xlsx', 'xls', 'csv'].includes(ext)) {
        const wb = XLSX.read(await file.arrayBuffer());
        const sheet = wb.Sheets[wb.SheetNames[0]];
        assets = fromSheet(XLSX.utils.sheet_to_json(sheet, { defval: '' }));
      } else if (['pdf', 'png', 'jpg', 'jpeg'].includes(ext)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('clientId', clientId);
        fd.append('broker', '');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Não autenticado');
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-performance-report`, {
          method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, body: fd,
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.success) throw new Error(json?.error ?? 'Falha na leitura do relatório');
        const positions: any[] = json.extractedData?.positions ?? [];
        assets = positions.map(p => {
          const name = String(p.ticker && p.ticker !== '—' ? `${p.ticker}${p.name && p.name !== p.ticker ? ` — ${p.name}` : ''}` : p.name ?? '').trim();
          const type = guessType(String(p.type ?? ''), name);
          const rate = String(p.rate ?? '');
          return {
            id: uid(), name, type, value: Number(p.grossBalance) || 0,
            strategy: guessStrategy(type, rate, String(p.indexer ?? '')),
            maturity: p.maturityDate ?? null, rate: rate || null,
          };
        }).filter(a => a.name && a.value > 0);
      } else {
        throw new Error('Formato não suportado. Envie PDF, Excel ou CSV.');
      }
      if (assets.length === 0) throw new Error('Nenhum ativo encontrado no arquivo.');
      onImport(assets);
      toast.success(`${assets.length} ativo(s) importado(s). Revise tipos e estratégias.`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao importar');
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
      <div
        className={`border border-dashed rounded-lg p-6 text-center transition-colors ${drag ? 'border-primary bg-primary/5' : 'border-border'}`}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) handle(f); }}
      >
        {busy ? <Loader2 className="w-8 h-8 text-primary mx-auto mb-2 animate-spin" /> : <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />}
        <p className="text-sm font-medium">{busy ? 'Lendo relatório...' : 'Importar Relatório de Performance'}</p>
        <p className="text-xs text-muted-foreground">Arraste o PDF/Excel ou clique para selecionar</p>
        <input ref={ref} type="file" hidden accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg" onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); }} />
        <Button type="button" size="sm" className="mt-3" disabled={busy} onClick={() => ref.current?.click()}>Selecionar Arquivo</Button>
      </div>
      <Button type="button" variant="outline" className="h-auto md:w-44" onClick={onAdd}>
        <Plus className="w-4 h-4 mr-1" /> Adicionar Ativo
      </Button>
    </div>
  );
}
