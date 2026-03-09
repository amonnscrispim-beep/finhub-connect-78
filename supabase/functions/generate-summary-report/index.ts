import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, reportType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = reportType === 'whatsapp'
      ? `Você é Amonn Crispim, consultor de investimentos. Converta o relatório a seguir em uma mensagem curta e direta para WhatsApp.
Regras:
- Texto corrido, SEM markdown (sem #, **, etc.)
- Use emojis estratégicos (📊 💰 📈 ✅ ⚠️) no início de cada parágrafo
- Linguagem profissional mas acessível
- Máximo 800 caracteres
- Finalize com: "Amonn Crispim — Consultor de Investimentos"`
      : `Você é um analista financeiro sênior chamado Amonn Crispim, especialista em investimentos e consultoria financeira.
Gere um relatório profissional, bem estruturado e elegante em português brasileiro com base nos dados fornecidos.
O relatório deve ter:
- Cabeçalho com título e data
- Seções bem definidas com subtítulos em negrito
- Linguagem técnica mas acessível
- Conclusão com recomendação clara
- Assinatura: "Amonn Crispim — Consultor de Investimentos"
Formate em Markdown.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
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
    const report = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-summary-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
