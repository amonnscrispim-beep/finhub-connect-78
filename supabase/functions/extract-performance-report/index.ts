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

    // Determine MIME type
    const mimeType = file.type || "application/octet-stream";
    const supportedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!supportedTypes.some(t => mimeType.startsWith(t.split("/")[0]) && mimeType.includes(t.split("/")[1]))) {
      // Fallback: check by extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext ?? '')) {
        throw new Error("Formato não suportado. Envie PDF, JPG ou PNG.");
      }
    }

    // Sanitize filename: remove accents, special chars, spaces
    const sanitize = (name: string): string => {
      // Remove accents
      let s = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      // Get extension
      const dotIdx = s.lastIndexOf(".");
      let ext = dotIdx > 0 ? s.substring(dotIdx + 1).toLowerCase() : "";
      let base = dotIdx > 0 ? s.substring(0, dotIdx) : s;
      // Replace non-alphanumeric with underscore
      base = base.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
      if (ext === "jpeg") ext = "jpg";
      return base + (ext ? `.${ext}` : "");
    };
    const safeFilename = sanitize(file.name);

    // Upload file to storage
    const filePath = `${user.id}/${clientId}/${Date.now()}_${safeFilename}`;
    const { error: uploadError } = await supabase.storage
      .from("performance-reports")
      .upload(filePath, file, { contentType: mimeType, upsert: true });
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // Read file as base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = base64Encode(new Uint8Array(arrayBuffer));

    // Resolve the data URI MIME for the AI vision call
    const ext = file.name.split('.').pop()?.toLowerCase();
    let dataMime = mimeType;
    if (ext === 'jpg' || ext === 'jpeg') dataMime = 'image/jpeg';
    else if (ext === 'png') dataMime = 'image/png';
    else if (ext === 'pdf') dataMime = 'application/pdf';

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um especialista em análise de relatórios de investimentos brasileiros.
Sua tarefa é extrair dados de relatórios de corretoras (BTG Pactual, XP, etc.) com precisão absoluta.

## REGRAS DE EXTRAÇÃO

### QUANTIDADE DO ATIVO
- Extraia a quantidade EXATA exibida na coluna "Qtd" ou "Quantidade"
- NUNCA assuma quantidade = 1 se não estiver explícito
- Se a coluna estiver vazia ou ilegível, retorne null para quantidade
- Exemplos válidos: 10, 100, 1000, 2500, 0.5

### CLASSIFICAÇÃO DO TIPO DE ATIVO
Classifique cada ativo com base no ticker (código):

**ETF (Exchange Traded Fund):**
- Terminam em 11 MAS são ETFs conhecidos: IVVB11, WRLD11, BOVA11, SMAL11, HASH11, GOLD11, FIND11, SPXI11, DIVO11, MATB11, BOVB11, ECOO11, XFIX11, IFRA11, ISUS11, TIEE11, USDB11, BRAX11, PIBB11
- Se o fundo replica um índice de ações ou mercado amplo, é ETF

**FII (Fundo de Investimento Imobiliário):**
- Terminam em 11 E são fundos imobiliários (tijolo, papel, híbrido, FOF)
- Exemplos: BTLG11, VISC11, VILG11, CPIS11, XPML11, KNSC11, HGLG11, HGRU11, KNCK11, HSLG11, VGHF11, VGIR11, GARE11, VIUR11, TEPP11, KNRI11, MXRF11, BTCI11

**Ação (Stock):**
- Terminam em 3, 4, 5, 6 (ON, PN, etc): PETR4, VALE3, ITUB4, BBDC4
- BDRs geralmente terminam em 34 ou 32: AAPL34, MSFT34, AMZO34

**Renda Fixa / Tesouro:**
- CDB, LCI, LCA, CRI, CRA, Debênture, CDCA, LTN, NTN-B, NTN-F, Tesouro Direto, DPGE

**Previdência:**
- VGBL, PGBL — PROIBIDO atribuir liquidez D+0 ou D+1. SEMPRE liquidityNotInformed = true.

**Fundo de Investimento:**
- Fundos multimercado, renda fixa, cambial, etc. que não se enquadram nas categorias acima

### CÁLCULO DO VALOR TOTAL
- Se o relatório mostrar o Valor Total / Saldo Bruto, use o valor do relatório
- Se não mostrar, calcule: Valor Total = Quantidade × Preço Atual
- NUNCA use Preço Médio para calcular o Valor Total atual

### CAMPOS A EXTRAIR POR ATIVO (positions)
{
  "name": "nome completo do ativo",
  "ticker": "código do ativo ou null",
  "type": "ETF | FII | Ação | Renda Fixa | Previdência | Fundo | Cripto | Outro",
  "indexer": "IPCA+ | Prefixado | Pós-fixado | CDI+ | CDI | etc.",
  "rate": "string original (ex: IPCA+6.5%, 110% CDI, 12.5% a.a.)",
  "maturityDate": "YYYY-MM-DD ou null",
  "grossBalance": number (valor total / saldo bruto),
  "portfolioPct": number (% do patrimônio),
  "quantidade": number ou null,
  "precoMedio": number ou null,
  "precoAtual": number ou null,
  "lipRs": number ou null (lucro/prejuízo em R$),
  "lipPct": number ou null (lucro/prejuízo em %)
}

### REGRAS GERAIS
- Valores monetários: remova "R$" e converta vírgula para ponto (ex: R$ 2.502,96 → 2502.96)
- Percentuais como números decimais (ex: 5.2 para 5.2%)
- Se um dado não existir ou mostrar "—" (traço), retorne null
- Não invente dados que não estão visíveis no relatório
- Datas no formato YYYY-MM-DD
- Extraia TODOS os ativos listados, sem exceção

### REGRAS CRÍTICAS DE PATRIMÔNIO LÍQUIDO
- Só preencha netPatrimony se o relatório trouxer EXPLICITAMENTE: "patrimônio líquido", "valor líquido", "saldo líquido", "total líquido"
- Se nenhum desses termos aparecer, netPatrimony = null
- PROIBIDO usar: "disponível para resgate", "saldo disponível", "resgatável"

### REGRAS CRÍTICAS DE LIQUIDEZ
- Jamais assuma D+1 como padrão se o relatório não informar prazos de liquidez
- Se o relatório NÃO tiver informação de liquidez, retorne liquidityNotInformed = true e todos os campos de liquidity como null

IMPORTANTE: Retorne APENAS o JSON, sem markdown, sem backticks.

Estrutura obrigatória:
{
  "reportDate": "YYYY-MM-DD ou null",
  "liquidityNotInformed": boolean,
  "generalData": {
    "grossPatrimony": number ou null,
    "netPatrimony": number ou null,
    "monthReturn": number ou null,
    "yearReturn": number ou null,
    "twelveMonthReturn": number ou null,
    "cumulativeReturn": number ou null,
    "cdiEquivalent": number ou null
  },
  "liquidity": {
    "dPlus1": number ou null,
    "upTo1Year": number ou null,
    "oneToFiveYears": number ou null,
    "aboveFiveYears": number ou null
  },
  "positions": [ ...conforme estrutura acima... ],
  "indexerExposure": {
    "ipca": number ou null,
    "prefixed": number ou null,
    "postFixed": number ou null,
    "other": number ou null
  }
}`;

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
              { type: "text", text: "Analise este arquivo financeiro (pode ser PDF, imagem de extrato, screenshot de app) e extraia todos os dados estruturados conforme solicitado. Se for imagem, use OCR/visão." },
              { type: "image_url", image_url: { url: `data:${dataMime};base64,${base64}` } },
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
        ativo: p.ticker || p.name || null,
        tipo: p.type ?? null,
        indexador: p.indexer ?? null,
        taxa: p.rate ? parseFloat(String(p.rate).replace(/[^0-9.,\-]/g, '').replace(',', '.')) || null : null,
        vencimento: p.maturityDate ?? null,
        valor: p.grossBalance ?? null,
        percentual: p.portfolioPct ?? null,
        quantidade: p.quantidade ?? null,
        preco_medio: p.precoMedio ?? null,
        preco_atual: p.precoAtual ?? null,
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
