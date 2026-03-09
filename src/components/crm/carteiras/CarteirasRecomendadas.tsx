import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { CarteiraGrid } from './CarteiraGrid';
import { CarteiraDetail } from './CarteiraDetail';

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
  created_at: string;
  updated_at: string;
}

const DEFAULT_PORTFOLIOS = [
  { name: 'Small Caps', slug: 'small-caps', display_order: 0 },
  { name: 'Valor', slug: 'valor', display_order: 1 },
  { name: 'Dividendos', slug: 'dividendos', display_order: 2 },
  { name: 'FIIs', slug: 'fiis', display_order: 3 },
  { name: 'Internacional', slug: 'internacional', display_order: 4 },
];

export function CarteirasRecomendadas() {
  const { user } = useAuth();
  const [portfolios, setPortfolios] = useState<RecommendedPortfolio[]>([]);
  const [allAssets, setAllAssets] = useState<PortfolioAsset[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<RecommendedPortfolio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    // Load portfolios
    const { data: existingPortfolios } = await supabase
      .from('recommended_portfolios')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order');

    let portfolioList = (existingPortfolios || []) as unknown as RecommendedPortfolio[];

    // Seed defaults if none exist
    if (portfolioList.length === 0) {
      const toInsert = DEFAULT_PORTFOLIOS.map(p => ({
        ...p,
        user_id: user.id,
        description: '',
      }));
      const { data: inserted } = await supabase
        .from('recommended_portfolios')
        .insert(toInsert)
        .select();
      portfolioList = (inserted || []) as unknown as RecommendedPortfolio[];
    }

    setPortfolios(portfolioList);

    // Load all assets
    const { data: assets } = await supabase
      .from('recommended_portfolio_assets')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order');

    setAllAssets((assets || []) as unknown as PortfolioAsset[]);
    setLoading(false);
  };

  const refreshAssets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('recommended_portfolio_assets')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order');
    setAllAssets((data || []) as unknown as PortfolioAsset[]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (selectedPortfolio) {
    return (
      <CarteiraDetail
        portfolio={selectedPortfolio}
        assets={allAssets.filter(a => a.portfolio_id === selectedPortfolio.id)}
        onBack={() => setSelectedPortfolio(null)}
        onRefresh={refreshAssets}
      />
    );
  }

  return (
    <CarteiraGrid
      portfolios={portfolios}
      allAssets={allAssets}
      onSelect={setSelectedPortfolio}
    />
  );
}
