import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RichSnapshot {
  clientName: string;
  reportPeriodLabel: string;
  totalGross: number;
  totalNet: number | null;
  netCoverage: { available: number; total: number };
  brokers: { broker: string; totalGross: number }[];
  monthReturnPct: number | null;
  yearReturnPct: number | null;
  cumulativeReturnPct: number | null;
  cdiYearPct: number | null;
  pctOfCdiYear: number | null;
  grossGainBRL: number;
  netGainBRL: number;
  irProvisionBRL: number;
  alphaVsCdiBRL: number;
  taxExemptValueBRL: number;
  taxExemptPct: number;
  taxExemptAssets: { name: string; valueR$: number }[];
  monthlyHistory: { month: string; portfolioPct: number; cdiPct: number | null; pctOfCdi: number | null; gainBRL: number | null }[];
  composition: { className: string; valueR$: number | null; pct: number; taxExemptPct: number | null }[];
  projections: { horizonYears: number; withoutAporte: number; withAporte: number }[];
  projectionsCdi: { horizonYears: number; withoutAporte: number; withAporte: number }[];
  monthlyAporte: number;
  averageMonthlyReturnPct: number | null;
  reportsCount: number;
}

const fmtBRL = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
const fmtPct = (v: number | null | undefined) => (v == null ? "—" : `${Number(v).toFixed(2)}%`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as { snapshot: RichSnapshot };
    const snap = body.snapshot;
    if (!snap || typeof snap.totalGross !== "number") {
      return new Response(JSON.stringify({ error: "snapshot inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    // ── Briefing rico ──
    const brokerLines = snap.brokers.map(b => `- ${b.broker}: ${fmtBRL(b.totalGross)}`).join("\n") || "- não informado";
    const monthLines = snap.monthlyHistory.length
      ? snap.monthlyHistory.map(m => `- ${m.month}: ${fmtPct(m.portfolioPct)} | CDI ${fmtPct(m.cdiPct)} | ${m.pctOfCdi != null ? `${m.pctOfCdi.toFixed(0)}% do CDI` : "—"} | ganho ${fmtBRL(m.gainBRL)}`).join("\n")
      : "- série mensal não disponível neste relatório";
    const compLines = snap.composition.length
      ? snap.composition.map(c => `- ${c.className}: ${fmtBRL(c.valueR$)} (${c.pct.toFixed(1)}%)${c.taxExemptPct ? ` — ${c.taxExemptPct.toFixed(0)}% isento de IR` : ""}`).join("\n")
      : "- composição por classe não detalhada";
    const projLines = snap.projections.map((p, i) => {
      const cdi = snap.projectionsCdi[i];
      const aMore = p.withAporte - (cdi?.withAporte ?? p.withAporte);
      return `- ${p.horizonYears} ano(s): ${fmtBRL(p.withoutAporte)} sem aportes / ${fmtBRL(p.withAporte)} com aportes mensais de ${fmtBRL(snap.monthlyAporte)} | vs CDI puro: ${fmtBRL(cdi?.withAporte)} (alpha futuro: ${fmtBRL(aMore)})`;
    }).join("\n");
    const exemptLines = snap.taxExemptAssets.length
      ? snap.taxExemptAssets.slice(0, 6).map(a => `- ${a.name}: ${fmtBRL(a.valueR$)}`).join("\n")
      : "- nenhum ativo isento identificado explicitamente";

    const briefing = `
CLIENTE: ${snap.clientName}
PERÍODO: ${snap.reportPeriodLabel}
QUANTIDADE DE RELATÓRIOS: ${snap.reportsCount}

PATRIMÔNIO:
- Bruto consolidado: ${fmtBRL(snap.totalGross)}
- Líquido: ${snap.totalNet != null ? fmtBRL(snap.totalNet) : "não informado"}
- Distribuição por corretora:
${brokerLines}

RENTABILIDADE:
- Mês: ${fmtPct(snap.monthReturnPct)}
- Ano: ${fmtPct(snap.yearReturnPct)} (CDI no ano: ${fmtPct(snap.cdiYearPct)})
- Acumulada desde início: ${fmtPct(snap.cumulativeReturnPct)}
- % do CDI no ano: ${snap.pctOfCdiYear != null ? `${snap.pctOfCdiYear.toFixed(0)}%` : "—"}
- Rentabilidade média mensal estimada: ${fmtPct(snap.averageMonthlyReturnPct)}

GANHOS EM R$:
- Ganho bruto do período: ${fmtBRL(snap.grossGainBRL)}
- Ganho líquido (descontando IR provisionado de ${fmtBRL(snap.irProvisionBRL)}): ${fmtBRL(snap.netGainBRL)}
- Alpha gerado vs CDI puro: ${fmtBRL(snap.alphaVsCdiBRL)} (quanto ganhou A MAIS que se estivesse 100% no CDI)

ISENÇÃO DE IR:
- Valor isento: ${fmtBRL(snap.taxExemptValueBRL)} (${snap.taxExemptPct.toFixed(1)}% da carteira)
- Principais ativos isentos:
${exemptLines}

RENTABILIDADE MÊS A MÊS:
${monthLines}

COMPOSIÇÃO POR CLASSE:
${compLines}

PROJEÇÕES (mantendo rentabilidade média mensal atual de ${fmtPct(snap.averageMonthlyReturnPct)}):
${projLines}
`.trim();

    const systemPrompt = `Você é um consultor de investimentos sênior escrevendo o RESUMO EXECUTIVO de um relatório de performance para um cliente de ALTA RENDA, leigo em finanças.

TOM OBRIGATÓRIO — POSITIVO E CELEBRATÓRIO:
- Destacar conquistas, ganhos em R$, performance vs CDI, alpha gerado.
- SEMPRE mostrar o ganho em R$ quando mencionar percentuais.
- Destacar com entusiasmo que ativos com asterisco (*) ou marcados como "isentos de IR" aumentam o ganho líquido — o cliente ganha mais porque NÃO PAGA IMPOSTO sobre esses rendimentos.
- Linguagem clara, profissional, acessível para um cliente que NÃO é especialista.
- NUNCA criticar a carteira, NUNCA apontar problemas ou sugerir mudanças — isso é papel do consultor na reunião presencial.
- Sem markdown, sem emojis, sem jargão técnico desnecessário, sem bullets.

REGRAS DE PRECISÃO:
- Use APENAS os números do briefing. Nunca invente valores.
- Se algum dado não estiver disponível, omita-o naturalmente — não escreva "não informado".
- Sempre formate valores em R$ no padrão brasileiro (R$ 1.250.000,00) e percentuais com 2 casas (12,50%).

ESTRUTURA — JSON com EXATAMENTE estas chaves:
{
  "executive_summary": string,         // 4-6 linhas. Patrimônio, ganho líquido em R$, % do CDI, alpha gerado em R$, destaque para isenção de IR. Tom celebratório.
  "patrimonial_situation": string,     // Patrimônio bruto/líquido, distribuição por corretora, ganho bruto e líquido em R$ no período.
  "monthly_performance": string,       // Comentário sobre o desempenho mês a mês: meses de destaque, consistência vs CDI, ganho acumulado em R$.
  "portfolio_composition": string,     // Composição por classe e DESTAQUE FORTE para a parcela isenta de IR (R$ e %), explicando que o cliente ganha mais por não pagar imposto.
  "future_projection": string,         // Texto explicativo sobre as projeções 1, 3 e 5 anos (com e sem aportes). Comparar com CDI puro destacando o alpha futuro em R$.
  "consultant_comments": string,       // 3-4 linhas neutras-positivas: contexto e leitura serena (NÃO criticar). Pode ficar vazio para o consultor preencher.
  "next_steps": string                 // 3-4 ações em texto corrido separadas por ponto. Tom propositivo, nunca crítico.
}
Não escreva nada fora do JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Briefing dos dados extraídos do dashboard de performance:\n\n${briefing}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("Erro no gateway de IA");
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, string> = {};
    try { parsed = JSON.parse(raw); }
    catch { parsed = { executive_summary: raw }; }

    const summary = {
      executive_summary: parsed.executive_summary ?? "",
      patrimonial_situation: parsed.patrimonial_situation ?? "",
      monthly_performance: parsed.monthly_performance ?? "",
      portfolio_composition: parsed.portfolio_composition ?? "",
      future_projection: parsed.future_projection ?? "",
      consultant_comments: parsed.consultant_comments ?? "",
      next_steps: parsed.next_steps ?? "",
    };

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-performance-summary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
