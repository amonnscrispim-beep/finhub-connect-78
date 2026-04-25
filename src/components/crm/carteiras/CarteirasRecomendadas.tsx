import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMaster } from '@/hooks/useIsMaster';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { CarteiraGrid } from './CarteiraGrid';
import { CarteiraDetail } from './CarteiraDetail';
import { PortfoliosSection } from './portfolios/PortfoliosSection';

export interface RecommendedPortfolio {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface PortfolioAsset {
  id: string;
  portfolio_id: string;
  user_id: string;
  ticker: string;
  company_name: string;
  sector: string;
  entry_price: number;
  entry_date: string;
  ceiling_price: number;
  allocation_pct: number;
  current_price: number | null;
  manual_bias: string | null;
  display_order: number;
  is_international: boolean;
  sub_classification: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PORTFOLIOS = [
  { name: 'Crescimento', slug: 'crescimento', display_order: 0, description: 'Small Caps + Valor' },
  { name: 'Dividendos', slug: 'dividendos', display_order: 1, description: 'Ações pagadoras de dividendos' },
  { name: 'FIIs', slug: 'fiis', display_order: 2, description: 'Fundos Imobiliários' },
  { name: 'Internacional', slug: 'internacional', display_order: 3, description: 'Ativos internacionais' },
];

// Module-level cache to survive tab unmount/remount
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
type CarteirasCache = {
  userId: string;
  portfolios: RecommendedPortfolio[];
  assets: PortfolioAsset[];
  fetchedAt: number;
};
let carteirasCache: CarteirasCache | null = null;

export function CarteirasRecomendadas() {
  const { user } = useAuth();
  const isMaster = useIsMaster();
  const cached = carteirasCache && carteirasCache.userId === user?.id ? carteirasCache : null;
  const [portfolios, setPortfolios] = useState<RecommendedPortfolio[]>(cached?.portfolios ?? []);
  const [allAssets, setAllAssets] = useState<PortfolioAsset[]>(cached?.assets ?? []);
  const [selectedPortfolio, setSelectedPortfolio] = useState<RecommendedPortfolio | null>(null);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (!user) return;
    const c = carteirasCache;
    const fresh = c && c.userId === user.id && Date.now() - c.fetchedAt < CACHE_TTL_MS;
    if (fresh) {
      // Use cache; no refetch, no spinner
      setPortfolios(c!.portfolios);
      setAllAssets(c!.assets);
      setLoading(false);
      return;
    }
    // Stale or empty cache: if we have stale data, show it and refresh silently
    loadData({ silent: !!c && c.userId === user.id });
  }, [user]);

  const loadData = async (opts: { silent?: boolean } = {}) => {
    if (!user) return;
    if (!opts.silent) setLoading(true);

    const { data: existingPortfolios } = await supabase
      .from('recommended_portfolios')
      .select('*')
      .or(`user_id.eq.${user.id},shared.eq.true`)
      .order('display_order');

    let portfolioList = (existingPortfolios || []) as unknown as RecommendedPortfolio[];

    // Migrate old structure: merge Small Caps + Valor into Crescimento
    const slugs = portfolioList.map(p => p.slug);
    const hasOldStructure = (slugs.includes('small-caps') || slugs.includes('valor')) && !slugs.includes('crescimento');

    if (hasOldStructure) {
      // Create Crescimento portfolio
      const { data: crescimento } = await supabase
        .from('recommended_portfolios')
        .insert({ name: 'Crescimento', slug: 'crescimento', display_order: 0, user_id: user.id, description: 'Small Caps + Valor' })
        .select()
        .single();

      if (crescimento) {
        const crescimentoId = crescimento.id;
        // Migrate Small Caps assets
        const smallCaps = portfolioList.find(p => p.slug === 'small-caps');
        if (smallCaps) {
          await supabase
            .from('recommended_portfolio_assets')
            .update({ portfolio_id: crescimentoId, sub_classification: 'Small Caps' } as any)
            .eq('portfolio_id', smallCaps.id);
          await supabase.from('recommended_portfolios').delete().eq('id', smallCaps.id);
        }
        // Migrate Valor assets
        const valor = portfolioList.find(p => p.slug === 'valor');
        if (valor) {
          await supabase
            .from('recommended_portfolio_assets')
            .update({ portfolio_id: crescimentoId, sub_classification: 'Valor' } as any)
            .eq('portfolio_id', valor.id);
          await supabase.from('recommended_portfolios').delete().eq('id', valor.id);
        }
        // Update display_order of remaining portfolios
        for (const p of portfolioList) {
          if (p.slug === 'dividendos') await supabase.from('recommended_portfolios').update({ display_order: 1 }).eq('id', p.id);
          if (p.slug === 'fiis') await supabase.from('recommended_portfolios').update({ display_order: 2 }).eq('id', p.id);
          if (p.slug === 'internacional') await supabase.from('recommended_portfolios').update({ display_order: 3 }).eq('id', p.id);
        }
      }

      // Reload after migration
      const { data: refreshed } = await supabase
        .from('recommended_portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order');
      portfolioList = (refreshed || []) as unknown as RecommendedPortfolio[];
    }

    // Seed defaults if none exist
    if (portfolioList.length === 0) {
      const toInsert = DEFAULT_PORTFOLIOS.map(p => ({
        ...p,
        user_id: user.id,
      }));
      const { data: inserted } = await supabase
        .from('recommended_portfolios')
        .insert(toInsert)
        .select();
      portfolioList = (inserted || []) as unknown as RecommendedPortfolio[];
    }

    setPortfolios(portfolioList);

    const { data: assets } = await supabase
      .from('recommended_portfolio_assets')
      .select('*')
      .or(`user_id.eq.${user.id},shared.eq.true`)
      .order('display_order');

    const assetList = (assets || []) as unknown as PortfolioAsset[];
    setAllAssets(assetList);
    carteirasCache = {
      userId: user.id,
      portfolios: portfolioList,
      assets: assetList,
      fetchedAt: Date.now(),
    };
    setLoading(false);
  };

  const refreshAssets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('recommended_portfolio_assets')
      .select('*')
      .or(`user_id.eq.${user.id},shared.eq.true`)
      .order('display_order');
    const assetList = (data || []) as unknown as PortfolioAsset[];
    setAllAssets(assetList);
    if (carteirasCache && carteirasCache.userId === user.id) {
      carteirasCache = { ...carteirasCache, assets: assetList, fetchedAt: Date.now() };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (selectedPortfolio) {
    const isOwnPortfolio = selectedPortfolio.user_id === user?.id;
    return (
      <CarteiraDetail
        portfolio={selectedPortfolio}
        assets={allAssets.filter(a => a.portfolio_id === selectedPortfolio.id)}
        allPortfolios={portfolios}
        onBack={() => setSelectedPortfolio(null)}
        onRefresh={refreshAssets}
        isMaster={isMaster}
        readOnly={!isOwnPortfolio}
      />
    );
  }

  return (
    <div className="space-y-8">
      <CarteiraGrid
        portfolios={portfolios}
        allAssets={allAssets}
        onSelect={setSelectedPortfolio}
        isMaster={isMaster}
        userId={user?.id}
      />
      <PortfoliosSection
        recommendedAssets={allAssets}
        portfolioNameMap={Object.fromEntries(portfolios.map(p => [p.id, p.name]))}
        portfolioSlugMap={Object.fromEntries(portfolios.map(p => [p.id, p.slug]))}
        onRefreshRecommended={refreshAssets}
      />
    </div>
  );
}
