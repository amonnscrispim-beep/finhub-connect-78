import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase } from 'lucide-react';
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
  created_at: string;
  updated_at: string;
}

interface Props {
  recommendedAssets: PortfolioAsset[];
  portfolioNameMap: Record<string, string>;
}

export function PortfoliosSection({ recommendedAssets, portfolioNameMap }: Props) {
  const { user } = useAuth();
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
      .eq('user_id', user.id);

    let portfolioList = (existing || []) as unknown as InvestorPortfolio[];

    // Seed all 6 combos if none exist
    if (portfolioList.length === 0) {
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
      portfolioList = (inserted || []) as unknown as InvestorPortfolio[];
    }

    setPortfolios(portfolioList);

    // Load all assets
    const portfolioIds = portfolioList.map(p => p.id);
    if (portfolioIds.length > 0) {
      const { data: assets } = await supabase
        .from('portfolio_assets')
        .select('*')
        .in('portfolio_id', portfolioIds)
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
    const portfolioIds = portfolios.map(p => p.id);
    if (portfolioIds.length > 0) {
      const { data: assets } = await supabase
        .from('portfolio_assets')
        .select('*')
        .in('portfolio_id', portfolioIds)
        .order('display_order');
      setPortfolioAssets((assets || []) as unknown as PortfolioAssetItem[]);
    }
  };

  const updatePortfolio = async (id: string, updates: Partial<InvestorPortfolio>) => {
    await supabase.from('investor_portfolios').update(updates as any).eq('id', id);
    setPortfolios(prev => prev.map(p => p.id === id ? { ...p, ...updates } as InvestorPortfolio : p));
  };

  if (loading) return null;

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

        {PROFILES.map(profile => (
          <TabsContent key={profile} value={profile} className="space-y-6 mt-4">
            {STRATEGIES.map(strategy => {
              const portfolio = portfolios.find(p => p.profile === profile && p.strategy === strategy);
              if (!portfolio) return null;
              const assets = portfolioAssets.filter(a => a.portfolio_id === portfolio.id);
              return (
                <PortfolioStrategyView
                  key={portfolio.id}
                  portfolio={portfolio}
                  assets={assets}
                  recommendedAssets={recommendedAssets}
                  portfolioNameMap={portfolioNameMap}
                  onUpdatePortfolio={updatePortfolio}
                  onRefreshAssets={refreshPortfolioAssets}
                />
              );
            })}
          </TabsContent>
        ))}
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
