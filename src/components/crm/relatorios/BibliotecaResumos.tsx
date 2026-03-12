import { useState, useMemo } from 'react';
import { Search, Plus, Clock, Check, Bookmark, BookmarkCheck, BarChart3, Building2, Globe, TrendingUp, FolderOpen, DollarSign, Newspaper, Share2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SharedBadge } from '@/components/ui/shared-badge';
import type { SummaryReport } from './GeradorResumos';

interface Props {
  reports: SummaryReport[];
  isLoading: boolean;
  onViewReport: (report: SummaryReport) => void;
  onNewReport: () => void;
  onToggleRead: (id: string, val: boolean) => void;
  onToggleSaved: (id: string, val: boolean) => void;
  isMaster?: boolean;
  userId?: string;
  onToggleShare?: (id: string, val: boolean) => void;
}

const categories = [
  { key: 'todos', label: 'Todos', icon: null },
  { key: 'radar_fiis', label: 'Radar FIIs', icon: <Building2 className="w-3 h-3" /> },
  { key: 'estrategia_macro', label: 'Estratégia Macro', icon: <TrendingUp className="w-3 h-3" /> },
  { key: 'global_journal', label: 'The Global Journal', icon: <Newspaper className="w-3 h-3" /> },
  { key: 'portfolio', label: 'Portfólio', icon: <FolderOpen className="w-3 h-3" /> },
  { key: 'analise_ativo', label: 'Análise de Ativo', icon: <BarChart3 className="w-3 h-3" /> },
  { key: 'renda_fixa', label: 'Renda Fixa', icon: <DollarSign className="w-3 h-3" /> },
  { key: 'internacional', label: 'Internacional', icon: <Globe className="w-3 h-3" /> },
];

export const categoryConfig: Record<string, { icon: React.ReactNode; emoji: string; label: string }> = {
  radar_fiis: { icon: <Building2 className="w-4 h-4" />, emoji: '🏢', label: 'Radar FIIs' },
  estrategia_macro: { icon: <TrendingUp className="w-4 h-4" />, emoji: '📈', label: 'Estratégia Macro' },
  global_journal: { icon: <Newspaper className="w-4 h-4" />, emoji: '📰', label: 'The Global Journal' },
  portfolio: { icon: <FolderOpen className="w-4 h-4" />, emoji: '📁', label: 'Portfólio' },
  analise_ativo: { icon: <BarChart3 className="w-4 h-4" />, emoji: '📊', label: 'Análise de Ativo' },
  renda_fixa: { icon: <DollarSign className="w-4 h-4" />, emoji: '💰', label: 'Renda Fixa' },
  internacional: { icon: <Globe className="w-4 h-4" />, emoji: '🌐', label: 'Internacional' },
  resumo_carteira: { icon: <FolderOpen className="w-4 h-4" />, emoji: '📁', label: 'Portfólio' },
  conjuntura_mercado: { icon: <TrendingUp className="w-4 h-4" />, emoji: '📈', label: 'Mercado' },
};

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
  const clean = md
    .replace(/^#{1,3}\s.+$/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^- /gm, '• ')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  return clean.slice(0, 2).join(' ').slice(0, 140) + (clean.length > 2 ? '...' : '');
}

function parseTickers(report: SummaryReport): string[] {
  const tickers: string[] = [];
  if (report.ticker) {
    report.ticker.split(',').map(t => t.trim()).filter(Boolean).forEach(t => tickers.push(t));
  }
  return tickers;
}

export function BibliotecaResumos({ reports, isLoading, onViewReport, onNewReport, onToggleRead, onToggleSaved }: Props) {
  const [activeCategory, setActiveCategory] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    let result = reports;
    if (activeCategory !== 'todos') {
      result = result.filter(r => (r as any).category === activeCategory || r.report_type === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.title.toLowerCase().includes(q) ||
        (r.ticker || '').toLowerCase().includes(q) ||
        r.markdown_content.toLowerCase().includes(q)
      );
    }
    return result;
  }, [reports, activeCategory, searchQuery]);

  const activeCatLabel = categories.find(c => c.key === activeCategory)?.label || '';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, ticker ou conteúdo..."
            className="pl-9"
          />
        </div>
        <Button onClick={onNewReport} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1.5" /> Novo Relatório
        </Button>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === cat.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-background border border-border text-foreground hover:bg-muted'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-border rounded-lg p-4 space-y-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <BarChart3 className="w-12 h-12 opacity-30" />
          <p className="text-sm">
            {searchQuery ? 'Nenhum resultado encontrado.' : `Nenhum relatório em ${activeCatLabel} ainda.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(report => {
            const cat = categoryConfig[(report as any).category || report.report_type] || categoryConfig.analise_ativo;
            const tickers = parseTickers(report);
            const isRead = (report as any).is_read;
            const isSaved = (report as any).is_saved;

            return (
              <div
                key={report.id}
                className="border border-border rounded-lg p-4 hover:shadow-md hover:border-primary/30 transition-all flex flex-col gap-2 group"
              >
                {/* Top row */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {timeAgo(report.created_at)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); onToggleRead(report.id, !isRead); }}
                      className={`p-1 rounded hover:bg-muted transition-colors ${isRead ? 'text-green-600' : 'text-muted-foreground/40'}`}
                      title={isRead ? 'Marcar como não lido' : 'Marcar como lido'}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); onToggleSaved(report.id, !isSaved); }}
                      className={`p-1 rounded hover:bg-muted transition-colors ${isSaved ? 'text-amber-500' : 'text-muted-foreground/40'}`}
                      title={isSaved ? 'Remover dos salvos' : 'Salvar'}
                    >
                      {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Category */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{cat.emoji}</span> <span>{cat.label}</span>
                </div>

                {/* Title */}
                <h4 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{report.title}</h4>

                {/* Preview */}
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{getPreview(report.markdown_content)}</p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-2">
                  <div className="flex flex-wrap gap-1">
                    {tickers.map(t => (
                      <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2.5"
                    onClick={() => onViewReport(report)}
                  >
                    Relatório
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
