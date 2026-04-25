import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMaster } from '@/hooks/useIsMaster';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SharedBadge } from '@/components/ui/shared-badge';
import { Briefcase, Share2, ChevronDown, ChevronRight } from 'lucide-react';
import { PortfolioStrategyView } from './PortfolioStrategyView';
import { ClientPortfolioTab } from './ClientPortfolioTab';
import { FarolDonut } from './FarolDonut';
import { PortfolioAsset } from '../CarteirasRecomendadas';

// Module-level cache to survive tab unmount/remount (parallels CarteirasRecomendadas cache)
const PORTFOLIOS_CACHE_TTL_MS = 5 * 60 * 1000;
type PortfoliosCache = {
  userId: string;
  portfolios: any[];
  assets: any[];
  fetchedAt: number;
};
let portfoliosCache: PortfoliosCache | null = null;


const PROFILES = ['Conservador', 'Moderado', 'Arrojado'] as const;
const STRATEGIES = ['Renda', 'Crescimento'] as const;

export interface InvestorPortfolio {
  id: string;
  user_id: string;
  profile: string;
  strategy: string;
  acoes_pct: number;
  fiis_pct: number;
  internacional_pct: number;
  renda_fixa_pct: number;
  rf_pos_pct: number;
  rf_pre_pct: number;
  rf_ipca_pct: number;
  invest_amount: number;
  shared?: boolean;
  created_at: string;
  updated_at: string;
}

export interface PortfolioAssetItem {
  id: string;
  portfolio_id: string;
  user_id: string;
  asset_class: string;
  ticker: string;
  name: string;
  allocation_pct: number;
  dy_pct: number;
  source_asset_id: string | null;
  rf_type: string | null;
  indexador: string | null;
  vencimento: string | null;
  display_order: number;
  shared?: boolean;
  created_at: string;
  updated_at: string;
}

interface Props {
  recommendedAssets: PortfolioAsset[];
  portfolioNameMap: Record<string, string>;
  portfolioSlugMap?: Record<string, string>;
}

export function PortfoliosSection({ recommendedAssets, portfolioNameMap, portfolioSlugMap = {} }: Props) {
  const { user } = useAuth();
  const isMaster = useIsMaster();
  const cached = portfoliosCache && portfoliosCache.userId === user?.id ? portfoliosCache : null;
  const [portfolios, setPortfolios] = useState<InvestorPortfolio[]>(cached?.portfolios ?? []);
  const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAssetItem[]>(cached?.assets ?? []);
  const [activeProfile, setActiveProfile] = useState<string>('Conservador');
  const [loading, setLoading] = useState(!cached);

  // Per-strategy collapse state, persisted in localStorage. Default: collapsed.
  const STRATEGY_COLLAPSE_KEY = 'portfolios-strategy-collapse';
  const [collapsedStrategies, setCollapsedStrategies] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(STRATEGY_COLLAPSE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(STRATEGY_COLLAPSE_KEY, JSON.stringify(collapsedStrategies));
    } catch {}
  }, [collapsedStrategies]);
  const strategyKey = (profile: string, strategy: string) => `${profile}::${strategy}`;
  const isStrategyCollapsed = (profile: string, strategy: string) => {
    const k = strategyKey(profile, strategy);
    return k in collapsedStrategies ? collapsedStrategies[k] : true;
  };
  const toggleStrategyCollapse = (profile: string, strategy: string) =>
    setCollapsedStrategies(prev => ({ ...prev, [strategyKey(profile, strategy)]: !isStrategyCollapsed(profile, strategy) }));

  const loadPortfolios = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!user) return;
    if (!opts.silent) setLoading(true);

    // Parallelize portfolio + assets fetch into a single round-trip
    const [{ data: existing }, { data: assetsData }] = await Promise.all([
      supabase.from('investor_portfolios').select('*').or(`user_id.eq.${user.id},shared.eq.true`),
      supabase.from('portfolio_assets').select('*').or(`user_id.eq.${user.id},shared.eq.true`).order('display_order'),
    ]);

    let portfolioList = (existing || []) as unknown as InvestorPortfolio[];
    let assetList = (assetsData || []) as unknown as PortfolioAssetItem[];

    // Only seed if the user has NO own portfolios
    const ownPortfolios = portfolioList.filter(p => p.user_id === user.id);
    if (ownPortfolios.length === 0) {
      const toInsert: any[] = [];
      for (const profile of PROFILES) {
        for (const strategy of STRATEGIES) {
          const defaults = getDefaultAllocations(profile, strategy);
          toInsert.push({ user_id: user.id, profile, strategy, ...defaults });
        }
      }
      await supabase.from('investor_portfolios').insert(toInsert).select();
      const { data: all } = await supabase
        .from('investor_portfolios')
        .select('*')
        .or(`user_id.eq.${user.id},shared.eq.true`);
      portfolioList = (all || []) as unknown as InvestorPortfolio[];
    }

    setPortfolios(portfolioList);
    setPortfolioAssets(assetList);
    portfoliosCache = {
      userId: user.id,
      portfolios: portfolioList,
      assets: assetList,
      fetchedAt: Date.now(),
    };
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const c = portfoliosCache;
    const fresh = c && c.userId === user.id && Date.now() - c.fetchedAt < PORTFOLIOS_CACHE_TTL_MS;
    if (fresh) {
      setPortfolios(c!.portfolios);
      setPortfolioAssets(c!.assets);
      setLoading(false);
      return;
    }
    loadPortfolios({ silent: !!c && c.userId === user.id });
  }, [user, loadPortfolios]);

  const refreshPortfolioAssets = async () => {
    if (!user) return;
    const { data: assets } = await supabase
      .from('portfolio_assets')
      .select('*')
      .or(`user_id.eq.${user.id},shared.eq.true`)
      .order('display_order');
    const assetList = (assets || []) as unknown as PortfolioAssetItem[];
    setPortfolioAssets(assetList);
    if (portfoliosCache && portfoliosCache.userId === user.id) {
      portfoliosCache = { ...portfoliosCache, assets: assetList, fetchedAt: Date.now() };
    }
  };


  const updatePortfolio = async (id: string, updates: Partial<InvestorPortfolio>) => {
    await supabase.from('investor_portfolios').update(updates as any).eq('id', id);
    setPortfolios(prev => prev.map(p => p.id === id ? { ...p, ...updates } as InvestorPortfolio : p));
  };

  // Share/unshare a full profile (both strategies)
  const toggleShareProfile = async (profile: string) => {
    const profilePortfolios = portfolios.filter(p => p.profile === profile && p.user_id === user?.id);
    if (profilePortfolios.length === 0) return;
    const allShared = profilePortfolios.every(p => p.shared);
    const newVal = !allShared;

    for (const p of profilePortfolios) {
      await supabase.from('investor_portfolios').update({ shared: newVal } as any).eq('id', p.id);
      // Also share/unshare assets
      const assetIds = portfolioAssets.filter(a => a.portfolio_id === p.id && a.user_id === user?.id).map(a => a.id);
      if (assetIds.length > 0) {
        await supabase.from('portfolio_assets').update({ shared: newVal } as any).in('id', assetIds);
      }
    }

    toast.success(newVal ? `Perfil ${profile} compartilhado!` : `Compartilhamento do perfil ${profile} removido.`);
    await loadPortfolios();
  };

  // Share/unshare a single strategy within a profile
  const toggleShareStrategy = async (portfolioId: string, strategy: string) => {
    const p = portfolios.find(pp => pp.id === portfolioId);
    if (!p || p.user_id !== user?.id) return;
    const newVal = !p.shared;

    await supabase.from('investor_portfolios').update({ shared: newVal } as any).eq('id', portfolioId);
    const assetIds = portfolioAssets.filter(a => a.portfolio_id === portfolioId && a.user_id === user?.id).map(a => a.id);
    if (assetIds.length > 0) {
      await supabase.from('portfolio_assets').update({ shared: newVal } as any).in('id', assetIds);
    }

    toast.success(newVal ? `Estratégia ${strategy} compartilhada!` : `Compartilhamento da estratégia ${strategy} removido.`);
    await loadPortfolios();
  };

  // Build effective assets for a portfolio: Conservador owns assets, others inherit
  const getEffectiveAssets = useCallback((portfolio: InvestorPortfolio): PortfolioAssetItem[] => {
    if (portfolio.profile === 'Conservador') {
      return portfolioAssets.filter(a => a.portfolio_id === portfolio.id);
    }

    const conservador = portfolios.find(
      p => p.profile === 'Conservador' && p.strategy === portfolio.strategy && p.user_id === portfolio.user_id
    );
    if (!conservador) return [];

    const conservadorAssets = portfolioAssets.filter(a => a.portfolio_id === conservador.id);
    const ownAssets = portfolioAssets.filter(a => a.portfolio_id === portfolio.id);

    return conservadorAssets.map(ca => {
      const ownMatch = ownAssets.find(oa =>
        oa.asset_class === ca.asset_class &&
        ((ca.source_asset_id && oa.source_asset_id === ca.source_asset_id) ||
         (!ca.source_asset_id && oa.ticker === ca.ticker && oa.name === ca.name))
      );

      return {
        ...ca,
        allocation_pct: ownMatch ? ownMatch.allocation_pct : ca.allocation_pct,
        id: ownMatch ? ownMatch.id : `virtual-${ca.id}`,
        portfolio_id: portfolio.id,
      };
    });
  }, [portfolios, portfolioAssets]);

  const getConservadorId = useCallback((strategy: string): string | undefined => {
    return portfolios.find(p => p.profile === 'Conservador' && p.strategy === strategy && p.user_id === user?.id)?.id;
  }, [portfolios, user]);

  // Pre-compute FAROL aggregates per profile (memoized — no re-render churn)
  const farolByProfile = useMemo(() => {
    const result: Record<string, { total: number; acoes: number; fiis: number; rendaFixa: number; internacional: number }> = {};
    for (const profile of PROFILES) {
      const own = portfolios.filter(p => p.profile === profile && p.user_id === user?.id);
      const shared = portfolios.filter(p => p.profile === profile && p.user_id !== user?.id && p.shared);
      const list = own.length > 0 ? own : shared;
      result[profile] = list.reduce(
        (acc, p) => {
          const invest = Number(p.invest_amount) || 0;
          acc.total += invest;
          acc.acoes += invest * (Number(p.acoes_pct) || 0) / 100;
          acc.fiis += invest * (Number(p.fiis_pct) || 0) / 100;
          acc.rendaFixa += invest * (Number(p.renda_fixa_pct) || 0) / 100;
          acc.internacional += invest * (Number(p.internacional_pct) || 0) / 100;
          return acc;
        },
        { total: 0, acoes: 0, fiis: 0, rendaFixa: 0, internacional: 0 }
      );
    }
    return result;
  }, [portfolios, user]);

  if (loading) return null;

  // For each profile, determine own portfolios vs shared-from-master
  const getProfilePortfolios = (profile: string) => {
    const own = portfolios.filter(p => p.profile === profile && p.user_id === user?.id);
    const shared = portfolios.filter(p => p.profile === profile && p.user_id !== user?.id && p.shared);
    return { own, shared };
  };

  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center gap-2">
        <Briefcase className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-xl font-semibold text-foreground">Portfólios</h2>
          <p className="text-sm text-muted-foreground">Configure as alocações por perfil e estratégia</p>
        </div>
      </div>

      <Tabs value={activeProfile} onValueChange={setActiveProfile}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          {PROFILES.map(p => (
            <TabsTrigger key={p} value={p}>{p}</TabsTrigger>
          ))}
          <TabsTrigger value="cliente">Portfólio do Cliente</TabsTrigger>
        </TabsList>

        {PROFILES.map(profile => {
          const { own, shared } = getProfilePortfolios(profile);
          const profileShared = own.length > 0 && own.every(p => p.shared);
          const hasSharedFromMaster = shared.length > 0;
          const farolAgg = farolByProfile[profile] ?? { total: 0, acoes: 0, fiis: 0, rendaFixa: 0, internacional: 0 };

          return (
            <TabsContent key={profile} value={profile} className="space-y-6 mt-4">
              {/* Profile-level share button (master only) */}
              {isMaster && own.length > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">{profile}</h3>
                  </div>
                  <Button
                    variant={profileShared ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => toggleShareProfile(profile)}
                  >
                    <Share2 className="w-3.5 h-3.5 mr-1.5" />
                    {profileShared ? `${profile} Compartilhado` : `Compartilhar ${profile}`}
                  </Button>
                </div>
              )}

              {/* FAROL — Donut overview */}
              <FarolDonut
                title={profile}
                acoes={farolAgg.acoes}
                fiis={farolAgg.fiis}
                rendaFixa={farolAgg.rendaFixa}
                internacional={farolAgg.internacional}
                total={farolAgg.total}
              />

              {/* Own portfolios */}
              {STRATEGIES.map(strategy => {
                const portfolio = own.find(p => p.strategy === strategy);
                if (!portfolio) return null;
                const isConservador = profile === 'Conservador';
                const effectiveAssets = getEffectiveAssets(portfolio);
                const conservadorPortfolioId = isConservador ? undefined : getConservadorId(strategy);
                const collapsed = isStrategyCollapsed(profile, strategy);
                return (
                  <div key={portfolio.id} className="border border-border rounded-lg overflow-hidden bg-card">
                    <button
                      type="button"
                      onClick={() => toggleStrategyCollapse(profile, strategy)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                      aria-expanded={!collapsed}
                    >
                      <div className="flex items-center gap-2">
                        {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        <span className="text-base font-semibold text-foreground">{strategy}</span>
                        {portfolio.shared && <SharedBadge />}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {collapsed ? 'Clique para expandir' : 'Clique para recolher'}
                      </span>
                    </button>
                    {!collapsed && (
                      <div className="border-t border-border p-3 animate-fade-in">
                        <PortfolioStrategyView
                          portfolio={portfolio}
                          assets={effectiveAssets}
                          recommendedAssets={recommendedAssets}
                          portfolioNameMap={portfolioNameMap}
                          portfolioSlugMap={portfolioSlugMap}
                          onUpdatePortfolio={updatePortfolio}
                          onRefreshAssets={refreshPortfolioAssets}
                          isConservador={isConservador}
                          conservadorPortfolioId={conservadorPortfolioId}
                          isMaster={isMaster}
                          isOwnPortfolio={true}
                          onToggleShareStrategy={() => toggleShareStrategy(portfolio.id, strategy)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Shared from master (read-only) */}
              {hasSharedFromMaster && !isMaster && (
                <>
                  {STRATEGIES.map(strategy => {
                    const sharedPortfolio = shared.find(p => p.strategy === strategy);
                    if (!sharedPortfolio) return null;
                    const effectiveAssets = getEffectiveAssets(sharedPortfolio);
                    const collapsed = isStrategyCollapsed(profile, `shared-${strategy}`);
                    return (
                      <div key={`shared-${sharedPortfolio.id}`} className="border border-border rounded-lg overflow-hidden bg-card">
                        <button
                          type="button"
                          onClick={() => toggleStrategyCollapse(profile, `shared-${strategy}`)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                          aria-expanded={!collapsed}
                        >
                          <div className="flex items-center gap-2">
                            {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            <span className="text-base font-semibold text-foreground">{strategy}</span>
                            <SharedBadge />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {collapsed ? 'Clique para expandir' : 'Clique para recolher'}
                          </span>
                        </button>
                        {!collapsed && (
                          <div className="border-t border-border p-3 animate-fade-in">
                            <PortfolioStrategyView
                              portfolio={sharedPortfolio}
                              assets={effectiveAssets}
                              recommendedAssets={recommendedAssets}
                              portfolioNameMap={portfolioNameMap}
                              portfolioSlugMap={portfolioSlugMap}
                              onUpdatePortfolio={async () => {}}
                              onRefreshAssets={async () => {}}
                              isConservador={false}
                              readOnly={true}
                              isMaster={false}
                              isOwnPortfolio={false}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </TabsContent>
          );
        })}

        <TabsContent value="cliente" className="mt-4">
          <ClientPortfolioTab
            portfolios={portfolios}
            portfolioAssets={portfolioAssets}
            recommendedAssets={recommendedAssets}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getDefaultAllocations(profile: string, strategy: string) {
  if (profile === 'Conservador' && strategy === 'Renda') {
    return { acoes_pct: 7, fiis_pct: 8, internacional_pct: 5, renda_fixa_pct: 80, rf_pos_pct: 50, rf_pre_pct: 10, rf_ipca_pct: 20 };
  }
  if (profile === 'Conservador' && strategy === 'Crescimento') {
    return { acoes_pct: 15, fiis_pct: 10, internacional_pct: 5, renda_fixa_pct: 70, rf_pos_pct: 40, rf_pre_pct: 10, rf_ipca_pct: 20 };
  }
  if (profile === 'Moderado' && strategy === 'Renda') {
    return { acoes_pct: 15, fiis_pct: 15, internacional_pct: 10, renda_fixa_pct: 60, rf_pos_pct: 30, rf_pre_pct: 10, rf_ipca_pct: 20 };
  }
  if (profile === 'Moderado' && strategy === 'Crescimento') {
    return { acoes_pct: 25, fiis_pct: 15, internacional_pct: 10, renda_fixa_pct: 50, rf_pos_pct: 25, rf_pre_pct: 10, rf_ipca_pct: 15 };
  }
  if (profile === 'Arrojado' && strategy === 'Renda') {
    return { acoes_pct: 25, fiis_pct: 20, internacional_pct: 15, renda_fixa_pct: 40, rf_pos_pct: 20, rf_pre_pct: 10, rf_ipca_pct: 10 };
  }
  // Arrojado + Crescimento
  return { acoes_pct: 35, fiis_pct: 15, internacional_pct: 20, renda_fixa_pct: 30, rf_pos_pct: 15, rf_pre_pct: 5, rf_ipca_pct: 10 };
}
