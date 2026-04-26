import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const url = new URL(req.url);

    // GET: Load form by token
    if (req.method === "GET") {
      const token = url.searchParams.get("token");
      if (!token) {
        return new Response(JSON.stringify({ error: "Token required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: formToken, error } = await supabase
        .from("client_form_tokens")
        .select("*")
        .eq("token", token)
        .single();

      if (error || !formToken) {
        return new Response(JSON.stringify({ error: "Formulário não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check expiration
      if (formToken.expires_at && new Date(formToken.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Este formulário expirou" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          clientName: formToken.client_name,
          status: formToken.status,
          responses: formToken.responses || {},
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST: Save/submit form responses
    if (req.method === "POST") {
      const body = await req.json();
      const { token, responses, submit } = body;

      if (!token) {
        return new Response(JSON.stringify({ error: "Token required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Load token
      const { data: formToken, error: fetchError } = await supabase
        .from("client_form_tokens")
        .select("*")
        .eq("token", token)
        .single();

      if (fetchError || !formToken) {
        return new Response(JSON.stringify({ error: "Formulário não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check expiration
      if (formToken.expires_at && new Date(formToken.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Este formulário expirou" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newStatus = submit ? "completed" : "in_progress";
      const updateData: Record<string, unknown> = {
        responses,
        status: newStatus,
      };
      if (submit) {
        updateData.completed_at = new Date().toISOString();
      }

      // Update token with responses
      const { error: updateError } = await supabase
        .from("client_form_tokens")
        .update(updateData)
        .eq("id", formToken.id);

      if (updateError) {
        return new Response(JSON.stringify({ error: "Erro ao salvar respostas" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If submitting, sync to client's strategic_diagnostic
      if (submit) {
        const clientId = formToken.client_id;

        // Build strategic_diagnostic update from responses
        const { data: client } = await supabase
          .from("clients")
          .select("strategic_diagnostic")
          .eq("id", clientId)
          .single();

        const existing = (client?.strategic_diagnostic as Record<string, unknown>) || {};

        // Map form responses to strategic_diagnostic structure
        const formResponses = responses as Record<string, unknown>;

        const strategicDiagnostic: Record<string, unknown> = {
          ...existing,
          wealthBuilding: formResponses.wealthBuilding || existing.wealthBuilding || "",
          lifePhaseAnswer: formResponses.lifePhaseAnswer || existing.lifePhaseAnswer || "",
          biggestDecision: formResponses.biggestDecision || existing.biggestDecision || "",
          biggestMistake: formResponses.biggestMistake || existing.biggestMistake || "",
          futureVision: formResponses.futureVision || existing.futureVision || "",
          targetPatrimony: formResponses.targetPatrimony || existing.targetPatrimony || "",
          targetMonthlyIncome: formResponses.targetMonthlyIncome || existing.targetMonthlyIncome || "",
          family: {
            ...(existing.family as Record<string, unknown> || {}),
            ...(formResponses.family as Record<string, unknown> || {}),
          },
          estruturaPatrimonial: {
            ...(existing.estruturaPatrimonial as Record<string, unknown> || {}),
            ...(formResponses.estruturaPatrimonial as Record<string, unknown> || {}),
          },
          fluxoCaixa: {
            ...(existing.fluxoCaixa as Record<string, unknown> || {}),
            ...(formResponses.fluxoCaixa as Record<string, unknown> || {}),
          },
          objetivosMetas: {
            ...(existing.objetivosMetas as Record<string, unknown> || {}),
            ...(formResponses.objetivosMetas as Record<string, unknown> || {}),
          },
          perfilRisco: {
            ...(existing.perfilRisco as Record<string, unknown> || {}),
            ...(formResponses.perfilRisco as Record<string, unknown> || {}),
          },
          protecaoSucessao: {
            ...(existing.protecaoSucessao as Record<string, unknown> || {}),
            ...(formResponses.protecaoSucessao as Record<string, unknown> || {}),
          },
        };

        // Also store the extra open-ended question
        if (formResponses.additionalNotes) {
          strategicDiagnostic.clientAdditionalNotes = formResponses.additionalNotes;
        }

        await supabase
          .from("clients")
          .update({
            strategic_diagnostic: strategicDiagnostic,
            updated_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
          })
          .eq("id", clientId);
      }

      return new Response(
        JSON.stringify({ success: true, status: newStatus }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
