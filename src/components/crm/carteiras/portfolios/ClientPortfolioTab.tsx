import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  indexador: string | null;
  taxa: number | null;
  taxaLabel: string | null;
  rfSubclass: 'ipca' | 'pos' | 'pre' | null;
}

interface PendingImportAsset {
  id: string;
  ativo: string;
  tipo: string;
  broker: string;
  totalValue: number;
  reason: string;
  assetClass: ClientPosition['assetClass'];
  qty: number;
  avgPrice: number;
  currentPrice: number;
  vencimento: string | null;
  indexador: string | null;
  taxa: number | null;
  taxaLabel: string | null;
}

interface Props {
  portfolios: InvestorPortfolio[];
  portfolioAssets: PortfolioAssetItem[];
  recommendedAssets: PortfolioAsset[];
}

const BROKER_COLORS: Record<string, string> = {
  BTG: 'bg-blue-100 text-blue-700 border-blue-300',
  XP: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  Itaú: 'bg-orange-100 text-orange-700 border-orange-300',
  Rico: 'bg-purple-100 text-purple-700 border-purple-300',
  Clear: 'bg-green-100 text-green-700 border-green-300',
  Nubank: 'bg-violet-100 text-violet-700 border-violet-300',
};

const POSITION_NAME_KEYS = ['name', 'ativo', 'asset', 'ticker', 'descricao', 'description', 'title'];
const POSITION_TYPE_KEYS = ['type', 'tipo', 'assetType', 'classe', 'category'];
const POSITION_VALUE_KEYS = ['grossBalance', 'valor', 'totalValue', 'marketValue', 'currentValue', 'value', 'amount', 'appliedValue'];
const POSITION_QTY_KEYS = ['qty', 'quantity', 'quantidade', 'shares', 'units', 'cotas'];
const POSITION_AVG_PRICE_KEYS = ['avgPrice', 'averagePrice', 'precoMedio', 'preco_medio', 'pm'];
const POSITION_CURRENT_PRICE_KEYS = ['currentPrice', 'price', 'precoAtual', 'preco_atual', 'unitPrice'];
const POSITION_INDEXER_KEYS = ['indexer', 'indexador', 'benchmark'];
const POSITION_MATURITY_KEYS = ['maturityDate', 'vencimento', 'maturity', 'dueDate'];
const POSITION_RATE_KEYS = ['rate', 'taxa', 'yield', 'rendimento', 'rateLabel'];

const RF_KEYWORDS = [
  'renda fixa', 'cdb', 'lci', 'lca', 'tesouro', 'debenture', 'deb',
  'cri', 'cra', 'cdca', 'ltn', 'ntn-b', 'ntn-f', 'ntnb', 'ntnf',
  'dpge', 'lfsc', 'lft', 'letra financeira', 'prefixado', 'pós-fixado',
];

const CLASS_LABELS: Record<string, string> = {
  renda_fixa: 'Renda Fixa',
  acoes: 'Ações',
  fiis: 'Fundos Imobiliários',
  fundos: 'Fundos de Investimento',
  outros: 'Outros',
};

const RF_SUBCLASS_LABELS: Record<string, string> = {
  ipca: '📌 Indexado à Inflação (IPCA+, IGP-M+)',
  pos: '📌 Pós-Fixado (CDI, % CDI)',
  pre: '📌 Pré-Fixado (Taxa fixa a.a.)',
};

function getBrokerColor(broker: string): string {
  return BROKER_COLORS[broker] || 'bg-muted text-muted-foreground border-muted-foreground/30';
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPct(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}

function safeString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function parseMoneyLike(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const cleaned = value
    .replace(/R\$/gi, '')
    .replace(/\s+/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');

  if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.') return null;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRateNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const match = value.replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickString(obj: any, keys: string[]): string | null {
  for (const key of keys) {
    const found = safeString(obj?.[key]);
    if (found) return found;
  }
  return null;
}

function pickNumber(obj: any, keys: string[]): number | null {
  for (const key of keys) {
    const found = parseMoneyLike(obj?.[key]);
    if (found !== null) return found;
  }
  return null;
}

function extractRateInfo(position: any): { taxa: number | null; taxaLabel: string | null } {
  let taxa: number | null = null;
  let taxaLabel: string | null = null;

  for (const key of POSITION_RATE_KEYS) {
    const raw = position?.[key];
    if (raw === null || raw === undefined) continue;

    if (!taxaLabel && typeof raw === 'string' && raw.trim()) {
      taxaLabel = raw.trim();
    }

    if (taxa === null) {
      const parsed = parseRateNumber(raw);
      if (parsed !== null) taxa = parsed;
    }

    if (taxa !== null && taxaLabel) break;
  }

  if (!taxaLabel && taxa !== null) {
    taxaLabel = `${taxa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  }

  return { taxa, taxaLabel };
}

function classifyAsset(tipo: string | null, ativo: string | null): ClientPosition['assetClass'] {
  const t = (tipo || '').toLowerCase();
  const a = (ativo || '').toLowerCase();
  const combined = `${t} ${a}`;

  if (
    t.includes('fii') || t.includes('fundo imobiliário') || t.includes('fundo imobiliario') ||
    a.includes('fii') || /^[a-z]{4}11[bf]?$/i.test(a.trim())
  ) {
    return 'fiis';
  }

  if (
    t.includes('ação') || t.includes('acoes') || t.includes('renda variável') || t.includes('renda variavel') ||
    t.includes('equity') || t.includes('bdr') || t.includes('etf') ||
    /^[a-z]{4}\d{1,2}$/i.test(a.trim()) || a.includes('bdr')
  ) {
    return 'acoes';
  }

  for (const kw of RF_KEYWORDS) {
    if (combined.includes(kw)) return 'renda_fixa';
  }

  if (/^(cdb|lci|lca|cri|cra|cdca|deb|ltn|ntn|dpge|lfsc|lft)/i.test(a.trim())) return 'renda_fixa';
  if (/\bdeb\b|debenture/i.test(combined)) return 'renda_fixa';

  if (
    combined.includes('fundo') || combined.includes('multimercado') || combined.includes('cambial') ||
    combined.includes('previdência') || combined.includes('previdencia') || combined.includes('vgbl') || combined.includes('pgbl')
  ) {
    return 'fundos';
  }

  if (t.includes('coe') || t.includes('derivativo') || a.includes('coe')) return 'outros';
  if (/^[A-Z]{4}\d{1,2}$/i.test((ativo || '').trim())) return 'acoes';

  return 'outros';
}

function classifyRfSubclass(indexador: string | null, taxa: number | null, taxaLabel: string | null): ClientPosition['rfSubclass'] {
  const idx = (indexador || '').toLowerCase();
  const label = (taxaLabel || '').toLowerCase();

  if (idx.includes('ipca') || idx.includes('igp') || idx.includes('inflação') || idx.includes('inpc') || label.includes('ipca') || label.includes('igp')) {
    return 'ipca';
  }

  if (idx.includes('cdi') || idx.includes('selic') || idx.includes('pós') || idx.includes('pos') || label.includes('cdi') || label.includes('pós') || label.includes('pos')) {
    return 'pos';
  }

  if (idx.includes('pré') || idx.includes('pre') || idx.includes('prefixado') || label.includes('a.a') || label.includes('prefixado') || label.includes('pré')) {
    return 'pre';
  }

  if (taxa && taxa > 0 && !idx) return 'pre';

  return 'pos';
}

function isLikelyPositionObject(item: unknown): item is Record<string, any> {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const obj = item as Record<string, any>;

  const hasName = POSITION_NAME_KEYS.some((key) => safeString(obj[key]));
  const hasValue = POSITION_VALUE_KEYS.some((key) => parseMoneyLike(obj[key]) !== null);
  const hasType = POSITION_TYPE_KEYS.some((key) => safeString(obj[key]));

  return hasName || (hasValue && hasType);
}

function extractPositionCandidates(extractedData: any): any[] {
  if (!extractedData || typeof extractedData !== 'object') return [];

  const result: any[] = [];
  const seen = new Set<string>();

  const pushCandidates = (arr: any[]) => {
    arr.forEach((item) => {
      if (!isLikelyPositionObject(item)) return;
      const name = pickString(item, POSITION_NAME_KEYS) || 'sem_nome';
      const type = pickString(item, POSITION_TYPE_KEYS) || 'sem_tipo';
      const value = pickNumber(item, POSITION_VALUE_KEYS) ?? 0;
      const key = `${name}|${type}|${value}`;
      if (seen.has(key)) return;
      seen.add(key);
      result.push(item);
    });
  };

  const directArrayKeys = ['positions', 'ativos', 'assets', 'holdings', 'carteira', 'portfolioPositions', 'investmentPositions'];

  directArrayKeys.forEach((key) => {
    const arr = extractedData?.[key];
    if (Array.isArray(arr)) pushCandidates(arr);
  });

  Object.values(extractedData).forEach((value: any) => {
    if (Array.isArray(value)) {
      pushCandidates(value);
      return;
    }

    if (value && typeof value === 'object') {
      directArrayKeys.forEach((key) => {
        const nested = value?.[key];
        if (Array.isArray(nested)) pushCandidates(nested);
      });

      Object.values(value).forEach((inner: any) => {
        if (Array.isArray(inner)) pushCandidates(inner);
      });
    }
  });

  return result;
}

function normalizePositionName(ativo: string): string {
  return ativo.trim().toUpperCase().replace(/\s+/g, ' ');
}

function buildPendingAsset(partial: Partial<PendingImportAsset> & { reason: string; id: string }): PendingImportAsset {
  return {
    id: partial.id,
    ativo: partial.ativo || 'Ativo sem identificação',
    tipo: partial.tipo || 'Tipo não informado',
    broker: partial.broker || 'Outro',
    totalValue: partial.totalValue || 0,
    reason: partial.reason,
    assetClass: partial.assetClass || 'outros',
    qty: partial.qty && partial.qty > 0 ? partial.qty : 1,
    avgPrice: partial.avgPrice || 0,
    currentPrice: partial.currentPrice || 0,
    vencimento: partial.vencimento || null,
    indexador: partial.indexador || null,
    taxa: partial.taxa ?? null,
    taxaLabel: partial.taxaLabel ?? null,
  };
}

function mapRawPositionToClientPosition(raw: any, broker: string, sourceId: string, index: number): { position?: ClientPosition; pending?: PendingImportAsset } {
  const ativo = pickString(raw, POSITION_NAME_KEYS);
  const tipo = pickString(raw, POSITION_TYPE_KEYS) || '';
  const totalValue = pickNumber(raw, POSITION_VALUE_KEYS);

  const { taxa, taxaLabel } = extractRateInfo(raw);
  const indexador = pickString(raw, POSITION_INDEXER_KEYS);
  const vencimento = pickString(raw, POSITION_MATURITY_KEYS);

  const qtyRaw = pickNumber(raw, POSITION_QTY_KEYS);
  const avgPriceRaw = pickNumber(raw, POSITION_AVG_PRICE_KEYS);
  const currentPriceRaw = pickNumber(raw, POSITION_CURRENT_PRICE_KEYS);

  const assetClass = classifyAsset(tipo, ativo);

  if (!ativo) {
    return {
      pending: buildPendingAsset({
        id: `${sourceId}-${index}-no-name-${broker}`,
        tipo,
        broker,
        totalValue: totalValue || 0,
        reason: 'nome/ticker não identificado no relatório',
        assetClass,
        qty: qtyRaw || 1,
        avgPrice: avgPriceRaw || 0,
        currentPrice: currentPriceRaw || 0,
        vencimento,
        indexador,
        taxa,
        taxaLabel,
      }),
    };
  }

  if (totalValue === null || totalValue <= 0) {
    return {
      pending: buildPendingAsset({
        id: `${sourceId}-${index}-${normalizePositionName(ativo)}-${broker}`,
        ativo,
        tipo,
        broker,
        totalValue: 0,
        reason: 'campo de valor inválido ou ausente para importação automática',
        assetClass,
        qty: qtyRaw || 1,
        avgPrice: avgPriceRaw || 0,
        currentPrice: currentPriceRaw || 0,
        vencimento,
        indexador,
        taxa,
        taxaLabel,
      }),
    };
  }

  const qty = qtyRaw && qtyRaw > 0 ? qtyRaw : 1;
  const avgPrice = avgPriceRaw && avgPriceRaw > 0 ? avgPriceRaw : 0;
  const currentPrice = currentPriceRaw && currentPriceRaw > 0 ? currentPriceRaw : totalValue / Math.max(qty, 1);

  const costBasis = avgPrice > 0 ? avgPrice * qty : 0;
  const pnlR$ = costBasis > 0 ? totalValue - costBasis : 0;
  const pnlPct = costBasis > 0 ? (pnlR$ / costBasis) * 100 : 0;

  return {
    position: {
      ativo,
      tipo,
      broker,
      qty,
      avgPrice,
      currentPrice,
      totalValue,
      pnlR$,
      pnlPct,
      assetClass,
      vencimento,
      indexador,
      taxa,
      taxaLabel,
      rfSubclass: assetClass === 'renda_fixa' ? classifyRfSubclass(indexador, taxa, taxaLabel) : null,
    },
  };
}

function extractGrossPatrimony(report: any): number {
  const direct = parseMoneyLike(report?.patrimonio_bruto);
  if (direct !== null && direct > 0) return direct;

  const extracted = report?.extracted_data || {};
  const candidates = [
    extracted?.generalData?.grossPatrimony,
    extracted?.general_data?.gross_patrimony,
    extracted?.grossPatrimony,
    extracted?.patrimonioBruto,
    extracted?.patrimonio_bruto,
  ];

  for (const candidate of candidates) {
    const parsed = parseMoneyLike(candidate);
    if (parsed !== null && parsed > 0) return parsed;
  }

  return 0;
}

function consolidatePositions(input: ClientPosition[]): ClientPosition[] {
  const map = new Map<string, ClientPosition>();

  input.forEach((p) => {
    const key = `${normalizePositionName(p.ativo)}|${p.broker}|${p.tipo || ''}|${p.vencimento || ''}|${p.indexador || ''}|${p.taxaLabel || p.taxa || ''}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { ...p });
      return;
    }

    const mergedQty = existing.qty + p.qty;
    const mergedTotal = existing.totalValue + p.totalValue;
    const existingCost = existing.avgPrice > 0 ? existing.avgPrice * existing.qty : 0;
    const incomingCost = p.avgPrice > 0 ? p.avgPrice * p.qty : 0;
    const mergedCost = existingCost + incomingCost;

    existing.qty = mergedQty;
    existing.totalValue = mergedTotal;
    existing.avgPrice = mergedQty > 0 && mergedCost > 0 ? mergedCost / mergedQty : existing.avgPrice || p.avgPrice;
    existing.currentPrice = mergedQty > 0 ? mergedTotal / mergedQty : existing.currentPrice;
    existing.pnlR$ = mergedCost > 0 ? mergedTotal - mergedCost : existing.pnlR$ + p.pnlR$;
    existing.pnlPct = mergedCost > 0 ? ((mergedTotal - mergedCost) / mergedCost) * 100 : existing.pnlPct;

    if (!existing.taxaLabel && p.taxaLabel) existing.taxaLabel = p.taxaLabel;
    if (existing.taxa === null && p.taxa !== null) existing.taxa = p.taxa;
    if (!existing.indexador && p.indexador) existing.indexador = p.indexador;
    if (!existing.vencimento && p.vencimento) existing.vencimento = p.vencimento;
  });

  return Array.from(map.values());
}

function toClientPositionFromPending(asset: PendingImportAsset): ClientPosition | null {
  if (!asset.ativo || asset.totalValue <= 0) return null;

  const qty = asset.qty > 0 ? asset.qty : 1;
  const avgPrice = asset.avgPrice > 0 ? asset.avgPrice : 0;
  const currentPrice = asset.currentPrice > 0 ? asset.currentPrice : asset.totalValue / Math.max(qty, 1);
  const costBasis = avgPrice > 0 ? avgPrice * qty : 0;
  const pnlR$ = costBasis > 0 ? asset.totalValue - costBasis : 0;
  const pnlPct = costBasis > 0 ? (pnlR$ / costBasis) * 100 : 0;

  return {
    ativo: asset.ativo,
    tipo: asset.tipo,
    broker: asset.broker,
    qty,
    avgPrice,
    currentPrice,
    totalValue: asset.totalValue,
    pnlR$,
    pnlPct,
    assetClass: asset.assetClass,
    vencimento: asset.vencimento,
    indexador: asset.indexador,
    taxa: asset.taxa,
    taxaLabel: asset.taxaLabel,
    rfSubclass: asset.assetClass === 'renda_fixa' ? classifyRfSubclass(asset.indexador, asset.taxa, asset.taxaLabel) : null,
  };
}

function RendaFixaSection({ items, grandTotal }: { items: ClientPosition[]; grandTotal: number }) {
  const rfTotal = items.reduce((s, p) => s + p.totalValue, 0);

  const bySubclass: Record<string, ClientPosition[]> = { ipca: [], pos: [], pre: [] };
  items.forEach((p) => {
    const subclass = p.rfSubclass || 'pos';
    if (!bySubclass[subclass]) bySubclass[subclass] = [];
    bySubclass[subclass].push(p);
  });

  Object.values(bySubclass).forEach((arr) => arr.sort((a, b) => (b.taxa || 0) - (a.taxa || 0)));

  const subclassOrder: Array<'ipca' | 'pos' | 'pre'> = ['ipca', 'pos', 'pre'];

  const subclassSummary = subclassOrder.map((sc) => {
    const scItems = bySubclass[sc] || [];
    const scTotal = scItems.reduce((s, p) => s + p.totalValue, 0);
    return {
      key: sc,
      label: sc === 'ipca' ? 'Indexado à Inflação' : sc === 'pos' ? 'Pós-Fixado' : 'Pré-Fixado',
      total: scTotal,
      pct: grandTotal > 0 ? (scTotal / grandTotal) * 100 : 0,
    };
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{CLASS_LABELS.renda_fixa}</h4>
        <Badge variant="outline" className="text-xs">
          R$ {formatBRL(rfTotal)} ({grandTotal > 0 ? formatPct((rfTotal / grandTotal) * 100) : '0,00%'} do patrimônio)
        </Badge>
      </div>

      <div className="bg-muted/40 rounded-lg p-3 space-y-1 text-sm border border-border">
        {subclassSummary.map((sc) => (
          <div key={sc.key} className="flex items-center justify-between">
            <span className="text-muted-foreground">{sc.label}</span>
            <span className="font-medium">
              R$ {formatBRL(sc.total)} <span className="text-muted-foreground text-xs">({formatPct(sc.pct)})</span>
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border pt-1 mt-1 font-semibold">
          <span>TOTAL RENDA FIXA</span>
          <span>
            R$ {formatBRL(rfTotal)}{' '}
            <span className="text-muted-foreground text-xs font-normal">
              ({grandTotal > 0 ? formatPct((rfTotal / grandTotal) * 100) : '0,00%'})
            </span>
          </span>
        </div>
      </div>

      {subclassOrder.map((sc) => {
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
                      <TableCell className="text-right text-sm">{p.taxaLabel || (p.taxa !== null ? formatPct(p.taxa) : '—')}</TableCell>
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
  const [manualIncludedPositions, setManualIncludedPositions] = useState<ClientPosition[]>([]);
  const [pendingAssets, setPendingAssets] = useState<PendingImportAsset[]>([]);

  const [brokers, setBrokers] = useState<string[]>([]);
  const [selectedBrokers, setSelectedBrokers] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(false);
  const [readequacaoOpen, setReadequacaoOpen] = useState(false);
  const [consolidatedGross, setConsolidatedGross] = useState(0);

  const [editingPending, setEditingPending] = useState<PendingImportAsset | null>(null);

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

  useEffect(() => {
    if (!selectedClientId || !user) {
      setPositions([]);
      setManualIncludedPositions([]);
      setPendingAssets([]);
      setBrokers([]);
      setSelectedBrokers(new Set());
      setConsolidatedGross(0);
      return;
    }

    loadPositions();
  }, [selectedClientId, user]);

  const loadPositions = async () => {
    if (!user || !selectedClientId) return;
    setLoading(true);

    try {
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
        setManualIncludedPositions([]);
        setPendingAssets([]);
        setBrokers([]);
        setSelectedBrokers(new Set());
        setConsolidatedGross(0);
        return;
      }

      let totalGross = 0;
      reports.forEach((report: any) => { totalGross += extractGrossPatrimony(report); });
      clientReports.forEach((report: any) => { totalGross += extractGrossPatrimony(report); });
      setConsolidatedGross(totalGross);

      const importedRaw: ClientPosition[] = [];
      const pendingForManual: PendingImportAsset[] = [];
      const ignoredForLog: PendingImportAsset[] = [];

      const importedNameBrokerSet = new Set<string>();
      const registerImported = (position: ClientPosition) => {
        importedRaw.push(position);
        importedNameBrokerSet.add(`${normalizePositionName(position.ativo)}|${position.broker}`);
      };

      reports.forEach((report: any) => {
        const broker = report.corretora || report.broker || 'Outro';
        const candidates = extractPositionCandidates(report.extracted_data);

        candidates.forEach((candidate, idx) => {
          const mapped = mapRawPositionToClientPosition(candidate, broker, `performance_reports-${report.id}`, idx);
          if (mapped.position) {
            registerImported(mapped.position);
          } else if (mapped.pending) {
            pendingForManual.push(mapped.pending);
            ignoredForLog.push(mapped.pending);
          }
        });
      });

      clientReports.forEach((report: any) => {
        const broker = report.broker || 'Outro';
        const candidates = extractPositionCandidates(report.extracted_data);

        candidates.forEach((candidate, idx) => {
          const mapped = mapRawPositionToClientPosition(candidate, broker, `client_performance_reports-${report.id}`, idx);
          if (mapped.position) {
            registerImported(mapped.position);
          } else if (mapped.pending) {
            pendingForManual.push(mapped.pending);
            ignoredForLog.push(mapped.pending);
          }
        });
      });

      const reportIds = reports.map((report: any) => report.id);
      if (reportIds.length > 0) {
        const reportBrokerMap: Record<string, string> = {};
        reports.forEach((report: any) => {
          reportBrokerMap[report.id] = report.corretora || report.broker || 'Outro';
        });

        const { data: positionsTableRows } = await supabase
          .from('performance_positions')
          .select('*')
          .in('report_id', reportIds);

        (positionsTableRows || []).forEach((row: any, idx: number) => {
          const broker = reportBrokerMap[row.report_id] || 'Outro';
          const mapped = mapRawPositionToClientPosition(row, broker, `performance_positions-${row.report_id}`, idx);

          if (!mapped.position) {
            if (mapped.pending) ignoredForLog.push({ ...mapped.pending, reason: `fallback ignorado: ${mapped.pending.reason}` });
            return;
          }

          const duplicateKey = `${normalizePositionName(mapped.position.ativo)}|${broker}`;
          if (importedNameBrokerSet.has(duplicateKey)) {
            ignoredForLog.push(
              buildPendingAsset({
                id: `duplicado-${row.id}`,
                ativo: mapped.position.ativo,
                tipo: mapped.position.tipo,
                broker,
                totalValue: mapped.position.totalValue,
                reason: 'registro duplicado (já importado do JSON principal)',
                assetClass: mapped.position.assetClass,
                qty: mapped.position.qty,
                avgPrice: mapped.position.avgPrice,
                currentPrice: mapped.position.currentPrice,
                vencimento: mapped.position.vencimento,
                indexador: mapped.position.indexador,
                taxa: mapped.position.taxa,
                taxaLabel: mapped.position.taxaLabel,
              }),
            );
            return;
          }

          registerImported(mapped.position);
        });
      }

      const consolidated = consolidatePositions(importedRaw);
      const importedTotal = consolidated.reduce((sum, item) => sum + item.totalValue, 0);
      const missingValue = totalGross > 0 ? totalGross - importedTotal : 0;

      if (missingValue > 1) {
        pendingForManual.unshift(
          buildPendingAsset({
            id: `delta-${selectedClientId}`,
            ativo: 'Saldo não detalhado no relatório',
            tipo: 'Ajuste de consolidado',
            broker: 'Consolidado',
            totalValue: Number(missingValue.toFixed(2)),
            reason: 'diferença entre o patrimônio bruto do consolidado e a soma das posições detalhadas',
            assetClass: 'outros',
            qty: 1,
            avgPrice: 0,
            currentPrice: Number(missingValue.toFixed(2)),
            vencimento: null,
            indexador: null,
            taxa: null,
            taxaLabel: null,
          }),
        );
      }

      if (ignoredForLog.length > 0) {
        console.warn(
          '[Portfólio do Cliente] Ativos ignorados durante importação:',
          ignoredForLog.map((item) => ({
            ativo: item.ativo,
            tipo: item.tipo,
            valor: item.totalValue,
            corretora: item.broker,
            motivo: item.reason,
          })),
        );
      }

      const uniqueBrokers = [...new Set(consolidated.map((position) => position.broker))].sort();

      setPositions(consolidated);
      setManualIncludedPositions([]);
      setPendingAssets(pendingForManual);
      setBrokers(uniqueBrokers);
      setSelectedBrokers(new Set(uniqueBrokers));
    } catch (error) {
      console.error('Erro ao importar posições no Portfólio do Cliente:', error);
      setPositions([]);
      setManualIncludedPositions([]);
      setPendingAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const allPositions = useMemo(
    () => consolidatePositions([...positions, ...manualIncludedPositions]),
    [positions, manualIncludedPositions],
  );

  const toggleBroker = (broker: string) => {
    setSelectedBrokers((prev) => {
      const next = new Set(prev);
      if (next.has(broker)) next.delete(broker);
      else next.add(broker);
      return next;
    });
  };

  const filteredPositions = useMemo(() => {
    if (selectedBrokers.size === 0) return allPositions;
    return allPositions.filter((position) => selectedBrokers.has(position.broker));
  }, [allPositions, selectedBrokers]);

  const filteredGrandTotal = useMemo(
    () => filteredPositions.reduce((sum, position) => sum + position.totalValue, 0),
    [filteredPositions],
  );

  const portfolioGrandTotal = useMemo(
    () => allPositions.reduce((sum, position) => sum + position.totalValue, 0),
    [allPositions],
  );

  const pendingTotal = useMemo(
    () => pendingAssets.reduce((sum, item) => sum + item.totalValue, 0),
    [pendingAssets],
  );

  const positionsByClass = useMemo(() => {
    const groups: Record<string, ClientPosition[]> = {};
    filteredPositions.forEach((position) => {
      if (!groups[position.assetClass]) groups[position.assetClass] = [];
      groups[position.assetClass].push(position);
    });
    return groups;
  }, [filteredPositions]);

  const classOrder = ['renda_fixa', 'acoes', 'fiis', 'fundos', 'outros'];

  const selectedClient = clients.find((client) => client.id === selectedClientId);

  const divergence = consolidatedGross > 0 ? Math.abs(portfolioGrandTotal - consolidatedGross) : 0;
  const divergencePct = consolidatedGross > 0 ? (divergence / consolidatedGross) * 100 : 0;
  const hasDivergence = consolidatedGross > 0 && divergencePct > 1;

  const ensureBrokerVisible = (broker: string) => {
    setBrokers((prev) => (prev.includes(broker) ? prev : [...prev, broker].sort()));
    setSelectedBrokers((prev) => {
      const next = new Set(prev);
      next.add(broker);
      return next;
    });
  };

  const openPendingEditor = (item: PendingImportAsset) => {
    setEditingPending({ ...item });
  };

  const closePendingEditor = () => setEditingPending(null);

  const updateEditingPending = (patch: Partial<PendingImportAsset>) => {
    setEditingPending((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const includePendingItem = () => {
    if (!editingPending) return;

    const normalized = {
      ...editingPending,
      totalValue: parseMoneyLike(editingPending.totalValue) || 0,
      qty: parseMoneyLike(editingPending.qty) || 1,
      avgPrice: parseMoneyLike(editingPending.avgPrice) || 0,
      currentPrice: parseMoneyLike(editingPending.currentPrice) || 0,
      taxa: parseRateNumber(editingPending.taxaLabel ?? editingPending.taxa) ?? editingPending.taxa ?? null,
      taxaLabel: safeString(editingPending.taxaLabel) || null,
    };

    if (normalized.totalValue <= 0 || !normalized.ativo.trim()) return;

    const position = toClientPositionFromPending(normalized);
    if (!position) return;

    setManualIncludedPositions((prev) => [...prev, position]);
    setPendingAssets((prev) => prev.filter((item) => item.id !== normalized.id));
    ensureBrokerVisible(position.broker);
    closePendingEditor();
  };

  const includeAllPending = () => {
    if (pendingAssets.length === 0) return;

    const included: ClientPosition[] = [];
    const includedIds = new Set<string>();

    pendingAssets.forEach((asset) => {
      const position = toClientPositionFromPending(asset);
      if (!position) return;
      included.push(position);
      includedIds.add(asset.id);
    });

    if (included.length === 0) return;

    setManualIncludedPositions((prev) => [...prev, ...included]);
    setPendingAssets((prev) => prev.filter((item) => !includedIds.has(item.id)));

    const newBrokers = [...new Set(included.map((position) => position.broker))];
    setBrokers((prev) => [...new Set([...prev, ...newBrokers])].sort());
    setSelectedBrokers((prev) => {
      const next = new Set(prev);
      newBrokers.forEach((broker) => next.add(broker));
      return next;
    });
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Portfólio do Cliente</CardTitle>
          </div>
          {allPositions.length > 0 && (
            <Button onClick={() => setReadequacaoOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90" size="sm">
              <Lightbulb className="w-4 h-4 mr-1.5" />
              Sugerir Readequação
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-72">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione um cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {brokers.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              {brokers.map((broker) => (
                <label key={broker} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={selectedBrokers.has(broker)} onCheckedChange={() => toggleBroker(broker)} />
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
          <p className="text-sm text-muted-foreground text-center py-8">Selecione um cliente para visualizar seu portfólio.</p>
        )}

        {!loading && selectedClientId && allPositions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum relatório de performance encontrado para este cliente. Importe um relatório na aba de Performance do cliente.
          </p>
        )}

        {!loading && classOrder.map((cls) => {
          const items = positionsByClass[cls];
          if (!items || items.length === 0) return null;

          if (cls === 'renda_fixa') {
            return <RendaFixaSection key={cls} items={items} grandTotal={filteredGrandTotal} />;
          }

          const classTotal = items.reduce((sum, position) => sum + position.totalValue, 0);

          return (
            <div key={cls} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{CLASS_LABELS[cls] || cls}</h4>
                <Badge variant="outline" className="text-xs">R$ {formatBRL(classTotal)}</Badge>
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
                    {items.map((position, idx) => (
                      <TableRow key={`${position.ativo}-${position.broker}-${idx}`}>
                        <TableCell className="font-mono text-sm font-semibold">{position.ativo}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${getBrokerColor(position.broker)}`}>
                            {position.broker}
                          </Badge>
                        </TableCell>

                        {cls !== 'fundos' && (
                          <>
                            <TableCell className="text-right text-sm">{position.qty > 0 ? position.qty : '—'}</TableCell>
                            <TableCell className="text-right text-sm">{position.avgPrice > 0 ? `R$ ${formatBRL(position.avgPrice)}` : '—'}</TableCell>
                            <TableCell className="text-right text-sm">{position.currentPrice > 0 ? `R$ ${formatBRL(position.currentPrice)}` : '—'}</TableCell>
                          </>
                        )}

                        <TableCell className="text-right text-sm font-medium">R$ {formatBRL(position.totalValue)}</TableCell>

                        {(cls === 'acoes' || cls === 'fiis') && (
                          <>
                            <TableCell className={`text-right text-sm ${position.pnlR$ >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                              {position.pnlR$ !== 0 ? `R$ ${formatBRL(position.pnlR$)}` : '—'}
                            </TableCell>
                            <TableCell className={`text-right text-sm ${position.pnlPct >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                              {position.pnlPct !== 0 ? `${position.pnlPct.toFixed(2)}%` : '—'}
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

        {!loading && allPositions.length > 0 && (
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm font-medium">Total do Portfólio</span>
              <span className="text-lg font-bold text-foreground">R$ {formatBRL(portfolioGrandTotal)}</span>
            </div>

            {consolidatedGross > 0 && !hasDivergence && (
              <div className="rounded-lg p-3 text-sm bg-primary/10 border border-primary/30 text-foreground">
                ✅ Valor confere com o consolidado geral (R$ {formatBRL(consolidatedGross)})
              </div>
            )}

            {(hasDivergence || pendingAssets.length > 0) && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 space-y-3">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ Valor diverge do consolidado geral (R$ {formatBRL(consolidatedGross)}) — diferença de R$ {formatBRL(divergence)} ({divergencePct.toFixed(1)}%).
                </p>

                {pendingAssets.length > 0 ? (
                  <>
                    <p className="text-sm text-foreground">
                      ⚠️ {pendingAssets.length} ativos não foram importados (R$ {formatBRL(pendingTotal)}):
                    </p>

                    <div className="space-y-2">
                      {pendingAssets.map((item) => (
                        <div key={item.id} className="rounded-md border border-border bg-background p-2 flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <p className="text-sm">
                              <span className="font-semibold">{item.ativo}</span> — {item.tipo || 'Tipo não informado'} — R$ {formatBRL(item.totalValue)}
                            </p>
                            <p className="text-xs text-muted-foreground">Motivo: {item.reason}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => openPendingEditor(item)}>
                            + Incluir no Portfólio
                          </Button>
                        </div>
                      ))}
                    </div>

                    {pendingAssets.length > 1 && (
                      <div className="flex justify-end">
                        <Button size="sm" onClick={includeAllPending}>
                          Incluir Todos os Pendentes
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Nenhum ativo pendente foi identificado automaticamente. Verifique o mapeamento do relatório de performance.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
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

      <Dialog open={Boolean(editingPending)} onOpenChange={(open) => !open && closePendingEditor()}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Incluir ativo pendente</DialogTitle>
            <DialogDescription>Confira os dados importados e ajuste antes de incluir no Portfólio do Cliente.</DialogDescription>
          </DialogHeader>

          {editingPending && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Ativo</p>
                  <Input value={editingPending.ativo} onChange={(e) => updateEditingPending({ ativo: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <Input value={editingPending.tipo} onChange={(e) => updateEditingPending({ tipo: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Valor R$</p>
                  <Input value={String(editingPending.totalValue)} onChange={(e) => updateEditingPending({ totalValue: parseMoneyLike(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Corretora</p>
                  <Input value={editingPending.broker} onChange={(e) => updateEditingPending({ broker: e.target.value || 'Outro' })} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Classe</p>
                  <Select
                    value={editingPending.assetClass}
                    onValueChange={(value) => updateEditingPending({ assetClass: value as ClientPosition['assetClass'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="renda_fixa">Renda Fixa</SelectItem>
                      <SelectItem value="acoes">Ações</SelectItem>
                      <SelectItem value="fiis">FIIs</SelectItem>
                      <SelectItem value="fundos">Fundos</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Taxa</p>
                  <Input value={editingPending.taxaLabel || ''} onChange={(e) => updateEditingPending({ taxaLabel: e.target.value })} placeholder="Ex.: IPCA + 8,56%" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Indexador</p>
                  <Input value={editingPending.indexador || ''} onChange={(e) => updateEditingPending({ indexador: e.target.value || null })} placeholder="Ex.: IPCA+, CDI" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Vencimento</p>
                  <Input value={editingPending.vencimento || ''} onChange={(e) => updateEditingPending({ vencimento: e.target.value || null })} placeholder="AAAA-MM-DD" />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">Motivo original: {editingPending.reason}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closePendingEditor}>Cancelar</Button>
            <Button onClick={includePendingItem}>Incluir ativo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
