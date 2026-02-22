import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Copy, Download, RefreshCw, FileText, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Client } from '@/types/client';

interface ResumoRelatorioProps {
  client: Client;
  formData: any;
  consultantObservation: string;
  onConsultantObservationChange: (value: string) => void;
}

export function ResumoRelatorio({ 
  client, 
  formData, 
  consultantObservation, 
  onConsultantObservationChange 
}: ResumoRelatorioProps) {
  const [technicalReport, setTechnicalReport] = useState('');
  const [clientReport, setClientReport] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const generateReports = useCallback(async () => {
    setIsGenerating(true);
    try {
      // Gather performance summary from reports if available
      let performanceSummary = '';
      if (client?.id) {
        const { data: reports } = await supabase
          .from('performance_reports')
          .select('broker, patrimonio_bruto, patrimonio_liquido, rent_mes, rent_ano, rent_12m, technical_summary, alerts')
          .eq('client_id', client.id)
          .eq('status', 'extracted');
        
        if (reports && reports.length > 0) {
          const parts = reports.map((r: any) => {
            const items = [`Corretora: ${r.broker || 'N/A'}`];
            if (r.patrimonio_bruto) items.push(`Bruto: R$ ${Number(r.patrimonio_bruto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
            if (r.patrimonio_liquido) items.push(`Líquido: R$ ${Number(r.patrimonio_liquido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
            if (r.rent_ano) items.push(`Rent. ano: ${r.rent_ano}%`);
            if (r.technical_summary) items.push(r.technical_summary);
            if (r.alerts && Array.isArray(r.alerts) && r.alerts.length > 0) items.push(`Alertas: ${r.alerts.join('; ')}`);
            return items.join(', ');
          });
          performanceSummary = parts.join('\n');
        }
      }

      const clientData = {
        name: formData.name,
        age: formData.age,
        profession: formData.profession,
        objective: formData.objective,
        investorProfile: formData.investorProfile,
        residence: formData.residence,
        city: formData.city,
        state: formData.state,
        financialAssets: formData.financialAssets,
        materialAssets: formData.materialAssets,
        businessAssets: formData.businessAssets,
        monthlyRevenue: formData.monthlyRevenue,
        monthlyContribution: formData.monthlyContribution,
        passiveIncome: formData.passiveIncome,
        monthlyLivingCost: formData.monthlyLivingCost,
        emergencyReserve: formData.emergencyReserve,
        emergencyReserveStatus: formData.emergencyReserveStatus,
        debts: formData.debts,
        debtsComments: formData.debtsComments,
        privatePensionStatus: formData.privatePensionStatus,
        privatePensionType: formData.privatePensionType,
        retirementAge: formData.retirementAge,
        retirementIncome: formData.retirementIncome,
        shortTermGoals: formData.shortTermGoals,
        mediumTermGoals: formData.mediumTermGoals,
        longTermGoals: formData.longTermGoals,
        arquiteturaCarteira: formData.arquiteturaCarteira,
        strategicDiagnostic: formData.strategicDiagnostic,
        protecaoSucessao: formData.protecaoSucessao,
        successionPlanning: formData.successionPlanning,
        consultingInitialPatrimony: formData.consultingInitialPatrimony,
        consultingFinalPatrimony: formData.consultingFinalPatrimony,
        observations: formData.observations,
        workDone: formData.workDone,
        moduleNotes: formData.moduleNotes,
        performanceSummary,
      };

      const { data, error } = await supabase.functions.invoke('generate-client-report', {
        body: { clientData, consultantObservation },
      });

      if (error) throw new Error(error.message || 'Erro ao gerar relatórios');
      if (data?.error) throw new Error(data.error);

      setTechnicalReport(data.technicalReport || '');
      setClientReport(data.clientReport || '');
      setGeneratedAt(new Date().toLocaleString('pt-BR'));
      setVersion(prev => prev + 1);
      toast.success('Relatórios gerados com sucesso!');
    } catch (err: any) {
      console.error('Error generating reports:', err);
      toast.error(err.message || 'Erro ao gerar relatórios');
    } finally {
      setIsGenerating(false);
    }
  }, [client?.id, formData, consultantObservation]);

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado!`);
    } catch {
      toast.error('Erro ao copiar');
    }
  }, []);

  const downloadPDF = useCallback((text: string, filename: string) => {
    // Generate a printable HTML and trigger browser print/save as PDF
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${filename}</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.7; color: #1a1a1a; }
  h1 { font-size: 22px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; color: #1e40af; }
  h2 { font-size: 16px; margin-top: 24px; color: #1e40af; }
  p { margin: 8px 0; }
  strong { color: #1e3a5f; }
  .meta { font-size: 12px; color: #666; margin-bottom: 24px; }
</style>
</head>
<body>
<h1>${filename}</h1>
<div class="meta">Cliente: ${formData.name || 'N/A'} | Gerado em: ${generatedAt || new Date().toLocaleString('pt-BR')} | Versão: ${version}</div>
${text.split('\n').map(line => {
      if (line.startsWith('**') && line.endsWith('**')) return `<h2>${line.replace(/\*\*/g, '')}</h2>`;
      if (line.trim() === '') return '<br/>';
      return `<p>${line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`;
    }).join('\n')}
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.onload = () => {
        setTimeout(() => win.print(), 500);
      };
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, [formData.name, generatedAt, version]);

  const hasReports = technicalReport || clientReport;

  return (
    <div className="space-y-6">
      {/* Generate / Update button */}
      <div className="flex items-center justify-between">
        <div>
          {generatedAt && (
            <p className="text-xs text-muted-foreground">
              Gerado em: {generatedAt} · Versão {version}
            </p>
          )}
        </div>
        <Button
          type="button"
          onClick={generateReports}
          disabled={isGenerating}
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando...
            </>
          ) : hasReports ? (
            <>
              <RefreshCw className="w-4 h-4" />
              Atualizar Relatórios
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Gerar Relatórios
            </>
          )}
        </Button>
      </div>

      {/* Consultant final observation */}
      <div className="space-y-2">
        <Label>Observações finais do consultor</Label>
        <Textarea
          value={consultantObservation}
          onChange={(e) => onConsultantObservationChange(e.target.value)}
          placeholder="Essas observações serão incorporadas no final de ambos os documentos..."
          className="crm-input min-h-[80px]"
        />
      </div>

      {isGenerating && (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Gerando relatórios com IA... Isso pode levar alguns segundos.</span>
        </div>
      )}

      {/* Technical Report */}
      {technicalReport && !isGenerating && (
        <div className="space-y-3 border border-border rounded-xl p-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Resumo Técnico do Consultor</h3>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Interno</span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(technicalReport, 'Resumo Técnico')}
                className="gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadPDF(technicalReport, 'Resumo Técnico do Consultor')}
                className="gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                PDF
              </Button>
            </div>
          </div>
          <div className="bg-card rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap border border-border">
            {technicalReport}
          </div>
        </div>
      )}

      {/* Client Report */}
      {clientReport && !isGenerating && (
        <div className="space-y-3 border border-border rounded-xl p-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Relatório do Cliente</h3>
              <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">Para enviar</span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(clientReport, 'Relatório do Cliente')}
                className="gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadPDF(clientReport, 'Relatório do Cliente')}
                className="gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                PDF
              </Button>
            </div>
          </div>
          <div className="bg-card rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap border border-border">
            {clientReport}
          </div>
        </div>
      )}

      {!hasReports && !isGenerating && (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Clique em "Gerar Relatórios" para criar automaticamente o resumo técnico e o relatório do cliente.</p>
          <p className="text-xs mt-1">Os textos são baseados em tudo que foi preenchido nos demais módulos.</p>
        </div>
      )}
    </div>
  );
}
