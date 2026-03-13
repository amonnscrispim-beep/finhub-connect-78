import { useState, useCallback } from 'react';
import { Sparkles, Upload, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { SummaryReport } from './GeradorResumos';

interface Props {
  onReportCreated: (report: SummaryReport) => void;
  generatingId: string | null;
  setGeneratingId: (id: string | null) => void;
}

const categoryOptions = [
  { value: 'radar_fiis', label: 'Radar FIIs' },
  { value: 'estrategia_macro', label: 'Estratégia Macro' },
  { value: 'global_journal', label: 'The Global Journal' },
  { value: 'portfolio', label: 'Portfólio' },
  { value: 'analise_ativo', label: 'Análise de Ativo' },
  { value: 'renda_fixa', label: 'Renda Fixa' },
  { value: 'internacional', label: 'Internacional' },
];

export function PainelEntradaFeed({ onReportCreated, generatingId, setGeneratingId }: Props) {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('analise_ativo');
  const [title, setTitle] = useState('');
  const [mainText, setMainText] = useState('');
  const [ticker, setTicker] = useState('');
  const [clientName, setClientName] = useState('');
  const [refDate, setRefDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeProgress, setTranscribeProgress] = useState(0);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);

  const isGenerating = !!generatingId;

  const handleImageUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) setUploadedImages(prev => [...prev, e.target!.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handlePdfUpload = useCallback(async (file: File) => {
    if (!user) return;
    setIsTranscribing(true);
    setTranscribeProgress(20);
    setPdfFileName(file.name);

    try {
      // Read PDF as base64
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      setPdfBase64(base64);
      setTranscribeProgress(40);

      // Auto-detect ticker from filename
      const tickerMatch = file.name.match(/([A-Z]{4}\d{1,2})/i);
      if (tickerMatch && !ticker) setTicker(tickerMatch[1].toUpperCase());

      // Send to edge function for transcription
      setTranscribeProgress(60);
      const response = await supabase.functions.invoke('generate-summary-report', {
        body: { mode: 'transcribe_pdf', pdfBase64: base64, fileName: file.name },
      });

      setTranscribeProgress(90);
      if (response.error) throw new Error(response.error.message);
      const transcribed = response.data?.report;
      if (transcribed) {
        setMainText(prev => prev ? prev + '\n\n' + transcribed : transcribed);
        toast.success('PDF transcrito com sucesso!');
      }
      setTranscribeProgress(100);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao transcrever PDF: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setTimeout(() => {
        setIsTranscribing(false);
        setTranscribeProgress(0);
      }, 500);
    }
  }, [user, ticker]);

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.type === 'application/pdf') {
        handlePdfUpload(file);
      } else if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) setUploadedImages(prev => [...prev, e.target!.result as string]);
        };
        reader.readAsDataURL(file);
      }
    });
  }, [handlePdfUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleGenerate = async () => {
    if (!mainText.trim()) { toast.error('Cole os dados no campo de texto.'); return; }
    if (!user) { toast.error('Faça login para gerar resumos.'); return; }

    const tempId = crypto.randomUUID();
    setGeneratingId(tempId);

    try {
      const catLabel = categoryOptions.find(c => c.value === reportType)?.label || reportType;
      const userPrompt = [
        `Tipo de relatório: ${catLabel}`,
        title ? `Título: ${title}` : '',
        clientName ? `Cliente: ${clientName}` : '',
        ticker ? `Ticker/Ativo: ${ticker}` : '',
        `Data de referência: ${refDate}`,
        '', 'Dados fornecidos:', mainText,
        uploadedImages.length > 0 ? `\n(${uploadedImages.length} imagem(ns) anexada(s))` : '',
      ].filter(Boolean).join('\n');

      const response = await supabase.functions.invoke('generate-summary-report', {
        body: { message: userPrompt, reportType },
      });

      if (response.error) throw new Error(response.error.message);
      const markdown = response.data?.report;
      if (!markdown) throw new Error('Resposta inválida da IA');

      // Upload PDF to storage if present
      let storedPdfUrl: string | null = null;
      if (pdfBase64 && pdfFileName) {
        const sanitizedName = pdfFileName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${user.id}/${Date.now()}_${sanitizedName}`;
        const { error: uploadError } = await supabase.storage
          .from('summary-report-files')
          .upload(path, Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0)), { contentType: 'application/pdf' });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('summary-report-files').getPublicUrl(path);
          storedPdfUrl = urlData.publicUrl;
        }
      }

      const { data: inserted, error: dbError } = await supabase
        .from('summary_reports')
        .insert({
          user_id: user.id,
          title: title || `${catLabel} — ${refDate}`,
          report_type: reportType,
          category: reportType,
          ticker: ticker || null,
          client_name: clientName || null,
          ref_date: refDate,
          raw_input: mainText,
          markdown_content: markdown,
          images: uploadedImages,
          pdf_url: storedPdfUrl,
        } as any)
        .select()
        .single();

      if (dbError) throw dbError;

      onReportCreated(inserted as SummaryReport);
      toast.success('Resumo gerado com sucesso!');

      // Reset form
      setTitle('');
      setMainText('');
      setTicker('');
      setClientName('');
      setUploadedImages([]);
      setPdfBase64(null);
      setPdfFileName(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao gerar resumo.');
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <Card className="h-full border-border">
      <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
        <CardTitle className="text-lg">Criar Resumo</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3 overflow-auto max-h-[calc(75vh-60px)]">
        <div className="space-y-1.5">
          <Label>Tipo de Relatório</Label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {categoryOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Título do Resumo</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder='Ex: "PETR4: Resultados 4T25"' />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Ticker/Ativo</Label>
            <Input value={ticker} onChange={e => setTicker(e.target.value)} placeholder="Ex: PETR4" />
          </div>
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Dados e Observações</Label>
          <Textarea
            value={mainText}
            onChange={e => setMainText(e.target.value)}
            placeholder="Cole aqui os dados, resultados, análises brutas..."
            className="min-h-[120px] resize-y"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Imagens / PDF</Label>
          <div
            className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('feed-file-upload')?.click()}
          >
            <Upload className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Arraste imagens ou PDF</p>
            <input id="feed-file-upload" type="file" accept="image/*,.pdf" multiple className="hidden"
              onChange={e => handleFileUpload(e.target.files)} />
          </div>

          {isTranscribing && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-primary">
                <span className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-t-transparent" />
                Transcrevendo PDF com IA...
              </div>
              <Progress value={transcribeProgress} className="h-1.5" />
            </div>
          )}

          {pdfFileName && !isTranscribing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded px-2 py-1">
              <FileText className="w-3.5 h-3.5" />
              <span className="truncate flex-1">{pdfFileName}</span>
              <button onClick={() => { setPdfBase64(null); setPdfFileName(null); }} className="text-destructive hover:text-destructive/80">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {uploadedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {uploadedImages.map((img, i) => (
                <div key={i} className="relative group w-12 h-12">
                  <img src={img} alt="" className="w-full h-full object-cover rounded border border-border" />
                  <button onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Data de Referência</Label>
          <Input type="date" value={refDate} onChange={e => setRefDate(e.target.value)} />
        </div>

        <Button onClick={handleGenerate} disabled={isGenerating || !mainText.trim()}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10">
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
              Gerando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Gerar Resumo
            </span>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
