import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMaster } from '@/hooks/useIsMaster';
import { Loader2 } from 'lucide-react';
import { CarteiraGrid } from './CarteiraGrid';
import { CarteiraDetail } from './CarteiraDetail';
import { PortfoliosSection } from './portfolios/PortfoliosSection';
import { useCarteiras } from '@/contexts/CarteirasContext';

export interface RecommendedPortfolio {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string;
  display_order: number;
  created_at: string;
  updated_at: string;
  shared?: boolean;
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

export function CarteirasRecomendadas() {
  const { user } = useAuth();
  const isMaster = useIsMaster();
  const { portfolios, allAssets, loaded, loading, refresh, setAllAssets } = useCarteiras();
  const [selectedPortfolio, setSelectedPortfolio] = useState<RecommendedPortfolio | null>(null);

  const refreshAssets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('recommended_portfolio_assets')
      .select('*')
      .or(`user_id.eq.${user.id},shared.eq.true`)
      .order('display_order');
    setAllAssets((data || []) as unknown as PortfolioAsset[]);
  };

  // Show spinner ONLY on first load (no cached data yet).
  if (!loaded && loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!loaded) return null;

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
      <PortfoliosSection recommendedAssets={allAssets} portfolioNameMap={Object.fromEntries(portfolios.map(p => [p.id, p.name]))} />
    </div>
  );
}
