import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  BarChart3,
  Globe,
  Newspaper,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Simulated market data (in production, this would come from a real API)
const generateMarketData = () => {
  return {
    // Economic indicators
    selic: {
      current: 11.75,
      daily: 0,
      monthly: -0.25,
      annual: -0.75,
    },
    cdi: {
      current: 11.65,
      daily: 0,
      monthly: -0.25,
      annual: -0.70,
    },
    ipca: {
      current: 4.62,
      daily: 0,
      monthly: 0.38,
      annual: 4.62,
    },
    // Market indices
    ibovespa: {
      value: 128456,
      change: 0.85,
      trend: 'up' as const,
    },
    sp500: {
      value: 4892.37,
      change: 0.42,
      trend: 'up' as const,
    },
    nasdaq: {
      value: 15628.95,
      change: -0.23,
      trend: 'down' as const,
    },
    dolar: {
      value: 4.89,
      change: -0.15,
      trend: 'down' as const,
    },
    // Top movers
    topGainers: [
      { ticker: 'MGLU3', name: 'Magazine Luiza', change: 8.45 },
      { ticker: 'VIIA3', name: 'Via', change: 6.23 },
      { ticker: 'BHIA3', name: 'Casas Bahia', change: 5.87 },
      { ticker: 'PETZ3', name: 'Petz', change: 4.56 },
      { ticker: 'AZUL4', name: 'Azul', change: 3.92 },
    ],
    topLosers: [
      { ticker: 'CVCB3', name: 'CVC Brasil', change: -4.23 },
      { ticker: 'GOLL4', name: 'Gol', change: -3.87 },
      { ticker: 'COGN3', name: 'Cogna', change: -3.12 },
      { ticker: 'YDUQ3', name: 'Yduqs', change: -2.89 },
      { ticker: 'RENT3', name: 'Localiza', change: -2.34 },
    ],
    // News
    news: [
      {
        title: 'Copom mantém Selic em 11,75% e sinaliza cortes graduais',
        source: 'Valor Econômico',
        time: '2h atrás',
        category: 'Política Monetária',
      },
      {
        title: 'Fed indica possível início de corte de juros no segundo semestre',
        source: 'Bloomberg',
        time: '4h atrás',
        category: 'Internacional',
      },
      {
        title: 'IPCA desacelera e reforça expectativa de queda na Selic',
        source: 'Infomoney',
        time: '6h atrás',
        category: 'Inflação',
      },
      {
        title: 'Ibovespa renova máxima histórica com fluxo estrangeiro',
        source: 'Estadão',
        time: '8h atrás',
        category: 'Mercados',
      },
    ],
    lastUpdate: new Date(),
  };
};

export function DashboardMarket() {
  const [marketData, setMarketData] = useState(generateMarketData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setMarketData(generateMarketData());
      setIsRefreshing(false);
    }, 1000);
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-success';
    if (value < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const getChangeBg = (value: number) => {
    if (value > 0) return 'bg-success/10';
    if (value < 0) return 'bg-destructive/10';
    return 'bg-muted/10';
  };

  const formatChange = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Mercado Financeiro</h2>
          <p className="text-sm text-muted-foreground">
            Atualizado em: {format(marketData.lastUpdate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <RefreshCw className={`w-5 h-5 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Economic Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* SELIC */}
        <div className="crm-card p-5 border-l-4 border-l-primary">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Percent className="w-4 h-4 text-primary" />
              </div>
              <span className="font-semibold text-foreground">SELIC</span>
            </div>
            <span className="text-2xl font-bold text-primary">{marketData.selic.current}%</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 rounded bg-muted/50">
              <p className="text-muted-foreground">Dia</p>
              <p className={getChangeColor(marketData.selic.daily)}>{formatChange(marketData.selic.daily)}</p>
            </div>
            <div className="text-center p-2 rounded bg-muted/50">
              <p className="text-muted-foreground">Mês</p>
              <p className={getChangeColor(marketData.selic.monthly)}>{formatChange(marketData.selic.monthly)}</p>
            </div>
            <div className="text-center p-2 rounded bg-muted/50">
              <p className="text-muted-foreground">Ano</p>
              <p className={getChangeColor(marketData.selic.annual)}>{formatChange(marketData.selic.annual)}</p>
            </div>
          </div>
        </div>

        {/* CDI */}
        <div className="crm-card p-5 border-l-4 border-l-accent">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-accent/10">
                <BarChart3 className="w-4 h-4 text-accent" />
              </div>
              <span className="font-semibold text-foreground">CDI</span>
            </div>
            <span className="text-2xl font-bold text-accent">{marketData.cdi.current}%</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 rounded bg-muted/50">
              <p className="text-muted-foreground">Dia</p>
              <p className={getChangeColor(marketData.cdi.daily)}>{formatChange(marketData.cdi.daily)}</p>
            </div>
            <div className="text-center p-2 rounded bg-muted/50">
              <p className="text-muted-foreground">Mês</p>
              <p className={getChangeColor(marketData.cdi.monthly)}>{formatChange(marketData.cdi.monthly)}</p>
            </div>
            <div className="text-center p-2 rounded bg-muted/50">
              <p className="text-muted-foreground">Ano</p>
              <p className={getChangeColor(marketData.cdi.annual)}>{formatChange(marketData.cdi.annual)}</p>
            </div>
          </div>
        </div>

        {/* IPCA */}
        <div className="crm-card p-5 border-l-4 border-l-warning">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-warning/10">
                <TrendingUp className="w-4 h-4 text-warning" />
              </div>
              <span className="font-semibold text-foreground">IPCA</span>
            </div>
            <span className="text-2xl font-bold text-warning">{marketData.ipca.current}%</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 rounded bg-muted/50">
              <p className="text-muted-foreground">Dia</p>
              <p className={getChangeColor(marketData.ipca.daily)}>{formatChange(marketData.ipca.daily)}</p>
            </div>
            <div className="text-center p-2 rounded bg-muted/50">
              <p className="text-muted-foreground">Mês</p>
              <p className={getChangeColor(marketData.ipca.monthly)}>{formatChange(marketData.ipca.monthly)}</p>
            </div>
            <div className="text-center p-2 rounded bg-muted/50">
              <p className="text-muted-foreground">Ano</p>
              <p className={getChangeColor(marketData.ipca.annual)}>{formatChange(marketData.ipca.annual)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Market Indices */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ibovespa */}
        <div className={`crm-card p-5 ${getChangeBg(marketData.ibovespa.change)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">IBOVESPA</span>
            {marketData.ibovespa.trend === 'up' ? (
              <ArrowUp className="w-4 h-4 text-success" />
            ) : (
              <ArrowDown className="w-4 h-4 text-destructive" />
            )}
          </div>
          <p className="text-xl font-bold text-foreground">{marketData.ibovespa.value.toLocaleString('pt-BR')}</p>
          <p className={`text-sm font-medium ${getChangeColor(marketData.ibovespa.change)}`}>
            {formatChange(marketData.ibovespa.change)}
          </p>
        </div>

        {/* S&P 500 */}
        <div className={`crm-card p-5 ${getChangeBg(marketData.sp500.change)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">S&P 500</span>
            {marketData.sp500.trend === 'up' ? (
              <ArrowUp className="w-4 h-4 text-success" />
            ) : (
              <ArrowDown className="w-4 h-4 text-destructive" />
            )}
          </div>
          <p className="text-xl font-bold text-foreground">{marketData.sp500.value.toLocaleString('en-US')}</p>
          <p className={`text-sm font-medium ${getChangeColor(marketData.sp500.change)}`}>
            {formatChange(marketData.sp500.change)}
          </p>
        </div>

        {/* Nasdaq */}
        <div className={`crm-card p-5 ${getChangeBg(marketData.nasdaq.change)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">NASDAQ</span>
            {marketData.nasdaq.change >= 0 ? (
              <ArrowUp className="w-4 h-4 text-success" />
            ) : (
              <ArrowDown className="w-4 h-4 text-destructive" />
            )}
          </div>
          <p className="text-xl font-bold text-foreground">{marketData.nasdaq.value.toLocaleString('en-US')}</p>
          <p className={`text-sm font-medium ${getChangeColor(marketData.nasdaq.change)}`}>
            {formatChange(marketData.nasdaq.change)}
          </p>
        </div>

        {/* Dollar */}
        <div className={`crm-card p-5 ${getChangeBg(marketData.dolar.change)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">DÓLAR</span>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-xl font-bold text-foreground">R$ {marketData.dolar.value.toFixed(2)}</p>
          <p className={`text-sm font-medium ${getChangeColor(marketData.dolar.change)}`}>
            {formatChange(marketData.dolar.change)}
          </p>
        </div>
      </div>

      {/* Top Movers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Gainers */}
        <div className="crm-card p-5">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-success" />
            Maiores Altas do Dia
          </h3>
          <div className="space-y-2">
            {marketData.topGainers.map((stock, index) => (
              <div key={stock.ticker} className="flex items-center justify-between p-3 rounded-lg bg-success/5 hover:bg-success/10 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
                  <div>
                    <p className="font-medium text-foreground">{stock.ticker}</p>
                    <p className="text-xs text-muted-foreground">{stock.name}</p>
                  </div>
                </div>
                <span className="font-bold text-success">+{stock.change.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Losers */}
        <div className="crm-card p-5">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-destructive" />
            Maiores Baixas do Dia
          </h3>
          <div className="space-y-2">
            {marketData.topLosers.map((stock, index) => (
              <div key={stock.ticker} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 hover:bg-destructive/10 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
                  <div>
                    <p className="font-medium text-foreground">{stock.ticker}</p>
                    <p className="text-xs text-muted-foreground">{stock.name}</p>
                  </div>
                </div>
                <span className="font-bold text-destructive">{stock.change.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Financial News */}
      <div className="crm-card p-5">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-primary" />
          Notícias Relevantes
        </h3>
        <div className="space-y-3">
          {marketData.news.map((item, index) => (
            <div key={index} className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border-l-4 border-l-primary">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {item.category}
                  </span>
                  <h4 className="font-medium text-foreground mt-2">{item.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.source} • {item.time}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
