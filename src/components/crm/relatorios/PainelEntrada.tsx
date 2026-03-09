import { useState, useCallback } from 'react';
import { Sparkles, Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  onReportGenerated: (markdown: string) => void;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  uploadedImages: string[];
  setUploadedImages: (imgs: string[]) => void;
  clientName: string;
  setClientName: (name: string) => void;
}

export function PainelEntrada({
  onReportGenerated, isGenerating, setIsGenerating,
  uploadedImages, setUploadedImages, clientName, setClientName
}: Props) {
  const [reportType, setReportType] = useState('analise_ativo');
  const [mainText, setMainText] = useState('');
  const [ticker, setTicker] = useState('');
  const [refDate, setRefDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDragging, setIsDragging] = useState(false);

  const handleImageUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setUploadedImages([...uploadedImages, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [setUploadedImages]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleImageUpload(e.dataTransfer.files);
  }, [handleImageUpload]);

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  const reportTypeLabels: Record<string, string> = {
    analise_ativo: 'Análise de Ativo/Ação',
    resumo_carteira: 'Resumo de Carteira do Cliente',
    conjuntura_mercado: 'Conjuntura de Mercado',
  };

  const handleGenerate = async () => {
    if (!mainText.trim()) {
      toast.error('Cole os dados ou observações no campo de texto.');
      return;
    }

    setIsGenerating(true);
    onReportGenerated('');

    try {
      const userPrompt = [
        `Tipo de relatório: ${reportTypeLabels[reportType]}`,
        clientName ? `Cliente: ${clientName}` : '',
        ticker ? `Ticker/Ativo: ${ticker}` : '',
        `Data de referência: ${refDate}`,
        '',
        'Dados fornecidos:',
        mainText,
        uploadedImages.length > 0 ? `\n(${uploadedImages.length} imagem(ns) anexada(s) pelo consultor para contexto visual)` : '',
      ].filter(Boolean).join('\n');

      const response = await supabase.functions.invoke('generate-summary-report', {
        body: { message: userPrompt, reportType },
      });

      if (response.error) throw new Error(response.error.message);

      const data = response.data;
      if (data?.report) {
        onReportGenerated(data.report);
        toast.success('Relatório gerado com sucesso!');
      } else {
        throw new Error('Resposta inválida da IA');
      }
    } catch (err: any) {
      console.error('Error generating report:', err);
      toast.error(err.message || 'Erro ao gerar relatório. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="h-full border-border">
      <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
        <CardTitle className="text-lg">Painel de Entrada</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Report Type */}
        <div className="space-y-1.5">
          <Label>Tipo de Relatório</Label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="analise_ativo">Análise de Ativo/Ação</SelectItem>
              <SelectItem value="resumo_carteira">Resumo de Carteira do Cliente</SelectItem>
              <SelectItem value="conjuntura_mercado">Conjuntura de Mercado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Main Text */}
        <div className="space-y-1.5">
          <Label>Dados e Observações</Label>
          <Textarea
            value={mainText}
            onChange={(e) => setMainText(e.target.value)}
            placeholder="Cole aqui os dados, resultados, análises brutas..."
            className="min-h-[180px] resize-y"
          />
        </div>

        {/* Image Upload */}
        <div className="space-y-1.5">
          <Label>Imagens (tabelas, gráficos)</Label>
          <div
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('image-upload')?.click()}
          >
            <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Arraste imagens ou clique para enviar</p>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files)}
            />
          </div>

          {uploadedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {uploadedImages.map((img, i) => (
                <div key={i} className="relative group w-16 h-16">
                  <img src={img} alt="" className="w-full h-full object-cover rounded-md border border-border" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Context Fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Nome do Cliente</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="space-y-1.5">
            <Label>Ticker/Ativo</Label>
            <Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="Ex: PETR4" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Data de Referência</Label>
          <Input type="date" value={refDate} onChange={(e) => setRefDate(e.target.value)} />
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !mainText.trim()}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-base"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
              Gerando relatório...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Gerar Relatório
            </span>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
