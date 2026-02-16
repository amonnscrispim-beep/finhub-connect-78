import { Building2 } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { BrokerSummary } from './types';
import { fmt, fmtPct } from './utils';
import { LiquidityChart } from './LiquidityChart';

interface BrokerCardProps {
  data: BrokerSummary;
}

export function BrokerCard({ data }: BrokerCardProps) {
  return (
    <div className="p-4 bg-card rounded-xl border border-border shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-foreground text-sm">{data.broker}</h4>
          <p className="text-xs text-muted-foreground">{data.positions.length} ativos • {data.reports.length} relatório(s)</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-foreground">R$ {fmt(data.totalGross)}</p>
          <p className="text-xs text-muted-foreground">Patrimônio bruto</p>
          {data.hasNet ? (
            <p className="text-xs text-muted-foreground">Líquido: R$ {fmt(data.totalNet)}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic">Líquido: não informado</p>
          )}
        </div>
      </div>

      {/* Liquidity Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Faixa de prazo</TableHead>
              <TableHead className="text-right text-xs">Valor (R$)</TableHead>
              <TableHead className="text-right text-xs">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.liquidityBands.map(b => (
              <TableRow key={b.key}>
                <TableCell className="text-xs">{b.label}</TableCell>
                <TableCell className="text-right text-xs font-medium">R$ {fmt(b['valueR$'])}</TableCell>
                <TableCell className="text-right text-xs">{fmtPct(b.pct)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold bg-muted/30">
              <TableCell className="text-xs">Total</TableCell>
              <TableCell className="text-right text-xs">R$ {fmt(data.totalGross)}</TableCell>
              <TableCell className="text-right text-xs">100%</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Mini Chart */}
      <LiquidityChart bands={data.liquidityBands} height={180} />
    </div>
  );
}
