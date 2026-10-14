import { useRef, useState } from 'react';
import { Upload, Loader2, Plus, FileText, X } from 'lucide-react';
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
  importedFiles: string[];
  onImport: (assets: ConsolidatedAsset[], fileNames: string[]) => void;
  onRemoveFile: (name: string) => void;
  onAdd: () => void;
  onClearAll: () => void;
  assetCount: number;
}

export function PortfolioUpload({ clientId, importedFiles, onImport, onRemoveFile, onAdd, onClearAll, assetCount }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  const parseFile = async (file: File): Promise<ConsolidatedAsset[]> => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      const wb = XLSX.read(await file.arrayBuffer());
      const sheet = wb.Sheets[wb.SheetNames[0]];
      return fromSheet(XLSX.utils.sheet_to_json(sheet, { defval: '' }));
    }
    if (['pdf', 'png', 'jpg', 'jpeg'].includes(ext)) {
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
      return positions.map(p => {
        const name = String(p.ticker && p.ticker !== '—' ? `${p.ticker}${p.name && p.name !== p.ticker ? ` — ${p.name}` : ''}` : p.name ?? '').trim();
        const type = guessType(String(p.type ?? ''), name);
        const rate = String(p.rate ?? '');
        return {
          id: uid(), name, type, value: Number(p.grossBalance) || 0,
          strategy: guessStrategy(type, rate, String(p.indexer ?? '')),
          maturity: p.maturityDate ?? null, rate: rate || null,
        };
      }).filter(a => a.name && a.value > 0);
    }
    throw new Error('Formato não suportado. Envie PDF, Excel ou CSV.');
  };

  const handle = async (files: File[]) => {
    const allAssets: ConsolidatedAsset[] = [];
    const okNames: string[] = [];
    const errors: string[] = [];
    for (const file of files) {
      setBusy(file.name);
      try {
        const assets = await parseFile(file);
        if (assets.length === 0) throw new Error('nenhum ativo encontrado');
        allAssets.push(...assets.map(a => ({ ...a, sourceFile: file.name })));
        okNames.push(file.name);
      } catch (e: any) {
        errors.push(`${file.name}: ${e?.message ?? 'erro ao importar'}`);
      }
    }
    setBusy(null);
    if (ref.current) ref.current.value = '';
    if (allAssets.length > 0) {
      onImport(allAssets, okNames);
      toast.success(`${allAssets.length} ativo(s) importado(s) de ${okNames.length} arquivo(s). Revise tipos e estratégias.`);
    }
    errors.forEach(msg => toast.error(msg));
    if (allAssets.length === 0 && errors.length === 0) toast.error('Nenhum arquivo selecionado.');
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div
          className={`border border-dashed rounded-lg p-6 text-center transition-colors ${drag ? 'border-primary bg-primary/5' : 'border-border'}`}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); const fs = Array.from(e.dataTransfer.files ?? []); if (fs.length) handle(fs); }}
        >
          {busy ? <Loader2 className="w-8 h-8 text-primary mx-auto mb-2 animate-spin" /> : <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />}
          <p className="text-sm font-medium">{busy ? `Lendo ${busy}...` : 'Importar Relatórios de Performance'}</p>
          <p className="text-xs text-muted-foreground">Arraste um ou mais PDFs/Excels ou clique para selecionar</p>
          <input ref={ref} type="file" hidden multiple accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg" onChange={e => { const fs = Array.from(e.target.files ?? []); if (fs.length) handle(fs); }} />
          <Button type="button" size="sm" className="mt-3" disabled={!!busy} onClick={() => ref.current?.click()}>Selecionar Arquivos</Button>
        </div>
        <Button type="button" variant="outline" className="h-auto md:w-44" onClick={onAdd}>
          <Plus className="w-4 h-4 mr-1" /> Adicionar Ativo
        </Button>
      </div>

      {(importedFiles.length > 0 || assetCount > 0) && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">Arquivos importados ({importedFiles.length})</p>
            {assetCount > 0 && (
              <button type="button" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => { if (confirm('Remover todos os ativos e arquivos do consolidador?')) onClearAll(); }}>
                Limpar tudo
              </button>
            )}
          </div>
          <ul className="space-y-1">
            {importedFiles.map(name => (
              <li key={name} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{name}</span>
                </span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  title="Remover arquivo e os ativos importados dele"
                  onClick={() => onRemoveFile(name)}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
