// Diagnóstico Inteligente — extrai estrutura de cliente a partir de texto livre
// Usa Lovable AI Gateway (sem chave do usuário).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const SYSTEM_PROMPT = `Você é um analista sênior de wealth management. Receberá um texto livre (transcrição de reunião, anotações, WhatsApp, resumo) sobre UM cliente de consultoria financeira. Sua tarefa é EXTRAIR informações estruturadas, SEM INVENTAR.

REGRAS:
- Se a informação não estiver no texto, use a string "Não informado" (campos texto), null (campos numéricos) ou array vazio.
- Converta valores em moeda para número puro em reais: "1,7 milhão" => 1700000, "10 mil/mês" => 10000, "R$ 2,5mi" => 2500000. Para USD mantenha como BRL apenas se o texto indicar conversão; caso contrário registre no campo de descrição.
- Detecte prazos: "em 10 anos" => "10 anos".
- Gere riscos e oportunidades a partir do contexto (concentração, falta de seguro, dependência de renda ativa, exposição cambial, sucessão etc.).
- Resposta em PORTUGUÊS.`;

const SCHEMA = {
  type: 'object',
  properties: {
    informacoes_pessoais: {
      type: 'object',
      properties: {
        nome: { type: 'string' },
        idade: { type: ['number', 'null'] },
        profissao: { type: 'string' },
        cidade: { type: 'string' },
        estado: { type: 'string' },
        pais: { type: 'string' },
        estado_civil: { type: 'string' },
        regime_bens: { type: 'string' },
        conjuge: { type: 'string' },
        filhos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              nome: { type: 'string' },
              idade: { type: ['number', 'null'] },
            },
          },
        },
      },
    },
    perfil: {
      type: 'object',
      properties: {
        hobbies: { type: 'string' },
        relacao_com_dinheiro: { type: 'string' },
        decisores_financeiros: { type: 'string' },
        como_conheceu: { type: 'string' },
      },
    },
    situacao_financeira: {
      type: 'object',
      properties: {
        renda_mensal: { type: ['number', 'null'] },
        receita_recorrente: { type: ['number', 'null'] },
        custo_vida_mensal: { type: ['number', 'null'] },
        aporte_mensal: { type: ['number', 'null'] },
        patrimonio_financeiro: { type: ['number', 'null'] },
        patrimonio_imobiliario: { type: ['number', 'null'] },
        patrimonio_societario: { type: ['number', 'null'] },
        reserva_emergencia_valor: { type: ['number', 'null'] },
        reserva_emergencia_local: { type: 'string' },
        instituicoes_financeiras: { type: 'string' },
      },
    },
    ativos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          descricao: { type: 'string' },
          categoria: { type: 'string' },
          valor: { type: ['number', 'null'] },
          liquidez: { type: 'string' },
        },
      },
    },
    dividas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tipo: { type: 'string' },
          descricao: { type: 'string' },
          saldo_devedor: { type: ['number', 'null'] },
          prazo_restante: { type: 'string' },
        },
      },
    },
    seguros: {
      type: 'object',
      properties: {
        seguro_vida: { type: 'string' },
        seguro_patrimonial: { type: 'string' },
        previdencia_privada: { type: 'string' },
      },
    },
    objetivos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          objetivo: { type: 'string' },
          prazo: { type: 'string' },
          valor_necessario: { type: ['number', 'null'] },
          prioridade: { type: 'string' },
        },
      },
    },
    riscos_identificados: { type: 'array', items: { type: 'string' } },
    resumo_executivo: { type: 'string' },
    principais_dores: { type: 'array', items: { type: 'string' } },
    principais_oportunidades: { type: 'array', items: { type: 'string' } },
    proximos_passos: { type: 'array', items: { type: 'string' } },
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY ausente' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { text } = await req.json();
    if (!text || typeof text !== 'string' || text.trim().length < 20) {
      return new Response(JSON.stringify({ error: 'Texto muito curto.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extrair_diagnostico_cliente',
            description: 'Extrai dados estruturados do cliente a partir do texto.',
            parameters: SCHEMA,
          },
        }],
        tool_choice: { type: 'function', function: { name: 'extrair_diagnostico_cliente' } },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      const status = resp.status === 429 ? 429 : resp.status === 402 ? 402 : 500;
      return new Response(JSON.stringify({ error: 'Falha no Lovable AI', details: errText }), {
        status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const data = await resp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      return new Response(JSON.stringify({ error: 'IA não retornou estrutura.', raw: data }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const parsed = JSON.parse(args);
    return new Response(JSON.stringify({ extraction: parsed }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
