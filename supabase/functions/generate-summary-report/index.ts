import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Limit PDF payload to ~10MB base64 to prevent abuse
const MAX_PDF_BASE64_LENGTH = 14_000_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const body = await req.json();
    const { message, reportType, mode, pdfBase64, fileName } = body;

    if (pdfBase64 && typeof pdfBase64 === "string" && pdfBase64.length > MAX_PDF_BASE64_LENGTH) {
      return new Response(JSON.stringify({ error: "PDF muito grande. Limite: ~10MB." }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let messages: any[];

    if (mode === 'transcribe_pdf' && pdfBase64) {
      // PDF transcription mode
      const transcriptionPrompt = `Você é um formatador de relatórios financeiros profissionais. Transcreva e formate este documento PDF em um relatório profissional de análise de investimentos. Preserve todos os dados, tabelas, números e gráficos descritos. Formate com títulos, subtítulos, tabelas em markdown e destaques relevantes. Mantenha tom analítico e profissional. Retorne em Markdown.`;

      messages = [
        { role: "system", content: transcriptionPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: `Transcreva e formate este documento PDF (${fileName || 'documento.pdf'}):` },
            {
              type: "image_url",
              image_url: { url: `data:application/pdf;base64,${pdfBase64}` }
            }
          ]
        },
      ];
    } else {
      // Normal report generation
      const systemPrompt = reportType === 'whatsapp'
        ? `Você é Amonn Crispim, consultor de investimentos. Converta o relatório a seguir em uma mensagem curta e direta para WhatsApp.
Regras:
- Texto corrido, SEM markdown (sem #, **, etc.)
- Use emojis estratégicos (📊 💰 📈 ✅ ⚠️) no início de cada parágrafo
- Linguagem profissional mas acessível
- Máximo 800 caracteres
- Finalize com: "Amonn Crispim — Consultor de Investimentos"`
        : `Você é um formatador de relatórios financeiros profissionais. Sua única função é pegar o texto bruto fornecido e formatá-lo visualmente de forma elegante e profissional, SEM alterar, resumir, reescrever ou adicionar nenhum conteúdo novo. Mantenha cada palavra, número e dado exatamente como está. Apenas:
- Organize em seções com títulos em negrito
- Adicione espaçamento adequado entre parágrafos
- Formate listas com bullet points onde já existem tópicos
- Destaque números e dados importantes em negrito
- Adicione cabeçalho com: título, ticker, cliente e data
- Adicione rodapé com: "Amonn Crispim — Consultor de Investimentos"
Retorne em Markdown. Não invente nada. Não resuma nada.`;

      messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
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
