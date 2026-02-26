import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { CollapsibleComments } from './CollapsibleComments';

export interface DirecionamentoEstrategicoData {
  strategicPriority: string;
  recommendedStructure: string;
  complexityLevel: string;
  identifiedRisks: string;
  pillars: string[];
  executiveSummary: string;
  consultantComment: string;
}

export const defaultDirecionamentoEstrategico: DirecionamentoEstrategicoData = {
  strategicPriority: '',
  recommendedStructure: '',
  complexityLevel: '',
  identifiedRisks: '',
  pillars: [],
  executiveSummary: '',
  consultantComment: '',
};

function ConsultantNote({ children }: { children: string }) {
  return (
    <p className="text-xs text-muted-foreground/70 italic mt-1 leading-relaxed">
      {children}
    </p>
  );
}

const STRATEGIC_PRIORITIES = [
  'Preservação patrimonial',
  'Crescimento acelerado',
  'Construção de renda passiva',
  'Redução de concentração',
  'Planejamento sucessório',
  'Diversificação internacional',
  'Reorganização estrutural',
];

const COMPLEXITY_LEVELS = [
  'Simples',
  'Intermediária',
  'Avançada',
  'Estruturada com múltiplas frentes',
];

interface Props {
  data: DirecionamentoEstrategicoData;
  onChange: (data: DirecionamentoEstrategicoData) => void;
}

export function DirecionamentoEstrategico({ data, onChange }: Props) {
  const safeData = data ?? defaultDirecionamentoEstrategico;
  const safePillars = Array.isArray(safeData.pillars) ? safeData.pillars : [];

  const update = (partial: Partial<DirecionamentoEstrategicoData>) => {
    onChange({ ...safeData, ...partial });
  };

  const [isOpen, setIsOpen] = useState(false);
  const [newPillar, setNewPillar] = useState('');

  const addPillar = () => {
    if (newPillar.trim() && safePillars.length < 5) {
      update({ pillars: [...safePillars, newPillar.trim()] });
      setNewPillar('');
    }
  };

  const removePillar = (index: number) => {
    update({ pillars: safePillars.filter((_, i) => i !== index) });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button type="button" className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
          <span className="font-semibold text-foreground text-sm">Direcionamento Estratégico Inicial</span>
          {isOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
        <div className="pt-4 space-y-6">
          <p className="text-xs text-muted-foreground">
            Consolidar diagnóstico e definir pilares estratégicos antes da construção da carteira.
          </p>

          {/* 1️⃣ */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">1️⃣ Prioridade Estratégica</h4>
            <Label>Qual deve ser o foco estratégico principal neste momento?</Label>
            <Select value={safeData.strategicPriority} onValueChange={(v) => update({ strategicPriority: v })}>
              <SelectTrigger className="crm-input w-full max-w-[350px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {STRATEGIC_PRIORITIES.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ConsultantNote>Definir o eixo principal da estratégia.</ConsultantNote>
          </div>

          {/* 2️⃣ */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">2️⃣ Estrutura Recomendada</h4>
            <Label>Qual estrutura patrimonial é recomendada com base no diagnóstico?</Label>
            <Textarea
              value={safeData.recommendedStructure}
              onChange={(e) => update({ recommendedStructure: e.target.value })}
              placeholder="Descreva a estrutura recomendada..."
              className="crm-input min-h-[80px]"
            />
            <ConsultantNote>Registrar visão macro antes de falar em ativos específicos.</ConsultantNote>
          </div>

          {/* 3️⃣ */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">3️⃣ Grau de Complexidade da Estratégia</h4>
            <Select value={safeData.complexityLevel} onValueChange={(v) => update({ complexityLevel: v })}>
              <SelectTrigger className="crm-input w-full max-w-[350px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {COMPLEXITY_LEVELS.map(l => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ConsultantNote>Calibrar entrega e justificar honorários.</ConsultantNote>
          </div>

          {/* 4️⃣ */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">4️⃣ Principais Riscos Identificados</h4>
            <Textarea
              value={safeData.identifiedRisks}
              onChange={(e) => update({ identifiedRisks: e.target.value })}
              placeholder="Liste as vulnerabilidades detectadas..."
              className="crm-input min-h-[80px]"
            />
            <ConsultantNote>Listar vulnerabilidades detectadas ao longo do diagnóstico.</ConsultantNote>
          </div>

          {/* 5️⃣ */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">5️⃣ Pilares da Estratégia</h4>
            <div className="space-y-2">
              {safePillars.map((pillar, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}.</span>
                  <span className="text-sm flex-1">{pillar}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removePillar(index)} className="h-7 w-7 p-0">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              {safePillars.length < 5 && (
                <div className="flex items-center gap-2">
                  <Input
                    value={newPillar}
                    onChange={(e) => setNewPillar(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPillar(); } }}
                    placeholder="Ex: Diversificação financeira"
                    className="crm-input flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addPillar} disabled={!newPillar.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Até 5 pilares. Exemplos: Diversificação financeira, Blindagem jurídica, Geração de renda, Liquidez estratégica, Internacionalização</p>
            </div>
            <ConsultantNote>Definir arquitetura antes da seleção de ativos.</ConsultantNote>
          </div>

          {/* 6️⃣ */}
          <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary/30 space-y-4">
            <h4 className="font-semibold text-primary">6️⃣ Síntese Executiva do Consultor</h4>
            <Label>Resumo estratégico inicial</Label>
            <p className="text-xs text-muted-foreground">
              Onde ele está hoje · Para onde precisa ir · O que precisa corrigir · Qual será o caminho estratégico
            </p>
            <Textarea
              value={safeData.executiveSummary}
              onChange={(e) => update({ executiveSummary: e.target.value })}
              placeholder="Descreva o resumo estratégico inicial..."
              className="crm-input min-h-[120px] text-sm"
            />
          </div>

          {/* Comentário do Consultor */}
          <CollapsibleComments
            value={safeData.consultantComment || ''}
            onChange={(v) => update({ consultantComment: v })}
            placeholder="Comentário do consultor sobre direcionamento estratégico..."
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
