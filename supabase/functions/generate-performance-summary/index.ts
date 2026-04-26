import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DashboardSnapshot {
  clientName: string;
  totalGross: number;
  totalNet: number | null;
  netCoverage: { available: number; total: number };
  brokers: { broker: string; totalGross: number }[];
  liquidityBands: { label: string; valueR$: number; pct: number }[];
  alerts: string[];
  reportsCount: number;
}

const fmtBRL = (v: number | null | undefined) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as { snapshot: DashboardSnapshot };
    const snap = body.snapshot;
    if (!snap || typeof snap.totalGross !== "number") {
      return new Response(JSON.stringify({ error: "snapshot inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    // Monta um briefing textual claro a partir do snapshot
    const liqLines = snap.liquidityBands
      .map((b) => `- ${b.label}: ${fmtBRL(b.valueR$)} (${b.pct.toFixed(1)}%)`)
      .join("\n");
    const brokerLines = snap.brokers
      .map((b) => `- ${b.broker}: ${fmtBRL(b.totalGross)}`)
      .join("\n");
    const alertsBlock = snap.alerts?.length
      ? `Alertas estratégicos:\n${snap.alerts.map((a) => `- ${a}`).join("\n")}`
      : "Sem alertas estratégicos relevantes.";

    const briefing = `
Cliente: ${snap.clientName}
Patrimônio Bruto Consolidado: ${fmtBRL(snap.totalGross)}
Patrimônio Líquido Consolidado: ${
      snap.totalNet != null
        ? `${fmtBRL(snap.totalNet)} (cobertura ${snap.netCoverage.available}/${snap.netCoverage.total} relatórios)`
        : "não informado nos relatórios"
    }
Quantidade de Relatórios analisados: ${snap.reportsCount}

Distribuição por Corretora:
${brokerLines || "- (sem corretoras informadas)"}

Liquidez Consolidada por prazo:
${liqLines || "- (sem dados de liquidez)"}

${alertsBlock}
`.trim();

    const systemPrompt = `Você é um consultor de investimentos sênior, com tom institucional sóbrio (BlackRock / Itaú Private / BTG Wealth).
Escreva para um CLIENTE LEIGO de alta renda. Linguagem clara, profissional, sem jargão técnico desnecessário, sem emojis, sem markdown.
NUNCA invente números: use APENAS os dados fornecidos no briefing. Se algo não estiver disponível, diga "não informado".
Responda EXCLUSIVAMENTE em JSON válido com EXATAMENTE estas chaves:
{
  "executive_summary": string,   // 4-6 linhas, visão geral do patrimônio e da diversificação
  "patrimonial_situation": string, // descreve patrimônio bruto, líquido, distribuição por corretora
  "portfolio_liquidity": string, // analisa a liquidez consolidada por prazo, em texto corrido
  "consultant_comments": string, // 3-5 linhas: leitura crítica, riscos e pontos fortes da carteira
  "next_steps": string           // lista em texto corrido com 3-5 ações recomendadas, separadas por ponto
}
Não escreva nada fora do JSON.`;

    const userPrompt = `Briefing dos dados extraídos do dashboard de performance:\n\n${briefing}`;

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
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("Erro no gateway de IA");
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";

    let parsed: Record<string, string> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      // fallback: empacota tudo no executive_summary
      parsed = { executive_summary: raw };
    }

    const summary = {
      executive_summary: parsed.executive_summary ?? "",
      patrimonial_situation: parsed.patrimonial_situation ?? "",
      portfolio_liquidity: parsed.portfolio_liquidity ?? "",
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
