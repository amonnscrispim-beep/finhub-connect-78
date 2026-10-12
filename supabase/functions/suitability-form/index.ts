import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { calculateInvestorProfile } from "../../../src/lib/suitability.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json() : {};
    const code = String(body.code || url.searchParams.get("code") || "").toUpperCase().slice(0, 8);
    if (!/^[A-Z0-9]{4,8}$/.test(code)) return json({ error: "Código inválido" }, 400);
    const { data: t } = await sb.from("client_suitability_tokens").select("*").eq("short_code", code).maybeSingle();
    if (!t) return json({ error: "Link não encontrado" }, 404);
    if (t.status === "submitted") return json({ status: "submitted" });
    if (new Date(t.expires_at) < new Date()) return json({ error: "Este link expirou" }, 410);

    if (req.method === "GET") {
      const [{ data: c }, { data: p }] = await Promise.all([
        sb.from("clients").select("name").eq("id", t.client_id).maybeSingle(),
        sb.from("profiles").select("full_name").eq("user_id", t.user_id).maybeSingle(),
      ]);
      return json({ status: "pending", clientName: c?.name || "", consultorName: p?.full_name || "" });
    }
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const { personType, formData } = body;
    if (!["PF", "PJ"].includes(personType) || typeof formData !== "object" || !formData || JSON.stringify(formData).length > 50000) return json({ error: "Respostas inválidas" }, 400);
    const { profile, score } = calculateInvestorProfile(formData);
    const now = new Date();
    const { error: e1 } = await sb.from("client_suitability_tokens").update({
      status: "submitted", submitted_at: now.toISOString(),
      submitted_data: { personType, formData, calculatedProfile: profile, calculatedScore: score },
    }).eq("id", t.id).eq("status", "pending");
    if (e1) return json({ error: "Erro ao salvar" }, 500);
    await sb.from("client_suitability").update({ status: "superseded" }).eq("client_id", t.client_id).eq("status", "active");
    const validUntil = new Date(now); validUntil.setMonth(validUntil.getMonth() + 24);
    await sb.from("client_suitability").insert({
      client_id: t.client_id, user_id: t.user_id, person_type: personType, investor_profile: profile, score,
      form_data: formData, completed_at: now.toISOString(), valid_until: validUntil.toISOString(), status: "active",
    });
    const label = profile.charAt(0).toUpperCase() + profile.slice(1);
    await sb.from("clients").update({ investor_profile: label }).eq("id", t.client_id);
    return json({ success: true, profile, score });
  } catch (err) {
    console.error(err);
    return json({ error: "Erro interno" }, 500);
  }
});
