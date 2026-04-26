import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CarteirasRecomendadas } from '@/components/crm/carteiras/CarteirasRecomendadas';

export interface ArquiteturaEstrategicaData {
  dominantObjective: string;
  riskLevel: string;
  strategicHorizon: string;
  structuralLiquidity: string;
  pillars: string[];
  // Macro allocation (legacy, mantido para retrocompatibilidade)
  fixedIncomePct: number;
  equitiesPct: number;
  internationalPct: number;
  alternativesPct: number;
  cashPct: number;
  // Final synthesis (legacy)
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

const OBJECTIVES = ['Renda', 'Crescimento'];

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

  const showCarteiras = !!safeData.dominantObjective && !!safeData.riskLevel;

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

      {/* Carteiras Recomendadas — exibido quando objetivo + risco preenchidos */}
      {showCarteiras && (
        <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
          <h4 className="font-medium text-foreground">Carteiras Recomendadas</h4>
          <p className="text-xs text-muted-foreground">
            Sugestões para perfil <strong>{safeData.riskLevel}</strong> com objetivo de <strong>{safeData.dominantObjective}</strong>.
          </p>
          <CarteirasRecomendadas />
        </div>
      )}
    </div>
  );
}
