import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface PortfolioAsset {
  id: string;
  ticker: string;
  name: string;
  asset_class: string;
  target_weight: number;
  recommendation: string;
  recommendation_date: string;
  fair_price: number;
  current_price: number | null;
  upside_pct: number | null;
  tir_pct: number | null;
  notes: string | null;
  display_order: number;
}

export interface PortfolioPerformance {
  id: string;
  month: string;
  initial_value: number;
  final_value: number;
  deposits: number;
  withdrawals: number;
  return_pct: number | null;
}

export interface PortfolioReport {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export function useClientPortfolio(clientId: string | undefined) {
  const { user } = useAuth();
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [aporte, setAporte] = useState<number>(0);
  const [previousValues, setPreviousValues] = useState<Record<string, number>>({});
  const [performance, setPerformance] = useState<PortfolioPerformance[]>([]);
  const [reports, setReports] = useState<PortfolioReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const loadAll = useCallback(async () => {
    if (!clientId || !user) return;
    setIsLoading(true);
    try {
      const [assetsRes, simRes, prevRes, perfRes, repRes] = await Promise.all([
        supabase.from('client_portfolio_assets').select('*').eq('client_id', clientId).order('display_order'),
        supabase.from('client_portfolio_simulations').select('*').eq('client_id', clientId).limit(1),
        supabase.from('client_portfolio_previous_values').select('*').eq('client_id', clientId),
        supabase.from('client_portfolio_performance').select('*').eq('client_id', clientId).order('month'),
        supabase.from('client_portfolio_reports').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      ]);

      if (assetsRes.data) {
        setAssets(assetsRes.data.map((a: any) => ({
          id: a.id,
          ticker: a.ticker,
          name: a.name,
          asset_class: a.asset_class,
          target_weight: Number(a.target_weight),
          recommendation: a.recommendation,
          recommendation_date: a.recommendation_date,
          fair_price: Number(a.fair_price),
          current_price: a.current_price != null ? Number(a.current_price) : null,
          upside_pct: a.upside_pct != null ? Number(a.upside_pct) : null,
          tir_pct: a.tir_pct != null ? Number(a.tir_pct) : null,
          notes: a.notes,
          display_order: a.display_order,
        })));
      }
      if (simRes.data && simRes.data.length > 0) {
        setAporte(Number((simRes.data[0] as any).aporte));
      }
      if (prevRes.data) {
        const map: Record<string, number> = {};
        prevRes.data.forEach((p: any) => { map[p.ticker] = Number(p.previous_value); });
        setPreviousValues(map);
      }
      if (perfRes.data) {
        setPerformance(perfRes.data.map((p: any) => ({
          id: p.id, month: p.month,
          initial_value: Number(p.initial_value), final_value: Number(p.final_value),
          deposits: Number(p.deposits), withdrawals: Number(p.withdrawals),
          return_pct: p.return_pct != null ? Number(p.return_pct) : null,
        })));
      }
      if (repRes.data) {
        setReports(repRes.data.map((r: any) => ({
          id: r.id, title: r.title, content: r.content, created_at: r.created_at,
        })));
      }
    } catch (e) {
      console.error('Error loading portfolio:', e);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // --- ASSETS ---
  const saveAsset = useCallback(async (asset: PortfolioAsset) => {
    if (!clientId || !user) return;
    const payload = {
      client_id: clientId, user_id: user.id,
      ticker: asset.ticker, name: asset.name, asset_class: asset.asset_class,
      target_weight: asset.target_weight, recommendation: asset.recommendation,
      recommendation_date: asset.recommendation_date, fair_price: asset.fair_price,
      current_price: asset.current_price, upside_pct: asset.upside_pct,
      tir_pct: asset.tir_pct, notes: asset.notes, display_order: asset.display_order,
    };
    const { error } = await supabase.from('client_portfolio_assets').upsert({ id: asset.id, ...payload });
    if (error) { console.error(error); toast.error('Erro ao salvar ativo'); }
  }, [clientId, user]);

  const addAsset = useCallback(async () => {
    if (!clientId || !user) return;
    const newAsset = {
      client_id: clientId, user_id: user.id,
      ticker: '', name: '', asset_class: 'Ações', target_weight: 0,
      recommendation: 'MANTER', recommendation_date: new Date().toISOString().split('T')[0],
      fair_price: 0, display_order: assets.length,
    };
    const { data, error } = await supabase.from('client_portfolio_assets').insert(newAsset).select().single();
    if (error) { toast.error('Erro ao adicionar ativo'); return; }
    if (data) {
      setAssets(prev => [...prev, {
        id: data.id, ticker: '', name: '', asset_class: 'Ações', target_weight: 0,
        recommendation: 'MANTER', recommendation_date: newAsset.recommendation_date,
        fair_price: 0, current_price: null, upside_pct: null, tir_pct: null,
        notes: null, display_order: assets.length,
      }]);
    }
  }, [clientId, user, assets.length]);

  const deleteAsset = useCallback(async (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
    const { error } = await supabase.from('client_portfolio_assets').delete().eq('id', id);
    if (error) { toast.error('Erro ao remover ativo'); loadAll(); }
  }, [loadAll]);

  const updateAssetLocal = useCallback((id: string, field: keyof PortfolioAsset, value: any) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  }, []);

  const debouncedSaveAsset = useCallback((asset: PortfolioAsset) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveAsset(asset), 800);
  }, [saveAsset]);

  // --- SIMULATION ---
  const saveAporte = useCallback(async (val: number) => {
    setAporte(val);
    if (!clientId || !user) return;
    const { error } = await supabase.from('client_portfolio_simulations')
      .upsert({ client_id: clientId, user_id: user.id, aporte: val }, { onConflict: 'client_id' });
    if (error) console.error(error);
  }, [clientId, user]);

  const savePreviousValue = useCallback(async (ticker: string, value: number) => {
    setPreviousValues(prev => ({ ...prev, [ticker]: value }));
    if (!clientId || !user) return;
    const { error } = await supabase.from('client_portfolio_previous_values')
      .upsert({ client_id: clientId, user_id: user.id, ticker, previous_value: value }, { onConflict: 'client_id,ticker' });
    if (error) console.error(error);
  }, [clientId, user]);

  // --- PERFORMANCE ---
  const savePerformance = useCallback(async (perf: Omit<PortfolioPerformance, 'id'> & { id?: string }) => {
    if (!clientId || !user) return;
    const initial = perf.initial_value || 0;
    const returnPct = initial > 0
      ? ((perf.final_value - perf.deposits + perf.withdrawals) / initial - 1) * 100
      : null;
    const payload = {
      client_id: clientId, user_id: user.id,
      month: perf.month, initial_value: perf.initial_value, final_value: perf.final_value,
      deposits: perf.deposits, withdrawals: perf.withdrawals, return_pct: returnPct,
    };
    if (perf.id) {
      const { error } = await supabase.from('client_portfolio_performance').update(payload).eq('id', perf.id);
      if (error) { toast.error('Erro ao salvar performance'); return; }
      setPerformance(prev => prev.map(p => p.id === perf.id ? { ...p, ...payload, return_pct: returnPct } : p));
    } else {
      const { data, error } = await supabase.from('client_portfolio_performance').insert(payload).select().single();
      if (error) { toast.error('Erro ao adicionar mês'); return; }
      if (data) {
        setPerformance(prev => [...prev, { id: data.id, ...payload, return_pct: returnPct }].sort((a, b) => a.month.localeCompare(b.month)));
      }
    }
  }, [clientId, user]);

  const deletePerformance = useCallback(async (id: string) => {
    setPerformance(prev => prev.filter(p => p.id !== id));
    await supabase.from('client_portfolio_performance').delete().eq('id', id);
  }, []);

  // --- REPORTS ---
  const saveReport = useCallback(async (report: { id?: string; title: string; content: string }) => {
    if (!clientId || !user) return;
    if (report.id) {
      const { error } = await supabase.from('client_portfolio_reports').update({ title: report.title, content: report.content }).eq('id', report.id);
      if (error) { toast.error('Erro ao salvar relatório'); return; }
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, ...report } : r));
    } else {
      const { data, error } = await supabase.from('client_portfolio_reports')
        .insert({ client_id: clientId, user_id: user.id, title: report.title, content: report.content }).select().single();
      if (error) { toast.error('Erro ao criar relatório'); return; }
      if (data) setReports(prev => [{ id: data.id, title: data.title, content: data.content, created_at: data.created_at }, ...prev]);
    }
  }, [clientId, user]);

  const deleteReport = useCallback(async (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
    await supabase.from('client_portfolio_reports').delete().eq('id', id);
  }, []);

  return {
    assets, aporte, previousValues, performance, reports, isLoading,
    addAsset, deleteAsset, updateAssetLocal, debouncedSaveAsset, saveAsset,
    saveAporte, savePreviousValue,
    savePerformance, deletePerformance,
    saveReport, deleteReport,
    reload: loadAll,
  };
}
