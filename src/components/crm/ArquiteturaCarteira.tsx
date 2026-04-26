import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CarteirasRecomendadas } from './carteiras/CarteirasRecomendadas';

export interface ArquiteturaCarteiraData {
  dominantObjective: string;
  riskLevel: string;
  minLiquidity: string;
  liquidityJustification: string;
  summaryObservations: string;
}

export const defaultArquiteturaCarteira: ArquiteturaCarteiraData = {
  dominantObjective: '',
  riskLevel: '',
  minLiquidity: '',
  liquidityJustification: '',
  summaryObservations: '',
};

function ConsultantNote({ children }: { children: string }) {
  return (
    <p className="text-xs text-muted-foreground/70 italic mt-1 leading-relaxed">
      {children}
    </p>
  );
}

const OBJECTIVES = ['Renda', 'Crescimento'];

const RISK_LEVELS = ['Conservador', 'Moderado', 'Arrojado'];

const LIQUIDITY_OPTIONS = [
  '3 meses de custo de vida',
  '6 meses',
  '12 meses',
  '18+ meses',
];

interface Props {
  data: ArquiteturaCarteiraData;
  onChange: (data: ArquiteturaCarteiraData) => void;
}

export function ArquiteturaCarteira({ data, onChange }: Props) {
  const safeData = data ?? defaultArquiteturaCarteira;
  const update = (partial: Partial<ArquiteturaCarteiraData>) => {
    onChange({ ...safeData, ...partial });
  };
  const [isOpen, setIsOpen] = useState(false);

  const showRecommendations =
    !!safeData.dominantObjective &&
    RISK_LEVELS.includes(safeData.riskLevel);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button type="button" className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
          <span className="font-semibold text-foreground text-sm">Arquitetura Estratégica da Carteira</span>
          {isOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
        <div className="pt-4 space-y-6">
          <p className="text-xs text-muted-foreground">
            Definir a estrutura macro da carteira com base no diagnóstico: objetivo, nível de risco e liquidez mínima.
          </p>

          {/* 1️⃣ Objetivo */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">1️⃣ Objetivo dominante da carteira</h4>
            <Label>Qual é o objetivo dominante da carteira neste momento?</Label>
            <Select value={safeData.dominantObjective} onValueChange={(v) => update({ dominantObjective: v })}>
              <SelectTrigger className="crm-input w-full max-w-[400px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {OBJECTIVES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            <ConsultantNote>Define o "centro de gravidade" da carteira. Todo o resto se ajusta a isso.</ConsultantNote>
          </div>

          {/* 2️⃣ Risco */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">2️⃣ Nível de risco recomendado</h4>
            <Label>Com base no diagnóstico comportamental, qual nível de risco é adequado?</Label>
            <Select value={safeData.riskLevel} onValueChange={(v) => update({ riskLevel: v })}>
              <SelectTrigger className="crm-input w-[250px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <ConsultantNote>Não é o que o cliente diz. É o que ele aguenta.</ConsultantNote>
          </div>

          {/* 3️⃣ Liquidez */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">3️⃣ Liquidez mínima necessária</h4>
            <Label>Qual é a liquidez mínima que a carteira precisa manter?</Label>
            <Select value={safeData.minLiquidity} onValueChange={(v) => update({ minLiquidity: v })}>
              <SelectTrigger className="crm-input w-[300px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {LIQUIDITY_OPTIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="space-y-2">
              <Label>Justificativa</Label>
              <Textarea
                value={safeData.liquidityJustification}
                onChange={(e) => update({ liquidityJustification: e.target.value })}
                placeholder="Justifique a liquidez mínima..."
                className="crm-input min-h-[60px]"
              />
            </div>
            <ConsultantNote>Liquidez é o "cinto de segurança" que evita resgate em crise.</ConsultantNote>
          </div>

          {/* Carteiras Recomendadas filtradas */}
          {showRecommendations && (
            <div className="p-4 bg-muted/10 rounded-lg border border-border space-y-3">
              <h4 className="font-medium text-foreground">
                Carteiras recomendadas — {safeData.riskLevel} / {safeData.dominantObjective}
              </h4>
              <CarteirasRecomendadas />
            </div>
          )}

          {/* Observação estratégica */}
          <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary/30 space-y-2">
            <Label className="font-semibold text-primary">Observação estratégica do consultor</Label>
            <Textarea
              value={safeData.summaryObservations}
              onChange={(e) => update({ summaryObservations: e.target.value })}
              placeholder="Observações estratégicas do consultor..."
              className="crm-input min-h-[100px] text-sm"
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
