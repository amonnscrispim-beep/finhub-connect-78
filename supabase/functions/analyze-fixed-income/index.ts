import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Analisa um conjunto de relatórios de performance (PDFs já no storage)
 * e devolve a quebra de Renda Fixa por EMISSOR, SETOR e INDEXADOR.
 *
 * Body:
 *   { reportIds: string[] }   // ids da tabela performance_reports
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { reportIds } = await req.json();
    if (!Array.isArray(reportIds) || reportIds.length === 0) {
      return new Response(JSON.stringify({ error: "reportIds vazio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca os reports + URLs dos PDFs
    const { data: reports, error: repErr } = await supabase
      .from("performance_reports")
      .select("id, pdf_url, pdf_filename, broker, extracted_data")
      .in("id", reportIds)
      .eq("user_id", user.id);

    if (repErr) throw repErr;
    if (!reports || reports.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum relatório encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // ---- Constrói o "input" da IA: posições já extraídas + nomes dos PDFs ----
    // Evita reenviar o PDF inteiro (rápido, barato, e usa dados já validados).
    const positionsFlat: any[] = [];
    for (const r of reports) {
      const ed: any = r.extracted_data ?? {};
      const positions = Array.isArray(ed.positions) ? ed.positions : [];
      for (const p of positions) {
        positionsFlat.push({
          broker: r.broker || "N/A",
          name: p.name,
          ticker: p.ticker,
          type: p.type,
          indexer: p.indexer,
          rate: p.rate,
          maturityDate: p.maturityDate,
          grossBalance: p.grossBalance,
        });
      }
    }

    if (positionsFlat.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            "Nenhuma posição extraída encontrada nos relatórios. Faça o upload e a extração antes de analisar.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const totalGross = positionsFlat.reduce((s, p) => s + (Number(p.grossBalance) || 0), 0);

    const systemPrompt = `Você é um analista sênior de renda fixa do mercado brasileiro.
Receberá uma lista de posições já extraídas de relatórios de corretoras (BTG, XP, Itaú, Safra, etc).
Sua tarefa: filtrar APENAS os ativos de RENDA FIXA e devolver uma análise estruturada de:

1) EMISSORES (quem emitiu o título): Banco do Brasil, Itaú, Bradesco, Santander, Caixa, BTG, XP, Safra,
   Tesouro Nacional, Petrobras, Vale, BNDES, etc.
   - Para CDB, LCI, LCA, LF, LIG → emissor é o banco/instituição.
   - Para Debêntures, CRI, CRA → emissor é a empresa por trás (extraia do nome).
   - Para Tesouro Direto / LTN / NTN-B / NTN-F → emissor = "Tesouro Nacional".
   - Para Fundos de RF → emissor = a gestora/banco.
   - Se realmente não conseguir identificar, use "Não identificado".

2) SETORES ECONÔMICOS dos emissores:
   "Bancário" (CDB, LCI, LCA, LF, LIG de bancos),
   "Governo" (Tesouro Direto e títulos públicos),
   "Crédito Privado - Imobiliário" (CRI),
   "Crédito Privado - Agro" (CRA),
   "Crédito Privado - Corporativo" (Debêntures),
   "Fundos de RF" (fundos),
   "Outros".

3) INDEXADORES (% sobre o TOTAL DE RENDA FIXA):
   - "pos_fixado_cdi"  → CDI / % CDI / DI
   - "pos_fixado_selic" → Selic / Tesouro Selic / LFT
   - "pre_fixado" → Prefixado / LTN / NTN-F
   - "ipca" → IPCA+ / NTN-B / Tesouro IPCA
   - "outros" → o que não se encaixar

REGRAS:
- Só inclua ativos cujo type/nome indicam Renda Fixa (CDB, LCI, LCA, LF, LIG, CRI, CRA, Debênture,
  Tesouro, LTN, NTN-B, NTN-F, LFT, Fundo RF, COE, DPGE).
- Ignore Ações, FIIs, ETFs, Previdência, Cripto, Multimercado.
- Some os valores (grossBalance) por emissor e por setor.
- Calcule percentuais sobre o TOTAL DE RENDA FIXA (não sobre o patrimônio total).
- Percentuais como número decimal: 12.5 representa 12,5%.

Retorne APENAS JSON válido, sem markdown, com este schema EXATO:

{
  "patrimonio_bruto_total": number,
  "total_renda_fixa": number,
  "emissores": [
    { "nome": string, "setor": string, "valor": number, "percentual": number, "ativos_count": number }
  ],
  "setores": [
    { "nome": string, "emissores_count": number, "valor": number, "percentual": number }
  ],
  "indexadores": {
    "pos_fixado_cdi":  { "valor": number, "percentual": number },
    "pos_fixado_selic":{ "valor": number, "percentual": number },
    "pre_fixado":      { "valor": number, "percentual": number },
    "ipca":            { "valor": number, "percentual": number },
    "outros":          { "valor": number, "percentual": number }
  },
  "observacoes": [ string ]
}

Ordene "emissores" e "setores" do MAIOR para o MENOR percentual.`;

    const userMessage = `Patrimônio bruto total dos relatórios: R$ ${totalGross.toFixed(2)}.
Lista de TODAS as posições extraídas (${positionsFlat.length}):

${JSON.stringify(positionsFlat, null, 2)}

Filtre as de Renda Fixa, agrupe por emissor / setor / indexador e devolva o JSON conforme o schema.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 8000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições da IA atingido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos no workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error(`AI failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content ?? "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("Falha ao parsear JSON da IA:", content.substring(0, 600));
      // tentativa simples de reparo
      const open = (content.match(/\{/g) || []).length - (content.match(/\}/g) || []).length;
      let repaired = content.replace(/,\s*$/, "");
      for (let i = 0; i < open; i++) repaired += "}";
      try {
        parsed = JSON.parse(repaired);
      } catch {
        throw new Error("A IA retornou JSON inválido. Tente novamente.");
      }
    }

    // Garante coerência mínima
    parsed.patrimonio_bruto_total = parsed.patrimonio_bruto_total ?? totalGross;
    parsed.emissores = Array.isArray(parsed.emissores) ? parsed.emissores : [];
    parsed.setores = Array.isArray(parsed.setores) ? parsed.setores : [];
    parsed.indexadores = parsed.indexadores ?? {};
    parsed.observacoes = Array.isArray(parsed.observacoes) ? parsed.observacoes : [];

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-fixed-income error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
