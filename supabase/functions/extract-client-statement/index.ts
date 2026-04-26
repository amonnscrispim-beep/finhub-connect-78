const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExtractedAsset {
  asset_type: string;
  asset_name: string;
  issuer?: string;
  rate?: string;
  maturity_date?: string | null;
  gross_value: number;
  percentage: number;
  asset_class: string;
  is_tax_exempt: boolean;
}

interface ExtractedSnapshot {
  snapshot_date: string | null;
  total_patrimony: number;
  broker: string | null;
  assets: ExtractedAsset[];
}

const SYSTEM_PROMPT = `Você é um especialista em análise de extratos de corretoras brasileiras (BTG, XP, Necton, Itaú, Bradesco, Genial, Rico, etc.).

Sua tarefa: extrair TODOS os ativos do extrato em PDF e classificá-los corretamente.

REGRAS DE CLASSIFICAÇÃO (asset_class):
- "Renda Fixa": CDB, LCI, LCA, LF, LFT, LTN, NTN, CRA, CRI, Debênture, Tesouro Direto, RDB
- "Renda Variável": Ações (PETR4, VALE3 etc), BDRs, ETFs de ações
- "Fundos Imobiliários": FIIs (terminam com 11, ex: HGLG11, KNRI11)
- "Multimercado": Fundos multimercado, FI Multimercado, hedge funds
- "Previdência": VGBL, PGBL, fundos de previdência
- "Caixa": Conta corrente, saldo em conta, fundo DI, money market, liquidez imediata

REGRAS DE asset_type (mais específico):
- Renda Fixa: "CDB", "LCI", "LCA", "CRA", "CRI", "Debênture", "Tesouro IPCA+", "Tesouro Selic", "Tesouro Prefixado", "LF"
- Renda Variável: "Ação", "BDR", "ETF"
- Fundos Imobiliários: "FII"
- Multimercado: "Multimercado", "Long Biased", "Long Short"
- Previdência: "VGBL", "PGBL"
- Caixa: "Conta", "Fundo DI"

ISENÇÃO DE IR (is_tax_exempt = true):
- LCI, LCA: SEMPRE isentos
- CRA, CRI: SEMPRE isentos
- Debêntures incentivadas (lei 12.431) — geralmente marcadas com asterisco (*) ou texto "incentivada" / "isenta"
- FIIs: SEMPRE isentos (dividendos)
- Outros: false

CAMPOS:
- asset_name: nome completo do ativo como aparece no extrato (ex: "CDB BANCO BTG 110% CDI 2027", "PETR4", "HGLG11")
- issuer: emissor/empresa (ex: "BTG Pactual", "Petrobras", "BB Seguridade") — opcional
- rate: taxa quando aplicável (ex: "IPCA+6,5%", "110% CDI", "Pré 11,5%") — vazio para ações/FIIs
- maturity_date: data no formato YYYY-MM-DD ou null (não aplicável para ações, FIIs, fundos abertos)
- gross_value: valor bruto em R$ (apenas número, sem símbolos)
- percentage: percentual do patrimônio total (apenas número, ex: 5.32)

EXTRAIA TAMBÉM:
- snapshot_date: data de referência do extrato (formato YYYY-MM-DD); use null se não encontrar
- total_patrimony: patrimônio total bruto em R$
- broker: nome da corretora (BTG, XP, Necton, Itaú, etc.)

Se algum campo não estiver explícito, use null ou string vazia. Não invente dados.
Responda APENAS com JSON válido seguindo o schema fornecido.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pdfBase64, pdfMimeType } = await req.json();
    if (!pdfBase64) {
      return new Response(JSON.stringify({ error: "pdfBase64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mime = pdfMimeType || "application/pdf";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extraia todos os ativos deste extrato e responda em JSON conforme o schema da tool.",
              },
              {
                type: "image_url",
                image_url: { url: `data:${mime};base64,${pdfBase64}` },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_extracted_snapshot",
              description: "Retorna o extrato extraído com todos os ativos.",
              parameters: {
                type: "object",
                properties: {
                  snapshot_date: { type: ["string", "null"], description: "YYYY-MM-DD ou null" },
                  total_patrimony: { type: "number" },
                  broker: { type: ["string", "null"] },
                  assets: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        asset_type: { type: "string" },
                        asset_name: { type: "string" },
                        issuer: { type: ["string", "null"] },
                        rate: { type: ["string", "null"] },
                        maturity_date: { type: ["string", "null"] },
                        gross_value: { type: "number" },
                        percentage: { type: "number" },
                        asset_class: {
                          type: "string",
                          enum: [
                            "Renda Fixa",
                            "Renda Variável",
                            "Fundos Imobiliários",
                            "Multimercado",
                            "Previdência",
                            "Caixa",
                          ],
                        },
                        is_tax_exempt: { type: "boolean" },
                      },
                      required: [
                        "asset_type",
                        "asset_name",
                        "gross_value",
                        "percentage",
                        "asset_class",
                        "is_tax_exempt",
                      ],
                    },
                  },
                },
                required: ["total_patrimony", "assets"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_extracted_snapshot" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI Gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos do Lovable AI esgotados. Adicione créditos no workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI Gateway error: ${errText}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "Modelo não retornou dados estruturados." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed: ExtractedSnapshot = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-client-statement error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
