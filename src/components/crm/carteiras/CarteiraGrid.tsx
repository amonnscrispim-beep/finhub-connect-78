import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, BarChart3, Calendar } from 'lucide-react';
import { RecommendedPortfolio, PortfolioAsset } from './CarteirasRecomendadas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  portfolios: RecommendedPortfolio[];
  allAssets: PortfolioAsset[];
  onSelect: (p: RecommendedPortfolio) => void;
}

export function CarteiraGrid({ portfolios, allAssets, onSelect }: Props) {
  const getPortfolioStats = (portfolioId: string) => {
    const assets = allAssets.filter(a => a.portfolio_id === portfolioId);
    const totalAssets = assets.length;
    
    const buyCount = assets.filter(a => {
      if (!a.current_price) return false;
      return a.current_price < a.ceiling_price;
    }).length;
    const waitCount = totalAssets - buyCount;

    // Weighted avg return
    let totalReturn = 0;
    let totalAlloc = 0;
    assets.forEach(a => {
      if (a.current_price && a.entry_price > 0) {
        const ret = ((a.current_price - a.entry_price) / a.entry_price) * 100;
        totalReturn += ret * a.allocation_pct;
        totalAlloc += a.allocation_pct;
      }
    });
    const avgReturn = totalAlloc > 0 ? totalReturn / totalAlloc : 0;

    const lastUpdated = assets.length > 0
      ? assets.reduce((max, a) => a.updated_at > max ? a.updated_at : max, assets[0].updated_at)
      : null;

    return { totalAssets, buyCount, waitCount, avgReturn, lastUpdated };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">Carteiras Recomendadas</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {portfolios.map(portfolio => {
          const stats = getPortfolioStats(portfolio.id);
          const isPositive = stats.avgReturn >= 0;

          return (
            <Card
              key={portfolio.id}
              className="cursor-pointer hover:shadow-md transition-all border-border hover:border-primary/30"
              onClick={() => onSelect(portfolio)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  {portfolio.name}
                  <Badge variant="outline" className="text-xs">
                    {stats.totalAssets} ativos
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-emerald-600 font-medium">
                    Comprar: {stats.buyCount}
                  </span>
                  <span className="text-amber-600 font-medium">
                    Aguardar: {stats.waitCount}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isPositive ? (
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  )}
                  <span className={`text-lg font-bold ${isPositive ? 'text-emerald-600' : 'text-destructive'}`}>
                    {stats.avgReturn.toFixed(2)}%
                  </span>
                  <span className="text-xs text-muted-foreground">rentabilidade</span>
                </div>

                {stats.lastUpdated && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    Atualizado em {format(new Date(stats.lastUpdated), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
