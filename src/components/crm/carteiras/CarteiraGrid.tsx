import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SharedBadge } from '@/components/ui/shared-badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3, Calendar, Share2, Plus } from 'lucide-react';
import { RecommendedPortfolio, PortfolioAsset } from './CarteirasRecomendadas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  portfolios: RecommendedPortfolio[];
  allAssets: PortfolioAsset[];
  onSelect: (p: RecommendedPortfolio) => void;
  isMaster?: boolean;
  userId?: string;
  onPortfolioCreated?: () => void | Promise<void>;
}

export function CarteiraGrid({ portfolios, allAssets, onSelect, isMaster, userId }: Props) {

  const toggleShare = async (e: React.MouseEvent, portfolio: RecommendedPortfolio) => {
    e.stopPropagation();
    const newVal = !(portfolio as any).shared;
    await supabase.from('recommended_portfolios').update({ shared: newVal } as any).eq('id', portfolio.id);
    // Also share/unshare all assets in this portfolio
    const assetIds = allAssets.filter(a => a.portfolio_id === portfolio.id).map(a => a.id);
    if (assetIds.length > 0) {
      await supabase.from('recommended_portfolio_assets').update({ shared: newVal } as any).in('id', assetIds);
    }
    toast.success(newVal ? 'Carteira compartilhada!' : 'Compartilhamento removido.');
    // Force page reload to refresh
    window.location.reload();
  };
  const getPortfolioStats = (portfolioId: string) => {
    const assets = allAssets.filter(a => a.portfolio_id === portfolioId);
    const totalAssets = assets.length;

    const buyCount = assets.filter(a => {
      const bias = a.manual_bias || (a.current_price !== null && a.current_price < a.ceiling_price ? 'Comprar' : 'Aguardar');
      return bias === 'Comprar';
    }).length;
    const waitCount = totalAssets - buyCount;

    const lastUpdated = assets.length > 0
      ? assets.reduce((max, a) => a.updated_at > max ? a.updated_at : max, assets[0].updated_at)
      : null;

    return { totalAssets, buyCount, waitCount, lastUpdated };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">Carteiras Recomendadas</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {portfolios.map(portfolio => {
          const stats = getPortfolioStats(portfolio.id);
          const isShared = (portfolio as any).shared;
          const isOwnPortfolio = portfolio.user_id === userId;

          return (
            <Card
              key={portfolio.id}
              className="cursor-pointer hover:shadow-md transition-all border-border hover:border-primary/30"
              onClick={() => onSelect(portfolio)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  {portfolio.name}
                  <div className="flex items-center gap-1">
                    {isShared && !isOwnPortfolio && <SharedBadge />}
                    <Badge variant="outline" className="text-xs">
                      {stats.totalAssets} ativos
                    </Badge>
                  </div>
                </CardTitle>
                {portfolio.description && (
                  <p className="text-xs text-muted-foreground">{portfolio.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Comprar: {stats.buyCount}
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    Aguardar: {stats.waitCount}
                  </span>
                </div>

                {stats.lastUpdated && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    Atualizado em {format(new Date(stats.lastUpdated), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                )}

                {isMaster && isOwnPortfolio && (
                  <Button
                    variant={isShared ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs h-7 w-full"
                    onClick={(e) => toggleShare(e, portfolio)}
                  >
                    <Share2 className="w-3 h-3 mr-1" />
                    {isShared ? 'Compartilhado' : 'Compartilhar'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
