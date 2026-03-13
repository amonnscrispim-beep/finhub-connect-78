import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Lightbulb, Users } from 'lucide-react';
import { ReadequacaoModal } from './ReadequacaoModal';
import type { InvestorPortfolio, PortfolioAssetItem } from './PortfoliosSection';
import type { PortfolioAsset } from '../CarteirasRecomendadas';

interface ClientOption {
  id: string;
  name: string;
}

export interface ClientPosition {
  ativo: string;
  tipo: string;
  broker: string;
  qty: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  pnlR$: number;
  pnlPct: number;
  assetClass: 'renda_fixa' | 'acoes' | 'fiis' | 'fundos' | 'outros';
  vencimento: string | null;
}

interface Props {
  portfolios: InvestorPortfolio[];
  portfolioAssets: PortfolioAssetItem[];
  recommendedAssets: PortfolioAsset[];
}

const BROKER_COLORS: Record<string, string> = {
  'BTG': 'bg-blue-100 text-blue-700 border-blue-300',
  'XP': 'bg-yellow-100 text-yellow-700 border-yellow-300',
  'Itaú': 'bg-orange-100 text-orange-700 border-orange-300',
  'Rico': 'bg-purple-100 text-purple-700 border-purple-300',
  'Clear': 'bg-green-100 text-green-700 border-green-300',
  'Nubank': 'bg-violet-100 text-violet-700 border-violet-300',
};

function getBrokerColor(broker: string): string {
  return BROKER_COLORS[broker] || 'bg-muted text-muted-foreground border-muted-foreground/30';
}

function classifyAsset(tipo: string | null, ativo: string | null): ClientPosition['assetClass'] {
  const t = (tipo || '').toLowerCase();
  const a = (ativo || '').toLowerCase();
  if (t.includes('fii') || t.includes('fundo imobiliário') || a.includes('11') && a.length <= 8) return 'fiis';
  if (t.includes('ação') || t.includes('acoes') || t.includes('renda variável') || (a.match(/^[A-Z]{4}\d{1,2}$/) && !a.includes('11'))) return 'acoes';
  if (t.includes('renda fixa') || t.includes('cdb') || t.includes('lci') || t.includes('lca') || t.includes('tesouro') || t.includes('debenture')) return 'renda_fixa';
  if (t.includes('fundo') || t.includes('multimercado') || t.includes('cambial')) return 'fundos';
  return 'outros';
}

const CLASS_LABELS: Record<string, string> = {
  'renda_fixa': 'Renda Fixa',
  'acoes': 'Ações',
  'fiis': 'Fundos Imobiliários',
  'fundos': 'Fundos de Investimento',
  'outros': 'Outros',
};

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ClientPortfolioTab({ portfolios, portfolioAssets, recommendedAssets }: Props) {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [positions, setPositions] = useState<ClientPosition[]>([]);
  const [brokers, setBrokers] = useState<string[]>([]);
  const [selectedBrokers, setSelectedBrokers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [readequacaoOpen, setReadequacaoOpen] = useState(false);

  // Load clients list
  useEffect(() => {
    if (!user) return;
    supabase
      .from('clients')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name')
      .then(({ data }) => {
        setClients((data || []) as ClientOption[]);
      });
  }, [user]);

  // Load positions when client changes
  useEffect(() => {
    if (!selectedClientId || !user) {
      setPositions([]);
      setBrokers([]);
      setSelectedBrokers(new Set());
      return;
    }
    loadPositions();
  }, [selectedClientId, user]);

  const loadPositions = async () => {
    if (!user || !selectedClientId) return;
    setLoading(true);

    // Get performance reports for this client
    const { data: reports } = await supabase
      .from('performance_reports')
      .select('id, corretora, broker')
      .eq('client_id', selectedClientId)
      .eq('user_id', user.id);

    if (!reports || reports.length === 0) {
      setPositions([]);
      setBrokers([]);
      setSelectedBrokers(new Set());
      setLoading(false);
      return;
    }

    const reportIds = reports.map(r => r.id);
    const brokerMap: Record<string, string> = {};
    reports.forEach(r => {
      brokerMap[r.id] = r.corretora || r.broker || 'Outro';
    });

    // Get all positions
    const { data: posData } = await supabase
      .from('performance_positions')
      .select('*')
      .in('report_id', reportIds);

    const parsed: ClientPosition[] = (posData || []).map((p: any) => {
      const broker = brokerMap[p.report_id] || 'Outro';
      const valor = Number(p.valor) || 0;
      const qty = 1; // positions may not have qty, use value-based
      const avgPrice = 0;
      const currentPrice = valor;
      const assetClass = classifyAsset(p.tipo, p.ativo);

      return {
        ativo: p.ativo || 'N/A',
        tipo: p.tipo || '',
        broker,
        qty,
        avgPrice,
        currentPrice,
        totalValue: valor,
        pnlR$: 0,
        pnlPct: 0,
        assetClass,
        vencimento: p.vencimento || null,
      };
    });

    // Consolidate duplicates per broker
    const consolidatedMap = new Map<string, ClientPosition>();
    parsed.forEach(p => {
      const key = `${p.ativo}|${p.broker}`;
      const existing = consolidatedMap.get(key);
      if (existing) {
        existing.totalValue += p.totalValue;
      } else {
        consolidatedMap.set(key, { ...p });
      }
    });

    const allPositions = Array.from(consolidatedMap.values());
    const uniqueBrokers = [...new Set(allPositions.map(p => p.broker))].sort();

    setPositions(allPositions);
    setBrokers(uniqueBrokers);
    setSelectedBrokers(new Set(uniqueBrokers));
    setLoading(false);
  };

  const toggleBroker = (broker: string) => {
    setSelectedBrokers(prev => {
      const next = new Set(prev);
      if (next.has(broker)) next.delete(broker);
      else next.add(broker);
      return next;
    });
  };

  const filteredPositions = useMemo(() => {
    if (selectedBrokers.size === 0) return positions;
    return positions.filter(p => selectedBrokers.has(p.broker));
  }, [positions, selectedBrokers]);

  // Group by class
  const positionsByClass = useMemo(() => {
    const groups: Record<string, ClientPosition[]> = {};
    filteredPositions.forEach(p => {
      if (!groups[p.assetClass]) groups[p.assetClass] = [];
      groups[p.assetClass].push(p);
    });
    return groups;
  }, [filteredPositions]);

  const classOrder = ['renda_fixa', 'acoes', 'fiis', 'fundos', 'outros'];
  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Portfólio do Cliente</CardTitle>
          </div>
          {positions.length > 0 && (
            <Button
              onClick={() => setReadequacaoOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              size="sm"
            >
              <Lightbulb className="w-4 h-4 mr-1.5" />
              Sugerir Readequação
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Client selector */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-72">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione um cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Broker filters */}
          {brokers.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              {brokers.map(broker => (
                <label key={broker} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={selectedBrokers.has(broker)}
                    onCheckedChange={() => toggleBroker(broker)}
                  />
                  <Badge variant="outline" className={`text-[10px] ${getBrokerColor(broker)}`}>
                    {broker}
                  </Badge>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {/* Empty states */}
        {!loading && !selectedClientId && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Selecione um cliente para visualizar seu portfólio.
          </p>
        )}
        {!loading && selectedClientId && positions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum relatório de performance encontrado para este cliente. Importe um relatório na aba de Performance do cliente.
          </p>
        )}

        {/* Positions by class */}
        {!loading && classOrder.map(cls => {
          const items = positionsByClass[cls];
          if (!items || items.length === 0) return null;
          const classTotal = items.reduce((s, p) => s + p.totalValue, 0);

          return (
            <div key={cls} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{CLASS_LABELS[cls] || cls}</h4>
                <Badge variant="outline" className="text-xs">
                  R$ {formatBRL(classTotal)}
                </Badge>
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Ativo</TableHead>
                      <TableHead className="text-xs">Corretora</TableHead>
                      {cls !== 'renda_fixa' && cls !== 'fundos' && (
                        <>
                          <TableHead className="text-xs text-right">Qtd</TableHead>
                          <TableHead className="text-xs text-right">Preço Médio</TableHead>
                          <TableHead className="text-xs text-right">Preço Atual</TableHead>
                        </>
                      )}
                      <TableHead className="text-xs text-right">Valor Total</TableHead>
                      {cls === 'renda_fixa' && <TableHead className="text-xs">Vencimento</TableHead>}
                      {(cls === 'acoes' || cls === 'fiis') && (
                        <>
                          <TableHead className="text-xs text-right">L/P R$</TableHead>
                          <TableHead className="text-xs text-right">L/P %</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((p, idx) => (
                      <TableRow key={`${p.ativo}-${p.broker}-${idx}`}>
                        <TableCell className="font-mono text-sm font-semibold">{p.ativo}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${getBrokerColor(p.broker)}`}>
                            {p.broker}
                          </Badge>
                        </TableCell>
                        {cls !== 'renda_fixa' && cls !== 'fundos' && (
                          <>
                            <TableCell className="text-right text-sm">{p.qty > 0 ? p.qty : '—'}</TableCell>
                            <TableCell className="text-right text-sm">
                              {p.avgPrice > 0 ? `R$ ${formatBRL(p.avgPrice)}` : '—'}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {p.currentPrice > 0 ? `R$ ${formatBRL(p.currentPrice)}` : '—'}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-right text-sm font-medium">
                          R$ {formatBRL(p.totalValue)}
                        </TableCell>
                        {cls === 'renda_fixa' && (
                          <TableCell className="text-sm">{p.vencimento || '—'}</TableCell>
                        )}
                        {(cls === 'acoes' || cls === 'fiis') && (
                          <>
                            <TableCell className={`text-right text-sm ${p.pnlR$ >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                              {p.pnlR$ !== 0 ? `R$ ${formatBRL(p.pnlR$)}` : '—'}
                            </TableCell>
                            <TableCell className={`text-right text-sm ${p.pnlPct >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                              {p.pnlPct !== 0 ? `${p.pnlPct.toFixed(2)}%` : '—'}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          );
        })}

        {/* Grand total */}
        {!loading && filteredPositions.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm font-medium">Total do Portfólio</span>
            <span className="text-lg font-bold text-foreground">
              R$ {formatBRL(filteredPositions.reduce((s, p) => s + p.totalValue, 0))}
            </span>
          </div>
        )}
      </CardContent>

      {/* Readequação Modal */}
      {selectedClient && (
        <ReadequacaoModal
          open={readequacaoOpen}
          onOpenChange={setReadequacaoOpen}
          clientName={selectedClient.name}
          positions={filteredPositions}
          portfolios={portfolios}
          portfolioAssets={portfolioAssets}
          recommendedAssets={recommendedAssets}
        />
      )}
    </Card>
  );
}
