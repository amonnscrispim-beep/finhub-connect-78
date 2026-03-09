import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Pencil, Trash2, GripVertical, RefreshCw } from 'lucide-react';
import { RecommendedPortfolio, PortfolioAsset } from './CarteirasRecomendadas';
import { AssetModal } from './AssetModal';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  portfolio: RecommendedPortfolio;
  assets: PortfolioAsset[];
  onBack: () => void;
  onRefresh: () => Promise<void>;
}

function SortableRow({ asset, onEdit, onDelete }: { asset: PortfolioAsset; index: number; onEdit: (a: PortfolioAsset) => void; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: asset.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const rentabilidade = asset.current_price && asset.entry_price > 0
    ? ((asset.current_price - asset.entry_price) / asset.entry_price) * 100
    : null;

  const bias = asset.manual_bias || (
    asset.current_price !== null
      ? (asset.current_price < asset.ceiling_price ? 'Comprar' : 'Aguardar')
      : '—'
  );
  const biasColor = bias === 'Comprar' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : bias === 'Aguardar' ? 'bg-amber-100 text-amber-700 border-amber-300' : '';

  return (
    <TableRow ref={setNodeRef} style={style} className="group">
      <TableCell className="w-10">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground">
          <GripVertical className="w-4 h-4" />
        </button>
      </TableCell>
      <TableCell className="font-medium">{asset.display_order + 1}</TableCell>
      <TableCell className="font-mono font-semibold">{asset.ticker}</TableCell>
      <TableCell>{asset.company_name}</TableCell>
      <TableCell className="text-muted-foreground">{asset.sector || '—'}</TableCell>
      <TableCell className="text-right">R$ {Number(asset.entry_price).toFixed(2)}</TableCell>
      <TableCell className="text-right font-medium">
        {asset.current_price !== null ? `R$ ${Number(asset.current_price).toFixed(2)}` : '...'}
      </TableCell>
      <TableCell className="text-right">R$ {Number(asset.ceiling_price).toFixed(2)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Progress value={Number(asset.allocation_pct)} className="h-2 w-16" />
          <span className="text-xs font-medium">{Number(asset.allocation_pct).toFixed(1)}%</span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        {rentabilidade !== null ? (
          <span className={`font-semibold ${rentabilidade >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
            {rentabilidade >= 0 ? '+' : ''}{rentabilidade.toFixed(2)}%
          </span>
        ) : '—'}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={biasColor}>{bias}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(asset)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(asset.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function CarteiraDetail({ portfolio, assets: initialAssets, onBack, onRefresh }: Props) {
  const { user } = useAuth();
  const [assets, setAssets] = useState<PortfolioAsset[]>(initialAssets);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<PortfolioAsset | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    setAssets(initialAssets);
  }, [initialAssets]);

  const fetchPrices = useCallback(async () => {
    if (assets.length === 0) return;
    setRefreshing(true);
    try {
      const tickers = assets.map(a => ({ ticker: a.ticker, international: a.is_international }));
      const { data, error } = await supabase.functions.invoke('fetch-stock-price', {
        body: { tickers },
      });
      if (error) throw error;
      const prices = data?.prices || {};

      const updates = assets.map(a => {
        const price = prices[a.ticker];
        return price !== undefined && price !== null ? { ...a, current_price: price } : a;
      });
      setAssets(updates);

      // Persist prices
      for (const a of updates) {
        if (a.current_price !== null) {
          await supabase
            .from('recommended_portfolio_assets')
            .update({ current_price: a.current_price, updated_at: new Date().toISOString() })
            .eq('id', a.id);
        }
      }
      await onRefresh();
    } catch (e) {
      console.error('Price fetch error:', e);
    } finally {
      setRefreshing(false);
    }
  }, [assets, onRefresh]);

  useEffect(() => {
    fetchPrices();
    intervalRef.current = setInterval(fetchPrices, 60000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const totalAllocation = assets.reduce((sum, a) => sum + Number(a.allocation_pct), 0);
  const allocationOk = Math.abs(totalAllocation - 100) < 0.01;

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = assets.findIndex(a => a.id === active.id);
    const newIndex = assets.findIndex(a => a.id === over.id);
    const reordered = arrayMove(assets, oldIndex, newIndex).map((a, i) => ({ ...a, display_order: i }));
    setAssets(reordered);

    for (const a of reordered) {
      await supabase
        .from('recommended_portfolio_assets')
        .update({ display_order: a.display_order })
        .eq('id', a.id);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('recommended_portfolio_assets').delete().eq('id', id);
    toast.success('Ativo removido');
    await onRefresh();
  };

  const handleEdit = (asset: PortfolioAsset) => {
    setEditingAsset(asset);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingAsset(undefined);
    setModalOpen(true);
  };

  const handleSaved = async () => {
    setModalOpen(false);
    setEditingAsset(undefined);
    await onRefresh();
    setTimeout(fetchPrices, 500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <h2 className="text-xl font-semibold text-foreground">{portfolio.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPrices} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar Preços
          </Button>
          <Button size="sm" onClick={handleAdd} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1.5" /> Adicionar Ativo
          </Button>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="w-10 text-primary-foreground" />
                  <TableHead className="text-primary-foreground">Rank</TableHead>
                  <TableHead className="text-primary-foreground">Ticker</TableHead>
                  <TableHead className="text-primary-foreground">Empresa</TableHead>
                  <TableHead className="text-primary-foreground">Setor</TableHead>
                  <TableHead className="text-right text-primary-foreground">Entrada</TableHead>
                  <TableHead className="text-right text-primary-foreground">Atual</TableHead>
                  <TableHead className="text-right text-primary-foreground">Teto</TableHead>
                  <TableHead className="text-primary-foreground">Alocação</TableHead>
                  <TableHead className="text-right text-primary-foreground">Rent.</TableHead>
                  <TableHead className="text-primary-foreground">Viés</TableHead>
                  <TableHead className="text-primary-foreground w-20" />
                </TableRow>
              </TableHeader>
              <SortableContext items={assets.map(a => a.id)} strategy={verticalListSortingStrategy}>
                <TableBody>
                  {assets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                        Nenhum ativo cadastrado. Clique em "+ Adicionar Ativo" para começar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    assets.map((asset, index) => (
                      <SortableRow key={asset.id} asset={asset} index={index} onEdit={handleEdit} onDelete={handleDelete} />
                    ))
                  )}
                </TableBody>
              </SortableContext>
            </Table>
          </DndContext>
        </div>

        {/* Footer allocation indicator */}
        <div className={`px-4 py-3 border-t flex items-center justify-between text-sm font-medium ${allocationOk ? 'bg-emerald-50 text-emerald-700' : 'bg-destructive/10 text-destructive'}`}>
          <span>Alocação total: {totalAllocation.toFixed(1)}%</span>
          {!allocationOk && <span className="text-xs">⚠️ A soma deve ser exatamente 100%</span>}
          {allocationOk && <span className="text-xs">✓ Alocação correta</span>}
        </div>
      </div>

      <AssetModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        portfolioId={portfolio.id}
        portfolioSlug={portfolio.slug}
        asset={editingAsset}
        nextOrder={assets.length}
        onSaved={handleSaved}
      />
    </div>
  );
}
