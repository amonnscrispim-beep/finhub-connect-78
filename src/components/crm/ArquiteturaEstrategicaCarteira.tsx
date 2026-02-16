import { useState, useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Plus, Trash2 } from 'lucide-react';

export interface ArquiteturaEstrategicaData {
  dominantObjective: string;
  riskLevel: string;
  strategicHorizon: string;
  structuralLiquidity: string;
  pillars: string[];
  // Macro allocation
  fixedIncomePct: number;
  equitiesPct: number;
  internationalPct: number;
  alternativesPct: number;
  cashPct: number;
  // Final synthesis
  strategicSummary: string;
}

export const defaultArquiteturaEstrategica: ArquiteturaEstrategicaData = {
  dominantObjective: '',
  riskLevel: '',
  strategicHorizon: '',
  structuralLiquidity: '',
  pillars: [],
  fixedIncomePct: 0,
  equitiesPct: 0,
  internationalPct: 0,
  alternativesPct: 0,
  cashPct: 0,
  strategicSummary: '',
};

const OBJECTIVES = [
  'Preservação patrimonial',
  'Crescimento de patrimônio',
  'Construção de renda passiva',
  'Estratégia equilibrada',
  'Estratégia fiscal/tributária',
];

const RISK_LEVELS = ['Conservador', 'Moderado', 'Arrojado'];

const HORIZONS = [
  'Curto prazo (até 2 anos)',
  'Médio prazo (2 a 7 anos)',
  'Longo prazo (7+ anos)',
];

const LIQUIDITY_OPTIONS = ['3 meses', '6 meses', '12 meses', '18+ meses'];

function ConsultantNote({ children }: { children: string }) {
  return (
    <p className="text-xs text-muted-foreground/70 italic mt-1 leading-relaxed">
      {children}
    </p>
  );
}

interface Props {
  data: ArquiteturaEstrategicaData;
  onChange: (data: ArquiteturaEstrategicaData) => void;
}

export function ArquiteturaEstrategicaCarteira({ data, onChange }: Props) {
  const safeData = data ?? defaultArquiteturaEstrategica;
  const update = (partial: Partial<ArquiteturaEstrategicaData>) => {
    onChange({ ...safeData, ...partial });
  };

  const [newPillar, setNewPillar] = useState('');

  const addPillar = () => {
    const trimmed = newPillar.trim();
    if (trimmed && (safeData.pillars?.length || 0) < 5) {
      update({ pillars: [...(safeData.pillars || []), trimmed] });
      setNewPillar('');
    }
  };

  const removePillar = (index: number) => {
    update({ pillars: (safeData.pillars || []).filter((_, i) => i !== index) });
  };

  const pctFields = [
    { key: 'fixedIncomePct' as const, label: 'Renda Fixa (%)' },
    { key: 'equitiesPct' as const, label: 'Renda Variável (%)' },
    { key: 'internationalPct' as const, label: 'Internacional (%)' },
    { key: 'alternativesPct' as const, label: 'Alternativos / Estruturados (%)' },
    { key: 'cashPct' as const, label: 'Caixa / Oportunidade (%)' },
  ];

  const totalPct = useMemo(() => {
    return pctFields.reduce((sum, f) => sum + (safeData[f.key] || 0), 0);
  }, [safeData.fixedIncomePct, safeData.equitiesPct, safeData.internationalPct, safeData.alternativesPct, safeData.cashPct]);

  const isValid = Math.abs(totalPct - 100) < 0.01;
  const hasAnyValue = totalPct > 0;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Definir a estrutura macro da carteira com base no diagnóstico estratégico antes da seleção de ativos.
      </p>

      {/* 1️⃣ Objetivo Dominante */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
        <h4 className="font-medium text-foreground">1️⃣ Objetivo Dominante da Carteira</h4>
        <Label>Qual é o objetivo dominante da carteira neste momento?</Label>
        <Select value={safeData.dominantObjective} onValueChange={(v) => update({ dominantObjective: v })}>
          <SelectTrigger className="crm-input w-full max-w-[400px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {OBJECTIVES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <ConsultantNote>Define o "centro de gravidade" da carteira. Todo o resto se ajusta a isso.</ConsultantNote>
      </div>

      {/* 2️⃣ Nível de Risco */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
        <h4 className="font-medium text-foreground">2️⃣ Nível de Risco Estratégico</h4>
        <Label>Com base no diagnóstico comportamental, qual nível de risco é adequado?</Label>
        <Select value={safeData.riskLevel} onValueChange={(v) => update({ riskLevel: v })}>
          <SelectTrigger className="crm-input w-[250px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <ConsultantNote>Não é o que o cliente diz. É o que ele aguenta.</ConsultantNote>
      </div>

      {/* 3️⃣ Horizonte Estratégico */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
        <h4 className="font-medium text-foreground">3️⃣ Horizonte Estratégico</h4>
        <Label>Qual é o horizonte estratégico da carteira?</Label>
        <Select value={safeData.strategicHorizon} onValueChange={(v) => update({ strategicHorizon: v })}>
          <SelectTrigger className="crm-input w-full max-w-[350px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {HORIZONS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
          </SelectContent>
        </Select>
        <ConsultantNote>O horizonte define o grau de tolerância à volatilidade e o tipo de ativos adequados.</ConsultantNote>
      </div>

      {/* 4️⃣ Liquidez Estrutural */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
        <h4 className="font-medium text-foreground">4️⃣ Liquidez Estrutural Necessária</h4>
        <Label>Qual é a liquidez mínima que a carteira precisa manter?</Label>
        <Select value={safeData.structuralLiquidity} onValueChange={(v) => update({ structuralLiquidity: v })}>
          <SelectTrigger className="crm-input w-[250px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {LIQUIDITY_OPTIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <ConsultantNote>Liquidez é o "cinto de segurança" que evita resgate em crise.</ConsultantNote>
      </div>

      {/* 5️⃣ Pilares Estratégicos */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
        <h4 className="font-medium text-foreground">5️⃣ Pilares Estratégicos da Carteira</h4>
        <Label>Defina até 5 pilares estratégicos:</Label>
        <div className="space-y-2">
          {(safeData.pillars || []).map((pillar, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm flex-1 bg-muted/50 px-3 py-2 rounded-md border border-border">{pillar}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removePillar(index)} className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {(safeData.pillars?.length || 0) < 5 && (
            <div className="flex items-center gap-2">
              <Input
                value={newPillar}
                onChange={(e) => setNewPillar(e.target.value)}
                placeholder="Ex: Diversificação financeira"
                className="crm-input flex-1"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPillar(); } }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addPillar} disabled={!newPillar.trim()}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>
          )}
        </div>
        <ConsultantNote>Definir arquitetura antes da seleção de ativos.</ConsultantNote>
      </div>

      {/* 6️⃣ Diretrizes de Alocação Macro */}
      <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-4">
        <h4 className="font-medium text-foreground">6️⃣ Diretrizes de Alocação Macro</h4>
        <div className="space-y-3">
          {pctFields.map(f => (
            <div key={f.key} className="flex items-center gap-3">
              <Label className="flex-1 text-sm">{f.label}</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={safeData[f.key] || ''}
                  onChange={(e) => update({ [f.key]: parseFloat(e.target.value) || 0 } as any)}
                  className="crm-input w-[80px] text-right"
                  placeholder="0"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Total validation */}
        {hasAnyValue && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total da Alocação:</span>
              <span className={isValid ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                {totalPct.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={Math.min(totalPct, 100)} 
              className={`h-2 ${!isValid ? '[&>div]:bg-destructive' : '[&>div]:bg-green-600'}`} 
            />
            {!isValid && (
              <p className="text-xs text-destructive">
                {totalPct < 100 
                  ? `Faltam ${(100 - totalPct).toFixed(1)}% para completar a alocação.`
                  : `Alocação excede 100% em ${(totalPct - 100).toFixed(1)}%.`
                }
              </p>
            )}
          </div>
        )}
        <ConsultantNote>Aqui nasce o mapa da carteira. Depois você só "preenche" com ativos.</ConsultantNote>
      </div>

      {/* 7️⃣ Síntese Estratégica Final */}
      <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary/30 space-y-3">
        <h4 className="font-semibold text-primary">7️⃣ Síntese Estratégica Final</h4>
        <Label>Resumo estratégico da arquitetura da carteira</Label>
        <Textarea
          value={safeData.strategicSummary}
          onChange={(e) => update({ strategicSummary: e.target.value })}
          placeholder="Descreva: onde o cliente está, para onde precisa ir, o que corrigir e qual o caminho estratégico da carteira..."
          className="crm-input min-h-[120px]"
        />
        <ConsultantNote>Este campo consolida a visão estratégica antes da seleção de ativos.</ConsultantNote>
      </div>
    </div>
  );
}
