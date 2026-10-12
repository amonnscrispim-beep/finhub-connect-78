// Questionário de perfil do investidor (Suitability) — opções e pontuação.
export type Opt = [value: string, label: string, points: number];

export const QUESTIONS: { key: string; title: string; opts: Opt[] }[] = [
  { key: 'percentInvested', title: 'Que percentual da sua renda você investe?', opts: [['up_to_10', 'Até 10%', 1], ['11_to_20', '11% a 20%', 2], ['21_to_30', '21% a 30%', 3], ['over_30', 'Acima de 30%', 4]] },
  { key: 'needIn12Months', title: 'Quanto dos seus investimentos pretende resgatar nos próximos 12 meses?', opts: [['over_50', 'Mais de 50%', 1], ['25_to_50', '25% a 50%', 2], ['up_to_25', 'Até 25%', 3], ['nothing', 'Não pretendo resgatar', 4]] },
  { key: 'investmentBehavior', title: 'Qual frase melhor descreve seu comportamento com investimentos?', opts: [['avoid_loss', 'Evito qualquer perda', 1], ['accept_small', 'Aceito pequenas perdas', 2], ['accept_losses', 'Aceito perdas em busca de ganhos maiores', 4]] },
  { key: 'acceptableLoss', title: 'Em 6 meses, qual perda você aceitaria sem resgatar?', opts: [['none', 'Não aceitaria perdas', 1], ['up_to_5', 'Até 5%', 2], ['5_to_10', '5% a 10%', 3], ['over_10', 'Mais de 10%', 4]] },
  { key: 'gainReaction', title: 'Se seus investimentos subissem cerca de 12,5%, você:', opts: [['redeem_all', 'Resgataria tudo', 1], ['move_part_safer', 'Moveria parte para opções mais seguras', 2], ['pleased_no_change', 'Ficaria satisfeito e não mexeria', 3], ['invest_more', 'Investiria mais', 4]] },
  { key: 'lossReaction', title: 'Se seus investimentos caíssem cerca de 12,5%, você:', opts: [['redeem_all', 'Resgataria tudo', 1], ['move_part_safer', 'Moveria parte para opções mais seguras', 2], ['worried_no_change', 'Ficaria preocupado, mas não mexeria', 3], ['invest_more', 'Investiria mais', 4]] },
  { key: 'belowCDITolerance', title: 'Por quanto tempo aceitaria uma rentabilidade abaixo do CDI?', opts: [['none', 'Não aceitaria', 1], ['1_to_3_years', '1 a 3 anos', 2], ['3_to_5_years', '3 a 5 anos', 3], ['5_to_10_years', '5 a 10 anos', 4]] },
];

export const PRODUCTS: [string, string][] = [
  ['poupanca', 'Poupança'], ['previdencia', 'Previdência'], ['tesouro_direto', 'Tesouro Direto'], ['renda_fixa_privada', 'RF Privada (CDB, LCI, LCA)'],
  ['fundos_multimercado', 'Fundos Multimercado'], ['fundos_acoes', 'Fundos de Ações'], ['fiis', 'FIIs'], ['acoes', 'Ações'], ['derivativos', 'Derivativos'],
  ['commodities', 'Commodities'], ['cambio', 'Câmbio'], ['coe', 'COE'], ['criptoativos', 'Criptoativos'],
];

export const OCCUPATIONS: [string, string][] = [
  ['clt', 'Profissional CLT'], ['empresario', 'Empresário'], ['liberal', 'Profissional Liberal'], ['servidor', 'Servidor Público'], ['aposentado', 'Aposentado'], ['investidor', 'Investidor'],
];

export const SOURCES: [string, string][] = [
  ['salario', 'Salário'], ['pro_labore', 'Pró-labore / lucros'], ['heranca', 'Herança'], ['venda_bens', 'Venda de bens'], ['aposentadoria', 'Aposentadoria'], ['investimentos', 'Rendimentos de investimentos'], ['outros', 'Outros'],
];

export const PROFILE_DESC: Record<string, string> = {
  conservador: 'Prioriza a preservação do capital com baixa tolerância a perdas. Busca previsibilidade e segurança nos investimentos.',
  moderado: 'Busca equilíbrio entre segurança e rentabilidade. Aceita oscilações moderadas para melhores retornos no médio/longo prazo.',
  arrojado: 'Aceita oscilações significativas e foco no longo prazo. Busca retornos acima da média com diversificação ampla.',
  agressivo: 'Alta tolerância a perdas e volatilidade. Busca maximizar retornos com concentração em ativos de maior risco.',
};

export const ALLOCATIONS: Record<string, string[][]> = {
  conservador: [['Renda Fixa', '80-100%'], ['Multimercado', '0-15%'], ['Renda Variável', '0-5%']],
  moderado: [['Renda Fixa', '50-70%'], ['Multimercado', '15-30%'], ['Renda Variável', '10-20%']],
  arrojado: [['Renda Fixa', '30-50%'], ['Multimercado', '20-30%'], ['Renda Variável', '20-40%']],
  agressivo: [['Renda Fixa', '10-30%'], ['Multimercado', '15-25%'], ['Renda Variável', '40-70%']],
};

/** Score 0–100: média das respostas (1–4) + bônus por conhecimento de produtos. */
export function calculateInvestorProfile(f: Record<string, any>) {
  const pts = QUESTIONS.map((q) => q.opts.find((o) => o[0] === f[q.key])?.[2] ?? 1);
  const base = ((pts.reduce((a, b) => a + b, 0) - pts.length) / (pts.length * 3)) * 90;
  const known = Array.isArray(f.knownProducts) ? f.knownProducts.length : 0;
  const score = Math.round(Math.min(100, base + Math.min(10, known)));
  const profile = score <= 30 ? 'conservador' : score <= 55 ? 'moderado' : score <= 80 ? 'arrojado' : 'agressivo';
  return { profile, score };
}
