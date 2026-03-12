import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMaster } from '@/hooks/useIsMaster';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SharedBadge } from '@/components/ui/shared-badge';
import { Briefcase, Share2 } from 'lucide-react';
import { PortfolioStrategyView } from './PortfolioStrategyView';
import { PortfolioAsset } from '../CarteirasRecomendadas';

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
}

export function PortfoliosSection({ recommendedAssets, portfolioNameMap }: Props) {
  const { user } = useAuth();
  const isMaster = useIsMaster();
  const [portfolios, setPortfolios] = useState<InvestorPortfolio[]>([]);
  const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAssetItem[]>([]);
  const [activeProfile, setActiveProfile] = useState<string>('Conservador');
  const [loading, setLoading] = useState(true);

  const loadPortfolios = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: existing } = await supabase
      .from('investor_portfolios')
      .select('*')
      .or(`user_id.eq.${user.id},shared.eq.true`);

    let portfolioList = (existing || []) as unknown as InvestorPortfolio[];

    // Only seed if the user has NO own portfolios
    const ownPortfolios = portfolioList.filter(p => p.user_id === user.id);
    if (ownPortfolios.length === 0) {
      const toInsert: any[] = [];
      for (const profile of PROFILES) {
        for (const strategy of STRATEGIES) {
          const defaults = getDefaultAllocations(profile, strategy);
          toInsert.push({
            user_id: user.id,
            profile,
            strategy,
            ...defaults,
          });
        }
      }
      const { data: inserted } = await supabase
        .from('investor_portfolios')
        .insert(toInsert)
        .select();
      // Re-fetch to include shared ones too
      const { data: all } = await supabase
        .from('investor_portfolios')
        .select('*')
        .or(`user_id.eq.${user.id},shared.eq.true`);
      portfolioList = (all || []) as unknown as InvestorPortfolio[];
    }

    setPortfolios(portfolioList);

    const portfolioIds = portfolioList.map(p => p.id);
    if (portfolioIds.length > 0) {
      const { data: assets } = await supabase
        .from('portfolio_assets')
        .select('*')
        .or(`user_id.eq.${user.id},shared.eq.true`)
        .order('display_order');
      setPortfolioAssets((assets || []) as unknown as PortfolioAssetItem[]);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadPortfolios();
  }, [loadPortfolios]);

  const refreshPortfolioAssets = async () => {
    if (!user) return;
    const { data: assets } = await supabase
      .from('portfolio_assets')
      .select('*')
      .or(`user_id.eq.${user.id},shared.eq.true`)
      .order('display_order');
    setPortfolioAssets((assets || []) as unknown as PortfolioAssetItem[]);
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
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          {PROFILES.map(p => (
            <TabsTrigger key={p} value={p}>{p}</TabsTrigger>
          ))}
        </TabsList>

        {PROFILES.map(profile => {
          const { own, shared } = getProfilePortfolios(profile);
          const profileShared = own.length > 0 && own.every(p => p.shared);
          const hasSharedFromMaster = shared.length > 0;

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

              {/* Own portfolios */}
              {STRATEGIES.map(strategy => {
                const portfolio = own.find(p => p.strategy === strategy);
                if (!portfolio) return null;
                const isConservador = profile === 'Conservador';
                const effectiveAssets = getEffectiveAssets(portfolio);
                const conservadorPortfolioId = isConservador ? undefined : getConservadorId(strategy);
                return (
                  <PortfolioStrategyView
                    key={portfolio.id}
                    portfolio={portfolio}
                    assets={effectiveAssets}
                    recommendedAssets={recommendedAssets}
                    portfolioNameMap={portfolioNameMap}
                    onUpdatePortfolio={updatePortfolio}
                    onRefreshAssets={refreshPortfolioAssets}
                    isConservador={isConservador}
                    conservadorPortfolioId={conservadorPortfolioId}
                    isMaster={isMaster}
                    isOwnPortfolio={true}
                    onToggleShareStrategy={() => toggleShareStrategy(portfolio.id, strategy)}
                  />
                );
              })}

              {/* Shared from master (read-only) */}
              {hasSharedFromMaster && !isMaster && (
                <>
                  {STRATEGIES.map(strategy => {
                    const sharedPortfolio = shared.find(p => p.strategy === strategy);
                    if (!sharedPortfolio) return null;
                    const effectiveAssets = getEffectiveAssets(sharedPortfolio);
                    return (
                      <PortfolioStrategyView
                        key={`shared-${sharedPortfolio.id}`}
                        portfolio={sharedPortfolio}
                        assets={effectiveAssets}
                        recommendedAssets={recommendedAssets}
                        portfolioNameMap={portfolioNameMap}
                        onUpdatePortfolio={async () => {}}
                        onRefreshAssets={async () => {}}
                        isConservador={false}
                        readOnly={true}
                        isMaster={false}
                        isOwnPortfolio={false}
                      />
                    );
                  })}
                </>
              )}
            </TabsContent>
          );
        })}
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
