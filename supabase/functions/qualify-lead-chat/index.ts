import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista em qualificação comercial para consultoria financeira high ticket no Brasil. 
Seu papel é conduzir uma conversa consultiva, humana e estratégica com o objetivo de qualificar um lead para uma reunião de venda de consultoria financeira independente.

A consultoria oferece: planejamento financeiro, curadoria independente de ativos, eficiência tributária integrada, diversificação global, proteção patrimonial, planejamento sucessório e monitoramento contínuo. O serviço custa entre R$ 18.000 e R$ 30.000.

REGRAS OBRIGATÓRIAS:
- Faça UMA pergunta por vez, nunca várias ao mesmo tempo
- Conecte cada pergunta com a resposta anterior
- Use tom humano, claro, inteligente e consultivo — nunca robótico
- Aprofunde quando detectar: empresa (PJ), morar fora do Brasil, imóveis, herança, filhos, sócios, alta complexidade tributária ou patrimonial
- Nunca tente vender durante a qualificação
- Nunca faça recomendação técnica definitiva
- Não repita perguntas já feitas
- Avance pelas etapas naturalmente: momento de vida → mapa patrimonial → estrutura PF/PJ → investimentos → tributação → internacional (se aplicável) → sucessão → urgência → abertura para solução

OBJETIVO: Ao final, você deve ter coletado informações suficientes para gerar um relatório comercial completo que permita ao closer entrar na reunião sabendo onde está a dor, onde está o dinheiro e onde está a oportunidade.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, leadName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemWithName = SYSTEM_PROMPT + `\n\nO nome do lead é: ${leadName}.\nInicie sempre com: "Oi ${leadName}! Antes de direcionarmos para a próxima etapa, quero entender melhor o seu cenário financeiro e patrimonial. Posso te fazer algumas perguntas rápidas?"`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemWithName },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("qualify-lead-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
