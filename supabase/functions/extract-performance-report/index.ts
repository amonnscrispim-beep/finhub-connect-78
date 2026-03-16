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
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext ?? '')) {
        throw new Error("Formato não suportado. Envie PDF, JPG ou PNG.");
      }
    }

    // Sanitize filename
    const sanitize = (name: string): string => {
      let s = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const dotIdx = s.lastIndexOf(".");
      let ext = dotIdx > 0 ? s.substring(dotIdx + 1).toLowerCase() : "";
      let base = dotIdx > 0 ? s.substring(0, dotIdx) : s;
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

    const ext = file.name.split('.').pop()?.toLowerCase();
    let dataMime = mimeType;
    if (ext === 'jpg' || ext === 'jpeg') dataMime = 'image/jpeg';
    else if (ext === 'png') dataMime = 'image/png';
    else if (ext === 'pdf') dataMime = 'application/pdf';

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um especialista em análise de relatórios de investimentos brasileiros.
Sua tarefa é extrair dados de relatórios de corretoras (BTG Pactual, XP, Itaú, Bradesco, Safra, etc.) com precisão absoluta.

## REGRAS CRÍTICAS DE EXTRAÇÃO

### 1. TICKER DO ATIVO — OBRIGATÓRIO
- SEMPRE identifique o ticker (código B3) de cada ativo.
- Se o relatório mostrar apenas o nome da empresa, CONVERTA para o ticker correto:
  EXEMPLOS DE CONVERSÃO OBRIGATÓRIA:
  "BANCO DO BRASIL ON" ou "BANCO BRASIL ON" → BBAS3
  "CEMIG PN" → CMIG4
  "PETROBRAS PN" → PETR4
  "VALE ON" → VALE3
  "ITAÚ UNIBANCO PN" ou "ITAUUNIBANCO PN" → ITUB4
  "BRADESCO PN" → BBDC4
  "B3 ON" → B3SA3
  "AMBEV ON" → ABEV3
  "WEG ON" → WEGE3
  "MAGAZINE LUIZA ON" → MGLU3
  "LOCALIZA ON" → RENT3
  "RAIA DROGASIL ON" → RADL3
  "SUZANO ON" → SUZB3
  "JBS ON" → JBSS3
  "HAPVIDA ON" → HAPV3
  "TOTVS ON" → TOTS3
  "ENGIE ON" → EGIE3
  "EQUATORIAL ON" → EQTL3
  "SABESP ON" → SBSP3
  "COPEL PN" → CPLE6
  "TAESA UNIT" → TAEE11
  "ENEVA ON" → ENEV3
  "CYRELA ON" → CYRE3
  "MULTIPLAN ON" → MULT3
  "AREZZO ON" → ARZZ3
  "RUMO ON" → RAIL3
  "COSAN ON" → CSAN3
  "PRIO ON" → PRIO3
  "VAMOS ON" → VAMO3
  "SMARTFIT ON" → SMFT3
  "WIZCO ON" ou "WIZ ON" → WIZC3
  Se o ativo terminar em ON → sufixo 3
  Se o ativo terminar em PN → sufixo 4
  Se o ativo terminar em PNA → sufixo 5
  Se o ativo terminar em PNB → sufixo 6
  Se o ativo terminar em UNIT → sufixo 11
- Se não conseguir identificar o ticker, coloque o nome completo no campo "ticker" e adicione ao campo "erros".
- NUNCA retorne ticker como "—" ou null se o nome do ativo estiver visível.

### 2. QUANTIDADE DO ATIVO — PRECISÃO ABSOLUTA
- Extraia a quantidade EXATA exibida na coluna "Qtd", "Quantidade", "Cotas", "Qtde" ou similar.
- NUNCA assuma quantidade = 1 se não estiver explícito no relatório.
- Se a coluna mostrar 100, retorne 100. Se mostrar 2.500, retorne 2500.
- Se a coluna estiver vazia, ilegível ou não existir, retorne null para quantidade.
- Para Renda Fixa sem quantidade explícita, retorne null (o valor total já estará no grossBalance).

### 3. CLASSIFICAÇÃO DO TIPO DE ATIVO — LISTA DEFINITIVA

**ETF (Exchange Traded Fund) — tickers que SÃO ETF:**
IVVB11, WRLD11, BOVA11, SMAL11, HASH11, GOLD11, FIND11, SPXI11, DIVO11, MATB11, BOVB11, ECOO11, XFIX11, IFRA11, ISUS11, TIEE11, USDB11, BRAX11, PIBB11, EURP11, ACWI11, NASD11, BITH11, ETHE11, QBTC11, DEFI11, META11, TECK11, USTK11
→ Se o ticker está nesta lista, o tipo é "ETF", NÃO "FII".

**FII (Fundo de Investimento Imobiliário) — exemplos:**
BTLG11, VISC11, VILG11, CPIS11, XPML11, KNSC11, HGLG11, HGRU11, KNCK11, HSLG11, VGHF11, VGIR11, GARE11, VIUR11, TEPP11, KNRI11, MXRF11, BTCI11, PATL11, TRXF11, RZTR11, HSML11, CPTS11, IRDM11, RBRR11, PVBI11, RECR11, RBRP11, HGBS11, XPLG11, BRCR11, BCFF11

**Ação (Stock):**
Terminam em 3, 4, 5, 6 (ON, PN, PNA, PNB): PETR4, VALE3, ITUB4
BDRs terminam em 34, 32, 35: AAPL34, MSFT34

**Renda Fixa:**
CDB, LCI, LCA, CRI, CRA, Debênture, CDCA, LTN, NTN-B, NTN-F, Tesouro Direto, DPGE, COE, LC

**Previdência:** VGBL, PGBL

**Fundo de Investimento:** Fundos multimercado, renda fixa, cambial, etc.

### 4. CÁLCULO DO VALOR TOTAL
- Se o relatório mostrar Valor Total / Saldo Bruto / Financeiro, USE o valor do relatório.
- Se não mostrar, calcule: Valor Total = Quantidade × Preço Atual.
- NUNCA use Preço Médio para calcular o Valor Total atual.

### 5. CAMPOS POR ATIVO (positions)
{
  "name": "nome completo do ativo como aparece no relatório",
  "ticker": "código B3 (ex: PETR4, BTLG11, IVVB11) — OBRIGATÓRIO se visível",
  "type": "ETF | FII | Ação | Renda Fixa | Previdência | Fundo | Cripto | Outro",
  "indexer": "IPCA+ | Prefixado | Pós-fixado | CDI+ | CDI | Selic | etc.",
  "rate": "string original (ex: IPCA+6.5%, 110% CDI, 12.5% a.a.)",
  "maturityDate": "YYYY-MM-DD ou null",
  "grossBalance": number (valor total / saldo bruto),
  "portfolioPct": number (% do patrimônio),
  "quantidade": number ou null,
  "precoMedio": number ou null,
  "precoAtual": number ou null,
  "lipRs": number ou null,
  "lipPct": number ou null,
  "liquidityDays": number ou null (D+0, D+1, D+2, D+30, D+90 etc. — extraia se informado)
}

### 6. LIQUIDEZ — REGRAS POR TIPO DE ATIVO
Se o relatório NÃO informar dados de liquidez explicitamente, aplique estes PADRÕES:
- Ações e BDRs → D+2 (liquidityDays: 2)
- FIIs → D+2 (liquidityDays: 2)
- ETFs → D+2 (liquidityDays: 2)
- Tesouro Selic → D+1 (liquidityDays: 1)
- CDB com liquidez diária → D+1 (liquidityDays: 1)
- CDB sem liquidez → use a data de vencimento (liquidityDays: null, use maturityDate)
- LCI/LCA → use a data de vencimento (liquidityDays: null, use maturityDate)
- VGBL/PGBL → sem liquidez (liquidityDays: null)
Se o relatório INFORMAR a liquidez, use o valor informado e ignore os padrões acima.

### 7. REGRAS DE PATRIMÔNIO LÍQUIDO
- Só preencha netPatrimony se o relatório trouxer EXPLICITAMENTE: "patrimônio líquido", "valor líquido", "saldo líquido"
- Se nenhum desses termos aparecer, netPatrimony = null
- PROIBIDO usar: "disponível para resgate", "saldo disponível", "resgatável"

### 8. REGRAS GERAIS
- Valores monetários: remova "R$" e converta vírgula para ponto (ex: R$ 2.502,96 → 2502.96)
- Percentuais como números decimais (ex: 5.2 para 5.2%)
- Se um dado não existir ou mostrar "—" (traço), retorne null
- Não invente dados que não estão visíveis no relatório
- Datas no formato YYYY-MM-DD
- Extraia TODOS os ativos listados, sem exceção

IMPORTANTE: Retorne APENAS o JSON válido, sem markdown, sem backticks. Retorne o JSON COMPLETO sem truncar.

Estrutura obrigatória:
{
  "reportDate": "YYYY-MM-DD ou null",
  "liquidityNotInformed": boolean (true SOMENTE se o relatório não tiver NENHUMA informação de liquidez E nenhum ativo tem tipo identificável para aplicar padrão),
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
    "dPlus1": number ou null (% do patrimônio com liquidez D+0 ou D+1),
    "dPlus2": number ou null (% com liquidez D+2),
    "upTo30": number ou null (% com liquidez até 30 dias),
    "upTo1Year": number ou null (% com liquidez até 1 ano),
    "oneToFiveYears": number ou null,
    "aboveFiveYears": number ou null
  },
  "positions": [ ...conforme estrutura acima... ],
  "indexerExposure": {
    "ipca": number ou null,
    "prefixed": number ou null,
    "postFixed": number ou null,
    "other": number ou null
  },
  "erros": [ "lista de campos que não foi possível extrair com clareza" ]
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 16000,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analise este arquivo financeiro e extraia todos os dados estruturados conforme solicitado. ATENÇÃO: identifique o ticker B3 de cada ativo (converta nome para ticker quando necessário), extraia a quantidade EXATA da coluna Qtd, e classifique ETFs corretamente (IVVB11, WRLD11 são ETF, NÃO FII). Retorne o JSON completo sem truncar." },
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
    const finishReason = aiData.choices?.[0]?.finish_reason ?? "";
    let extractedText = aiData.choices?.[0]?.message?.content ?? "";
    extractedText = extractedText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    // If response was truncated, try to repair
    if (finishReason === "length" && extractedText.length > 0) {
      console.warn("AI response truncated. Attempting JSON repair...");
      let repaired = extractedText;
      repaired = repaired.replace(/,\s*$/, "");
      const openBrackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
      const openBraces = (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length;
      for (let i = 0; i < openBrackets; i++) repaired += "]";
      for (let i = 0; i < openBraces; i++) repaired += "}";
      extractedText = repaired;
    }

    let extractedData: any;
    try {
      extractedData = JSON.parse(extractedText);
    } catch {
      console.error("Failed to parse AI response:", extractedText.substring(0, 1000));
      throw new Error("Falha ao interpretar os dados do PDF. Tente novamente.");
    }

    // Post-process: fix ETF vs FII misclassification and ensure tickers
    const ETF_TICKERS = new Set([
      'IVVB11','WRLD11','BOVA11','SMAL11','HASH11','GOLD11','FIND11','SPXI11','DIVO11',
      'MATB11','BOVB11','ECOO11','XFIX11','IFRA11','ISUS11','TIEE11','USDB11','BRAX11',
      'PIBB11','EURP11','ACWI11','NASD11','BITH11','ETHE11','QBTC11','DEFI11','META11',
      'TECK11','USTK11',
    ]);

    const positions = Array.isArray(extractedData?.positions) ? extractedData.positions : [];
    
    // Post-process each position
    positions.forEach((p: any) => {
      const ticker = (p.ticker ?? '').toUpperCase().trim();
      
      // Fix ETF misclassification
      if (ETF_TICKERS.has(ticker) && p.type !== 'ETF') {
        p.type = 'ETF';
      }
      
      // Ensure ticker is not "—"
      if (ticker === '—' || ticker === '-' || ticker === '') {
        // Try to derive from name
        if (p.name) {
          p.ticker = p.name;
        }
      }
      
      // Apply default liquidity if not set
      if (p.liquidityDays == null && p.maturityDate == null) {
        const type = (p.type ?? '').toLowerCase();
        if (type === 'ação' || type === 'acao' || type === 'fii' || type === 'etf') {
          p.liquidityDays = 2;
        }
      }
    });
    
    extractedData.positions = positions;

    // Compute liquidity from positions if the AI returned null/empty liquidity
    const liq = extractedData?.liquidity ?? {};
    const hasAnyLiq = liq.dPlus1 != null || liq.upTo1Year != null || liq.oneToFiveYears != null || liq.aboveFiveYears != null;
    const totalPatrimony = extractedData?.generalData?.grossPatrimony ?? 0;
    
    if (!hasAnyLiq && totalPatrimony > 0 && positions.length > 0) {
      // Compute liquidity from individual position data
      let dPlus1Val = 0;
      let dPlus2Val = 0;
      let upTo30Val = 0;
      let upTo1YearVal = 0;
      let oneToFiveVal = 0;
      let aboveFiveVal = 0;
      let noLiqVal = 0;
      const now = new Date();
      
      positions.forEach((p: any) => {
        const val = p.grossBalance ?? 0;
        if (val <= 0) return;
        
        const liqDays = p.liquidityDays;
        const matDate = p.maturityDate ? new Date(p.maturityDate) : null;
        const type = (p.type ?? '').toLowerCase();
        
        if (liqDays != null) {
          if (liqDays <= 1) dPlus1Val += val;
          else if (liqDays <= 2) dPlus2Val += val;
          else if (liqDays <= 30) upTo30Val += val;
          else if (liqDays <= 365) upTo1YearVal += val;
          else if (liqDays <= 1825) oneToFiveVal += val;
          else aboveFiveVal += val;
        } else if (matDate && matDate >= now) {
          const diffDays = Math.ceil((matDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 1) dPlus1Val += val;
          else if (diffDays <= 30) upTo30Val += val;
          else if (diffDays <= 365) upTo1YearVal += val;
          else if (diffDays <= 1825) oneToFiveVal += val;
          else aboveFiveVal += val;
        } else if (type.includes('previdência') || type.includes('previdencia') || type.includes('vgbl') || type.includes('pgbl')) {
          noLiqVal += val;
        } else if (type === 'ação' || type === 'acao' || type === 'fii' || type === 'etf') {
          dPlus2Val += val;
        } else {
          // Unknown - classify as no liquidity info
          noLiqVal += val;
        }
      });
      
      extractedData.liquidity = {
        dPlus1: totalPatrimony > 0 ? ((dPlus1Val + dPlus2Val) / totalPatrimony) * 100 : null,
        upTo1Year: totalPatrimony > 0 ? ((upTo30Val + upTo1YearVal) / totalPatrimony) * 100 : null,
        oneToFiveYears: totalPatrimony > 0 ? (oneToFiveVal / totalPatrimony) * 100 : null,
        aboveFiveYears: totalPatrimony > 0 ? (aboveFiveVal / totalPatrimony) * 100 : null,
      };
      extractedData.liquidityNotInformed = false;
    }

    const gd = extractedData?.generalData ?? {};

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
      
      // Alert for positions without ticker
      const noTicker = positions.filter((p: any) => !p.ticker || p.ticker === '—' || p.ticker === '-');
      if (noTicker.length > 0) {
        alerts.push(`⚠️ ${noTicker.length} ativo(s) sem ticker identificado`);
      }
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

    const finalLiq = extractedData?.liquidity ?? {};
    const liqD1 = finalLiq.dPlus1 ?? null;
    if (liqD1 !== null && liqD1 < 5) alerts.push(`🔴 Liquidez imediata (D+1) baixa: ${liqD1.toFixed(1)}% (< 5%)`);
    
    const ie = extractedData?.indexerExposure ?? {};
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

    // Save to DB
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

    // Insert positions
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