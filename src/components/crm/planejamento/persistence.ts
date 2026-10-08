import { supabase } from "@/integrations/supabase/client";
import { defaults, type PlanningData } from "./calculations";
export function hydrate(raw: unknown, fallback: PlanningData): PlanningData {
  if (!raw || typeof raw !== "object") return fallback;
  const result = { ...fallback };
  for (const [k, v] of Object.entries(raw)) {
    const key = k as keyof PlanningData;
    if (!(key in result)) continue;
    const base = defaults()[key];
    if (
      typeof base === "number" &&
      typeof v === "number" &&
      Number.isFinite(v) &&
      v >= 0
    )
      Object.assign(result, { [k]: v });
    else if (typeof base === "string" && typeof v === "string")
      Object.assign(result, { [k]: v });
    else if (typeof base === "boolean" && typeof v === "boolean")
      Object.assign(result, { [k]: v });
    else if (
      ["coberturaAte"].includes(k) &&
      (v === null || typeof v === "number")
    )
      Object.assign(result, { [k]: v });
  }
  for (const key of ["entradas", "saidas"] as const) {
    const v = (raw as Record<string, unknown>)[key];
    if (Array.isArray(v))
      result[key] = v
        .filter(
          (e) =>
            e &&
            typeof e === "object" &&
            typeof e.idade === "number" &&
            typeof e.valor === "number" &&
            e.valor >= 0 &&
            ["unica", "mensal", "novo_aporte"].includes(e.recorrencia),
        )
        .map((e) => ({
          ...e,
          id: typeof e.id === "string" ? e.id : crypto.randomUUID(),
          descricao: String(e.descricao ?? ""),
          idadeFim: typeof e.idadeFim === "number" ? e.idadeFim : null,
        }));
  }
  const a = (raw as Record<string, unknown>).aiFields;
  if (Array.isArray(a))
    result.aiFields = a.filter((v): v is string => typeof v === "string");
  return result;
}
export async function loadPlanning(clientId: string, userId: string) {
  return supabase
    .from("client_patrimonial_simulations")
    .select("data,updated_at")
    .eq("client_id", clientId)
    .eq("user_id", userId)
    .maybeSingle();
}
export async function savePlanning(
  clientId: string,
  userId: string,
  data: PlanningData,
) {
  const { error } = await supabase
    .from("client_patrimonial_simulations")
    .upsert(
      {
        client_id: clientId,
        user_id: userId,
        data: JSON.parse(JSON.stringify(data)),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,user_id" },
    );
  if (error) throw error;
}
