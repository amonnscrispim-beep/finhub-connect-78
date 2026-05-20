// ================================================================
// Calculadora de Imposto de Renda Pessoa Física (Brasil) — 2026
// Tabela progressiva anual + INSS progressivo com teto
// ================================================================

export interface IRBracket {
  min: number;
  max: number;
  rate: number;       // 0 - 1
  deduction: number;  // parcela a deduzir (anual)
}

// Tabela ANUAL IRPF 2026
export const IR_BRACKETS_ANUAL: IRBracket[] = [
  { min: 0,         max: 28_559.70, rate: 0,     deduction: 0 },
  { min: 28_559.70, max: 40_391.64, rate: 0.075, deduction: 2_141.98 },
  { min: 40_391.64, max: 52_270.32, rate: 0.15,  deduction: 5_171.35 },
  { min: 52_270.32, max: 64_146.12, rate: 0.225, deduction: 9_091.62 },
  { min: 64_146.12, max: Infinity,  rate: 0.275, deduction: 12_298.93 },
];

// INSS 2026 — faixas progressivas (mensais) com teto da previdência
export interface INSSBracket {
  min: number;
  max: number;
  rate: number;
}

export const INSS_BRACKETS_MENSAL: INSSBracket[] = [
  { min: 0,       max: 1_518.00, rate: 0.075 },
  { min: 1_518.00, max: 2_793.88, rate: 0.09  },
  { min: 2_793.88, max: 4_190.83, rate: 0.12  },
  { min: 4_190.83, max: 8_157.41, rate: 0.14  },
];
export const INSS_TETO_BASE = 8_157.41;

/** INSS mensal aplicando faixas progressivas, com teto da previdência. */
export function calcINSSMensal(rendaMensal: number): number {
  if (rendaMensal <= 0) return 0;
  const base = Math.min(rendaMensal, INSS_TETO_BASE);
  let inss = 0;
  for (const f of INSS_BRACKETS_MENSAL) {
    if (base > f.min) {
      const trecho = Math.min(base, f.max) - f.min;
      if (trecho > 0) inss += trecho * f.rate;
    }
  }
  return inss;
}

/** INSS anual a partir da renda BRUTA ANUAL (assume distribuição uniforme em 12 meses). */
export function calcINSSAnualFromAnual(rendaAnual: number): number {
  return calcINSSMensal(rendaAnual / 12) * 12;
}

// Limites legais
export const LIMITS = {
  PGBL_PCT: 0.12,
  DEPENDENT_DEDUCTION: 2_275.08,        // por dependente / ano
  EDUCATION_PER_PERSON: 3_561.50,        // trava por CPF / ano
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
  /** Educação do titular (anual). Capada em LIMITS.EDUCATION_PER_PERSON. */
  educacaoTitular: number;
  /** Educação por dependente (anual). Cada item capado individualmente. */
  educacaoPorDependente: number[];
  numDependentes: number;
  outrasDeducoes: number;
  pgblExistente: number;
  inssAnual: number;
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
  aporteSugerido: number;
  pgblTetoAnual: number;
  beneficioFiscal: number;
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

function aplicarEducacao(inputs: IRInputs) {
  const pessoas = 1 + Math.max(0, inputs.numDependentes);
  const capPessoa = LIMITS.EDUCATION_PER_PERSON;
  const titularAplicado = Math.min(inputs.educacaoTitular, capPessoa);
  const titularExcedente = Math.max(0, inputs.educacaoTitular - capPessoa);

  let depAplicado = 0;
  let depExcedente = 0;
  for (let i = 0; i < inputs.numDependentes; i++) {
    const v = inputs.educacaoPorDependente[i] || 0;
    depAplicado += Math.min(v, capPessoa);
    depExcedente += Math.max(0, v - capPessoa);
  }

  return {
    educacaoAplicada: titularAplicado + depAplicado,
    educacaoLimite: pessoas * capPessoa,
    educacaoExcedente: titularExcedente + depExcedente,
  };
}

function buildDetail(inputs: IRInputs, pgblTotal: number): IRResultDetail {
  const renda = Math.max(0, inputs.rendaBrutaAnual);
  const edu = aplicarEducacao(inputs);
  const dependentes = inputs.numDependentes * LIMITS.DEPENDENT_DEDUCTION;

  const totalDeducoes =
    inputs.inssAnual +
    inputs.despesaSaude +
    edu.educacaoAplicada +
    dependentes +
    inputs.outrasDeducoes +
    pgblTotal;

  const baseCalculo = Math.max(0, renda - totalDeducoes);
  const { imposto, aliquotaEfetiva, aliquotaMarginal } = calcImposto(baseCalculo);

  return {
    rendaBruta: renda,
    inss: inputs.inssAnual,
    saude: inputs.despesaSaude,
    educacaoAplicada: edu.educacaoAplicada,
    educacaoLimite: edu.educacaoLimite,
    educacaoExcedente: edu.educacaoExcedente,
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
