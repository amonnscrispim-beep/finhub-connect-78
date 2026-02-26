import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CollapsibleComments } from './CollapsibleComments';

export interface HistoricoMercadoData {
  investmentExperience: string;
  assetTypes: string;
  previousAdvisor: string;
  whatWorkedWell: string;
  whatBothered: string;
  participationLevel: string;
  communicationFrequency: string;
  expectations: string;
  // Síntese
  summaryMaturity: string;
  summaryPreviousExperience: string;
  summaryInvolvement: string;
  summaryMisalignmentRisk: string;
  summaryRelationshipStrategy: string;
  consultantComment: string;
}

export const defaultHistoricoMercado: HistoricoMercadoData = {
  investmentExperience: '',
  assetTypes: '',
  previousAdvisor: '',
  whatWorkedWell: '',
  whatBothered: '',
  participationLevel: '',
  communicationFrequency: '',
  expectations: '',
  summaryMaturity: '',
  summaryPreviousExperience: '',
  summaryInvolvement: '',
  summaryMisalignmentRisk: '',
  summaryRelationshipStrategy: '',
  consultantComment: '',
};

function ConsultantNote({ children }: { children: string }) {
  return (
    <p className="text-xs text-muted-foreground/70 italic mt-1 leading-relaxed">
      {children}
    </p>
  );
}

interface Props {
  data: HistoricoMercadoData;
  onChange: (data: HistoricoMercadoData) => void;
}

export function HistoricoMercado({ data, onChange }: Props) {
  const safeData = data ?? defaultHistoricoMercado;
  const update = (partial: Partial<HistoricoMercadoData>) => {
    onChange({ ...safeData, ...partial });
  };
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button type="button" className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
          <span className="font-semibold text-foreground text-sm">Histórico com Mercado Financeiro e Expectativas</span>
          {isOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
        <div className="pt-4 space-y-6">
          <p className="text-xs text-muted-foreground">
            Mapear experiências anteriores, nível de maturidade financeira e expectativas sobre a relação consultiva.
          </p>

          {/* 1️⃣ */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">1️⃣ Experiência com Investimentos</h4>
            <Label>Há quanto tempo você investe no mercado financeiro?</Label>
            <Select value={safeData.investmentExperience} onValueChange={(v) => update({ investmentExperience: v })}>
              <SelectTrigger className="crm-input w-[250px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Menos de 1 ano">Menos de 1 ano</SelectItem>
                <SelectItem value="1 a 5 anos">1 a 5 anos</SelectItem>
                <SelectItem value="5 a 10 anos">5 a 10 anos</SelectItem>
                <SelectItem value="Mais de 10 anos">Mais de 10 anos</SelectItem>
              </SelectContent>
            </Select>
            <div className="space-y-2">
              <Label>Quais tipos de ativos você já utilizou?</Label>
              <Textarea value={safeData.assetTypes} onChange={(e) => update({ assetTypes: e.target.value })} placeholder="Ex: renda fixa, ações, FIIs, cripto..." className="crm-input min-h-[80px]" />
            </div>
            <ConsultantNote>Identificar nível de maturidade e sofisticação.</ConsultantNote>
          </div>

          {/* 2️⃣ */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">2️⃣ Relação com Assessores ou Bancos</h4>
            <Label>Você já trabalhou com assessor, banco ou consultor financeiro antes?</Label>
            <RadioGroup value={safeData.previousAdvisor} onValueChange={(v) => update({ previousAdvisor: v })} className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Sim" /> Sim</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="Não" /> Não</label>
            </RadioGroup>
            {safeData.previousAdvisor === 'Sim' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>O que funcionou bem?</Label>
                  <Textarea value={safeData.whatWorkedWell} onChange={(e) => update({ whatWorkedWell: e.target.value })} placeholder="Descreva..." className="crm-input min-h-[70px]" />
                </div>
                <div className="space-y-2">
                  <Label>O que te incomodava?</Label>
                  <Textarea value={safeData.whatBothered} onChange={(e) => update({ whatBothered: e.target.value })} placeholder="Descreva..." className="crm-input min-h-[70px]" />
                </div>
              </div>
            )}
            <ConsultantNote>Descobrir dor comercial e oportunidades de diferenciação.</ConsultantNote>
          </div>

          {/* 3️⃣ */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">3️⃣ Nível de Participação</h4>
            <Label>Você prefere acompanhar de perto as decisões ou delegar a gestão?</Label>
            <RadioGroup value={safeData.participationLevel} onValueChange={(v) => update({ participationLevel: v })} className="flex flex-col gap-2">
              {['Prefiro delegar totalmente', 'Gosto de acompanhar decisões', 'Quero participar ativamente'].map(opt => (
                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={opt} /> {opt}</label>
              ))}
            </RadioGroup>
            <ConsultantNote>Definir nível de envolvimento e frequência de comunicação.</ConsultantNote>
          </div>

          {/* 4️⃣ */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">4️⃣ Frequência de Comunicação Esperada</h4>
            <Label>Qual frequência de acompanhamento você considera ideal?</Label>
            <RadioGroup value={safeData.communicationFrequency} onValueChange={(v) => update({ communicationFrequency: v })} className="flex flex-wrap gap-4">
              {['Mensal', 'Trimestral', 'Semestral', 'Sob demanda'].map(opt => (
                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={opt} /> {opt}</label>
              ))}
            </RadioGroup>
            <ConsultantNote>Alinhar expectativa e evitar ruído futuro.</ConsultantNote>
          </div>

          {/* 5️⃣ */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">5️⃣ O que você espera desta consultoria?</h4>
            <Label>O que precisa acontecer para você considerar essa parceria um sucesso?</Label>
            <Textarea value={safeData.expectations} onChange={(e) => update({ expectations: e.target.value })} placeholder="Descreva suas expectativas..." className="crm-input min-h-[80px]" />
            <ConsultantNote>Mapear expectativa central e métrica subjetiva de satisfação.</ConsultantNote>
          </div>

          {/* 6️⃣ Síntese */}
          <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary/30 space-y-4">
            <h4 className="font-semibold text-primary">6️⃣ Síntese de Expectativas do Consultor</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nível de maturidade financeira</Label>
                <Select value={safeData.summaryMaturity} onValueChange={(v) => update({ summaryMaturity: v })}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixo">Baixo</SelectItem>
                    <SelectItem value="Médio">Médio</SelectItem>
                    <SelectItem value="Alto">Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Experiência anterior</Label>
                <Select value={safeData.summaryPreviousExperience} onValueChange={(v) => update({ summaryPreviousExperience: v })}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Positiva">Positiva</SelectItem>
                    <SelectItem value="Negativa">Negativa</SelectItem>
                    <SelectItem value="Inexistente">Inexistente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nível de envolvimento desejado</Label>
                <Select value={safeData.summaryInvolvement} onValueChange={(v) => update({ summaryInvolvement: v })}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixo">Baixo</SelectItem>
                    <SelectItem value="Médio">Médio</SelectItem>
                    <SelectItem value="Alto">Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Risco de expectativa desalinhada</Label>
                <Select value={safeData.summaryMisalignmentRisk} onValueChange={(v) => update({ summaryMisalignmentRisk: v })}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixo">Baixo</SelectItem>
                    <SelectItem value="Médio">Médio</SelectItem>
                    <SelectItem value="Alto">Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estratégia de relacionamento sugerida</Label>
              <Textarea value={safeData.summaryRelationshipStrategy} onChange={(e) => update({ summaryRelationshipStrategy: e.target.value })} placeholder="Descreva a estratégia de relacionamento sugerida..." className="crm-input min-h-[100px] text-sm" />
            </div>
          </div>

          {/* Comentário do Consultor */}
          <CollapsibleComments
            value={safeData.consultantComment || ''}
            onChange={(v) => update({ consultantComment: v })}
            placeholder="Comentário do consultor sobre histórico com mercado financeiro..."
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
