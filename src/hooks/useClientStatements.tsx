import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type AssetClass =
  | 'Renda Fixa'
  | 'Renda Variável'
  | 'Fundos Imobiliários'
  | 'Multimercado'
  | 'Previdência'
  | 'Caixa';

export interface ExtractAsset {
  id: string;
  snapshot_id: string;
  asset_type: string;
  asset_name: string;
  issuer: string | null;
  rate: string | null;
  maturity_date: string | null;
  gross_value: number;
  percentage: number;
  asset_class: AssetClass;
  is_tax_exempt: boolean;
  display_order: number;
}

export interface ExtractSnapshot {
  id: string;
  client_id: string;
  snapshot_date: string;
  total_patrimony: number;
  broker: string | null;
  pdf_filename: string | null;
  pdf_url: string | null;
  notes: string | null;
  return_month_value: number;
  return_month_pct: number;
  return_year_value: number;
  return_year_pct: number;
  technical_summary: string;
  consultant_comments: string;
  created_at: string;
}

export function useClientStatements(clientId: string | undefined) {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<ExtractSnapshot[]>([]);
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null);
  const [assets, setAssets] = useState<ExtractAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const loadSnapshots = useCallback(async () => {
    if (!clientId || !user) return;
    setIsLoading(true);
    // Pequeno retry para falhas transitórias de rede ("Failed to fetch")
    const attempt = async (): Promise<{ data: any[] | null; error: any }> => {
      return await supabase
        .from('client_extract_snapshots')
        .select('*')
        .eq('client_id', clientId)
        .order('snapshot_date', { ascending: false });
    };
    try {
      let { data, error } = await attempt();
      if (error && /Failed to fetch|NetworkError/i.test(String(error?.message))) {
        await new Promise((r) => setTimeout(r, 600));
        ({ data, error } = await attempt());
      }
      if (error) throw error;
      const list = (data || []) as ExtractSnapshot[];
      setSnapshots(list);
      if (list.length > 0 && !activeSnapshotId) {
        setActiveSnapshotId(list[0].id);
      } else if (list.length === 0) {
        setActiveSnapshotId(null);
        setAssets([]);
      }
    } catch (e: any) {
      console.error('[useClientStatements] loadSnapshots failed', e);
      // Silencia falhas transitórias de rede para não poluir a UI
      const msg = String(e?.message || e);
      if (!/Failed to fetch|NetworkError/i.test(msg)) {
        toast.error('Erro ao carregar snapshots');
      }
    } finally {
      setIsLoading(false);
    }
  }, [clientId, user, activeSnapshotId]);

  const loadAssets = useCallback(async (snapshotId: string) => {
    const { data, error } = await supabase
      .from('client_extract_assets')
      .select('*')
      .eq('snapshot_id', snapshotId)
      .order('gross_value', { ascending: false });
    if (error) {
      toast.error('Erro ao carregar ativos');
      return;
    }
    setAssets((data || []) as ExtractAsset[]);
  }, []);

  useEffect(() => {
    loadSnapshots();
  }, [clientId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeSnapshotId) loadAssets(activeSnapshotId);
    else setAssets([]);
  }, [activeSnapshotId, loadAssets]);

  const extractAndSave = useCallback(
    async (file: File) => {
      if (!clientId || !user) {
        toast.error('Cliente não identificado');
        return null;
      }
      setIsExtracting(true);
      try {
        // 1. Convert PDF to base64
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        const base64 = btoa(binary);

        // 2. Upload PDF to storage
        const sanitized = file.name.replace(/[^\w.-]/g, '_');
        const path = `${user.id}/${clientId}/${Date.now()}-${sanitized}`;
        const { error: upErr } = await supabase.storage
          .from('client-extracts')
          .upload(path, file, { contentType: file.type || 'application/pdf', upsert: false });
        if (upErr) {
          console.warn('Falha no upload do PDF (continuando):', upErr);
        }

        // 3. Call extraction edge function
        toast.loading('Extraindo dados do extrato com IA...', { id: 'extract' });
        const { data: extracted, error: fnErr } = await supabase.functions.invoke(
          'extract-client-statement',
          { body: { pdfBase64: base64, pdfMimeType: file.type || 'application/pdf' } }
        );
        if (fnErr || !extracted || extracted.error) {
          toast.error(extracted?.error || fnErr?.message || 'Erro na extração', { id: 'extract' });
          return null;
        }

        // 4. Insert snapshot
        const snapshotDate = extracted.snapshot_date || new Date().toISOString().slice(0, 10);
        const { data: snap, error: snapErr } = await supabase
          .from('client_extract_snapshots')
          .insert({
            client_id: clientId,
            user_id: user.id,
            snapshot_date: snapshotDate,
            total_patrimony: extracted.total_patrimony || 0,
            broker: extracted.broker || null,
            pdf_filename: file.name,
            pdf_url: upErr ? null : path,
          })
          .select()
          .single();
        if (snapErr || !snap) {
          toast.error('Erro ao salvar snapshot', { id: 'extract' });
          return null;
        }

        // 5. Insert assets — auto-mark Debêntures as tax exempt
        const assetRows = (extracted.assets || []).map((a: any, i: number) => {
          const blob = `${a.asset_type || ''} ${a.asset_name || ''}`.toUpperCase();
          const isDeb = blob.includes('DEB');
          return {
            snapshot_id: snap.id,
            user_id: user.id,
            asset_type: a.asset_type || '',
            asset_name: a.asset_name || '',
            issuer: a.issuer || null,
            rate: a.rate || null,
            maturity_date: a.maturity_date || null,
            gross_value: Number(a.gross_value) || 0,
            percentage: Number(a.percentage) || 0,
            asset_class: a.asset_class || 'Renda Fixa',
            is_tax_exempt: isDeb ? true : !!a.is_tax_exempt,
            display_order: i,
          };
        });
        if (assetRows.length > 0) {
          const { error: assetsErr } = await supabase.from('client_extract_assets').insert(assetRows);
          if (assetsErr) {
            console.error(assetsErr);
            toast.error('Snapshot salvo, mas falhou ao salvar ativos', { id: 'extract' });
          }
        }

        toast.success(`Extrato processado: ${assetRows.length} ativos extraídos`, { id: 'extract' });
        await loadSnapshots();
        setActiveSnapshotId(snap.id);
        return snap.id;
      } catch (e: any) {
        console.error(e);
        toast.error(`Erro: ${e.message || e}`, { id: 'extract' });
        return null;
      } finally {
        setIsExtracting(false);
      }
    },
    [clientId, user, loadSnapshots]
  );

  const deleteSnapshot = useCallback(
    async (snapshotId: string) => {
      const { error } = await supabase.from('client_extract_snapshots').delete().eq('id', snapshotId);
      if (error) {
        toast.error('Erro ao remover snapshot');
        return;
      }
      toast.success('Snapshot removido');
      if (activeSnapshotId === snapshotId) setActiveSnapshotId(null);
      await loadSnapshots();
    },
    [activeSnapshotId, loadSnapshots]
  );

  const updateSnapshot = useCallback(
    async (snapshotId: string, patch: Partial<ExtractSnapshot>) => {
      const { error } = await supabase
        .from('client_extract_snapshots')
        .update(patch)
        .eq('id', snapshotId);
      if (error) {
        toast.error('Erro ao salvar');
        return false;
      }
      setSnapshots((prev) => prev.map((s) => (s.id === snapshotId ? { ...s, ...patch } as ExtractSnapshot : s)));
      return true;
    },
    []
  );

  return {
    snapshots,
    activeSnapshotId,
    setActiveSnapshotId,
    assets,
    isLoading,
    isExtracting,
    extractAndSave,
    deleteSnapshot,
    updateSnapshot,
    reload: loadSnapshots,
  };
}

