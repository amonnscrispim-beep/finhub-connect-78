export type InvestorProfileKey = 'conservador' | 'moderado' | 'arrojado' | 'agressivo';

export interface ProfileAnswers {
  percentInvested: string;
  knownProducts: string[];
  needIn12Months: string;
  investmentBehavior: string;
  acceptableLoss: string;
  gainReaction: string;
  lossReaction: string;
  belowCDITolerance: string;
}

const COMPLEXITY: Record<string, number> = {
  poupanca: 0, previdencia: 0, tesouro_direto: 1, renda_fixa_privada: 1, fundos_multimercado: 2,
  fundos_acoes: 2, fiis: 2, acoes: 3, derivativos: 4, commodities: 3, cambio: 3, coe: 3, criptoativos: 3,
};
const S = {
  percentInvested: { up_to_10: 1, '11_to_20': 2, '21_to_30': 3, over_30: 4 },
  needIn12Months: { nothing: 4, up_to_25: 3, '25_to_50': 2, over_50: 1 },
  investmentBehavior: { avoid_loss: 1, accept_small: 2, accept_losses: 4 },
  acceptableLoss: { none: 1, up_to_5: 2, '5_to_10': 3, over_10: 4 },
  gainReaction: { redeem_all: 1, move_part_safer: 2, pleased_no_change: 3, invest_more: 4 },
  lossReaction: { redeem_all: 1, move_part_safer: 2, worried_no_change: 3, invest_more: 4 },
  belowCDITolerance: { none: 1, '1_to_3_years': 2, '3_to_5_years': 3, '5_to_10_years': 4 },
} as Record<string, Record<string, number>>;

export function calculateInvestorProfile(a: ProfileAnswers): { profile: InvestorProfileKey; score: number } {
  let score = S.percentInvested[a.percentInvested] || 0;
  const max = Object.values(COMPLEXITY).reduce((x, y) => x + y, 0);
  score += Math.round((a.knownProducts.reduce((s, p) => s + (COMPLEXITY[p] || 0), 0) / max) * 4);
  score += (S.needIn12Months[a.needIn12Months] || 0) * 2;
  score += (S.investmentBehavior[a.investmentBehavior] || 0) * 2;
  score += (S.acceptableLoss[a.acceptableLoss] || 0) * 2;
  score += S.gainReaction[a.gainReaction] || 0;
  score += (S.lossReaction[a.lossReaction] || 0) * 2;
  score += S.belowCDITolerance[a.belowCDITolerance] || 0;
  const n = Math.round((score / 48) * 100);
  const profile: InvestorProfileKey = n <= 25 ? 'conservador' : n <= 50 ? 'moderado' : n <= 75 ? 'arrojado' : 'agressivo';
  return { profile, score: n };
}

export const PROFILE_LABEL: Record<InvestorProfileKey, string> = {
  conservador: 'Conservador', moderado: 'Moderado', arrojado: 'Arrojado', agressivo: 'Agressivo',
};
export const PROFILE_TEXT: Record<InvestorProfileKey, string> = {
  conservador: 'Prioriza a segurança e a liquidez, aceitando retornos menores para preservar o capital.',
  moderado: 'Busca equilíbrio entre segurança e rentabilidade, aceitando oscilações moderadas.',
  arrojado: 'Aceita oscilações relevantes em busca de retornos maiores no médio e longo prazo.',
  agressivo: 'Tem alta tolerância a perdas e busca maximizar retornos com produtos complexos.',
};
