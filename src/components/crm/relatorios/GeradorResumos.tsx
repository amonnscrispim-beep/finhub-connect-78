import { useState, useEffect } from 'react';
import { PainelEntradaFeed } from './PainelEntradaFeed';
import { FeedResumos } from './FeedResumos';
import { ResumoDetailModal } from './ResumoDetailModal';
import { WhatsAppModal } from './WhatsAppModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface SummaryReport {
  id: string;
  title: string;
  report_type: string;
  ticker: string | null;
  client_name: string | null;
  ref_date: string | null;
  markdown_content: string;
  images: string[];
  created_at: string;
}

export function GeradorResumos() {
  const { user } = useAuth();
  const [reports, setReports] = useState<SummaryReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<SummaryReport | null>(null);
  const [whatsAppReport, setWhatsAppReport] = useState<SummaryReport | null>(null);

  useEffect(() => {
    if (user) fetchReports();
  }, [user]);

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('summary_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setReports(data as SummaryReport[]);
    setIsLoading(false);
  };

  const handleNewReport = async (report: SummaryReport) => {
    setReports(prev => [report, ...prev]);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('summary_reports').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir resumo.'); return; }
    setReports(prev => prev.filter(r => r.id !== id));
    setSelectedReport(null);
    toast.success('Resumo excluído.');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[75vh]">
        <div className="lg:col-span-4">
          <PainelEntradaFeed
            onReportCreated={handleNewReport}
            generatingId={generatingId}
            setGeneratingId={setGeneratingId}
          />
        </div>
        <div className="lg:col-span-8">
          <FeedResumos
            reports={reports}
            isLoading={isLoading}
            generatingId={generatingId}
            onViewReport={setSelectedReport}
          />
        </div>
      </div>

      {selectedReport && (
        <ResumoDetailModal
          report={selectedReport}
          open={!!selectedReport}
          onOpenChange={(open) => !open && setSelectedReport(null)}
          onDelete={handleDelete}
          onWhatsApp={() => setWhatsAppReport(selectedReport)}
        />
      )}

      {whatsAppReport && (
        <WhatsAppModal
          open={!!whatsAppReport}
          onOpenChange={(open) => !open && setWhatsAppReport(null)}
          reportMarkdown={whatsAppReport.markdown_content}
          clientName={whatsAppReport.client_name || ''}
        />
      )}
    </div>
  );
}
