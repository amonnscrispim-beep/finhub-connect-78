import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface FarolPillar {
  id: string;
  client_id: string;
  profile_tab: string;
  pillar_name: string;
  allocation_pct: number;
  display_order: number;
}

export interface FarolAsset {
  id: string;
  pillar_id: string;
  client_id: string;
  ticker: string;
  name: string;
  sector: string | null;
  ceiling_price: number | null;
  current_price: number | null;
  bias: string;
  allocation_pct: number;
  display_order: number;
}

export const PROFILE_TABS = ['Curto Prazo', 'Conservador', 'Moderado', 'Arrojado'] as const;
export type ProfileTab = typeof PROFILE_TABS[number];

export const PILLAR_OPTIONS = [
  'Ações Brasileiras',
  'Ações Internacionais',
  'Fundos Imobiliários',
  'Pós-Fixado',
  'Pré-Fixado',
  'Indexado à Inflação',
  'Alternativos',
  'Caixa / Oportunidade',
] as const;

const RENDA_VARIAVEL_PILLARS = ['Ações Brasileiras', 'Ações Internacionais', 'Fundos Imobiliários'];

export function isRendaVariavel(pillarName: string) {
  return RENDA_VARIAVEL_PILLARS.includes(pillarName);
}

export function useCarteiraFarol(clientId: string | undefined) {
  const { user } = useAuth();
  const [pillars, setPillars] = useState<FarolPillar[]>([]);
  const [assets, setAssets] = useState<FarolAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!clientId || !user) return;
    setIsLoading(true);
    try {
      const [pillarsRes, assetsRes] = await Promise.all([
        supabase.from('farol_pillars').select('*').eq('client_id', clientId).order('display_order'),
        supabase.from('farol_assets').select('*').eq('client_id', clientId).order('display_order'),
      ]);
      setPillars((pillarsRes.data as any[]) || []);
      setAssets((assetsRes.data as any[]) || []);
    } catch (e) {
      console.error('Error loading Carteira Farol', e);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, user]);

  useEffect(() => { loadData(); }, [loadData]);

  const addPillar = async (profileTab: string, pillarName: string) => {
    if (!clientId || !user) return;
    const existing = pillars.filter(p => p.profile_tab === profileTab);
    const { data, error } = await supabase.from('farol_pillars').insert({
      client_id: clientId,
      user_id: user.id,
      profile_tab: profileTab,
      pillar_name: pillarName,
      allocation_pct: 0,
      display_order: existing.length,
    } as any).select().single();
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setPillars(prev => [...prev, data as any]);
  };

  const updatePillar = async (id: string, updates: Partial<FarolPillar>) => {
    const { error } = await supabase.from('farol_pillars').update(updates as any).eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setPillars(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePillar = async (id: string) => {
    const { error } = await supabase.from('farol_pillars').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setPillars(prev => prev.filter(p => p.id !== id));
    setAssets(prev => prev.filter(a => a.pillar_id !== id));
  };

  const addAsset = async (pillarId: string) => {
    if (!clientId || !user) return;
    const existing = assets.filter(a => a.pillar_id === pillarId);
    const { data, error } = await supabase.from('farol_assets').insert({
      pillar_id: pillarId,
      client_id: clientId,
      user_id: user.id,
      ticker: '',
      name: '',
      bias: 'AGUARDAR',
      allocation_pct: 0,
      display_order: existing.length,
    } as any).select().single();
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setAssets(prev => [...prev, data as any]);
  };

  const updateAsset = async (id: string, updates: Partial<FarolAsset>) => {
    const { error } = await supabase.from('farol_assets').update(updates as any).eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setAssets(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const deleteAsset = async (id: string) => {
    const { error } = await supabase.from('farol_assets').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const fetchQuotes = async (tickers: string[]) => {
    if (tickers.length === 0) return;
    try {
      const { data, error } = await supabase.functions.invoke('fetch-stock-quote', {
        body: { tickers },
      });
      if (error) throw error;
      const quotes = data?.quotes as Record<string, number | null>;
      if (!quotes) return;

      const updates: Promise<void>[] = [];
      setAssets(prev => prev.map(a => {
        const price = quotes[a.ticker];
        if (price != null && price !== a.current_price) {
          const p: Promise<void> = supabase.from('farol_assets').update({ current_price: price } as any).eq('id', a.id).then(() => {});
          updates.push(p);
          return { ...a, current_price: price };
        }
        return a;
      }));
      await Promise.all(updates);
      toast({ title: 'Cotações atualizadas' });
    } catch (e) {
      console.error('Error fetching quotes', e);
      toast({ title: 'Erro ao buscar cotações', variant: 'destructive' });
    }
  };

  return {
    pillars,
    assets,
    isLoading,
    addPillar,
    updatePillar,
    deletePillar,
    addAsset,
    updateAsset,
    deleteAsset,
    fetchQuotes,
    reload: loadData,
  };
}
