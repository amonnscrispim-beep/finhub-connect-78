// ================================================================
// Calculadora de Imposto de Renda Pessoa Física (Brasil)
// Tabela progressiva anual vigente (2024) — valores oficiais Receita
// ================================================================

export interface IRBracket {
  min: number;
  max: number;
  rate: number;       // 0 - 1
  deduction: number;  // parcela a deduzir (anual)
}

// Tabela ANUAL (mensal × 12)
export const IR_BRACKETS_ANUAL: IRBracket[] = [
  { min: 0,         max: 27_110.40, rate: 0,     deduction: 0 },
  { min: 27_110.40, max: 33_919.80, rate: 0.075, deduction: 2_033.28 },
  { min: 33_919.80, max: 45_012.60, rate: 0.15,  deduction: 4_577.28 },
  { min: 45_012.60, max: 55_976.16, rate: 0.225, deduction: 7_953.24 },
  { min: 55_976.16, max: Infinity,  rate: 0.275, deduction: 10_752.00 },
];

// Limites legais
export const LIMITS = {
  PGBL_PCT: 0.12,
  DEPENDENT_DEDUCTION: 2_275.08,        // por dependente / ano
  EDUCATION_PER_PERSON: 3_561.50,        // titular ou dependente / ano
  SIMPLIFICADA_PCT: 0.20,
  SIMPLIFICADA_CAP: 16_754.34,
};

/** Calcula imposto devido a partir da Base de Cálculo anual. */
export function calcImposto(base: number): { imposto: number; aliquotaEfetiva: number; aliquotaMarginal: number; bracket: IRBracket } {
  if (base <= 0) return { imposto: 0, aliquotaEfetiva: 0, aliquotaMarginal: 0, bracket: IR_BRACKETS_ANUAL[0] };
  const bracket = IR_BRACKETS_ANUAL.find(b => base > b.min && base <= b.max) ?? IR_BRACKETS_ANUAL[IR_BRACKETS_ANUAL.length - 1];
  const imposto = Math.max(0, base * bracket.rate - bracket.deduction);
  return {
    imposto,
    aliquotaEfetiva: base > 0 ? imposto / base : 0,
    aliquotaMarginal: bracket.rate,
    bracket,
  };
}

export interface IRInputs {
  rendaBrutaAnual: number;
  despesaSaude: number;
  despesaEducacao: number;
  numDependentes: number;
  outrasDeducoes: number;
  pgblExistente: number;
  inssAnual: number;            // contribuição previdenciária oficial
}

export interface IRResultDetail {
  rendaBruta: number;
  inss: number;
  saude: number;
  educacaoAplicada: number;
  educacaoLimite: number;
  educacaoExcedente: number;
  dependentes: number;
  outras: number;
  pgblAplicado: number;
  totalDeducoes: number;
  baseCalculo: number;
  imposto: number;
  aliquotaEfetiva: number;
  aliquotaMarginal: number;
}

export interface IRSimulationResult {
  semAporte: IRResultDetail;
  comAporteSugerido: IRResultDetail;
  aporteSugerido: number;          // valor adicional para atingir o teto de 12%
  pgblTetoAnual: number;           // 12% da renda bruta
  beneficioFiscal: number;         // diferença de imposto
  declaracaoSimplificada: {
    desconto: number;
    base: number;
    imposto: number;
    melhorQueCompleta: boolean;
  };
  mensal: {
    aporteSugerido: number;
    beneficio: number;
  };
}

function buildDetail(inputs: IRInputs, pgblTotal: number): IRResultDetail {
  const renda = Math.max(0, inputs.rendaBrutaAnual);
  const educacaoTotalPessoas = 1 + Math.max(0, inputs.numDependentes);
  const educacaoLimite = educacaoTotalPessoas * LIMITS.EDUCATION_PER_PERSON;
  const educacaoAplicada = Math.min(inputs.despesaEducacao, educacaoLimite);
  const educacaoExcedente = Math.max(0, inputs.despesaEducacao - educacaoLimite);
  const dependentes = inputs.numDependentes * LIMITS.DEPENDENT_DEDUCTION;

  const totalDeducoes =
    inputs.inssAnual +
    inputs.despesaSaude +
    educacaoAplicada +
    dependentes +
    inputs.outrasDeducoes +
    pgblTotal;

  const baseCalculo = Math.max(0, renda - totalDeducoes);
  const { imposto, aliquotaEfetiva, aliquotaMarginal } = calcImposto(baseCalculo);

  return {
    rendaBruta: renda,
    inss: inputs.inssAnual,
    saude: inputs.despesaSaude,
    educacaoAplicada,
    educacaoLimite,
    educacaoExcedente,
    dependentes,
    outras: inputs.outrasDeducoes,
    pgblAplicado: pgblTotal,
    totalDeducoes,
    baseCalculo,
    imposto,
    aliquotaEfetiva,
    aliquotaMarginal,
  };
}

export function simulateIR(inputs: IRInputs): IRSimulationResult {
  const renda = Math.max(0, inputs.rendaBrutaAnual);
  const pgblTeto = renda * LIMITS.PGBL_PCT;
  const pgblAtual = Math.min(inputs.pgblExistente, pgblTeto);
  const aporteSugerido = Math.max(0, pgblTeto - pgblAtual);

  const semAporte = buildDetail(inputs, pgblAtual);
  const comAporte = buildDetail(inputs, pgblTeto);

  // Declaração simplificada (substitui TODAS deduções legais por 20% capado)
  const desconto = Math.min(renda * LIMITS.SIMPLIFICADA_PCT, LIMITS.SIMPLIFICADA_CAP);
  const baseSimpl = Math.max(0, renda - desconto);
  const impSimpl = calcImposto(baseSimpl).imposto;

  const beneficio = semAporte.imposto - comAporte.imposto;

  return {
    semAporte,
    comAporteSugerido: comAporte,
    aporteSugerido,
    pgblTetoAnual: pgblTeto,
    beneficioFiscal: beneficio,
    declaracaoSimplificada: {
      desconto,
      base: baseSimpl,
      imposto: impSimpl,
      melhorQueCompleta: impSimpl < comAporte.imposto,
    },
    mensal: {
      aporteSugerido: aporteSugerido / 12,
      beneficio: beneficio / 12,
    },
  };
}

export const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v || 0);

export const fmtPct = (v: number) => `${(v * 100).toFixed(2).replace('.', ',')}%`;
