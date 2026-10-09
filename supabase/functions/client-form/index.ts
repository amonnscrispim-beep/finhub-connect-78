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

      const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", formToken.user_id).maybeSingle();
      return new Response(
        JSON.stringify({
          consultorName: prof?.full_name || "",
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

      // Uso único: depois de enviado, não aceita alterações
      if (["completed", "updated"].includes(formToken.status)) {
        return new Response(JSON.stringify({ error: "Formulário já enviado" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (typeof responses !== "object" || responses === null || JSON.stringify(responses).length > 200000) {
        return new Response(JSON.stringify({ error: "Respostas inválidas" }), {
          status: 400,
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

      // Os dados ficam no token até o consultor revisar e mesclar no CRM.

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
