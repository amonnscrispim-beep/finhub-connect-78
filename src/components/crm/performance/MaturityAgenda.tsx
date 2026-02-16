import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ConsolidatedSummary, PositionWithOrigin } from './types';
import { fmt, fmtPct } from './utils';

interface MaturityAgendaProps {
  data: ConsolidatedSummary;
}

function MaturitySection({ positions, totalGross, label }: { positions: PositionWithOrigin[]; totalGross: number; label?: string }) {
  const now = new Date();
  const withMat = positions
    .filter(p => p.maturityDate && new Date(p.maturityDate) >= now)
    .sort((a, b) => new Date(a.maturityDate!).getTime() - new Date(b.maturityDate!).getTime());

  if (withMat.length === 0) return <p className="text-xs text-muted-foreground py-4">Nenhum vencimento futuro encontrado{label ? ` para ${label}` : ''}.</p>;

  const in6m = new Date(now); in6m.setMonth(in6m.getMonth() + 6);
  const in12m = new Date(now); in12m.setMonth(in12m.getMonth() + 12);
  const within6m = withMat.filter(p => new Date(p.maturityDate!) <= in6m);
  const sixTo12m = withMat.filter(p => new Date(p.maturityDate!) > in6m && new Date(p.maturityDate!) <= in12m);

  const byYear: Record<string, PositionWithOrigin[]> = {};
  withMat.forEach(p => {
    const yr = new Date(p.maturityDate!).getFullYear().toString();
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(p);
  });

  const renderGroup = (title: string, items: PositionWithOrigin[]) => {
    if (items.length === 0) return null;
    const total = items.reduce((s, p) => s + (p.grossBalance ?? 0), 0);
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h5 className="text-sm font-semibold text-foreground">{title}</h5>
          <Badge variant="outline" className="text-xs">{items.length} ativos • R$ {fmt(total)}</Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs min-w-[150px]">Ativo</TableHead>
                <TableHead className="text-xs">Vencimento</TableHead>
                <TableHead className="text-right text-xs">Valor (R$)</TableHead>
                <TableHead className="text-xs">Corretora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs font-medium">{p.name}</TableCell>
                  <TableCell className="text-xs">{new Date(p.maturityDate!).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="text-right text-xs">R$ {fmt(p.grossBalance)}</TableCell>
                  <TableCell className="text-xs">{p.broker}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderGroup('Próximos 6 meses', within6m)}
      {renderGroup('6 a 12 meses', sixTo12m)}

      {/* By Year */}
      <div className="space-y-2">
        <h5 className="text-sm font-semibold text-foreground">Por Ano</h5>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Ano</TableHead>
                <TableHead className="text-right text-xs">Total (R$)</TableHead>
                <TableHead className="text-right text-xs">Ativos</TableHead>
                <TableHead className="text-right text-xs">% Patrimônio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(byYear).sort(([a], [b]) => a.localeCompare(b)).map(([year, items]) => {
                const total = items.reduce((s, p) => s + (p.grossBalance ?? 0), 0);
                const pct = totalGross > 0 ? (total / totalGross) * 100 : 0;
                return (
                  <TableRow key={year}>
                    <TableCell className="text-xs font-medium">{year}</TableCell>
                    <TableCell className="text-right text-xs">R$ {fmt(total)}</TableCell>
                    <TableCell className="text-right text-xs">{items.length}</TableCell>
                    <TableCell className="text-right text-xs">{fmtPct(pct)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export function MaturityAgenda({ data }: MaturityAgendaProps) {
  const [agendaTab, setAgendaTab] = useState('consolidated');
  const [selectedBroker, setSelectedBroker] = useState('');
  const brokerNames = data.brokers.map(b => b.broker);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-foreground">Agenda de Vencimentos</h3>
      </div>
      <Tabs value={agendaTab} onValueChange={setAgendaTab}>
        <TabsList className="h-8">
          <TabsTrigger value="consolidated" className="text-xs">Consolidado</TabsTrigger>
          <TabsTrigger value="broker" className="text-xs">Por Corretora</TabsTrigger>
        </TabsList>
        <TabsContent value="consolidated" className="mt-3">
          <MaturitySection positions={data.positions} totalGross={data.totalGross} />
        </TabsContent>
        <TabsContent value="broker" className="mt-3 space-y-3">
          <Select value={selectedBroker} onValueChange={setSelectedBroker}>
            <SelectTrigger className="w-64 h-8 text-xs"><SelectValue placeholder="Selecione a corretora..." /></SelectTrigger>
            <SelectContent>
              {brokerNames.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          {selectedBroker ? (
            <MaturitySection
              positions={data.positions.filter(p => p.broker === selectedBroker)}
              totalGross={data.brokers.find(b => b.broker === selectedBroker)?.totalGross ?? 0}
              label={selectedBroker}
            />
          ) : (
            <p className="text-xs text-muted-foreground py-4">Selecione uma corretora.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
