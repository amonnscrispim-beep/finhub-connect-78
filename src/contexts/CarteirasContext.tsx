import { createContext, useContext, useState, useCallback, useRef, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { RecommendedPortfolio, PortfolioAsset } from '@/components/crm/carteiras/CarteirasRecomendadas';
import type { InvestorPortfolio, PortfolioAssetItem } from '@/components/crm/carteiras/portfolios/PortfoliosSection';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const DEFAULT_PORTFOLIOS = [
  { name: 'Crescimento', slug: 'crescimento', display_order: 0, description: 'Small Caps + Valor' },
  { name: 'Dividendos', slug: 'dividendos', display_order: 1, description: 'Ações pagadoras de dividendos' },
  { name: 'FIIs', slug: 'fiis', display_order: 2, description: 'Fundos Imobiliários' },
  { name: 'Internacional', slug: 'internacional', display_order: 3, description: 'Ativos internacionais' },
];

const PROFILES = ['Conservador', 'Moderado', 'Arrojado'] as const;
const STRATEGIES = ['Renda', 'Crescimento'] as const;

function getDefaultAllocations(profile: string, strategy: string) {
  if (profile === 'Conservador' && strategy === 'Renda') return { acoes_pct: 7, fiis_pct: 8, internacional_pct: 5, renda_fixa_pct: 80, rf_pos_pct: 50, rf_pre_pct: 10, rf_ipca_pct: 20 };
  if (profile === 'Conservador' && strategy === 'Crescimento') return { acoes_pct: 15, fiis_pct: 10, internacional_pct: 5, renda_fixa_pct: 70, rf_pos_pct: 40, rf_pre_pct: 10, rf_ipca_pct: 20 };
  if (profile === 'Moderado' && strategy === 'Renda') return { acoes_pct: 15, fiis_pct: 15, internacional_pct: 10, renda_fixa_pct: 60, rf_pos_pct: 30, rf_pre_pct: 10, rf_ipca_pct: 20 };
  if (profile === 'Moderado' && strategy === 'Crescimento') return { acoes_pct: 25, fiis_pct: 15, internacional_pct: 10, renda_fixa_pct: 50, rf_pos_pct: 25, rf_pre_pct: 10, rf_ipca_pct: 15 };
  if (profile === 'Arrojado' && strategy === 'Renda') return { acoes_pct: 25, fiis_pct: 20, internacional_pct: 15, renda_fixa_pct: 40, rf_pos_pct: 20, rf_pre_pct: 10, rf_ipca_pct: 10 };
  return { acoes_pct: 35, fiis_pct: 15, internacional_pct: 20, renda_fixa_pct: 30, rf_pos_pct: 15, rf_pre_pct: 5, rf_ipca_pct: 10 };
}

interface CarteirasState {
  portfolios: RecommendedPortfolio[];
  allAssets: PortfolioAsset[];
  investorPortfolios: InvestorPortfolio[];
  portfolioAssets: PortfolioAssetItem[];
  loaded: boolean;
  loading: boolean;
  refresh: (force?: boolean) => Promise<void>;
  setAllAssets: (a: PortfolioAsset[]) => void;
  setInvestorPortfolios: (p: InvestorPortfolio[]) => void;
  setPortfolioAssets: (a: PortfolioAssetItem[]) => void;
}

const CarteirasContext = createContext<CarteirasState | null>(null);

export function CarteirasProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [portfolios, setPortfolios] = useState<RecommendedPortfolio[]>([]);
  const [allAssets, setAllAssets] = useState<PortfolioAsset[]>([]);
  const [investorPortfolios, setInvestorPortfolios] = useState<InvestorPortfolio[]>([]);
  const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAssetItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastLoadedAtRef = useRef<number>(0);
  const inflightRef = useRef<Promise<void> | null>(null);

  const doLoad = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // --- Recommended portfolios + assets ---
      const { data: existingPortfolios } = await supabase
        .from('recommended_portfolios')
        .select('*')
        .or(`user_id.eq.${user.id},shared.eq.true`)
        .order('display_order');

      let portfolioList = (existingPortfolios || []) as unknown as RecommendedPortfolio[];

      // Migration: merge Small Caps + Valor into Crescimento (kept from original)
      const slugs = portfolioList.map(p => p.slug);
      const hasOldStructure = (slugs.includes('small-caps') || slugs.includes('valor')) && !slugs.includes('crescimento');
      if (hasOldStructure) {
        const { data: crescimento } = await supabase
          .from('recommended_portfolios')
          .insert({ name: 'Crescimento', slug: 'crescimento', display_order: 0, user_id: user.id, description: 'Small Caps + Valor' })
          .select()
          .single();
        if (crescimento) {
          const crescimentoId = crescimento.id;
          const smallCaps = portfolioList.find(p => p.slug === 'small-caps');
          if (smallCaps) {
            await supabase.from('recommended_portfolio_assets').update({ portfolio_id: crescimentoId, sub_classification: 'Small Caps' } as any).eq('portfolio_id', smallCaps.id);
            await supabase.from('recommended_portfolios').delete().eq('id', smallCaps.id);
          }
          const valor = portfolioList.find(p => p.slug === 'valor');
          if (valor) {
            await supabase.from('recommended_portfolio_assets').update({ portfolio_id: crescimentoId, sub_classification: 'Valor' } as any).eq('portfolio_id', valor.id);
            await supabase.from('recommended_portfolios').delete().eq('id', valor.id);
          }
          for (const p of portfolioList) {
            if (p.slug === 'dividendos') await supabase.from('recommended_portfolios').update({ display_order: 1 }).eq('id', p.id);
            if (p.slug === 'fiis') await supabase.from('recommended_portfolios').update({ display_order: 2 }).eq('id', p.id);
            if (p.slug === 'internacional') await supabase.from('recommended_portfolios').update({ display_order: 3 }).eq('id', p.id);
          }
        }
        const { data: refreshed } = await supabase.from('recommended_portfolios').select('*').eq('user_id', user.id).order('display_order');
        portfolioList = (refreshed || []) as unknown as RecommendedPortfolio[];
      }

      if (portfolioList.length === 0) {
        const toInsert = DEFAULT_PORTFOLIOS.map(p => ({ ...p, user_id: user.id }));
        const { data: inserted } = await supabase.from('recommended_portfolios').insert(toInsert).select();
        portfolioList = (inserted || []) as unknown as RecommendedPortfolio[];
      }

      const { data: assetsData } = await supabase
        .from('recommended_portfolio_assets')
        .select('*')
        .or(`user_id.eq.${user.id},shared.eq.true`)
        .order('display_order');

      // --- Investor portfolios + assets ---
      const { data: invExisting } = await supabase
        .from('investor_portfolios')
        .select('*')
        .or(`user_id.eq.${user.id},shared.eq.true`);
      let invList = (invExisting || []) as unknown as InvestorPortfolio[];
      const ownInv = invList.filter(p => p.user_id === user.id);
      if (ownInv.length === 0) {
        const toInsert: any[] = [];
        for (const profile of PROFILES) {
          for (const strategy of STRATEGIES) {
            toInsert.push({ user_id: user.id, profile, strategy, ...getDefaultAllocations(profile, strategy) });
          }
        }
        await supabase.from('investor_portfolios').insert(toInsert).select();
        const { data: all } = await supabase.from('investor_portfolios').select('*').or(`user_id.eq.${user.id},shared.eq.true`);
        invList = (all || []) as unknown as InvestorPortfolio[];
      }

      const { data: invAssets } = await supabase
        .from('portfolio_assets')
        .select('*')
        .or(`user_id.eq.${user.id},shared.eq.true`)
        .order('display_order');

      setPortfolios(portfolioList);
      setAllAssets((assetsData || []) as unknown as PortfolioAsset[]);
      setInvestorPortfolios(invList);
      setPortfolioAssets((invAssets || []) as unknown as PortfolioAssetItem[]);
      lastLoadedAtRef.current = Date.now();
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refresh = useCallback(async (force = false) => {
    if (!user) return;
    if (!force && loaded && Date.now() - lastLoadedAtRef.current < CACHE_TTL_MS) return;
    if (inflightRef.current) return inflightRef.current;
    const p = doLoad().finally(() => { inflightRef.current = null; });
    inflightRef.current = p;
    return p;
  }, [user, loaded, doLoad]);

  // Auto-load on mount when user is available
  useEffect(() => {
    if (user && !loaded) {
      refresh(false);
    }
  }, [user, loaded, refresh]);

  return (
    <CarteirasContext.Provider value={{
      portfolios, allAssets, investorPortfolios, portfolioAssets,
      loaded, loading, refresh,
      setAllAssets, setInvestorPortfolios, setPortfolioAssets,
    }}>
      {children}
    </CarteirasContext.Provider>
  );
}

export function useCarteiras() {
  const ctx = useContext(CarteirasContext);
  if (!ctx) throw new Error('useCarteiras must be used inside CarteirasProvider');
  return ctx;
}
