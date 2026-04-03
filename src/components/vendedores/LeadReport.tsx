import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileDown, Copy, CheckCircle, AlertTriangle, Target, TrendingUp, Shield, HelpCircle, ArrowRight } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import type { Lead } from './VendedoresTab';

const FIT_COLORS: Record<string, string> = {
  'Muito Alto': 'bg-emerald-600 text-white',
  'Alto': 'bg-green-500 text-white',
  'Médio': 'bg-yellow-500 text-black',
  'Baixo': 'bg-muted text-muted-foreground',
};

function NotaBar({ nota }: { nota: number }) {
  const pct = (nota / 10) * 100;
  const color = nota >= 8 ? 'bg-green-500' : nota >= 5 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-2xl font-bold">{nota}/10</span>
    </div>
  );
}

interface Props {
  lead: Lead;
  onBack: () => void;
}

export function LeadReport({ lead, onBack }: Props) {
  const r = lead.relatorio;
  if (!r) return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">Nenhum relatório gerado para este lead.</p>
      <Button className="mt-4" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
    </div>
  );

  const handleCopy = () => {
    const text = `RELATÓRIO DE QUALIFICAÇÃO — ${lead.nome}\n\n${r.resumo_executivo || ''}\n\nFit Comercial: ${r.fit_comercial?.nivel || '—'}\nNota de Prontidão: ${r.nota_prontidao?.nota || '—'}/10\nPróximo Passo: ${r.proximo_passo || '—'}`;
    navigator.clipboard.writeText(text);
    toast.success('Resumo copiado!');
  };

  const handleExportPDF = () => {
    // Use HTML template approach for PDF
    const html = `
      <html><head><meta charset="utf-8"><style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #1a2332; }
        h1 { color: #1a2332; border-bottom: 2px solid #c9a84c; padding-bottom: 8px; }
        h2 { color: #1a2332; margin-top: 24px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; }
        .fit-muito-alto { background: #059669; color: white; }
        .fit-alto { background: #22c55e; color: white; }
        .fit-medio { background: #eab308; color: black; }
        .fit-baixo { background: #6b7280; color: white; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        td { padding: 6px 12px; border: 1px solid #e5e7eb; }
        td:first-child { font-weight: bold; background: #f3f4f6; width: 35%; }
        ul { padding-left: 20px; }
        li { margin: 4px 0; }
        .nota { font-size: 28px; font-weight: bold; }
      </style></head><body>
        <h1>Relatório de Qualificação — ${lead.nome}</h1>
        <h2>📋 Resumo Executivo</h2><p>${r.resumo_executivo || '—'}</p>
        <h2>📊 Dados Principais</h2>
        <table>${Object.entries(r.dados_principais || {}).map(([k, v]) => `<tr><td>${k}</td><td>${v || '—'}</td></tr>`).join('')}</table>
        <h2>🔍 Diagnóstico Comercial</h2>
        <table>${Object.entries(r.diagnostico_comercial || {}).map(([k, v]) => `<tr><td>${k}</td><td>${v || '—'}</td></tr>`).join('')}</table>
        <h2>✅ Sinais de Oportunidade</h2>
        <ul>${(r.sinais_oportunidade || []).map((s: string) => `<li>${s}</li>`).join('')}</ul>
        <h2>⚠️ Riscos e Objeções</h2>
        <ul>${(r.riscos_objecoes || []).map((s: string) => `<li>${s}</li>`).join('')}</ul>
        <h2>🎯 Estratégia para Reunião</h2><p>${r.estrategia_reuniao || '—'}</p>
        <h2>🏷️ Fit Comercial</h2>
        <p><span class="badge fit-${(r.fit_comercial?.nivel || '').toLowerCase().replace(' ', '-')}">${r.fit_comercial?.nivel || '—'}</span></p>
        <p>${r.fit_comercial?.justificativa || ''}</p>
        <h2>🔢 Nota de Prontidão</h2>
        <p class="nota">${r.nota_prontidao?.nota || '—'}/10</p>
        <p>${r.nota_prontidao?.explicacao || ''}</p>
        <h2>➡️ Próximo Passo</h2><p>${r.proximo_passo || '—'}</p>
        <h2>❓ Perguntas Faltando</h2>
        <ul>${(r.perguntas_faltando || []).map((s: string) => `<li>${s}</li>`).join('')}</ul>
      </body></html>
    `;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => { document.body.removeChild(iframe); URL.revokeObjectURL(url); }, 1000);
    };
  };

  const dados = r.dados_principais || {};
  const diag = r.diagnostico_comercial || {};

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopy}><Copy className="w-4 h-4 mr-2" />Copiar Resumo</Button>
          <Button onClick={handleExportPDF}><FileDown className="w-4 h-4 mr-2" />Exportar PDF</Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Relatório de Qualificação</h1>
        <p className="text-lg text-muted-foreground">{lead.nome}</p>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-muted/30 rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase mb-1">Fit Comercial</p>
            <Badge className={`${FIT_COLORS[r.fit_comercial?.nivel] || 'bg-muted'} text-sm px-3 py-1`}>
              {r.fit_comercial?.nivel || '—'}
            </Badge>
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase mb-2">Nota de Prontidão</p>
            {r.nota_prontidao?.nota != null && <NotaBar nota={r.nota_prontidao.nota} />}
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase mb-1">Próximo Passo</p>
            <p className="text-sm text-foreground font-medium">{r.proximo_passo || '—'}</p>
          </div>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={['resumo', 'diagnostico', 'fit']} className="space-y-2">
        <AccordionItem value="resumo" className="bg-card rounded-lg border border-border px-4">
          <AccordionTrigger className="hover:no-underline font-semibold">📋 Resumo Executivo</AccordionTrigger>
          <AccordionContent><p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{r.resumo_executivo}</p></AccordionContent>
        </AccordionItem>

        <AccordionItem value="dados" className="bg-card rounded-lg border border-border px-4">
          <AccordionTrigger className="hover:no-underline font-semibold">📊 Dados Principais</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {Object.entries(dados).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border/50 py-1.5">
                  <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="font-medium text-foreground">{(v as string) || '—'}</span>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="diagnostico" className="bg-card rounded-lg border border-border px-4">
          <AccordionTrigger className="hover:no-underline font-semibold">🔍 Diagnóstico Comercial</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 text-sm">
              {Object.entries(diag).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border/50 py-1.5">
                  <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="font-medium text-foreground">{v as string}</span>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="oportunidades" className="bg-card rounded-lg border border-border px-4">
          <AccordionTrigger className="hover:no-underline font-semibold"><span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Sinais de Oportunidade</span></AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-1.5">{(r.sinais_oportunidade || []).map((s: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />{s}</li>
            ))}</ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="riscos" className="bg-card rounded-lg border border-border px-4">
          <AccordionTrigger className="hover:no-underline font-semibold"><span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500" />Riscos e Objeções</span></AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-1.5">{(r.riscos_objecoes || []).map((s: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm"><AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />{s}</li>
            ))}</ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="estrategia" className="bg-card rounded-lg border border-border px-4">
          <AccordionTrigger className="hover:no-underline font-semibold"><span className="flex items-center gap-2"><Target className="w-4 h-4" />Estratégia para Reunião</span></AccordionTrigger>
          <AccordionContent><p className="text-sm leading-relaxed whitespace-pre-wrap">{r.estrategia_reuniao}</p></AccordionContent>
        </AccordionItem>

        <AccordionItem value="fit" className="bg-card rounded-lg border border-border px-4">
          <AccordionTrigger className="hover:no-underline font-semibold"><span className="flex items-center gap-2"><TrendingUp className="w-4 h-4" />Fit Comercial</span></AccordionTrigger>
          <AccordionContent>
            <Badge className={`${FIT_COLORS[r.fit_comercial?.nivel] || 'bg-muted'} mb-2`}>{r.fit_comercial?.nivel}</Badge>
            <p className="text-sm">{r.fit_comercial?.justificativa}</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="nota" className="bg-card rounded-lg border border-border px-4">
          <AccordionTrigger className="hover:no-underline font-semibold"><span className="flex items-center gap-2"><Shield className="w-4 h-4" />Nota de Prontidão</span></AccordionTrigger>
          <AccordionContent>
            {r.nota_prontidao?.nota != null && <NotaBar nota={r.nota_prontidao.nota} />}
            <p className="text-sm mt-2">{r.nota_prontidao?.explicacao}</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="proximo" className="bg-card rounded-lg border border-border px-4">
          <AccordionTrigger className="hover:no-underline font-semibold"><span className="flex items-center gap-2"><ArrowRight className="w-4 h-4" />Próximo Passo</span></AccordionTrigger>
          <AccordionContent><p className="text-sm leading-relaxed">{r.proximo_passo}</p></AccordionContent>
        </AccordionItem>

        <AccordionItem value="perguntas" className="bg-card rounded-lg border border-border px-4">
          <AccordionTrigger className="hover:no-underline font-semibold"><span className="flex items-center gap-2"><HelpCircle className="w-4 h-4" />Perguntas Faltando</span></AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-1.5">{(r.perguntas_faltando || []).map((s: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm"><HelpCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />{s}</li>
            ))}</ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
