import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface PerfilRiscoData {
  volatilityExperience: string;
  volatilityReaction: string;
  oscillationLimit: string;
  crisisPriority: string;
  liquidityComfort: string;
  pressureSelling: string;
  pressureMotivation: string;
  // Síntese
  volatilityTolerance: string;
  behavioralRisk: string;
  liquidityNeed: string;
  strategicDirection: string;
}

export const defaultPerfilRisco: PerfilRiscoData = {
  volatilityExperience: '',
  volatilityReaction: '',
  oscillationLimit: '',
  crisisPriority: '',
  liquidityComfort: '',
  pressureSelling: '',
  pressureMotivation: '',
  volatilityTolerance: '',
  behavioralRisk: '',
  liquidityNeed: '',
  strategicDirection: '',
};

function ConsultantNote({ children }: { children: string }) {
  return (
    <p className="text-xs text-muted-foreground/70 italic mt-1 leading-relaxed">
      {children}
    </p>
  );
}

interface Props {
  data: PerfilRiscoData;
  onChange: (data: PerfilRiscoData) => void;
}

export function PerfilRisco({ data, onChange }: Props) {
  const safeData = data ?? defaultPerfilRisco;
  const update = (partial: Partial<PerfilRiscoData>) => {
    onChange({ ...safeData, ...partial });
  };
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <span className="font-semibold text-foreground text-sm">Perfil de Risco e Comportamento em Crises</span>
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform duration-200" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
        <div className="pt-4 space-y-6">
          <p className="text-xs text-muted-foreground">
            Mapear tolerância real à volatilidade, comportamento histórico em crises e risco comportamental.
          </p>

          {/* 1️⃣ Experiência com Volatilidade */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">1️⃣ Experiência com Volatilidade</h4>
            <Label>Você já passou por períodos de queda relevante nos seus investimentos?</Label>
            <RadioGroup
              value={safeData.volatilityExperience}
              onValueChange={(v) => update({ volatilityExperience: v })}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="Sim" /> Sim
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="Não" /> Não
              </label>
            </RadioGroup>
            {safeData.volatilityExperience === 'Sim' && (
              <div className="space-y-2">
                <Label>Como você reagiu na época?</Label>
                <Textarea
                  value={safeData.volatilityReaction}
                  onChange={(e) => update({ volatilityReaction: e.target.value })}
                  placeholder="Descreva a reação..."
                  className="crm-input min-h-[80px]"
                />
              </div>
            )}
            <ConsultantNote>Identificar comportamento real, não teórico.</ConsultantNote>
          </div>

          {/* 2️⃣ Limite de Oscilação */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">2️⃣ Limite de Oscilação</h4>
            <Label>Qual queda percentual no seu patrimônio te faria questionar a estratégia?</Label>
            <Select value={safeData.oscillationLimit} onValueChange={(v) => update({ oscillationLimit: v })}>
              <SelectTrigger className="crm-input w-[250px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Até 5%">Até 5%</SelectItem>
                <SelectItem value="5% a 10%">5% a 10%</SelectItem>
                <SelectItem value="10% a 20%">10% a 20%</SelectItem>
                <SelectItem value="20%+">20%+</SelectItem>
                <SelectItem value="Não sei">Não sei</SelectItem>
              </SelectContent>
            </Select>
            <ConsultantNote>Calibrar exposição à renda variável e ativos voláteis.</ConsultantNote>
          </div>

          {/* 3️⃣ Prioridade em Momentos de Incerteza */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">3️⃣ Prioridade em Momentos de Incerteza</h4>
            <Label>Em momentos de crise, você prefere:</Label>
            <RadioGroup
              value={safeData.crisisPriority}
              onValueChange={(v) => update({ crisisPriority: v })}
              className="flex flex-col gap-2"
            >
              {[
                'Reduzir risco imediatamente',
                'Manter posição e aguardar',
                'Aumentar posição aproveitando oportunidade',
                'Depende do cenário',
              ].map(opt => (
                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value={opt} /> {opt}
                </label>
              ))}
            </RadioGroup>
            <ConsultantNote>Detectar perfil comportamental dominante.</ConsultantNote>
          </div>

          {/* 4️⃣ Relação com Liquidez */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">4️⃣ Relação com Liquidez</h4>
            <Label>Você se sente mais confortável sabendo que pode acessar o dinheiro rapidamente, mesmo que renda menos?</Label>
            <RadioGroup
              value={safeData.liquidityComfort}
              onValueChange={(v) => update({ liquidityComfort: v })}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="Sim" /> Sim
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="Não" /> Não
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="Depende" /> Depende
              </label>
            </RadioGroup>
            <ConsultantNote>Medir necessidade psicológica de liquidez.</ConsultantNote>
          </div>

          {/* 5️⃣ Histórico de Decisão Sob Pressão */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">5️⃣ Histórico de Decisão Sob Pressão</h4>
            <Label>Você já vendeu investimentos em momentos de queda por insegurança?</Label>
            <RadioGroup
              value={safeData.pressureSelling}
              onValueChange={(v) => update({ pressureSelling: v })}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="Sim" /> Sim
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="Não" /> Não
              </label>
            </RadioGroup>
            {safeData.pressureSelling === 'Sim' && (
              <div className="space-y-2">
                <Label>O que motivou essa decisão?</Label>
                <Textarea
                  value={safeData.pressureMotivation}
                  onChange={(e) => update({ pressureMotivation: e.target.value })}
                  placeholder="Descreva o que motivou..."
                  className="crm-input min-h-[80px]"
                />
              </div>
            )}
            <ConsultantNote>Mapear gatilhos emocionais.</ConsultantNote>
          </div>

          {/* 6️⃣ Síntese Comportamental do Consultor */}
          <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary/30 space-y-4">
            <h4 className="font-semibold text-primary">6️⃣ Síntese Comportamental do Consultor</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tolerância à volatilidade</Label>
                <Select value={safeData.volatilityTolerance} onValueChange={(v) => update({ volatilityTolerance: v })}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Risco comportamental</Label>
                <Select value={safeData.behavioralRisk} onValueChange={(v) => update({ behavioralRisk: v })}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixo">Baixo</SelectItem>
                    <SelectItem value="Médio">Médio</SelectItem>
                    <SelectItem value="Alto">Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Necessidade de liquidez</Label>
                <Select value={safeData.liquidityNeed} onValueChange={(v) => update({ liquidityNeed: v })}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Direção estratégica sugerida</Label>
              <Textarea
                value={safeData.strategicDirection}
                onChange={(e) => update({ strategicDirection: e.target.value })}
                placeholder="Descreva a direção estratégica sugerida..."
                className="crm-input min-h-[100px] text-sm"
              />
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
