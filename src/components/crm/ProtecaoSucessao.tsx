import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CollapsibleComments } from './CollapsibleComments';

export interface ProtecaoSucessaoData {
  successionPlanning: string;
  successionStructure: string;
  patrimonialOrganization: string;
  organizationDescription: string;
  legalExposure: string;
  lifeInsurance: string;
  insuranceCoverage: string;
  geoDiversification: string;
  geoDiversificationPct: string;
  // Síntese
  summarySuccession: string;
  summaryLegalExposure: string;
  summaryFamilyProtection: string;
  summaryBrazilRisk: string;
  summaryStrategicDirection: string;
  consultantComment: string;
}

export const defaultProtecaoSucessao: ProtecaoSucessaoData = {
  successionPlanning: '',
  successionStructure: '',
  patrimonialOrganization: '',
  organizationDescription: '',
  legalExposure: '',
  lifeInsurance: '',
  insuranceCoverage: '',
  geoDiversification: '',
  geoDiversificationPct: '',
  summarySuccession: '',
  summaryLegalExposure: '',
  summaryFamilyProtection: '',
  summaryBrazilRisk: '',
  summaryStrategicDirection: '',
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
  data: ProtecaoSucessaoData;
  onChange: (data: ProtecaoSucessaoData) => void;
}

export function ProtecaoSucessao({ data, onChange }: Props) {
  const safeData = data ?? defaultProtecaoSucessao;
  const update = (partial: Partial<ProtecaoSucessaoData>) => {
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
          <span className="font-semibold text-foreground text-sm">Proteção, Sucessão e Blindagem Patrimonial</span>
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
            Mapear riscos jurídicos, sucessórios e estruturais que possam comprometer o patrimônio no longo prazo.
          </p>

          {/* 1️⃣ Planejamento Sucessório */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">1️⃣ Planejamento Sucessório</h4>
            <Label>Você já estruturou algum planejamento sucessório?</Label>
            <RadioGroup
              value={safeData.successionPlanning}
              onValueChange={(v) => update({ successionPlanning: v })}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="Sim" /> Sim
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="Não" /> Não
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="Parcialmente" /> Parcialmente
              </label>
            </RadioGroup>
            {(safeData.successionPlanning === 'Sim' || safeData.successionPlanning === 'Parcialmente') && (
              <div className="space-y-2">
                <Label>Qual estrutura foi utilizada? (holding, testamento, doação em vida, seguro, outro)</Label>
                <Textarea
                  value={safeData.successionStructure}
                  onChange={(e) => update({ successionStructure: e.target.value })}
                  placeholder="Descreva a estrutura utilizada..."
                  className="crm-input min-h-[80px]"
                />
              </div>
            )}
            <ConsultantNote>Identificar risco de inventário judicial e exposição ao ITCMD.</ConsultantNote>
          </div>

          {/* 2️⃣ Organização Patrimonial */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">2️⃣ Organização Patrimonial</h4>
            <Label>Seu patrimônio está organizado sob alguma estrutura jurídica específica? (holding, offshore, acordo societário, etc.)</Label>
            <RadioGroup
              value={safeData.patrimonialOrganization}
              onValueChange={(v) => update({ patrimonialOrganization: v })}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="Sim" /> Sim
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="Não" /> Não
              </label>
            </RadioGroup>
            {safeData.patrimonialOrganization === 'Sim' && (
              <div className="space-y-2">
                <Label>Descrever estrutura</Label>
                <Textarea
                  value={safeData.organizationDescription}
                  onChange={(e) => update({ organizationDescription: e.target.value })}
                  placeholder="Descreva a estrutura jurídica..."
                  className="crm-input min-h-[80px]"
                />
              </div>
            )}
            <ConsultantNote>Avaliar nível de organização e oportunidades de otimização.</ConsultantNote>
          </div>

          {/* 3️⃣ Exposição a Riscos Jurídicos */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">3️⃣ Exposição a Riscos Jurídicos</h4>
            <Label>Seu patrimônio pessoal está protegido contra riscos empresariais ou profissionais?</Label>
            <RadioGroup
              value={safeData.legalExposure}
              onValueChange={(v) => update({ legalExposure: v })}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="Sim" /> Sim
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="Não" /> Não
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="Não sei" /> Não sei
              </label>
            </RadioGroup>
            <ConsultantNote>Detectar risco de confusão patrimonial ou responsabilidade civil.</ConsultantNote>
          </div>

          {/* 4️⃣ Seguro de Vida e Proteção Familiar */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">4️⃣ Seguro de Vida e Proteção Familiar</h4>
            <Label>Você possui seguro de vida proporcional ao seu padrão de vida e patrimônio?</Label>
            <RadioGroup
              value={safeData.lifeInsurance}
              onValueChange={(v) => update({ lifeInsurance: v })}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="Sim" /> Sim
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="Não" /> Não
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="Parcialmente" /> Parcialmente
              </label>
            </RadioGroup>
            {(safeData.lifeInsurance === 'Sim' || safeData.lifeInsurance === 'Parcialmente') && (
              <div className="space-y-2">
                <Label>Valor da cobertura aproximada (R$)</Label>
                <CurrencyInput
                  value={safeData.insuranceCoverage}
                  onChange={(v) => update({ insuranceCoverage: v })}
                  placeholder="R$ 0,00"
                />
              </div>
            )}
            <ConsultantNote>Avaliar proteção da família e planejamento sucessório indireto.</ConsultantNote>
          </div>

          {/* 5️⃣ Diversificação Geográfica */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
            <h4 className="font-medium text-foreground">5️⃣ Diversificação Geográfica</h4>
            <Label>Você possui parte do patrimônio alocada fora do Brasil?</Label>
            <RadioGroup
              value={safeData.geoDiversification}
              onValueChange={(v) => update({ geoDiversification: v })}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="Sim" /> Sim
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="Não" /> Não
              </label>
            </RadioGroup>
            {safeData.geoDiversification === 'Sim' && (
              <div className="space-y-2">
                <Label>Percentual aproximado (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={safeData.geoDiversificationPct}
                  onChange={(e) => update({ geoDiversificationPct: e.target.value })}
                  placeholder="Ex: 15"
                  className="crm-input w-[150px]"
                />
              </div>
            )}
            <ConsultantNote>Medir exposição ao risco Brasil e concentração geográfica.</ConsultantNote>
          </div>

          {/* 6️⃣ Síntese de Proteção do Consultor */}
          <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary/30 space-y-4">
            <h4 className="font-semibold text-primary">6️⃣ Síntese de Proteção do Consultor</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Planejamento sucessório</Label>
                <Select value={safeData.summarySuccession} onValueChange={(v) => update({ summarySuccession: v })}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Adequado">Adequado</SelectItem>
                    <SelectItem value="Parcial">Parcial</SelectItem>
                    <SelectItem value="Inexistente">Inexistente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Exposição jurídica</Label>
                <Select value={safeData.summaryLegalExposure} onValueChange={(v) => update({ summaryLegalExposure: v })}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Proteção familiar</Label>
                <Select value={safeData.summaryFamilyProtection} onValueChange={(v) => update({ summaryFamilyProtection: v })}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Adequada">Adequada</SelectItem>
                    <SelectItem value="Insuficiente">Insuficiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Exposição ao risco Brasil</Label>
                <Select value={safeData.summaryBrazilRisk} onValueChange={(v) => update({ summaryBrazilRisk: v })}>
                  <SelectTrigger className="crm-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Direção estratégica sugerida</Label>
              <Textarea
                value={safeData.summaryStrategicDirection}
                onChange={(e) => update({ summaryStrategicDirection: e.target.value })}
                placeholder="Descreva a direção estratégica sugerida..."
                className="crm-input min-h-[100px] text-sm"
              />
            </div>
          </div>

          {/* Comentário do Consultor */}
          <CollapsibleComments
            value={safeData.consultantComment || ''}
            onChange={(v) => update({ consultantComment: v })}
            placeholder="Comentário do consultor sobre proteção e sucessão..."
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
