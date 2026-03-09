import { useState, useCallback } from 'react';
import { Sparkles, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { SummaryReport } from './GeradorResumos';

interface Props {
  onReportCreated: (report: SummaryReport) => void;
  generatingId: string | null;
  setGeneratingId: (id: string | null) => void;
}

const reportTypeLabels: Record<string, string> = {
  analise_ativo: 'Análise de Ativo/Ação',
  resumo_carteira: 'Resumo de Carteira',
  conjuntura_mercado: 'Conjuntura de Mercado',
};

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleImageUpload(e.dataTransfer.files);
  }, [handleImageUpload]);

  const handleGenerate = async () => {
    if (!mainText.trim()) { toast.error('Cole os dados no campo de texto.'); return; }
    if (!user) { toast.error('Faça login para gerar resumos.'); return; }

    const tempId = crypto.randomUUID();
    setGeneratingId(tempId);

    try {
      const userPrompt = [
        `Tipo de relatório: ${reportTypeLabels[reportType]}`,
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

      const { data: inserted, error: dbError } = await supabase
        .from('summary_reports')
        .insert({
          user_id: user.id,
          title: title || `${reportTypeLabels[reportType]} — ${refDate}`,
          report_type: reportType,
          ticker: ticker || null,
          client_name: clientName || null,
          ref_date: refDate,
          raw_input: mainText,
          markdown_content: markdown,
          images: uploadedImages,
        })
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
              <SelectItem value="analise_ativo">Análise de Ativo/Ação</SelectItem>
              <SelectItem value="resumo_carteira">Resumo de Carteira</SelectItem>
              <SelectItem value="conjuntura_mercado">Conjuntura de Mercado</SelectItem>
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
          <Label>Imagens</Label>
          <div
            className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('feed-image-upload')?.click()}
          >
            <Upload className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Arraste ou clique</p>
            <input id="feed-image-upload" type="file" accept="image/*" multiple className="hidden"
              onChange={e => handleImageUpload(e.target.files)} />
          </div>
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
