import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SharedBadge } from '@/components/ui/shared-badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3, Calendar, Share2, Plus } from 'lucide-react';
import { RecommendedPortfolio, PortfolioAsset } from './CarteirasRecomendadas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  portfolios: RecommendedPortfolio[];
  allAssets: PortfolioAsset[];
  onSelect: (p: RecommendedPortfolio) => void;
  isMaster?: boolean;
  userId?: string;
  onPortfolioCreated?: () => void | Promise<void>;
}

export function CarteiraGrid({ portfolios, allAssets, onSelect, isMaster, userId, onPortfolioCreated }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const slugify = (s: string) =>
    s.toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `carteira-${Date.now()}`;

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) { toast.error('Informe o nome da carteira'); return; }
    if (!userId) { toast.error('Sessão inválida'); return; }
    setCreating(true);
    const slug = slugify(name);
    const nextOrder = portfolios.reduce((max, p) => Math.max(max, p.display_order ?? 0), -1) + 1;
    const { error } = await supabase.from('recommended_portfolios').insert({
      name,
      slug,
      description: newDescription.trim(),
      display_order: nextOrder,
      user_id: userId,
    } as any);
    setCreating(false);
    if (error) {
      toast.error('Erro ao criar carteira');
      console.error(error);
      return;
    }
    toast.success('Carteira criada!');
    setNewName('');
    setNewDescription('');
    setCreateOpen(false);
    await onPortfolioCreated?.();
  };

  const toggleShare = async (e: React.MouseEvent, portfolio: RecommendedPortfolio) => {
    e.stopPropagation();
    const newVal = !(portfolio as any).shared;
    await supabase.from('recommended_portfolios').update({ shared: newVal } as any).eq('id', portfolio.id);
    // Also share/unshare all assets in this portfolio
    const assetIds = allAssets.filter(a => a.portfolio_id === portfolio.id).map(a => a.id);
    if (assetIds.length > 0) {
      await supabase.from('recommended_portfolio_assets').update({ shared: newVal } as any).in('id', assetIds);
    }
    toast.success(newVal ? 'Carteira compartilhada!' : 'Compartilhamento removido.');
    // Force page reload to refresh
    window.location.reload();
  };
  const getPortfolioStats = (portfolioId: string) => {
    const assets = allAssets.filter(a => a.portfolio_id === portfolioId);
    const totalAssets = assets.length;

    const buyCount = assets.filter(a => {
      const bias = a.manual_bias || (a.current_price !== null && a.current_price < a.ceiling_price ? 'Comprar' : 'Aguardar');
      return bias === 'Comprar';
    }).length;
    const waitCount = totalAssets - buyCount;

    const lastUpdated = assets.length > 0
      ? assets.reduce((max, a) => a.updated_at > max ? a.updated_at : max, assets[0].updated_at)
      : null;

    return { totalAssets, buyCount, waitCount, lastUpdated };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Carteiras Recomendadas</h2>
        </div>
        {isMaster && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1.5" /> Nova Carteira
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {portfolios.map(portfolio => {
          const stats = getPortfolioStats(portfolio.id);
          const isShared = (portfolio as any).shared;
          const isOwnPortfolio = portfolio.user_id === userId;

          return (
            <Card
              key={portfolio.id}
              className="cursor-pointer hover:shadow-md transition-all border-border hover:border-primary/30"
              onClick={() => onSelect(portfolio)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  {portfolio.name}
                  <div className="flex items-center gap-1">
                    {isShared && !isOwnPortfolio && <SharedBadge />}
                    <Badge variant="outline" className="text-xs">
                      {stats.totalAssets} ativos
                    </Badge>
                  </div>
                </CardTitle>
                {portfolio.description && (
                  <p className="text-xs text-muted-foreground">{portfolio.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Comprar: {stats.buyCount}
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    Aguardar: {stats.waitCount}
                  </span>
                </div>

                {stats.lastUpdated && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    Atualizado em {format(new Date(stats.lastUpdated), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                )}

                {isMaster && isOwnPortfolio && (
                  <Button
                    variant={isShared ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs h-7 w-full"
                    onClick={(e) => toggleShare(e, portfolio)}
                  >
                    <Share2 className="w-3 h-3 mr-1" />
                    {isShared ? 'Compartilhado' : 'Compartilhar'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Carteira Recomendada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-portfolio-name">Nome da Carteira *</Label>
              <Input
                id="new-portfolio-name"
                placeholder="Ex: Internacional, Dividendos, Renda Fixa"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-portfolio-desc">Subtítulo / Descrição (opcional)</Label>
              <Input
                id="new-portfolio-desc"
                placeholder="Ex: Small Caps + Valor"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

