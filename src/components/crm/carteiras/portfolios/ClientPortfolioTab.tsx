import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
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
  indexador: string | null;
  taxa: number | null;
  rfSubclass: 'ipca' | 'pos' | 'pre' | null;
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

const RF_KEYWORDS = [
  'renda fixa', 'cdb', 'lci', 'lca', 'tesouro', 'debenture', 'deb',
  'cri', 'cra', 'cdca', 'ltn', 'ntn-b', 'ntn-f', 'ntnb', 'ntnf',
  'dpge', 'lfsc', 'lft', 'lf ', 'letra financeira',
];

function classifyAsset(tipo: string | null, ativo: string | null): ClientPosition['assetClass'] {
  const t = (tipo || '').toLowerCase();
  const a = (ativo || '').toLowerCase();
  const combined = `${t} ${a}`;

  // FIIs - check before ações (tickers ending in 11)
  if (t.includes('fii') || t.includes('fundo imobiliário') || t.includes('fundo imobiliario') ||
      a.includes('fii') || /^[a-z]{4}11[bf]?$/i.test(a.trim()) ||
      combined.includes('imobiliário') || combined.includes('imobiliario')) return 'fiis';

  // Ações / Renda Variável
  if (t.includes('ação') || t.includes('ações') || t.includes('acoes') || t.includes('acao') ||
      t.includes('renda variável') || t.includes('renda variavel') ||
      t.includes('equity') || t.includes('bdr') ||
      /^[a-z]{4}\d{1,2}$/i.test(a.trim()) ||
      a.includes('bdr')) return 'acoes';

  // Check RF
  for (const kw of RF_KEYWORDS) {
    if (t.includes(kw) || a.includes(kw)) return 'renda_fixa';
  }
  if (/^(cdb|lci|lca|cri|cra|cdca|deb|ltn|ntn|dpge|lfsc|lft)/i.test(a)) return 'renda_fixa';
  if (/debenture/i.test(a) || /\bDEB[-\s]/i.test(ativo || '')) return 'renda_fixa';
  if (t.includes('título') || t.includes('titulo') || t.includes('renda fixa') ||
      t.includes('fixed income') || t.includes('rf')) return 'renda_fixa';

  // Fundos de Investimento
  if (t.includes('fundo') || t.includes('multimercado') || t.includes('cambial') ||
      t.includes('hedge') || t.includes('fund') ||
      a.includes('fundo') || a.includes('multimercado') || a.includes('fi ') ||
      a.includes('ficfi') || a.includes('fic fi')) return 'fundos';

  // Previdência → classify as fundos
  if (combined.includes('previdência') || combined.includes('previdencia') ||
      combined.includes('vgbl') || combined.includes('pgbl')) return 'fundos';

  // COE, derivativos
  if (t.includes('coe') || t.includes('derivativo') || a.includes('coe')) return 'outros';

  // If nothing matched and has a value, try to avoid 'outros'
  // Check if it looks like a stock ticker
  if (/^[A-Z]{4}\d{1,2}$/i.test((ativo || '').trim())) return 'acoes';

  return 'outros';
}

function classifyRfSubclass(indexador: string | null, taxa: number | null): ClientPosition['rfSubclass'] {
  const idx = (indexador || '').toLowerCase();
  if (idx.includes('ipca') || idx.includes('igp') || idx.includes('inflação') || idx.includes('inpc')) return 'ipca';
  if (idx.includes('cdi') || idx.includes('selic') || idx.includes('pós') || idx.includes('pos')) return 'pos';
  if (idx.includes('pré') || idx.includes('pre') || idx.includes('prefixado')) return 'pre';
  // If there's a fixed rate but no indexador, it's likely pre-fixed
  if (taxa && taxa > 0 && !idx) return 'pre';
  return 'pos'; // default to pos-fixado
}

const CLASS_LABELS: Record<string, string> = {
  'renda_fixa': 'Renda Fixa',
  'acoes': 'Ações',
  'fiis': 'Fundos Imobiliários',
  'fundos': 'Fundos de Investimento',
  'outros': 'Outros',
};

const RF_SUBCLASS_LABELS: Record<string, string> = {
  'ipca': '📌 Indexado à Inflação (IPCA+, IGP-M+)',
  'pos': '📌 Pós-Fixado (CDI, % CDI)',
  'pre': '📌 Pré-Fixado (Taxa fixa a.a.)',
};

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPct(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}

// Renda Fixa section component
function RendaFixaSection({ items, grandTotal }: { items: ClientPosition[]; grandTotal: number }) {
  const rfTotal = items.reduce((s, p) => s + p.totalValue, 0);

  // Group by subclass
  const bySubclass: Record<string, ClientPosition[]> = { ipca: [], pos: [], pre: [] };
  items.forEach(p => {
    const sc = p.rfSubclass || 'pos';
    if (!bySubclass[sc]) bySubclass[sc] = [];
    bySubclass[sc].push(p);
  });

  // Sort each subclass by taxa descending
  Object.values(bySubclass).forEach(arr => arr.sort((a, b) => (b.taxa || 0) - (a.taxa || 0)));

  const subclassOrder: Array<'ipca' | 'pos' | 'pre'> = ['ipca', 'pos', 'pre'];

  const subclassSummary = subclassOrder.map(sc => {
    const scItems = bySubclass[sc] || [];
    const scTotal = scItems.reduce((s, p) => s + p.totalValue, 0);
    return { key: sc, label: sc === 'ipca' ? 'Indexado à Inflação' : sc === 'pos' ? 'Pós-Fixado' : 'Pré-Fixado', total: scTotal, pct: grandTotal > 0 ? (scTotal / grandTotal) * 100 : 0, count: scItems.length };
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{CLASS_LABELS['renda_fixa']}</h4>
        <Badge variant="outline" className="text-xs">
          R$ {formatBRL(rfTotal)} ({grandTotal > 0 ? formatPct((rfTotal / grandTotal) * 100) : '0,00%'} do patrimônio)
        </Badge>
      </div>

      {/* Summary box */}
      <div className="bg-muted/40 rounded-lg p-3 space-y-1 text-sm border border-border">
        {subclassSummary.map(sc => (
          <div key={sc.key} className="flex items-center justify-between">
            <span className="text-muted-foreground">{sc.label}</span>
            <span className="font-medium">R$ {formatBRL(sc.total)} <span className="text-muted-foreground text-xs">({formatPct(sc.pct)})</span></span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border pt-1 mt-1 font-semibold">
          <span>TOTAL RENDA FIXA</span>
          <span>R$ {formatBRL(rfTotal)} <span className="text-muted-foreground text-xs font-normal">({grandTotal > 0 ? formatPct((rfTotal / grandTotal) * 100) : '0,00%'})</span></span>
        </div>
      </div>

      {/* Tables by subclass */}
      {subclassOrder.map(sc => {
        const scItems = bySubclass[sc] || [];
        if (scItems.length === 0) return null;
        const scTotal = scItems.reduce((s, p) => s + p.totalValue, 0);

        return (
          <div key={sc} className="space-y-1">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-medium text-muted-foreground">{RF_SUBCLASS_LABELS[sc]}</h5>
              <span className="text-xs text-muted-foreground">R$ {formatBRL(scTotal)}</span>
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Ativo</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Indexador</TableHead>
                    <TableHead className="text-xs text-right">Taxa</TableHead>
                    <TableHead className="text-xs">Vencimento</TableHead>
                    <TableHead className="text-xs text-right">Valor R$</TableHead>
                    <TableHead className="text-xs text-right">% Patrimônio</TableHead>
                    <TableHead className="text-xs text-right">% Classe</TableHead>
                    <TableHead className="text-xs">Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scItems.map((p, idx) => (
                    <TableRow key={`${p.ativo}-${p.broker}-${idx}`}>
                      <TableCell className="font-mono text-sm font-semibold">{p.ativo}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.tipo || '—'}</TableCell>
                      <TableCell className="text-xs">{p.indexador || '—'}</TableCell>
                      <TableCell className="text-right text-sm">{p.taxa ? `${p.taxa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '—'}</TableCell>
                      <TableCell className="text-sm">{p.vencimento || '—'}</TableCell>
                      <TableCell className="text-right text-sm font-medium">R$ {formatBRL(p.totalValue)}</TableCell>
                      <TableCell className="text-right text-sm">{grandTotal > 0 ? formatPct((p.totalValue / grandTotal) * 100) : '—'}</TableCell>
                      <TableCell className="text-right text-sm">{rfTotal > 0 ? formatPct((p.totalValue / rfTotal) * 100) : '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${getBrokerColor(p.broker)}`}>
                          {p.broker}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}
    </div>
  );
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
  const [consolidatedGross, setConsolidatedGross] = useState(0);

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

    // Fetch reports with extracted_data AND also performance_positions
    const [reportsRes, clientReportsRes] = await Promise.all([
      supabase
        .from('performance_reports')
        .select('id, corretora, broker, extracted_data, patrimonio_bruto')
        .eq('client_id', selectedClientId)
        .eq('user_id', user.id),
      supabase
        .from('client_performance_reports')
        .select('id, broker, extracted_data')
        .eq('client_id', selectedClientId)
        .eq('user_id', user.id),
    ]);

    const reports = reportsRes.data || [];
    const clientReports = clientReportsRes.data || [];

    if (reports.length === 0 && clientReports.length === 0) {
      setPositions([]);
      setBrokers([]);
      setSelectedBrokers(new Set());
      setConsolidatedGross(0);
      setLoading(false);
      return;
    }

    // Calculate consolidated gross from reports
    let totalGross = 0;
    reports.forEach((r: any) => {
      const gross = Number(r.patrimonio_bruto) || 0;
      const extractedGross = (r.extracted_data as any)?.generalData?.grossPatrimony ?? 0;
      totalGross += gross > 0 ? gross : extractedGross;
    });
    clientReports.forEach((r: any) => {
      const extractedGross = (r.extracted_data as any)?.generalData?.grossPatrimony ?? 0;
      totalGross += extractedGross;
    });
    setConsolidatedGross(totalGross);

    const parsed: ClientPosition[] = [];
    const seenKeys = new Set<string>();

    // 1. Pull positions from extracted_data in performance_reports
    reports.forEach((r: any) => {
      const broker = r.corretora || r.broker || 'Outro';
      const extractedPositions = Array.isArray((r.extracted_data as any)?.positions)
        ? (r.extracted_data as any).positions : [];
      
      extractedPositions.forEach((p: any) => {
        const ativo = p.name || p.ativo || 'N/A';
        const tipo = p.type || p.tipo || '';
        const valor = Number(p.grossBalance || p.valor) || 0;
        const indexador = p.indexer || p.indexador || null;
        const taxa = p.rate != null ? Number(p.rate) : (p.taxa != null ? Number(p.taxa) : null);
        const vencimento = p.maturityDate || p.vencimento || null;
        const assetClass = classifyAsset(tipo, ativo);
        const rfSubclass = assetClass === 'renda_fixa' ? classifyRfSubclass(indexador, taxa) : null;
        const key = `${ativo}|${broker}|extracted`;
        seenKeys.add(key);

        parsed.push({
          ativo, tipo, broker,
          qty: 1, avgPrice: 0, currentPrice: valor,
          totalValue: valor, pnlR$: 0, pnlPct: 0,
          assetClass, vencimento, indexador, taxa, rfSubclass,
        });
      });
    });

    // 2. Pull positions from extracted_data in client_performance_reports
    clientReports.forEach((r: any) => {
      const broker = r.broker || 'Outro';
      const extractedPositions = Array.isArray((r.extracted_data as any)?.positions)
        ? (r.extracted_data as any).positions : [];
      
      extractedPositions.forEach((p: any) => {
        const ativo = p.name || p.ativo || 'N/A';
        const tipo = p.type || p.tipo || '';
        const valor = Number(p.grossBalance || p.valor) || 0;
        const indexador = p.indexer || p.indexador || null;
        const taxa = p.rate != null ? Number(p.rate) : (p.taxa != null ? Number(p.taxa) : null);
        const vencimento = p.maturityDate || p.vencimento || null;
        const assetClass = classifyAsset(tipo, ativo);
        const rfSubclass = assetClass === 'renda_fixa' ? classifyRfSubclass(indexador, taxa) : null;

        parsed.push({
          ativo, tipo, broker,
          qty: 1, avgPrice: 0, currentPrice: valor,
          totalValue: valor, pnlR$: 0, pnlPct: 0,
          assetClass, vencimento, indexador, taxa, rfSubclass,
        });
      });
    });

    // 3. Fallback: also pull from performance_positions table for reports with no extracted_data positions
    const reportIds = reports.map((r: any) => r.id);
    if (reportIds.length > 0) {
      const reportBrokerMap: Record<string, string> = {};
      reports.forEach((r: any) => { reportBrokerMap[r.id] = r.corretora || r.broker || 'Outro'; });

      const { data: posData } = await supabase
        .from('performance_positions')
        .select('*')
        .in('report_id', reportIds);

      (posData || []).forEach((p: any) => {
        const broker = reportBrokerMap[p.report_id] || 'Outro';
        const ativo = p.ativo || 'N/A';
        const key = `${ativo}|${broker}|extracted`;
        // Only add if not already from extracted_data
        if (seenKeys.has(key)) return;

        const valor = Number(p.valor) || 0;
        const assetClass = classifyAsset(p.tipo, p.ativo);
        const indexador = p.indexador || null;
        const taxa = p.taxa != null ? Number(p.taxa) : null;
        const rfSubclass = assetClass === 'renda_fixa' ? classifyRfSubclass(indexador, taxa) : null;

        parsed.push({
          ativo, tipo: p.tipo || '', broker,
          qty: 1, avgPrice: 0, currentPrice: valor,
          totalValue: valor, pnlR$: 0, pnlPct: 0,
          assetClass, vencimento: p.vencimento || null, indexador, taxa, rfSubclass,
        });
      });
    }

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

  const grandTotal = useMemo(() => filteredPositions.reduce((s, p) => s + p.totalValue, 0), [filteredPositions]);

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

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

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

          // Special rendering for Renda Fixa
          if (cls === 'renda_fixa') {
            return <RendaFixaSection key={cls} items={items} grandTotal={grandTotal} />;
          }

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
                      {cls !== 'fundos' && (
                        <>
                          <TableHead className="text-xs text-right">Qtd</TableHead>
                          <TableHead className="text-xs text-right">Preço Médio</TableHead>
                          <TableHead className="text-xs text-right">Preço Atual</TableHead>
                        </>
                      )}
                      <TableHead className="text-xs text-right">Valor Total</TableHead>
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
                        {cls !== 'fundos' && (
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
        {!loading && filteredPositions.length > 0 && (() => {
          const divergence = consolidatedGross > 0 ? Math.abs(grandTotal - consolidatedGross) : 0;
          const divergePct = consolidatedGross > 0 ? (divergence / consolidatedGross) * 100 : 0;
          const hasDivergence = consolidatedGross > 0 && divergePct > 1;

          return (
            <div className="space-y-2">
              <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm font-medium">Total do Portfólio</span>
                <span className="text-lg font-bold text-foreground">
                  R$ {formatBRL(grandTotal)}
                </span>
              </div>
              {consolidatedGross > 0 && (
                <div className={`rounded-lg p-3 flex items-center justify-between text-sm ${hasDivergence ? 'bg-destructive/10 border border-destructive/30' : 'bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'}`}>
                  <span className={hasDivergence ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-400'}>
                    {hasDivergence
                      ? `⚠️ Valor diverge do consolidado geral (R$ ${formatBRL(consolidatedGross)}) — diferença de R$ ${formatBRL(divergence)} (${divergePct.toFixed(1)}%). Verifique se todas as classes foram importadas.`
                      : `✅ Valor confere com o consolidado geral (R$ ${formatBRL(consolidatedGross)})`
                    }
                  </span>
                </div>
              )}
            </div>
          );
        })()}
      </CardContent>

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
