import { useState, useCallback } from 'react';
import { Sparkles, Upload, X, PenLine, Bot, Paperclip, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { SummaryReport } from './GeradorResumos';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReportCreated: (report: SummaryReport) => void;
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

export function NovoRelatorioModal({ open, onOpenChange, onReportCreated }: Props) {
  const { user } = useAuth();
  const [category, setCategory] = useState('analise_ativo');
  const [title, setTitle] = useState('');
  const [tickerInput, setTickerInput] = useState('');
  const [tickers, setTickers] = useState<string[]>([]);
  const [refDate, setRefDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualContent, setManualContent] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiGenerated, setAiGenerated] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('write');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);

  const handleAddTicker = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tickerInput.trim()) {
      e.preventDefault();
      const t = tickerInput.trim().toUpperCase();
      if (!tickers.includes(t)) setTickers(prev => [...prev, t]);
      setTickerInput('');
    }
  };

  const handleImageUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.type === 'application/pdf') {
        handlePdfUpload(file);
        return;
      }
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) setUploadedImages(prev => [...prev, e.target!.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handlePdfUpload = useCallback(async (file: File) => {
    setIsTranscribing(true);
    setPdfFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      setPdfBase64(base64);

      // Auto-detect ticker from filename
      const tickerMatch = file.name.match(/([A-Z]{4}\d{1,2})/i);
      if (tickerMatch) {
        const t = tickerMatch[1].toUpperCase();
        if (!tickers.includes(t)) setTickers(prev => [...prev, t]);
      }

      const response = await supabase.functions.invoke('generate-summary-report', {
        body: { mode: 'transcribe_pdf', pdfBase64: base64, fileName: file.name },
      });
      if (response.error) throw new Error(response.error.message);
      const transcribed = response.data?.report;
      if (transcribed) {
        if (activeTab === 'write') {
          setManualContent(prev => prev ? prev + '\n\n' + transcribed : transcribed);
        } else {
          setAiInput(prev => prev ? prev + '\n\n' + transcribed : transcribed);
        }
        toast.success('PDF transcrito com sucesso!');
      }
    } catch (err: any) {
      toast.error('Erro ao transcrever PDF: ' + (err.message || ''));
    } finally {
      setIsTranscribing(false);
    }
  }, [activeTab, tickers]);

  const handleGenerateAI = async () => {
    if (!aiInput.trim()) { toast.error('Cole os dados para gerar.'); return; }
    setIsGenerating(true);
    try {
      const prompt = [
        `Categoria: ${categoryOptions.find(c => c.value === category)?.label}`,
        title ? `Título: ${title}` : '',
        tickers.length ? `Tickers: ${tickers.join(', ')}` : '',
        `Data: ${refDate}`,
        '', 'Dados:', aiInput,
      ].filter(Boolean).join('\n');

      const response = await supabase.functions.invoke('generate-summary-report', {
        body: { message: prompt, reportType: category },
      });
      if (response.error) throw new Error(response.error.message);
      const md = response.data?.report;
      if (!md) throw new Error('Resposta inválida');
      setAiGenerated(md);
      toast.success('Conteúdo gerado!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getFinalContent = (): string => {
    if (activeTab === 'ai' && aiGenerated) return aiGenerated;
    return manualContent;
  };

  const handleSave = async () => {
    const content = getFinalContent();
    if (!content.trim() && uploadedImages.length === 0) {
      toast.error('Adicione conteúdo ou imagens.');
      return;
    }
    if (!title.trim()) { toast.error('Preencha o título.'); return; }
    if (!user) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('summary_reports')
        .insert({
          user_id: user.id,
          title,
          report_type: category,
          category,
          ticker: tickers.join(', ') || null,
          ref_date: refDate,
          raw_input: activeTab === 'ai' ? aiInput : null,
          markdown_content: content || '',
          images: uploadedImages,
        } as any)
        .select()
        .single();

      if (error) throw error;
      onReportCreated(data as any);
      toast.success('Relatório salvo na Biblioteca!');
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setCategory('analise_ativo');
    setTickers([]);
    setTickerInput('');
    setManualContent('');
    setAiInput('');
    setAiGenerated('');
    setUploadedImages([]);
    setActiveTab('write');
    setPdfBase64(null);
    setPdfFileName(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-3 border-b border-border">
          <DialogTitle className="text-lg font-bold">Novo Relatório na Biblioteca</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6 space-y-4">
          {/* Category */}
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categoryOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder='Ex: "Radar FIIs #466"' />
          </div>

          {/* Tickers */}
          <div className="space-y-1.5">
            <Label>Tickers relacionados</Label>
            <Input
              value={tickerInput}
              onChange={e => setTickerInput(e.target.value)}
              onKeyDown={handleAddTicker}
              placeholder="Digite o ticker e pressione Enter"
            />
            {tickers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {tickers.map(t => (
                  <Badge key={t} variant="secondary" className="gap-1 text-xs">
                    {t}
                    <button onClick={() => setTickers(prev => prev.filter(x => x !== t))}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Content tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="write" className="flex-1 gap-1.5"><PenLine className="w-3.5 h-3.5" /> Escrever</TabsTrigger>
              <TabsTrigger value="ai" className="flex-1 gap-1.5"><Bot className="w-3.5 h-3.5" /> Gerar com IA</TabsTrigger>
              <TabsTrigger value="upload" className="flex-1 gap-1.5"><Paperclip className="w-3.5 h-3.5" /> Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="write">
              <Textarea
                value={manualContent}
                onChange={e => setManualContent(e.target.value)}
                placeholder="Escreva o conteúdo do relatório em Markdown..."
                className="min-h-[200px] resize-y"
              />
            </TabsContent>

            <TabsContent value="ai" className="space-y-3">
              <Textarea
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                placeholder="Cole aqui os dados brutos para gerar o relatório com IA..."
                className="min-h-[120px] resize-y"
              />
              <Button onClick={handleGenerateAI} disabled={isGenerating || !aiInput.trim()} className="w-full bg-primary text-primary-foreground">
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                    Gerando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Gerar com IA</span>
                )}
              </Button>
              {aiGenerated && (
                <div className="border border-border rounded-lg p-3 max-h-[200px] overflow-auto">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">Preview gerado:</p>
                  <pre className="text-xs whitespace-pre-wrap text-foreground">{aiGenerated}</pre>
                </div>
              )}
            </TabsContent>

            <TabsContent value="upload" className="space-y-3">
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => document.getElementById('lib-file-upload')?.click()}
              >
                <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Clique ou arraste imagens ou PDFs aqui</p>
                <input id="lib-file-upload" type="file" accept="image/*,.pdf" multiple className="hidden"
                  onChange={e => handleImageUpload(e.target.files)} />
              </div>
              {isTranscribing && (
                <div className="flex items-center gap-2 text-xs text-primary">
                  <span className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-t-transparent" />
                  Transcrevendo PDF com IA...
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
                <div className="grid grid-cols-4 gap-2">
                  {uploadedImages.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img} alt="" className="w-full h-20 object-cover rounded border border-border" />
                      <button onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Data de Referência</Label>
            <Input type="date" value={refDate} onChange={e => setRefDate(e.target.value)} />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <Button onClick={handleSave} disabled={isSaving} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            {isSaving ? 'Salvando...' : 'Salvar na Biblioteca'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
