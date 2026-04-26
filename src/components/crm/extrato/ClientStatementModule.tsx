import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Upload, FileText, AlertTriangle, ShieldCheck, Trash2 } from 'lucide-react';
import { useClientStatements, AssetClass, ExtractAsset } from '@/hooks/useClientStatements';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtPct = (v: number) => `${(v || 0).toFixed(2)}%`;

const CLASS_COLORS: Record<AssetClass, string> = {
  'Renda Fixa': 'bg-blue-50 text-blue-700 border-blue-200',
  'Renda Variável': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Fundos Imobiliários': 'bg-amber-50 text-amber-700 border-amber-200',
  'Multimercado': 'bg-purple-50 text-purple-700 border-purple-200',
  'Previdência': 'bg-slate-50 text-slate-700 border-slate-200',
  'Caixa': 'bg-gray-50 text-gray-700 border-gray-200',
};

const ALL_CLASSES: AssetClass[] = [
  'Renda Fixa',
  'Renda Variável',
  'Fundos Imobiliários',
  'Multimercado',
  'Previdência',
  'Caixa',
];

interface Props {
  clientId?: string;
  clientName?: string;
}

export function ClientStatementModule({ clientId }: Props) {
  const {
    snapshots, activeSnapshotId, setActiveSnapshotId,
    assets, isExtracting, extractAndSave, deleteSnapshot,
  } = useClientStatements(clientId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterClass, setFilterClass] = useState<AssetClass | 'all'>('all');

  const activeSnapshot = useMemo(
    () => snapshots.find((s) => s.id === activeSnapshotId) || null,
    [snapshots, activeSnapshotId]
  );

  const total = activeSnapshot?.total_patrimony || assets.reduce((s, a) => s + a.gross_value, 0);

  // Totals by class
  const totalsByClass = useMemo(() => {
    const map: Record<string, { value: number; pct: number; count: number }> = {};
    ALL_CLASSES.forEach((c) => (map[c] = { value: 0, pct: 0, count: 0 }));
    assets.forEach((a) => {
      const k = a.asset_class as AssetClass;
      if (!map[k]) map[k] = { value: 0, pct: 0, count: 0 };
      map[k].value += a.gross_value;
      map[k].count += 1;
    });
    Object.keys(map).forEach((k) => {
      map[k].pct = total > 0 ? (map[k].value / total) * 100 : 0;
    });
    return map;
  }, [assets, total]);

  // Concentration by issuer >20%
  const concentrationAlerts = useMemo(() => {
    const map: Record<string, number> = {};
    assets.forEach((a) => {
      const issuer = (a.issuer || a.asset_name).trim();
      if (!issuer) return;
      map[issuer] = (map[issuer] || 0) + a.gross_value;
    });
    return Object.entries(map)
      .map(([issuer, value]) => ({ issuer, value, pct: total > 0 ? (value / total) * 100 : 0 }))
      .filter((x) => x.pct > 20)
      .sort((a, b) => b.pct - a.pct);
  }, [assets, total]);

  // Upcoming maturities ≤ 90d
  const upcomingMaturities = useMemo(() => {
    const today = new Date();
    return assets.filter((a) => {
      if (!a.maturity_date) return false;
      try {
        const days = differenceInDays(parseISO(a.maturity_date), today);
        return days >= 0 && days <= 90;
      } catch {
        return false;
      }
    });
  }, [assets]);

  // Tax exempt summary
  const taxExempt = useMemo(() => {
    const value = assets.filter((a) => a.is_tax_exempt).reduce((s, a) => s + a.gross_value, 0);
    return { value, pct: total > 0 ? (value / total) * 100 : 0 };
  }, [assets, total]);

  const filteredAssets = useMemo(() => {
    const list = filterClass === 'all' ? assets : assets.filter((a) => a.asset_class === filterClass);
    return [...list].sort((a, b) => b.gross_value - a.gross_value);
  }, [assets, filterClass]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    await extractAndSave(f);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isMaturityClose = (asset: ExtractAsset) => {
    if (!asset.maturity_date) return false;
    try {
      const d = differenceInDays(parseISO(asset.maturity_date), new Date());
      return d >= 0 && d <= 90;
    } catch {
      return false;
    }
  };

  if (!clientId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Salve o cliente antes de utilizar o módulo Extrato.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* HEADER: upload + seletor */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
          <div>
            <CardTitle className="text-lg">Extrato do Cliente</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Anexe um PDF de qualquer corretora — a IA classifica e organiza tudo automaticamente.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isExtracting}
            >
              {isExtracting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Anexar Extrato</>
              )}
            </Button>
          </div>
        </CardHeader>

        {snapshots.length > 0 && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-muted-foreground">Snapshot:</span>
              <Select
                value={activeSnapshotId || ''}
                onValueChange={(v) => setActiveSnapshotId(v)}
              >
                <SelectTrigger className="h-8 w-[280px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {snapshots.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {format(parseISO(s.snapshot_date), 'dd/MM/yyyy', { locale: ptBR })}
                      {s.broker ? ` • ${s.broker}` : ''} • {fmtCurrency(s.total_patrimony)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeSnapshot && (
                <>
                  {activeSnapshot.pdf_filename && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <FileText className="w-3 h-3" /> {activeSnapshot.pdf_filename}
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm('Remover este snapshot?')) deleteSnapshot(activeSnapshot.id);
                    }}
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive ml-auto"
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Remover
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {snapshots.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhum extrato anexado ainda. Clique em <strong>Anexar Extrato</strong> para começar.
          </CardContent>
        </Card>
      )}

      {activeSnapshot && (
        <>
          {/* ALERTAS */}
          {(concentrationAlerts.length > 0 || upcomingMaturities.length > 0) && (
            <div className="grid md:grid-cols-2 gap-3">
              {concentrationAlerts.length > 0 && (
                <Card className="border-amber-300 bg-amber-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
                      <AlertTriangle className="w-4 h-4" /> Concentração por emissor (&gt;20%)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs space-y-1">
                    {concentrationAlerts.map((c) => (
                      <div key={c.issuer} className="flex justify-between">
                        <span className="truncate pr-2">{c.issuer}</span>
                        <span className="font-semibold">{fmtPct(c.pct)} • {fmtCurrency(c.value)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {upcomingMaturities.length > 0 && (
                <Card className="border-red-300 bg-red-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-800">
                      <AlertTriangle className="w-4 h-4" /> Vencimentos nos próximos 90 dias
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs space-y-1">
                    {upcomingMaturities.map((a) => (
                      <div key={a.id} className="flex justify-between">
                        <span className="truncate pr-2">{a.asset_name}</span>
                        <span className="font-semibold">
                          {format(parseISO(a.maturity_date!), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* CARDS POR CLASSE */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {ALL_CLASSES.map((c) => {
              const t = totalsByClass[c];
              return (
                <Card key={c} className={`border ${CLASS_COLORS[c]}`}>
                  <CardContent className="p-3">
                    <div className="text-xs font-medium opacity-80">{c}</div>
                    <div className="text-base font-bold mt-1">{fmtCurrency(t.value)}</div>
                    <div className="text-xs opacity-70 mt-0.5">
                      {fmtPct(t.pct)} • {t.count} ativo{t.count !== 1 ? 's' : ''}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* RESUMO + ISENÇÃO IR */}
          <div className="grid md:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Patrimônio total</div>
                <div className="text-2xl font-bold mt-1">{fmtCurrency(total)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Total de ativos</div>
                <div className="text-2xl font-bold mt-1">{assets.length}</div>
              </CardContent>
            </Card>
            <Card className="border-emerald-300 bg-emerald-50/40">
              <CardContent className="p-4">
                <div className="text-xs text-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Isento de IR
                </div>
                <div className="text-2xl font-bold mt-1 text-emerald-800">
                  {fmtCurrency(taxExempt.value)}
                </div>
                <div className="text-xs text-emerald-700">{fmtPct(taxExempt.pct)} da carteira</div>
              </CardContent>
            </Card>
          </div>

          {/* TABELA */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
              <CardTitle className="text-base">Composição da carteira</CardTitle>
              <Select value={filterClass} onValueChange={(v) => setFilterClass(v as any)}>
                <SelectTrigger className="h-8 w-[200px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as classes</SelectItem>
                  {ALL_CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Taxa</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                    <TableHead className="text-right">% Carteira</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                        Sem ativos nesta seleção.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredAssets.map((a) => {
                    const matClose = isMaturityClose(a);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{a.asset_name}</span>
                            {a.is_tax_exempt && (
                              <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100">
                                Isento IR
                              </Badge>
                            )}
                          </div>
                          {a.issuer && (
                            <div className="text-xs text-muted-foreground">{a.issuer}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{a.asset_type}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${CLASS_COLORS[a.asset_class as AssetClass] || ''}`}>
                            {a.asset_class}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{a.rate || '—'}</TableCell>
                        <TableCell className={`text-sm ${matClose ? 'text-red-600 font-semibold' : ''}`}>
                          {a.maturity_date
                            ? format(parseISO(a.maturity_date), 'dd/MM/yyyy')
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {fmtCurrency(a.gross_value)}
                        </TableCell>
                        <TableCell className="text-right text-sm">{fmtPct(a.percentage)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
