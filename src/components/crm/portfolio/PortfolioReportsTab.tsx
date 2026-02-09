import { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, Copy, Save, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PortfolioAsset, PortfolioReport } from '@/hooks/useClientPortfolio';
import { toast } from 'sonner';

interface Props {
  reports: PortfolioReport[];
  assets: PortfolioAsset[];
  aporte: number;
  previousValues: Record<string, number>;
  onSave: (report: { id?: string; title: string; content: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function PortfolioReportsTab({ reports, assets, aporte, previousValues, onSave, onDelete }: Props) {
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const generateReport = useCallback(() => {
    const totalPrev = assets.reduce((s, a) => s + (previousValues[a.ticker] || 0), 0);
    const totalCurrent = totalPrev + aporte;
    const lines: string[] = [
      '=== RELATÓRIO DE CARTEIRA ===',
      '',
      '📊 ATIVOS RECOMENDADOS',
      '─'.repeat(40),
    ];
    assets.forEach(a => {
      lines.push(`${a.ticker || '(sem ticker)'} | ${a.name} | Classe: ${a.asset_class} | Peso: ${a.target_weight.toFixed(2)}% | Recom: ${a.recommendation}`);
      if (a.notes) lines.push(`   Obs: ${a.notes}`);
    });
    lines.push('', '💰 SIMULAÇÃO DE APORTE', '─'.repeat(40));
    lines.push(`Aporte: ${formatCurrency(aporte)}`);
    lines.push(`Total anterior: ${formatCurrency(totalPrev)}`);
    lines.push(`Total com aporte: ${formatCurrency(totalCurrent)}`);
    lines.push('');
    if (aporte > 0) {
      lines.push('COMPRAS SUGERIDAS:');
      assets.forEach(a => {
        const prev = previousValues[a.ticker] || 0;
        const target = totalCurrent * (a.target_weight / 100);
        const toBuy = Math.max(0, target - prev);
        if (toBuy > 0) lines.push(`  ${a.ticker}: Comprar ${formatCurrency(toBuy)}`);
      });
    }
    lines.push('', `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`);
    return lines.join('\n');
  }, [assets, aporte, previousValues]);

  const handleGenerate = () => {
    const content = generateReport();
    setEditId(null);
    setEditTitle(`Relatório ${new Date().toLocaleDateString('pt-BR')}`);
    setEditContent(content);
  };

  const handleSave = async () => {
    await onSave({ id: editId || undefined, title: editTitle, content: editContent });
    setEditId(null);
    setEditTitle('');
    setEditContent('');
    toast.success('Relatório salvo');
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copiado para a área de transferência');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={handleGenerate} className="gap-1">
          <FileText className="w-4 h-4" /> Gerar resumo
        </Button>
      </div>

      {(editTitle || editContent) && (
        <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/20">
          <Input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            placeholder="Título do relatório"
            className="font-semibold"
          />
          <Textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            rows={16}
            className="font-mono text-xs"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}><Save className="w-4 h-4 mr-1" /> Salvar</Button>
            <Button size="sm" variant="outline" onClick={() => handleCopy(editContent)}><Copy className="w-4 h-4 mr-1" /> Copiar</Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditTitle(''); setEditContent(''); setEditId(null); }}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Saved reports */}
      {reports.map(r => (
        <div key={r.id} className="border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">{r.title}</h4>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(r.content)}><Copy className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditId(r.id); setEditTitle(r.title); setEditContent(r.content); }}><Save className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('pt-BR')}</p>
          <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/40 p-3 rounded max-h-48 overflow-auto">{r.content}</pre>
        </div>
      ))}
    </div>
  );
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}
