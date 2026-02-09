import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { useClientPortfolio } from '@/hooks/useClientPortfolio';
import { PortfolioAssetsTab } from './PortfolioAssetsTab';
import { PortfolioPerformanceTab } from './PortfolioPerformanceTab';
import { PortfolioReportsTab } from './PortfolioReportsTab';

interface Props {
  clientId: string | undefined;
}

export function PortfolioModule({ clientId }: Props) {
  const portfolio = useClientPortfolio(clientId);

  if (!clientId) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Salve o cliente primeiro para acessar a Carteira.</p>;
  }

  if (portfolio.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="ativos" className="space-y-4">
      <TabsList className="bg-muted/50">
        <TabsTrigger value="ativos" className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs">
          Ativos
        </TabsTrigger>
        <TabsTrigger value="rentabilidade" className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs">
          Rentabilidade
        </TabsTrigger>
        <TabsTrigger value="relatorios" className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs">
          Relatórios
        </TabsTrigger>
      </TabsList>

      <TabsContent value="ativos">
        <PortfolioAssetsTab
          assets={portfolio.assets}
          aporte={portfolio.aporte}
          previousValues={portfolio.previousValues}
          onAddAsset={portfolio.addAsset}
          onDeleteAsset={portfolio.deleteAsset}
          onUpdateAsset={portfolio.updateAssetLocal}
          onSaveAsset={portfolio.debouncedSaveAsset}
          onSaveAporte={portfolio.saveAporte}
          onSavePreviousValue={portfolio.savePreviousValue}
        />
      </TabsContent>

      <TabsContent value="rentabilidade">
        <PortfolioPerformanceTab
          performance={portfolio.performance}
          onSave={portfolio.savePerformance}
          onDelete={portfolio.deletePerformance}
        />
      </TabsContent>

      <TabsContent value="relatorios">
        <PortfolioReportsTab
          reports={portfolio.reports}
          assets={portfolio.assets}
          aporte={portfolio.aporte}
          previousValues={portfolio.previousValues}
          onSave={portfolio.saveReport}
          onDelete={portfolio.deleteReport}
        />
      </TabsContent>
    </Tabs>
  );
}
