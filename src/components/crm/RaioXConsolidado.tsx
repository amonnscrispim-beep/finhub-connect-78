import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Trash2, Loader2, Sparkles, TrendingUp, Wallet, AlertTriangle, Calendar, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdf.js worker (use CDN to avoid bundler config)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface AttachedPdf {
  id: string;
  name: string;
  size: number;
  text: string;
  status: 'reading' | 'ready' | 'error';
}

interface LiquidityBucket {
  label: string;
  pct: number;
  color: string;
}

interface MaturityItem {
  ticker: string;
  amount: number;
  daysLeft: number;
  broker: string;
}

interface StrategyBreakdown {
  pos: number;
  pre: number;
  ipca: number;
  rv: number;
}

interface RaioX {
  patrimonioBruto: number;
  rentabilidadeMedia: number;
  brokers: string[];
  liquidity: LiquidityBucket[];
  maturities: { red: MaturityItem[]; yellow: MaturityItem[]; blue: MaturityItem[] };
  strategy: StrategyBreakdown;
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

const formatPct = (v: number) => `${v.toFixed(1)}%`;

const generateId = () => Math.random().toString(36).slice(2, 11);

/**
 * Mock AI call. Replace with real Lovable AI / OpenAI / Gemini call.
 * Receives concatenated text from all PDFs and returns a consolidated raio-x.
 */
async function callAIRaioX(_consolidatedText: string, brokers: string[]): Promise<RaioX> {
  // Simulate latency
  await new Promise((r) => setTimeout(r, 1800));

  // Mock data — replace with real AI parsing
  return {
    patrimonioBruto: 2_847_500,
    rentabilidadeMedia: 12.4,
    brokers,
    liquidity: [
      { label: 'Alta liquidez (D+0/D+1)', pct: 28, color: 'bg-emerald-600' },
      { label: 'Travado até 1 ano', pct: 35, color: 'bg-amber-500' },
      { label: 'Travado +2 anos', pct: 37, color: 'bg-slate-600' },
    ],
    maturities: {
      red: [
        { ticker: 'CDB BTG 110% CDI', amount: 85_000, daysLeft: 12, broker: 'BTG' },
        { ticker: 'LCI Safra IPCA+5%', amount: 42_300, daysLeft: 27, broker: 'Safra' },
      ],
      yellow: [
        { ticker: 'CDB XP Pré 11.2%', amount: 120_000, daysLeft: 45, broker: 'XP' },
      ],
      blue: [
        { ticker: 'Tesouro Selic 2026', amount: 67_500, daysLeft: 88, broker: 'XP' },
        { ticker: 'CDB Itaú 105% CDI', amount: 200_000, daysLeft: 110, broker: 'Itaú' },
      ],
    },
    strategy: { pos: 38, pre: 18, ipca: 22, rv: 22 },
  };
}

export function RaioXConsolidado() {
  const [pdfs, setPdfs] = useState<AttachedPdf[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [raioX, setRaioX] = useState<RaioX | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const extractText = useCallback(async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it: any) => it.str).join(' ') + '\n';
    }
    return text;
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const arr = Array.from(files).filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      if (arr.length === 0) {
        toast.error('Apenas arquivos PDF são aceitos.');
        return;
      }

      const newOnes: AttachedPdf[] = arr.map((f) => ({
        id: generateId(),
        name: f.name,
        size: f.size,
        text: '',
        status: 'reading' as const,
      }));

      setPdfs((prev) => [...prev, ...newOnes]);

      // Extract text in parallel
      await Promise.all(
        newOnes.map(async (entry, idx) => {
          try {
            const text = await extractText(arr[idx]);
            setPdfs((prev) => prev.map((p) => (p.id === entry.id ? { ...p, text, status: 'ready' } : p)));
          } catch (err) {
            console.error('PDF extract error:', err);
            setPdfs((prev) => prev.map((p) => (p.id === entry.id ? { ...p, status: 'error' } : p)));
            toast.error(`Falha ao ler ${entry.name}`);
          }
        }),
      );
    },
    [extractText],
  );

  const handleRemove = (id: string) => {
    setPdfs((prev) => prev.filter((p) => p.id !== id));
  };

  const handleGenerate = async () => {
    const ready = pdfs.filter((p) => p.status === 'ready');
    if (ready.length === 0) {
      toast.error('Anexe ao menos um PDF antes de gerar o Raio-X.');
      return;
    }
    setIsAnalyzing(true);
    setRaioX(null);
    try {
      const consolidated = ready.map((p) => `=== ${p.name} ===\n${p.text}`).join('\n\n');
      const brokers = ready.map((p) => p.name.replace(/\.pdf$/i, ''));
      const result = await callAIRaioX(consolidated, brokers);
      setRaioX(result);
      toast.success('Raio-X consolidado gerado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar Raio-X.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const readyCount = pdfs.filter((p) => p.status === 'ready').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Analisador Inteligente de Carteira
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Anexe relatórios de múltiplas corretoras e gere um Raio-X consolidado focado em liquidez e vencimentos.
          </p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-2">Arraste relatórios PDF aqui ou</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            // reset to allow same file re-upload
            if (inputRef.current) inputRef.current.value = '';
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          Escolher arquivos
        </Button>
        <p className="text-xs text-muted-foreground mt-2">PDFs de Safra, BTG, XP, Itaú, etc. — múltiplos aceitos</p>
      </div>

      {/* Attached list */}
      {pdfs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">PDFs anexados ({pdfs.length})</p>
          {pdfs.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-2.5 bg-muted/40 rounded-md border border-border">
              <FileText className="w-4 h-4 text-destructive flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground">{(p.size / 1024).toFixed(1)} KB</p>
              </div>
              {p.status === 'reading' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              {p.status === 'ready' && <Badge variant="secondary" className="text-[10px]">Lido</Badge>}
              {p.status === 'error' && <Badge variant="destructive" className="text-[10px]">Erro</Badge>}
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemove(p.id)}>
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Generate button */}
      <Button
        type="button"
        onClick={handleGenerate}
        disabled={readyCount === 0 || isAnalyzing}
        className="w-full h-11 bg-blue-900 hover:bg-blue-800 text-white"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Analisando {readyCount} relatório(s)...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Gerar Raio-X Consolidado (IA)
          </>
        )}
      </Button>

      {/* Result Dashboard */}
      {raioX && <RaioXDashboard data={raioX} />}
    </div>
  );
}

function RaioXDashboard({ data }: { data: RaioX }) {
  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-500" />
        <h4 className="font-semibold text-foreground">Raio-X Consolidado</h4>
        <Badge variant="outline" className="text-[10px]">
          {data.brokers.length} {data.brokers.length === 1 ? 'corretora' : 'corretoras'}
        </Badge>
      </div>

      {/* Visão Geral */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="p-4 border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Wallet className="w-3.5 h-3.5" />
            Patrimônio Bruto Consolidado
          </div>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">{formatBRL(data.patrimonioBruto)}</p>
        </Card>
        <Card className="p-4 border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Rentabilidade Média
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{formatPct(data.rentabilidadeMedia)}</p>
        </Card>
      </div>

      {/* Mapa de Liquidez */}
      <Card className="p-4 border-border">
        <div className="flex items-center gap-2 mb-3">
          <PieChart className="w-4 h-4 text-primary" />
          <h5 className="font-semibold text-sm text-foreground">Mapa de Liquidez</h5>
        </div>
        <div className="space-y-3">
          {data.liquidity.map((b) => (
            <div key={b.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{b.label}</span>
                <span className="font-semibold text-foreground">{formatPct(b.pct)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${b.color} transition-all`} style={{ width: `${b.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Radar de Vencimentos */}
      <Card className="p-4 border-border">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <h5 className="font-semibold text-sm text-foreground">Radar de Vencimentos</h5>
        </div>
        <div className="space-y-3">
          <MaturityGroup
            title="Próximos 30 dias"
            items={data.maturities.red}
            tone="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-900 dark:text-red-200"
            badgeTone="bg-red-700 text-white"
          />
          <MaturityGroup
            title="31 a 60 dias"
            items={data.maturities.yellow}
            tone="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200"
            badgeTone="bg-amber-600 text-white"
          />
          <MaturityGroup
            title="61 a 120 dias"
            items={data.maturities.blue}
            tone="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200"
            badgeTone="bg-blue-700 text-white"
          />
        </div>
      </Card>

      {/* Distribuição por Estratégia */}
      <Card className="p-4 border-border">
        <div className="flex items-center gap-2 mb-3">
          <PieChart className="w-4 h-4 text-primary" />
          <h5 className="font-semibold text-sm text-foreground">Distribuição por Estratégia</h5>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StrategyTile label="Pós-fixado" pct={data.strategy.pos} color="text-blue-900 dark:text-blue-200" />
          <StrategyTile label="Pré-fixado" pct={data.strategy.pre} color="text-emerald-700 dark:text-emerald-400" />
          <StrategyTile label="IPCA+" pct={data.strategy.ipca} color="text-amber-600 dark:text-amber-400" />
          <StrategyTile label="Renda Variável" pct={data.strategy.rv} color="text-slate-700 dark:text-slate-300" />
        </div>
      </Card>
    </div>
  );
}

function MaturityGroup({
  title,
  items,
  tone,
  badgeTone,
}: {
  title: string;
  items: MaturityItem[];
  tone: string;
  badgeTone: string;
}) {
  return (
    <div className={`rounded-md border p-3 ${tone}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          {title}
        </p>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badgeTone}`}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs opacity-70">Nenhum vencimento neste período.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((it, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{it.ticker}</p>
                <p className="opacity-70 text-[10px]">
                  {it.broker} • em {it.daysLeft} dias
                </p>
              </div>
              <p className="font-semibold ml-2">{formatBRL(it.amount)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StrategyTile({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="text-center p-3 rounded-md bg-slate-50 dark:bg-slate-900/50 border border-border">
      <p className={`text-2xl font-bold ${color}`}>{formatPct(pct)}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      <Progress value={pct} className="h-1 mt-2" />
    </div>
  );
}
