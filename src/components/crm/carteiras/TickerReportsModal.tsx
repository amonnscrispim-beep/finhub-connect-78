import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, BarChart3 } from 'lucide-react';
import { categoryConfig } from '../relatorios/BibliotecaResumos';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ticker: string;
}

interface Report {
  id: string;
  title: string;
  ticker: string | null;
  markdown_content: string;
  report_type: string;
  category: string | null;
  created_at: string;
  is_read: boolean;
  is_saved: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `há ${days} dia${days > 1 ? 's' : ''}`;
  const months = Math.floor(days / 30);
  return `há ${months} mês${months > 1 ? 'es' : ''}`;
}

function getPreview(md: string): string {
  return md
    .replace(/^#{1,3}\s.+$/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(' ')
    .slice(0, 140);
}

export function TickerReportsModal({ open, onOpenChange, ticker }: Props) {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewReport, setViewReport] = useState<Report | null>(null);

  useEffect(() => {
    if (open && user && ticker) {
      setLoading(true);
      supabase
        .from('summary_reports')
        .select('*')
        .eq('user_id', user.id)
        .ilike('ticker', `%${ticker}%`)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setReports((data || []) as unknown as Report[]);
          setLoading(false);
        });
    }
  }, [open, user, ticker]);

  return (
    <>
      <Dialog open={open && !viewReport} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Relatórios — {ticker}</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground gap-2">
              <BarChart3 className="w-10 h-10 opacity-30" />
              <p className="text-sm">Nenhum relatório encontrado para {ticker}.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reports.map(report => {
                const cat = categoryConfig[(report as any).category || report.report_type] || categoryConfig.analise_ativo;
                return (
                  <button
                    key={report.id}
                    onClick={() => setViewReport(report)}
                    className="border border-border rounded-lg p-3 hover:shadow-md hover:border-primary/30 transition-all flex flex-col gap-1.5 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {timeAgo(report.created_at)}
                      </span>
                      <span className="text-[11px] flex items-center gap-1 text-muted-foreground">
                        {cat.emoji} {cat.label}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{report.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{getPreview(report.markdown_content)}</p>
                    {report.ticker && (
                      <div className="flex gap-1 mt-1">
                        {report.ticker.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                          <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {viewReport && (
        <ResumoDetailModal
          open={!!viewReport}
          onOpenChange={(v) => { if (!v) setViewReport(null); }}
          report={viewReport as any}
        />
      )}
    </>
  );
}
