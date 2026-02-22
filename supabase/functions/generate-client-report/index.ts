import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { clientData, consultantObservation } = await req.json();
    if (!clientData) throw new Error("Missing clientData");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const fmtCurrency = (v: number | null | undefined) => {
      if (v == null || isNaN(v)) return null;
      return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    };

    // Build context string from all modules
    const ctx: string[] = [];

    // 1. Conhecer o Cliente
    if (clientData.name) ctx.push(`Nome: ${clientData.name}`);
    if (clientData.age) ctx.push(`Idade: ${clientData.age} anos`);
    if (clientData.profession) ctx.push(`Profissão: ${clientData.profession}`);
    if (clientData.objective) ctx.push(`Objetivo: ${clientData.objective}`);
    if (clientData.investorProfile) ctx.push(`Perfil de investidor: ${clientData.investorProfile}`);
    if (clientData.residence) ctx.push(`Residência: ${clientData.residence}`);
    if (clientData.city || clientData.state) ctx.push(`Localização: ${[clientData.city, clientData.state].filter(Boolean).join(", ")}`);

    // Strategic diagnostic
    const sd = clientData.strategicDiagnostic;
    if (sd) {
      if (sd.identity?.lifeStage) ctx.push(`Momento de vida: ${sd.identity.lifeStage}`);
      if (sd.identity?.mainGoal) ctx.push(`Objetivo principal: ${sd.identity.mainGoal}`);
      if (sd.identity?.consultingMotivation) ctx.push(`Motivação da consultoria: ${sd.identity.consultingMotivation}`);
      if (sd.family?.maritalStatus) ctx.push(`Estado civil: ${sd.family.maritalStatus}`);
      if (sd.family?.hasChildren === 'Sim') ctx.push(`Filhos: ${sd.family.childrenCount || 'sim'}`);
    }

    // 2. Situação Financeira
    if (clientData.financialAssets) ctx.push(`Ativos financeiros: ${fmtCurrency(Number(clientData.financialAssets))}`);
    if (clientData.materialAssets) ctx.push(`Ativos imobiliários: ${fmtCurrency(Number(clientData.materialAssets))}`);
    if (clientData.businessAssets) ctx.push(`Patrimônio empresarial: ${fmtCurrency(Number(clientData.businessAssets))}`);
    if (clientData.monthlyRevenue) ctx.push(`Renda mensal: ${fmtCurrency(Number(clientData.monthlyRevenue))}`);
    if (clientData.monthlyContribution) ctx.push(`Aporte mensal: ${fmtCurrency(Number(clientData.monthlyContribution))}`);
    if (clientData.passiveIncome) ctx.push(`Renda passiva: ${fmtCurrency(Number(clientData.passiveIncome))}`);
    if (clientData.monthlyLivingCost) ctx.push(`Custo de vida mensal: ${fmtCurrency(Number(clientData.monthlyLivingCost))}`);
    if (clientData.emergencyReserve) ctx.push(`Reserva de emergência: ${fmtCurrency(Number(clientData.emergencyReserve))}`);
    if (clientData.emergencyReserveStatus) ctx.push(`Status reserva emergência: ${clientData.emergencyReserveStatus}`);

    // 3. Dívidas
    if (clientData.debts && clientData.debts.length > 0) {
      ctx.push(`Dívidas: ${clientData.debts.length} registro(s)`);
      clientData.debts.forEach((d: any, i: number) => {
        const parts = [`Tipo: ${d.type || 'N/A'}`];
        if (d.cetPercentage) parts.push(`CET: ${d.cetPercentage}% a.a.`);
        if (d.term) parts.push(`Prazo: ${d.term} ${d.termUnit || 'meses'}`);
        if (d.amortizationSystem) parts.push(`Sistema: ${d.amortizationSystem}`);
        ctx.push(`  Dívida ${i + 1}: ${parts.join(", ")}`);
      });
    }
    if (clientData.debtsComments) ctx.push(`Observações sobre dívidas: ${clientData.debtsComments}`);

    // 4. Previdência
    if (clientData.privatePensionStatus) ctx.push(`Previdência privada: ${clientData.privatePensionStatus}`);
    if (clientData.privatePensionType) ctx.push(`Tipo previdência: ${clientData.privatePensionType}`);
    if (clientData.retirementAge) ctx.push(`Idade desejada aposentadoria: ${clientData.retirementAge}`);
    if (clientData.retirementIncome) ctx.push(`Renda desejada aposentadoria: ${fmtCurrency(Number(clientData.retirementIncome))}`);

    // 5. Metas
    if (clientData.shortTermGoals) ctx.push(`Metas curto prazo: ${clientData.shortTermGoals}`);
    if (clientData.mediumTermGoals) ctx.push(`Metas médio prazo: ${clientData.mediumTermGoals}`);
    if (clientData.longTermGoals) ctx.push(`Metas longo prazo: ${clientData.longTermGoals}`);

    // 6. Arquitetura da Carteira
    const ac = clientData.arquiteturaCarteira;
    if (ac) {
      if (ac.dominantObjective) ctx.push(`Objetivo dominante carteira: ${ac.dominantObjective}`);
      if (ac.horizon) ctx.push(`Horizonte: ${ac.horizon}`);
      if (ac.minimumLiquidity) ctx.push(`Liquidez mínima: ${ac.minimumLiquidity}`);
      if (ac.riskLevel) ctx.push(`Nível de risco: ${ac.riskLevel}`);
      if (ac.taxGuidelines) ctx.push(`Diretrizes tributárias: ${ac.taxGuidelines}`);
      if (ac.strategicPillars?.length) ctx.push(`Pilares estratégicos: ${ac.strategicPillars.join(", ")}`);
      const macro = ac.macroAllocation;
      if (macro) {
        const parts = [];
        if (macro.fixedIncome) parts.push(`RF ${macro.fixedIncome}%`);
        if (macro.variableIncome) parts.push(`RV ${macro.variableIncome}%`);
        if (macro.international) parts.push(`Internacional ${macro.international}%`);
        if (macro.alternatives) parts.push(`Alternativos ${macro.alternatives}%`);
        if (macro.cash) parts.push(`Caixa ${macro.cash}%`);
        if (parts.length) ctx.push(`Mapa macro: ${parts.join(", ")}`);
      }
    }

    // 7. Performance reports
    if (clientData.performanceSummary) {
      ctx.push(`Resumo de performance: ${clientData.performanceSummary}`);
    }

    // 8. Resultado da consultoria
    if (clientData.consultingInitialPatrimony) ctx.push(`Patrimônio inicial consultoria: ${fmtCurrency(Number(clientData.consultingInitialPatrimony))}`);
    if (clientData.consultingFinalPatrimony) ctx.push(`Patrimônio final consultoria: ${fmtCurrency(Number(clientData.consultingFinalPatrimony))}`);

    // 9. Observações do consultor
    if (clientData.observations) ctx.push(`Observações gerais: ${clientData.observations}`);
    if (clientData.workDone) ctx.push(`Trabalho desenvolvido: ${clientData.workDone}`);
    
    // Module notes
    const mn = clientData.moduleNotes;
    if (mn) {
      Object.entries(mn).forEach(([key, val]) => {
        if (val && typeof val === 'string' && val.trim()) {
          ctx.push(`Nota do consultor (${key}): ${val}`);
        }
      });
    }

    // Proteção e sucessão
    const ps = clientData.protecaoSucessao;
    if (ps) {
      if (ps.lifeInsurance) ctx.push(`Seguro de vida: ${ps.lifeInsurance}`);
      if (ps.willStatus) ctx.push(`Testamento: ${ps.willStatus}`);
      if (ps.successionNotes) ctx.push(`Notas sucessão: ${ps.successionNotes}`);
    }

    if (clientData.successionPlanning) ctx.push(`Planejamento sucessório: ${clientData.successionPlanning}`);

    // Final consultant observation
    if (consultantObservation) ctx.push(`Observações finais do consultor: ${consultantObservation}`);

    const contextString = ctx.filter(Boolean).join("\n");

    const systemPrompt = `Você é um redator financeiro sênior, especialista em planejamento financeiro pessoal. Sua tarefa é gerar dois documentos profissionais com base nos dados fornecidos.

REGRAS ABSOLUTAS:
1. NÃO invente dados. Use SOMENTE o que foi fornecido.
2. Se um dado estiver ausente, NÃO mencione no texto.
3. Se um cálculo depender de dado ausente, inclua nota: "Dado pendente: [campo]".
4. Todos os valores monetários em R$ formato brasileiro (R$ 0.000,00).
5. Corrija português automaticamente. Texto fluido e profissional.
6. Se houver "Observações finais do consultor", incorpore no final de AMBOS os documentos.

Retorne um JSON com esta estrutura EXATA (sem markdown, sem backticks):
{
  "technicalReport": "texto completo do resumo técnico",
  "clientReport": "texto completo do relatório do cliente"
}

DOCUMENTO 1 — RESUMO TÉCNICO DO CONSULTOR (interno)
Tom: técnico, objetivo, profissional. Frases curtas.
Seções obrigatórias (use somente as que tiverem dados):
1. **Identidade e Momento de Vida** — síntese do diagnóstico estratégico
2. **Estrutura Patrimonial** — consolidado PF/PJ, concentração, dependência de renda ativa
3. **Fluxo de Caixa e Capacidade de Aporte** — renda, custo, poupança, autonomia de liquidez
4. **Metas e Prazos** — meta principal + prazos + eventos relevantes
5. **Risco e Comportamento** — limites, crises, perfil real
6. **Diagnóstico de Carteira e Performance** — se houver dados: performance, liquidez, vencimentos, concentração
7. **Alertas Prioritários** — top 5 alertas objetivos (se houver dados suficientes)
8. **Próximas Ações do Consultor** — checklist prático

DOCUMENTO 2 — RELATÓRIO DO CLIENTE (bonito, pronto para enviar)
Tom: claro, acolhedor, profissional. Sem jargões excessivos.
Seções obrigatórias (use somente as que tiverem dados):
1. **Contexto e Objetivo** — o que você busca e por quê
2. **Diagnóstico Atual** — patrimônio, fluxo de caixa, organização
3. **Pontos Fortes** — o que está bom
4. **Pontos de Atenção** — o que precisa ajustar (sem expor alertas internos)
5. **Direcionamento Estratégico** — arquitetura da carteira e próximos passos
6. **Liquidez e Vencimentos** — se houver dados: resumo simples e claro
7. **Plano de Ação** — itens práticos
8. **Encerramento** — mensagem curta e profissional`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Dados do cliente:\n\n${contextString}\n\nGere os dois documentos conforme instruído. Retorne APENAS o JSON.` },
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
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let rawText = aiData.choices?.[0]?.message?.content ?? "";
    rawText = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let result: any;
    try {
      result = JSON.parse(rawText);
    } catch {
      console.error("Failed to parse AI response:", rawText.substring(0, 500));
      throw new Error("Falha ao gerar relatórios. Tente novamente.");
    }

    return new Response(JSON.stringify({
      success: true,
      technicalReport: result.technicalReport || "",
      clientReport: result.clientReport || "",
      generatedAt: new Date().toISOString(),
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
