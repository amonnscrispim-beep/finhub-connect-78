import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const clientId = formData.get("clientId") as string;
    const broker = formData.get("broker") as string | null;
    const reportType = formData.get("reportType") as string | null;

    if (!file || !clientId) throw new Error("Missing file or clientId");

    // Upload PDF to storage
    const filePath = `${user.id}/${clientId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("performance-reports")
      .upload(filePath, file, { contentType: "application/pdf", upsert: true });
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // Read PDF as base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = base64Encode(new Uint8Array(arrayBuffer));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um especialista em análise de relatórios financeiros de investimentos. Analise o PDF do relatório financeiro e extraia TODAS as informações relevantes em formato JSON estruturado.

IMPORTANTE: Retorne APENAS o JSON, sem markdown, sem backticks, sem texto antes ou depois.

Estrutura obrigatória do JSON:
{
  "reportDate": "YYYY-MM-DD ou null se não identificável",
  "generalData": {
    "grossPatrimony": number ou null,
    "netPatrimony": number ou null,
    "monthReturn": number ou null (percentual),
    "yearReturn": number ou null (percentual),
    "twelveMonthReturn": number ou null (percentual),
    "cumulativeReturn": number ou null (percentual),
    "cdiEquivalent": number ou null (percentual)
  },
  "liquidity": {
    "dPlus1": number ou null (percentual),
    "upTo1Year": number ou null (percentual),
    "oneToFiveYears": number ou null (percentual),
    "aboveFiveYears": number ou null (percentual)
  },
  "positions": [
    {
      "name": "string",
      "type": "string (CRA, CRI, Debênture, CDB, Fundo, LCA, LCI, Tesouro, Ação, FII, etc.)",
      "indexer": "string (IPCA+, Prefixado, Pós-fixado, CDI+, etc.)",
      "rate": "string (ex: IPCA+6.5%, 110% CDI, 12.5% a.a.)",
      "maturityDate": "YYYY-MM-DD ou null",
      "grossBalance": number,
      "portfolioPct": number (percentual do patrimônio)
    }
  ],
  "indexerExposure": {
    "ipca": number ou null (percentual),
    "prefixed": number ou null (percentual),
    "postFixed": number ou null (percentual),
    "other": number ou null (percentual)
  }
}

Regras:
- Extraia TODOS os ativos listados, sem exceção
- Calcule percentuais se não estiverem explícitos
- Valores monetários em reais (sem R$, apenas número)
- Percentuais como números decimais (ex: 5.2 para 5.2%)
- Se um dado não existir no documento, use null
- Datas no formato YYYY-MM-DD
- Classifique cada ativo pelo indexador mais provável`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analise este relatório financeiro e extraia todos os dados estruturados conforme solicitado." },
              { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI extraction failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let extractedText = aiData.choices?.[0]?.message?.content ?? "";
    extractedText = extractedText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    let extractedData: any;
    try {
      extractedData = JSON.parse(extractedText);
    } catch {
      console.error("Failed to parse AI response:", extractedText.substring(0, 500));
      throw new Error("Falha ao interpretar os dados do PDF. Tente novamente.");
    }

    const positions = Array.isArray(extractedData?.positions) ? extractedData.positions : [];
    const gd = extractedData?.generalData ?? {};
    const liq = extractedData?.liquidity ?? {};
    const ie = extractedData?.indexerExposure ?? {};
    const totalPatrimony = gd.grossPatrimony ?? gd.netPatrimony ?? 0;

    // Generate alerts
    const alerts: string[] = [];
    if (totalPatrimony > 0 && positions.length > 0) {
      const sortedByPct = [...positions].sort((a: any, b: any) => ((b?.portfolioPct ?? 0) - (a?.portfolioPct ?? 0)));
      const topPct = sortedByPct[0]?.portfolioPct ?? 0;
      if (topPct > 15) alerts.push(`⚠️ Concentração elevada: "${sortedByPct[0]?.name ?? 'N/A'}" representa ${topPct.toFixed(1)}% do patrimônio (> 15%)`);
      const top3Pct = sortedByPct.slice(0, 3).reduce((s: number, p: any) => s + (p?.portfolioPct ?? 0), 0);
      if (top3Pct > 45) alerts.push(`⚠️ Top 3 ativos concentram ${top3Pct.toFixed(1)}% do patrimônio (> 45%)`);

      const byIssuer: Record<string, number> = {};
      positions.forEach((p: any) => {
        const issuer = (p?.name ?? "").split(" ")[0] || "Desconhecido";
        byIssuer[issuer] = (byIssuer[issuer] ?? 0) + (p?.portfolioPct ?? 0);
      });
      Object.entries(byIssuer).forEach(([issuer, pct]) => {
        if (pct > 25) alerts.push(`⚠️ Emissor "${issuer}" concentra ${pct.toFixed(1)}% (> 25%)`);
      });
    }

    if (positions.length > 0) {
      const now = new Date();
      const in6m = new Date(now); in6m.setMonth(in6m.getMonth() + 6);
      const in12m = new Date(now); in12m.setMonth(in12m.getMonth() + 12);
      const maturing6m = positions.filter((p: any) => p?.maturityDate && new Date(p.maturityDate) <= in6m);
      const maturing12m = positions.filter((p: any) => p?.maturityDate && new Date(p.maturityDate) <= in12m && new Date(p.maturityDate) > in6m);
      if (maturing6m.length > 0) alerts.push(`📅 ${maturing6m.length} ativo(s) vencendo em até 6 meses`);
      if (maturing12m.length > 0) alerts.push(`📅 ${maturing12m.length} ativo(s) vencendo entre 6 e 12 meses`);
    }

    const liqD1 = liq.dPlus1 ?? null;
    if (liqD1 !== null && liqD1 < 5) alerts.push(`🔴 Liquidez imediata (D+1) baixa: ${liqD1.toFixed(1)}% (< 5%)`);
    if (ie.ipca != null && ie.ipca > 60) alerts.push(`⚠️ Exposição elevada a IPCA+: ${ie.ipca.toFixed(1)}% (> 60%)`);
    if (ie.prefixed != null && ie.prefixed > 50) alerts.push(`⚠️ Exposição elevada a Prefixado: ${ie.prefixed.toFixed(1)}% (> 50%)`);
    if (ie.postFixed != null && ie.postFixed < 5) alerts.push(`⚠️ Exposição baixa a Pós-fixado: ${ie.postFixed.toFixed(1)}% (< 5%)`);

    // Generate summaries
    const fmtNum = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    let technicalSummary = "";
    const patrimony = gd.netPatrimony ?? gd.grossPatrimony ?? 0;
    if (patrimony > 0) {
      technicalSummary += `📊 Visão Geral\nPatrimônio: R$ ${fmtNum(patrimony)}\n`;
      if (gd.monthReturn != null) technicalSummary += `Rentabilidade mês: ${gd.monthReturn.toFixed(2)}%\n`;
      if (gd.yearReturn != null) technicalSummary += `Rentabilidade ano: ${gd.yearReturn.toFixed(2)}%\n`;
      if (gd.twelveMonthReturn != null) technicalSummary += `Rentabilidade 12M: ${gd.twelveMonthReturn.toFixed(2)}%\n`;
      if (gd.cdiEquivalent != null) technicalSummary += `CDI equivalente: ${gd.cdiEquivalent.toFixed(1)}%\n`;
    }

    let commercialSummary = "";
    if (patrimony > 0) {
      commercialSummary += `Olá! Analisei seu relatório.\n\nSeu patrimônio investido é de R$ ${fmtNum(patrimony)}`;
      if (gd.yearReturn != null) commercialSummary += `, com rentabilidade de ${gd.yearReturn.toFixed(2)}% no ano`;
      commercialSummary += `.\n\n`;
      if (alerts.length > 0) {
        commercialSummary += `Principal ponto de atenção: ${alerts[0].replace(/[⚠️🔴📅]/g, "").trim()}\n\n`;
      }
      commercialSummary += `Próximo passo: agendar uma conversa para discutir ajustes e oportunidades.`;
    }

    // Always INSERT into the new performance_reports table (supports multiple reports per client)
    const brokerValue = broker || "Não informado";
    const reportData = {
      client_id: clientId,
      user_id: user.id,
      pdf_url: filePath,
      pdf_filename: file.name,
      extracted_data: extractedData ?? {},
      alerts,
      technical_summary: technicalSummary,
      commercial_summary: commercialSummary,
      broker: brokerValue,
      corretora: brokerValue,
      tipo_relatorio: reportType || null,
      nome_arquivo: file.name,
      data_relatorio: extractedData?.reportDate ?? null,
      patrimonio_bruto: gd.grossPatrimony ?? null,
      patrimonio_liquido: gd.netPatrimony ?? null,
      rent_mes: gd.monthReturn ?? null,
      rent_ano: gd.yearReturn ?? null,
      rent_12m: gd.twelveMonthReturn ?? null,
      rent_acumulada: gd.cumulativeReturn ?? null,
      status: 'extracted',
      updated_at: new Date().toISOString(),
    };

    const { data: insertedReport, error: insertError } = await supabase
      .from("performance_reports")
      .insert(reportData)
      .select("id")
      .single();

    if (insertError) throw new Error(`Save failed: ${insertError.message}`);

    // Insert positions into performance_positions
    if (positions.length > 0 && insertedReport?.id) {
      const positionRows = positions.map((p: any) => ({
        report_id: insertedReport.id,
        user_id: user.id,
        ativo: p.name ?? null,
        tipo: p.type ?? null,
        indexador: p.indexer ?? null,
        taxa: p.rate ? parseFloat(String(p.rate).replace(/[^0-9.,\-]/g, '').replace(',', '.')) || null : null,
        vencimento: p.maturityDate ?? null,
        valor: p.grossBalance ?? null,
        percentual: p.portfolioPct ?? null,
      }));
      const { error: posError } = await supabase
        .from("performance_positions")
        .insert(positionRows);
      if (posError) console.error("Error inserting positions:", posError);
    }

    return new Response(JSON.stringify({
      success: true,
      reportId: insertedReport?.id,
      extractedData: extractedData ?? {},
      alerts,
      technicalSummary,
      commercialSummary,
      reportDate: extractedData?.reportDate ?? null,
      pdfFilename: file.name,
      broker: broker || null,
      reportType: reportType || null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
