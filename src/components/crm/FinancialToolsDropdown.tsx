import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(v);

export function FinancialToolsDropdown() {
  const [openJuros, setOpenJuros] = useState(false);
  const [openValuation, setOpenValuation] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <Calculator className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Ferramentas</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setOpenJuros(true)} className="cursor-pointer">
            <TrendingUp className="w-4 h-4 mr-2" />
            Juros Compostos
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenValuation(true)} className="cursor-pointer">
            <Building2 className="w-4 h-4 mr-2" />
            Valuation Rápido
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <JurosCompostosModal open={openJuros} onOpenChange={setOpenJuros} />
      <ValuationModal open={openValuation} onOpenChange={setOpenValuation} />
    </>
  );
}

function JurosCompostosModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [valorInicial, setValorInicial] = useState('');
  const [aporte, setAporte] = useState('');
  const [taxaAnual, setTaxaAnual] = useState('');
  const [anos, setAnos] = useState('');
  const [resultado, setResultado] = useState<number | null>(null);

  const calcular = () => {
    const PV = parseFloat(valorInicial) || 0;
    const PMT = parseFloat(aporte) || 0;
    const annualRate = parseFloat(taxaAnual) || 0;
    const years = parseFloat(anos) || 0;
    const n = years * 12;
    const i = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
    const fvPV = PV * Math.pow(1 + i, n);
    const fvPMT = i === 0 ? PMT * n : PMT * ((Math.pow(1 + i, n) - 1) / i);
    setResultado(fvPV + fvPMT);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Calculadora de Juros Compostos
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Valor Inicial (R$)</Label>
              <Input type="number" value={valorInicial} onChange={(e) => setValorInicial(e.target.value)} placeholder="10000" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Aporte Mensal (R$)</Label>
              <Input type="number" value={aporte} onChange={(e) => setAporte(e.target.value)} placeholder="500" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Taxa Anual (%)</Label>
              <Input type="number" step="0.01" value={taxaAnual} onChange={(e) => setTaxaAnual(e.target.value)} placeholder="12" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Prazo (Anos)</Label>
              <Input type="number" value={anos} onChange={(e) => setAnos(e.target.value)} placeholder="10" />
            </div>
          </div>
          <Button onClick={calcular} className="w-full">Calcular</Button>
          {resultado !== null && (
            <div className="text-center p-4 rounded-md bg-muted/40 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Valor Final</p>
              <p className="text-3xl font-bold text-green-600">{formatBRL(resultado)}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ValuationModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [faturamento, setFaturamento] = useState('');
  const [margem, setMargem] = useState('');
  const [multiplo, setMultiplo] = useState('');
  const [resultado, setResultado] = useState<number | null>(null);

  const calcular = () => {
    const fat = parseFloat(faturamento) || 0;
    const m = (parseFloat(margem) || 0) / 100;
    const mult = parseFloat(multiplo) || 0;
    setResultado(fat * m * mult);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Valuation Rápido (Múltiplos)
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Faturamento Anual (R$)</Label>
              <Input type="number" value={faturamento} onChange={(e) => setFaturamento(e.target.value)} placeholder="1000000" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Margem de Lucro (%)</Label>
              <Input type="number" step="0.01" value={margem} onChange={(e) => setMargem(e.target.value)} placeholder="20" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Múltiplo do Setor</Label>
              <Input type="number" step="0.1" value={multiplo} onChange={(e) => setMultiplo(e.target.value)} placeholder="5" />
            </div>
          </div>
          <Button onClick={calcular} className="w-full">Calcular Valuation</Button>
          {resultado !== null && (
            <div className="text-center p-4 rounded-md bg-muted/40 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Valor Estimado da Empresa</p>
              <p className="text-3xl font-bold text-green-600">{formatBRL(resultado)}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
