import { BarChart3, User, Globe, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { SummaryReport } from './GeradorResumos';

interface Props {
  reports: SummaryReport[];
  isLoading: boolean;
  generatingId: string | null;
  onViewReport: (report: SummaryReport) => void;
}

const typeConfig: Record<string, { icon: React.ReactNode; label: string }> = {
  analise_ativo: { icon: <BarChart3 className="w-3 h-3" />, label: 'Ativo' },
  resumo_carteira: { icon: <User className="w-3 h-3" />, label: 'Carteira' },
  conjuntura_mercado: { icon: <Globe className="w-3 h-3" />, label: 'Mercado' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `há ${days}d`;
}

function getPreview(md: string, lines = 3): string {
  const clean = md
    .replace(/^#{1,3}\s.+$/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^- /gm, '• ')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  return clean.slice(0, lines).join(' ').slice(0, 200) + (clean.length > lines ? '...' : '');
}

export function FeedResumos({ reports, isLoading, generatingId, onViewReport }: Props) {
  return (
    <Card className="h-full border-border flex flex-col">
      <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Resumos de Mercado</CardTitle>
            <p className="text-xs text-primary-foreground/70 mt-0.5">Amonn Crispim — Consultor de Investimentos</p>
          </div>
          <Badge variant="secondary" className="text-xs">{reports.length} resumo{reports.length !== 1 ? 's' : ''}</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-4 space-y-3">
        {/* Generating skeleton */}
        {generatingId && (
          <div className="p-4 border border-border rounded-lg space-y-3 animate-pulse">
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        )}

        {isLoading && !reports.length ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 border border-border rounded-lg space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))
        ) : reports.length === 0 && !generatingId ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-16">
            <BarChart3 className="w-12 h-12 opacity-30" />
            <p className="text-sm">Nenhum resumo gerado ainda.</p>
            <p className="text-xs">Use o painel à esquerda para criar seu primeiro resumo.</p>
          </div>
        ) : (
          reports.map(report => {
            const type = typeConfig[report.report_type] || typeConfig.analise_ativo;
            return (
              <div
                key={report.id}
                className="p-4 border border-border rounded-lg hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group"
                onClick={() => onViewReport(report)}
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-2">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">AC</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">Amonn Crispim</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {timeAgo(report.created_at)}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground mt-0.5 truncate">{report.title}</h4>
                  </div>
                </div>

                {/* Preview */}
                <p className="text-xs text-muted-foreground leading-relaxed mb-2">{getPreview(report.markdown_content)}</p>

                {/* Footer tags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0">
                    {type.icon} {type.label}
                  </Badge>
                  {report.ticker && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-accent text-accent-foreground">{report.ticker}</Badge>
                  )}
                  {report.client_name && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{report.client_name}</Badge>
                  )}
                  <Button variant="link" size="sm" className="ml-auto text-xs p-0 h-auto text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    ver mais →
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
