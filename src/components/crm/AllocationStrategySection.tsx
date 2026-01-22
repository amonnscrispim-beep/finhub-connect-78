import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TrendingUp, Shield, Clock } from 'lucide-react';
import type { InvestorProfile } from '@/types/client';

export type AllocationObjective = 'Preservação' | 'Renda' | 'Crescimento' | 'Balanceado' | 'Aposentadoria' | '';
export type PortfolioHorizon = 'Curto prazo' | 'Médio prazo' | 'Longo prazo' | '';
export type AllocationProfile = 'Superconservador' | 'Conservador' | 'Moderado' | 'Arrojado' | '';

export const ALLOCATION_OBJECTIVES: AllocationObjective[] = [
  'Preservação',
  'Renda',
  'Crescimento',
  'Balanceado',
  'Aposentadoria'
];

export const PORTFOLIO_HORIZONS: PortfolioHorizon[] = [
  'Curto prazo',
  'Médio prazo',
  'Longo prazo'
];

export const ALLOCATION_PROFILES: AllocationProfile[] = [
  'Superconservador',
  'Conservador',
  'Moderado',
  'Arrojado'
];

// Predefined profile allocations with fixed income breakdown
export const PROFILE_PRESETS: Record<Exclude<AllocationProfile, ''>, {
  stocks: number;
  international: number;
  realEstate: number;
  reserve: number;
  postFixed: number;
  preFixed: number;
  inflationIndexed: number;
}> = {
  'Superconservador': {
    stocks: 0,
    international: 0,
    realEstate: 0,
    reserve: 20,
    postFixed: 20,
    preFixed: 30,
    inflationIndexed: 30
  },
  'Conservador': {
    stocks: 5,
    international: 5,
    realEstate: 5,
    reserve: 25,
    postFixed: 10,
    preFixed: 25,
    inflationIndexed: 25
  },
  'Moderado': {
    stocks: 10,
    international: 10,
    realEstate: 10,
    reserve: 15,
    postFixed: 15,
    preFixed: 20,
    inflationIndexed: 20
  },
  'Arrojado': {
    stocks: 20,
    international: 15,
    realEstate: 20,
    reserve: 8,
    postFixed: 7,
    preFixed: 15,
    inflationIndexed: 15
  }
};

export interface AllocationData {
  // Fixed Income breakdown
  reserve: number; // % Reserva (caixa / liquidez)
  postFixed: number; // % Pós-fixado
  preFixed: number; // % Prefixado
  inflationIndexed: number; // % Indexado à inflação
  // Other assets
  stocks: number; // % Ações Brasileiras
  realEstate: number; // % Fundos Imobiliários
  international: number; // % Ações Internacionais (Exterior)
  // Auxiliary fields
  objective: AllocationObjective;
  horizon: PortfolioHorizon;
  allocationProfile: AllocationProfile;
}

interface AllocationStrategySectionProps {
  value: AllocationData;
  onChange: (data: AllocationData) => void;
  investorProfile?: InvestorProfile;
}

export function AllocationStrategySection({ value, onChange, investorProfile }: AllocationStrategySectionProps) {
  const handleFieldChange = (field: keyof AllocationData, newValue: string | number) => {
    onChange({
      ...value,
      [field]: typeof newValue === 'string' && ['reserve', 'postFixed', 'preFixed', 'inflationIndexed', 'stocks', 'realEstate', 'international'].includes(field)
        ? parseFloat(newValue) || 0
        : newValue
    });
  };

  const applyProfilePreset = (profile: AllocationProfile) => {
    if (profile === '') {
      onChange({
        ...value,
        allocationProfile: profile
      });
    } else {
      const preset = PROFILE_PRESETS[profile];
      onChange({
        ...value,
        allocationProfile: profile,
        stocks: preset.stocks,
        international: preset.international,
        realEstate: preset.realEstate,
        reserve: preset.reserve,
        postFixed: preset.postFixed,
        preFixed: preset.preFixed,
        inflationIndexed: preset.inflationIndexed
      });
    }
  };

  const handleProfileChange = (newProfile: AllocationProfile) => {
    applyProfilePreset(newProfile);
  };

  // Calculate fixed income subtotal
  const fixedIncomeSubtotal = useMemo(() => {
    return (value.reserve || 0) + (value.postFixed || 0) + (value.preFixed || 0) + (value.inflationIndexed || 0);
  }, [value.reserve, value.postFixed, value.preFixed, value.inflationIndexed]);

  // Calculate total allocation
  const totalAllocation = useMemo(() => {
    return fixedIncomeSubtotal + (value.stocks || 0) + (value.realEstate || 0) + (value.international || 0);
  }, [fixedIncomeSubtotal, value.stocks, value.realEstate, value.international]);

  const isValid = totalAllocation === 100;
  const hasAnyValue = totalAllocation > 0;

  // Calculate risk metrics
  const riskAssets = (value.stocks || 0) + (value.international || 0);
  
  // Generate alerts
  const alerts = useMemo(() => {
    const alertList: { type: 'warning' | 'info'; message: string; icon: typeof AlertTriangle }[] = [];
    
    // Low inflation protection alert
    const inflationProtection = (value.inflationIndexed || 0) + (value.realEstate || 0);
    if (hasAnyValue && inflationProtection < 10 && value.horizon === 'Longo prazo') {
      alertList.push({
        type: 'warning',
        message: 'Baixa proteção contra inflação: considere aumentar alocação em ativos indexados (IPCA+ ou FIIs).',
        icon: Shield
      });
    }

    // Excess post-fixed in long term
    if (hasAnyValue && value.horizon === 'Longo prazo' && (value.postFixed || 0) > 50) {
      alertList.push({
        type: 'warning',
        message: 'Excesso de pós-fixado no longo prazo pode limitar ganhos reais. Considere diversificar.',
        icon: TrendingUp
      });
    }

    // Risk incompatible with profile
    if (investorProfile && hasAnyValue) {
      const riskLimits: Record<InvestorProfile, number> = {
        'Conservador': 15,
        'Moderado': 35,
        'Arrojado': 60,
        'Agressivo': 100
      };
      
      const maxRisk = riskLimits[investorProfile];
      if (riskAssets > maxRisk) {
        alertList.push({
          type: 'warning',
          message: `Risco elevado (${riskAssets}% em renda variável) pode ser incompatível com perfil ${investorProfile} (máx. sugerido: ${maxRisk}%).`,
          icon: AlertTriangle
        });
      }
    }

    // Short-term horizon with high risk
    if (hasAnyValue && value.horizon === 'Curto prazo' && riskAssets > 20) {
      alertList.push({
        type: 'warning',
        message: 'Alocação de alto risco para horizonte de curto prazo pode gerar volatilidade indesejada.',
        icon: Clock
      });
    }

    return alertList;
  }, [value, hasAnyValue, investorProfile, riskAssets]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Defina a estratégia de alocação da carteira do cliente. Selecione um perfil para preencher automaticamente ou ajuste os valores manualmente.
      </p>

      {/* Profile Selection */}
      <div className="space-y-2">
        <Label htmlFor="allocationProfile">Perfil de Alocação</Label>
        <Select 
          value={value.allocationProfile || ''} 
          onValueChange={(v) => handleProfileChange(v as AllocationProfile)}
        >
          <SelectTrigger className="crm-input">
            <SelectValue placeholder="Selecione um perfil..." />
          </SelectTrigger>
          <SelectContent>
            {ALLOCATION_PROFILES.map((profile) => (
              <SelectItem key={profile} value={profile}>{profile}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Ao selecionar um perfil, os campos são preenchidos automaticamente mas permanecem editáveis.
        </p>
      </div>

      {/* Auxiliary Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="allocationObjective">Objetivo da Alocação</Label>
          <Select 
            value={value.objective || ''} 
            onValueChange={(v) => handleFieldChange('objective', v as AllocationObjective)}
          >
            <SelectTrigger className="crm-input">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {ALLOCATION_OBJECTIVES.map((obj) => (
                <SelectItem key={obj} value={obj}>{obj}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="portfolioHorizon">Horizonte da Carteira</Label>
          <Select 
            value={value.horizon || ''} 
            onValueChange={(v) => handleFieldChange('horizon', v as PortfolioHorizon)}
          >
            <SelectTrigger className="crm-input">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {PORTFOLIO_HORIZONS.map((h) => (
                <SelectItem key={h} value={h}>{h}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Variable Income Assets */}
      <div className="p-4 bg-muted/50 rounded-lg space-y-4 border border-border">
        <h4 className="font-medium text-foreground">Renda Variável</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="portfolioStocks">% Ações Brasileiras</Label>
            <Input
              id="portfolioStocks"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={value.stocks || ''}
              onChange={(e) => handleFieldChange('stocks', e.target.value)}
              placeholder="0"
              className="crm-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="portfolioInternational">% Exterior</Label>
            <Input
              id="portfolioInternational"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={value.international || ''}
              onChange={(e) => handleFieldChange('international', e.target.value)}
              placeholder="0"
              className="crm-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="portfolioRealEstate">% Fundos Imobiliários</Label>
            <Input
              id="portfolioRealEstate"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={value.realEstate || ''}
              onChange={(e) => handleFieldChange('realEstate', e.target.value)}
              placeholder="0"
              className="crm-input"
            />
          </div>
        </div>
      </div>

      {/* Fixed Income Section */}
      <div className="p-4 bg-muted/50 rounded-lg space-y-4 border border-border">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-foreground">Renda Fixa</h4>
          <span className={`text-sm font-medium ${fixedIncomeSubtotal > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
            Subtotal: {fixedIncomeSubtotal.toFixed(1)}%
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="reserve">% Reserva (caixa / liquidez)</Label>
            <Input
              id="reserve"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={value.reserve || ''}
              onChange={(e) => handleFieldChange('reserve', e.target.value)}
              placeholder="0"
              className="crm-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postFixed">% Pós-fixado</Label>
            <Input
              id="postFixed"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={value.postFixed || ''}
              onChange={(e) => handleFieldChange('postFixed', e.target.value)}
              placeholder="0"
              className="crm-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preFixed">% Prefixado</Label>
            <Input
              id="preFixed"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={value.preFixed || ''}
              onChange={(e) => handleFieldChange('preFixed', e.target.value)}
              placeholder="0"
              className="crm-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inflationIndexed">% Indexado à inflação</Label>
            <Input
              id="inflationIndexed"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={value.inflationIndexed || ''}
              onChange={(e) => handleFieldChange('inflationIndexed', e.target.value)}
              placeholder="0"
              className="crm-input"
            />
          </div>
        </div>
      </div>

      {/* Total Validation */}
      {hasAnyValue && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total da Alocação:</span>
            <span className={isValid ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
              {totalAllocation.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={Math.min(totalAllocation, 100)} 
            className={`h-2 ${!isValid ? '[&>div]:bg-destructive' : '[&>div]:bg-green-600'}`} 
          />
          {!isValid && (
            <p className="text-xs text-destructive">
              {totalAllocation < 100 
                ? `Faltam ${(100 - totalAllocation).toFixed(1)}% para completar a alocação.`
                : `Alocação excede 100% em ${(totalAllocation - 100).toFixed(1)}%.`
              }
            </p>
          )}
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert key={index} variant="default" className="border-amber-500/50 bg-amber-500/10">
              <alert.icon className="h-4 w-4 text-amber-600 dark:text-amber-500" />
              <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
                {alert.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper to migrate old PortfolioDistribution to new AllocationData
export function migratePortfolioToAllocation(old: { 
  fixedIncome?: number; 
  stocks?: number; 
  realEstate?: number; 
  international?: number;
  // New fields (if already migrated)
  reserve?: number;
  postFixed?: number;
  preFixed?: number;
  inflationIndexed?: number;
  objective?: AllocationObjective;
  horizon?: PortfolioHorizon;
  allocationProfile?: AllocationProfile;
} | null): AllocationData {
  if (!old) {
    return {
      reserve: 0,
      postFixed: 0,
      preFixed: 0,
      inflationIndexed: 0,
      stocks: 0,
      realEstate: 0,
      international: 0,
      objective: '',
      horizon: '',
      allocationProfile: ''
    };
  }

  // Check if already migrated (has reserve or postFixed field)
  if ('reserve' in old || ('postFixed' in old && typeof old.postFixed === 'number')) {
    return {
      reserve: old.reserve || 0,
      postFixed: old.postFixed || 0,
      preFixed: old.preFixed || 0,
      inflationIndexed: old.inflationIndexed || 0,
      stocks: old.stocks || 0,
      realEstate: old.realEstate || 0,
      international: old.international || 0,
      objective: old.objective || '',
      horizon: old.horizon || '',
      allocationProfile: old.allocationProfile || ''
    };
  }

  // Migrate old format: fixedIncome becomes 100% postFixed (safe default)
  return {
    reserve: 0,
    postFixed: old.fixedIncome || 0,
    preFixed: 0,
    inflationIndexed: 0,
    stocks: old.stocks || 0,
    realEstate: old.realEstate || 0,
    international: old.international || 0,
    objective: '',
    horizon: '',
    allocationProfile: ''
  };
}

export function allocationToPortfolio(data: AllocationData): {
  reserve: number;
  postFixed: number;
  preFixed: number;
  inflationIndexed: number;
  stocks: number;
  realEstate: number;
  international: number;
  objective: AllocationObjective;
  horizon: PortfolioHorizon;
  allocationProfile: AllocationProfile;
  // Keep legacy field for compatibility
  fixedIncome: number;
} {
  const fixedIncome = (data.reserve || 0) + (data.postFixed || 0) + (data.preFixed || 0) + (data.inflationIndexed || 0);
  return {
    reserve: data.reserve || 0,
    postFixed: data.postFixed || 0,
    preFixed: data.preFixed || 0,
    inflationIndexed: data.inflationIndexed || 0,
    stocks: data.stocks || 0,
    realEstate: data.realEstate || 0,
    international: data.international || 0,
    objective: data.objective || '',
    horizon: data.horizon || '',
    allocationProfile: data.allocationProfile || '',
    fixedIncome // Legacy field
  };
}
