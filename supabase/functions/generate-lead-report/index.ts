import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REPORT_PROMPT = `Você é um analista sênior de qualificação comercial para consultoria financeira high ticket.

Com base no histórico de chat de qualificação abaixo, gere um relatório estruturado em JSON com os seguintes blocos:

1. "resumo_executivo": Texto corrido explicando quem é o lead, momento de vida, como ganha dinheiro, onde está o patrimônio e qual a principal dor.

2. "dados_principais": Objeto com campos: idade, profissao, pais_residencia, residencia_fiscal, estrutura_pf_pj, patrimonio_estimado, distribuicao_patrimonial, valor_investido_brasil, valor_investido_exterior, imoveis, empresa, renda_mensal_estimada, capacidade_aporte, fontes_renda, situacao_familiar. Use null para dados não coletados.

3. "diagnostico_comercial": Objeto com: dor_principal (texto), nivel_desorganizacao (Baixo/Médio/Alto/Crítico), nivel_complexidade_patrimonial (Baixo/Médio/Alto/Muito Alto), nivel_complexidade_tributaria (Baixo/Médio/Alto/Muito Alto), nivel_urgencia (Baixo/Médio/Alto), nivel_consciencia_problema (Baixo/Médio/Alto), abertura_high_ticket (Fechado/Neutro/Aberto/Muito Aberto).

4. "sinais_oportunidade": Array de strings com pontos que favorecem a venda.

5. "riscos_objecoes": Array de strings com o que pode dificultar o fechamento.

6. "estrategia_reuniao": Texto com instrução direta ao closer sobre qual ângulo entrar.

7. "fit_comercial": Objeto com: nivel (Muito Alto/Alto/Médio/Baixo), justificativa (texto).

8. "nota_prontidao": Objeto com: nota (número 0-10), explicacao (texto).

9. "proximo_passo": Texto com sugestão clara do que a equipe deve fazer.

10. "perguntas_faltando": Array de strings com o que ainda precisa ser validado.

RETORNE APENAS o JSON válido, sem markdown, sem code blocks.`;

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
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { chatHistory, leadName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const chatText = chatHistory.map((m: any) => `${m.role === 'assistant' ? 'Qualificador' : 'Lead'}: ${m.content}`).join('\n\n');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: REPORT_PROMPT },
          { role: "user", content: `Nome do lead: ${leadName}\n\nHistórico do chat de qualificação:\n\n${chatText}` },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';
    
    // Clean potential markdown wrapping
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    let report;
    try {
      report = JSON.parse(content);
    } catch {
      console.error("Failed to parse report JSON:", content);
      return new Response(JSON.stringify({ error: "Failed to parse AI report", raw: content }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-lead-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
