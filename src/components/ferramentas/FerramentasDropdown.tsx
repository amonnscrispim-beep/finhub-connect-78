import { useState, useRef, useEffect } from 'react';
import { Wrench, ChevronDown, Calculator, TrendingUp, DollarSign, Home, ShoppingCart, Percent, Target, Landmark, LineChart, Wallet, PiggyBank, Receipt } from 'lucide-react';

export type FerramentaId =
  | 'juros-compostos'
  | 'milhao'
  | 'patrimonio-idade'
  | 'alugar-financiar'
  | 'vista-parcelada'
  | 'iof-caixinha'
  | 'simulador-ir'
  | 'cdb'
  | 'lci-lca'
  | 'tesouro-pre'
  | 'tesouro-selic'
  | 'dividendos';

interface Props {
  onSelect: (id: FerramentaId) => void;
  active: boolean;
}

const calculadoras = [
  { id: 'juros-compostos' as FerramentaId, label: 'Calculadora de Juros Compostos', icon: Calculator },
  { id: 'milhao' as FerramentaId, label: 'Calculadora do Milhão', icon: Target },
  { id: 'patrimonio-idade' as FerramentaId, label: 'Calculadora Patrimônio por Idade', icon: TrendingUp },
  { id: 'alugar-financiar' as FerramentaId, label: 'Calculadora Alugar ou Financiar', icon: Home },
  { id: 'vista-parcelada' as FerramentaId, label: 'Compra à Vista ou Parcelada', icon: ShoppingCart },
  { id: 'iof-caixinha' as FerramentaId, label: 'Calculadora de IOF da Caixinha', icon: Percent },
  { id: 'simulador-ir' as FerramentaId, label: 'Simulador de Imposto de Renda', icon: Receipt },
];

const simuladores = [
  { id: 'cdb' as FerramentaId, label: 'Simulador de CDB', icon: Landmark },
  { id: 'lci-lca' as FerramentaId, label: 'Simulador LCI / LCA', icon: Landmark },
  { id: 'tesouro-pre' as FerramentaId, label: 'Simulador Tesouro Prefixado', icon: LineChart },
  { id: 'tesouro-selic' as FerramentaId, label: 'Simulador Tesouro Selic', icon: Wallet },
  { id: 'dividendos' as FerramentaId, label: 'Viver de Dividendos', icon: PiggyBank },
];

export function FerramentasDropdown({ onSelect, active }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          active
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        <Wrench className="w-4 h-4" />
        Ferramentas
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-card border border-border rounded-lg shadow-lg z-50 py-2 animate-fade-in">
          <p className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Calculadoras</p>
          {calculadoras.map(item => (
            <button
              key={item.id}
              onClick={() => { onSelect(item.id); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <item.icon className="w-4 h-4 text-muted-foreground" />
              {item.label}
            </button>
          ))}
          <div className="my-1.5 border-t border-border" />
          <p className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Simuladores</p>
          {simuladores.map(item => (
            <button
              key={item.id}
              onClick={() => { onSelect(item.id); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <item.icon className="w-4 h-4 text-muted-foreground" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
