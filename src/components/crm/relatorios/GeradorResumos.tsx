import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PainelEntradaFeed } from './PainelEntradaFeed';
import { FeedResumos } from './FeedResumos';
import { ResumoDetailModal } from './ResumoDetailModal';
import { WhatsAppModal } from './WhatsAppModal';
import { BibliotecaResumos } from './BibliotecaResumos';
import { BibliotecaDetailModal } from './BibliotecaDetailModal';
import { NovoRelatorioModal } from './NovoRelatorioModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMaster } from '@/hooks/useIsMaster';
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
  category?: string;
  is_read?: boolean;
  is_saved?: boolean;
  shared?: boolean;
  user_id?: string;
}

export function GeradorResumos() {
  const { user } = useAuth();
  const isMaster = useIsMaster();
  const [reports, setReports] = useState<SummaryReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<SummaryReport | null>(null);
  const [libSelectedReport, setLibSelectedReport] = useState<SummaryReport | null>(null);
  const [whatsAppReport, setWhatsAppReport] = useState<SummaryReport | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  useEffect(() => {
    if (user) fetchReports();
  }, [user]);

  const fetchReports = async () => {
    // RLS now returns own + shared reports
    const { data, error } = await supabase
      .from('summary_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setReports(data as any as SummaryReport[]);
    setIsLoading(false);
  };

  const handleToggleShare = async (id: string, val: boolean) => {
    await supabase.from('summary_reports').update({ shared: val } as any).eq('id', id);
    setReports(prev => prev.map(r => r.id === id ? { ...r, shared: val } : r));
    toast.success(val ? 'Resumo compartilhado!' : 'Compartilhamento removido.');
  };

  const handleNewReport = (report: SummaryReport) => {
    setReports(prev => [report, ...prev]);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('summary_reports').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir.'); return; }
    setReports(prev => prev.filter(r => r.id !== id));
    setSelectedReport(null);
    setLibSelectedReport(null);
    toast.success('Relatório excluído.');
  };

  const handleToggleRead = async (id: string, val: boolean) => {
    await supabase.from('summary_reports').update({ is_read: val } as any).eq('id', id);
    setReports(prev => prev.map(r => r.id === id ? { ...r, is_read: val } : r));
  };

  const handleToggleSaved = async (id: string, val: boolean) => {
    await supabase.from('summary_reports').update({ is_saved: val } as any).eq('id', id);
    setReports(prev => prev.map(r => r.id === id ? { ...r, is_saved: val } : r));
  };

  const handleUpdateContent = (id: string, content: string) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, markdown_content: content } : r));
    if (selectedReport?.id === id) setSelectedReport(prev => prev ? { ...prev, markdown_content: content } : null);
    if (libSelectedReport?.id === id) setLibSelectedReport(prev => prev ? { ...prev, markdown_content: content } : null);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="novo" className="w-full">
        <TabsList>
          <TabsTrigger value="novo">Novo Resumo</TabsTrigger>
          <TabsTrigger value="biblioteca">Biblioteca</TabsTrigger>
        </TabsList>

        <TabsContent value="novo">
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
                isMaster={isMaster}
                userId={user?.id}
                onToggleShare={handleToggleShare}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="biblioteca">
          <BibliotecaResumos
            reports={reports}
            isLoading={isLoading}
            onViewReport={setLibSelectedReport}
            onNewReport={() => setShowNewModal(true)}
            onToggleRead={handleToggleRead}
            onToggleSaved={handleToggleSaved}
          />
        </TabsContent>
      </Tabs>

      {selectedReport && (
        <ResumoDetailModal
          report={selectedReport}
          open={!!selectedReport}
          onOpenChange={(open) => !open && setSelectedReport(null)}
          onDelete={handleDelete}
          onWhatsApp={() => setWhatsAppReport(selectedReport)}
          onUpdate={handleUpdateContent}
        />
      )}

      {libSelectedReport && (
        <BibliotecaDetailModal
          report={libSelectedReport}
          open={!!libSelectedReport}
          onOpenChange={(open) => !open && setLibSelectedReport(null)}
          onDelete={handleDelete}
          onWhatsApp={() => setWhatsAppReport(libSelectedReport)}
          onUpdate={handleUpdateContent}
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

      <NovoRelatorioModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        onReportCreated={handleNewReport}
      />
    </div>
  );
}
