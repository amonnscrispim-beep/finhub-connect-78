import { useState } from 'react';
import { Loader2, Compass } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCarteiraFarol, PROFILE_TABS, ProfileTab } from '@/hooks/useCarteiraFarol';
import { FarolProfileTab } from './FarolProfileTab';
import { FarolAllocationSimulator } from './FarolAllocationSimulator';

interface Props {
  clientId: string | undefined;
  financialAssets?: number;
  monthlyContribution?: number;
}

export function CarteiraFarolModule({ clientId, financialAssets = 0, monthlyContribution = 0 }: Props) {
  const farol = useCarteiraFarol(clientId);
  const [activeTab, setActiveTab] = useState<ProfileTab>('Curto Prazo');

  if (!clientId) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Salve o cliente primeiro para acessar a Carteira Farol.</p>;
  }

  if (farol.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const activePillars = farol.pillars.filter(p => p.profile_tab === activeTab);

  return (
    <div className="space-y-6" onClick={e => e.stopPropagation()}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Carteira Farol</h3>
        </div>
        <p className="text-sm text-muted-foreground">Confira as carteiras de acordo com o seu perfil</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ProfileTab)}>
        <TabsList className="bg-muted/50 w-full justify-start flex-wrap">
          {PROFILE_TABS.map(tab => (
            <TabsTrigger key={tab} value={tab} className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs">
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {PROFILE_TABS.map(tab => (
          <TabsContent key={tab} value={tab}>
            <FarolProfileTab
              profileTab={tab}
              pillars={farol.pillars.filter(p => p.profile_tab === tab)}
              assets={farol.assets}
              financialAssets={financialAssets}
              onAddPillar={(name) => farol.addPillar(tab, name)}
              onUpdatePillar={farol.updatePillar}
              onDeletePillar={farol.deletePillar}
              onAddAsset={farol.addAsset}
              onUpdateAsset={farol.updateAsset}
              onDeleteAsset={farol.deleteAsset}
              onFetchQuotes={farol.fetchQuotes}
            />
          </TabsContent>
        ))}
      </Tabs>

      <FarolAllocationSimulator
        pillars={activePillars}
        financialAssets={financialAssets}
        monthlyContribution={monthlyContribution}
      />
    </div>
  );
}
