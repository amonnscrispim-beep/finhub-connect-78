export type Recurrence = "unica" | "mensal" | "novo_aporte";
export interface PlanningEvent {
  id: string;
  descricao: string;
  recorrencia: Recurrence;
  idade: number;
  idadeFim: number | null;
  valor: number;
}
export interface PlanningData {
  nome: string;
  data: string;
  idadeAtual: number;
  idadeAposentadoria: number;
  idadeLimite: number;
  ativosFinanceiros: number;
  imoveisOutrosBens: number;
  aporteMensal: number;
  rendaMensal: number;
  rentabilidadeAcumulacao: number;
  rentabilidadeAposentadoria: number;
  inflacao: number;
  entradas: PlanningEvent[];
  saidas: PlanningEvent[];
  seguroAtivo: boolean;
  previdenciaAtiva: boolean;
  uf: string;
  itcmd: number;
  fracao: number;
  honorarios: number;
  custas: number;
  capitalSeguro: number;
  premioSeguro: number;
  coberturaAte: number | null;
  descontarSeguro: boolean;
  saldoPrevidencia: number;
  aportePrevidencia: number;
  tipoPrevidencia: "VGBL" | "PGBL";
  somarPrevidencia: boolean;
  protectionTab: string;
  extras: string;
  generated: boolean;
  aiFields: string[];
}
export const STATE_TAXES: Record<string, number> = {
  AC: 7,
  AL: 8,
  AP: 6,
  AM: 4,
  BA: 8,
  CE: 8,
  DF: 6,
  ES: 4,
  GO: 8,
  MA: 7,
  MT: 8,
  MS: 6,
  MG: 5,
  PA: 6,
  PB: 8,
  PR: 4,
  PE: 8,
  PI: 6,
  RJ: 8,
  RN: 6,
  RS: 6,
  RO: 4,
  RR: 4,
  SC: 7,
  SP: 4,
  SE: 8,
  TO: 8,
};
export function defaults(): PlanningData {
  const d = new Date();
  return {
    nome: "",
    data: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    idadeAtual: 0,
    idadeAposentadoria: 60,
    idadeLimite: 100,
    ativosFinanceiros: 0,
    imoveisOutrosBens: 0,
    aporteMensal: 0,
    rendaMensal: 0,
    rentabilidadeAcumulacao: 12,
    rentabilidadeAposentadoria: 10,
    inflacao: 5,
    entradas: [],
    saidas: [],
    seguroAtivo: false,
    previdenciaAtiva: false,
    uf: "SC",
    itcmd: 7,
    fracao: 1,
    honorarios: 6,
    custas: 2,
    capitalSeguro: 0,
    premioSeguro: 0,
    coberturaAte: null,
    descontarSeguro: true,
    saldoPrevidencia: 0,
    aportePrevidencia: 0,
    tipoPrevidencia: "VGBL",
    somarPrevidencia: false,
    protectionTab: "heranca",
    extras: "",
    generated: false,
    aiFields: [],
  };
}
export const brl = (n: number) =>
  `${n < 0 ? "− " : ""}R$ ${Math.abs(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
export const short = (n: number) =>
  Math.abs(n) >= 1e9
    ? `R$ ${(n / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bi`
    : Math.abs(n) >= 1e6
      ? `R$ ${(n / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`
      : Math.abs(n) >= 1000
        ? `R$ ${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`
        : brl(n);
export function validate(d: PlanningData) {
  if (d.idadeAtual <= 0 || d.idadeAposentadoria <= d.idadeAtual)
    return "Preencha a idade atual e a idade de aposentadoria (maior que a atual).";
  if (d.idadeLimite <= d.idadeAposentadoria || d.idadeLimite > 150)
    return "Planeje até uma idade maior que a aposentadoria e de no máximo 150 anos.";
  if (
    d.inflacao <= -100 ||
    d.rentabilidadeAcumulacao <= -100 ||
    d.rentabilidadeAposentadoria <= -100
  )
    return "As taxas devem ser superiores a −100%.";
  return null;
}
export interface Run {
  final: number;
  yearly: number[];
  depleted: number | null;
  firstDepletionMonth: number | null;
  cash: { idade: number; entradas: number; saidas: number }[];
}
export function project(d: PlanningData) {
  const ia = d.idadeAtual,
    ip = d.idadeAposentadoria,
    il = d.idadeLimite,
    T = (il - ia) * 12,
    R = (ip - ia) * 12,
    inf = d.inflacao / 100;
  const realAc = (1 + d.rentabilidadeAcumulacao / 100) / (1 + inf) - 1,
    realAp = (1 + d.rentabilidadeAposentadoria / 100) / (1 + inf) - 1;
  const mAc = Math.pow(1 + realAc, 1 / 12) - 1,
    mAp = Math.pow(1 + realAp, 1 / 12) - 1;
  const fin =
    d.ativosFinanceiros +
    (d.previdenciaAtiva && d.somarPrevidencia ? d.saldoPrevidencia : 0);
  const pensionAporte =
    d.previdenciaAtiva && d.somarPrevidencia ? d.aportePrevidencia : 0;
  const changes = d.entradas
    .filter(
      (e) =>
        e.recorrencia === "novo_aporte" &&
        e.idade >= ia &&
        e.idade < ip &&
        e.valor >= 0,
    )
    .sort((a, b) => a.idade - b.idade);
  const ev = Array(T).fill(0) as number[],
    incoming = Array(T).fill(0) as number[],
    outgoing = Array(T).fill(0) as number[];
  const events = [
    ...d.entradas.map((e) => ({ ...e, sign: 1 })),
    ...d.saidas.map((e) => ({ ...e, sign: -1 })),
  ];
  if (d.seguroAtivo && d.descontarSeguro)
    events.push({
      id: "insurance",
      descricao: "Prêmio do seguro de vida",
      recorrencia: "mensal",
      idade: ia,
      idadeFim: d.coberturaAte ?? il,
      valor: d.premioSeguro,
      sign: -1,
    });
  events.forEach((e) => {
    if (
      e.recorrencia === "novo_aporte" ||
      e.valor <= 0 ||
      e.idade < ia ||
      e.idade >= il
    )
      return;
    const start = Math.round((e.idade - ia) * 12);
    const end =
      e.recorrencia === "unica"
        ? start + 1
        : Math.min(
            T,
            Math.round(((e.idadeFim ?? (e.idade < ip ? ip : il)) - ia) * 12),
          );
    for (let k = start; k < end; k++) {
      ev[k] += e.sign * e.valor;
      if (e.sign > 0) incoming[k] += e.valor;
      else outgoing[k] += e.valor;
    }
  });
  const am = (k: number, opt?: { am?: number; extra?: number }) => {
    let v = d.aporteMensal;
    for (const e of changes)
      if (e.idade <= ia + Math.floor(k / 12)) v = e.valor;
    return (
      ((opt?.am ?? v) + (opt?.extra ?? 0) + pensionAporte) *
      Math.pow(1 + inf, Math.floor(k / 12) - (k + 1) / 12)
    );
  };
  function run(
    W: number,
    clamp = false,
    opt?: { am?: number; extra?: number; unico?: number },
  ): Run {
    let b = fin + (opt?.unico ?? 0),
      depleted: number | null = null,
      firstDepletionMonth: number | null = null;
    const yearly: number[] = [],
      cash: Run["cash"] = [];
    for (let k = 0; k < T; k++) {
      b += ev[k];
      if (k % 12 === 0) {
        yearly.push(b);
        cash.push({ idade: ia + k / 12, entradas: 0, saidas: 0 });
      }
      const c = cash[Math.floor(k / 12)];
      c.entradas += incoming[k] + (k < R ? am(k, opt) : 0);
      c.saidas -= outgoing[k] + (k >= R ? W : 0);
      b = k < R ? b * (1 + mAc) + am(k, opt) : b * (1 + mAp) - W;
      if (clamp && b < 0) {
        if (depleted === null) {
          depleted = ia + Math.floor((k + 1) / 12);
          firstDepletionMonth = k + 1;
        }
        b = 0;
      }
    }
    yearly.push(b);
    return { final: b, yearly, depleted, firstDepletionMonth, cash };
  }
  const base = run(0),
    unit = run(1),
    S = base.final - unit.final,
    pRet = base.yearly[ip - ia];
  const pvPost = ev.reduce(
    (s, v, k) => (k > R ? s + v / Math.pow(1 + mAp, k - R) : s),
    0,
  );
  const wCons = S > 0 ? Math.max(0, base.final / S) : 0,
    wPres = Math.max(0, (pRet + pvPost) * mAp);
  const reference = run(d.rendaMensal, true),
    preserving = run(wPres, true),
    consuming = run(wCons, true);
  const sufficient = (r: Run) =>
    r.firstDepletionMonth === null || r.firstDepletionMonth >= T;
  function search(unique: boolean) {
    const option = (v: number) =>
      unique ? { unico: v } : changes.length ? { extra: v } : { am: v };
    let lo = 0,
      hi = Math.max(1000, d.rendaMensal) * (unique ? 120 : 1),
      attempts = 0;
    while (!sufficient(run(d.rendaMensal, true, option(hi))) && attempts++ < 50)
      hi *= 2;
    if (
      !Number.isFinite(hi) ||
      !sufficient(run(d.rendaMensal, true, option(hi)))
    )
      return null;
    for (let j = 0; j < 60; j++) {
      const mid = (lo + hi) / 2;
      if (sufficient(run(d.rendaMensal, true, option(mid)))) hi = mid;
      else lo = mid;
    }
    return hi;
  }
  const enough = sufficient(reference),
    needMonthly = enough ? 0 : search(false),
    needUnique = enough ? 0 : search(true);
  const ages = [ia, ip, 85 > ip && 85 < il ? 85 : Math.floor((ip + il) / 2)];
  const succession = ages.map((age) => {
    const index = age - ia,
      finT = Math.max(0, reference.yearly[index] ?? reference.final);
    const sold = d.entradas
      .filter(
        (e) =>
          e.recorrencia === "unica" &&
          e.idade <= age &&
          e.idade >= ia &&
          e.valor > 0,
      )
      .reduce((s, e) => s + e.valor, 0);
    const imobT = Math.max(0, d.imoveisOutrosBens - sold);
    let prv = d.previdenciaAtiva ? d.saldoPrevidencia : 0;
    for (let k = 0; k < index * 12; k++)
      prv =
        k < R
          ? prv * (1 + mAc) +
            d.aportePrevidencia *
              Math.pow(1 + inf, Math.floor(k / 12) - (k + 1) / 12)
          : prv * (1 + mAp);
    prv = d.previdenciaAtiva ? Math.min(prv, finT) : 0;
    const total = finT + imobT,
      inventory = Math.max(0, total - prv) * d.fracao,
      itcmd = (inventory * d.itcmd) / 100,
      fees = (inventory * (d.honorarios + d.custas)) / 100,
      cost = itcmd + fees,
      insurance =
        d.seguroAtivo && (d.coberturaAte === null || age < d.coberturaAte)
          ? d.capitalSeguro
          : 0,
      liquidity = insurance + prv;
    return {
      age,
      total,
      inventory,
      itcmd,
      fees,
      cost,
      insurance,
      pension: prv,
      liquidity,
      missing: Math.max(0, cost - liquidity),
      coverage: cost > 0 ? liquidity / cost : 1,
      saving: (prv * d.fracao * (d.itcmd + d.honorarios + d.custas)) / 100,
    };
  });
  const suggestedInsurance =
    Math.ceil(
      Math.max(...succession.map((s) => Math.max(0, s.cost - s.pension))) /
        50000,
    ) * 50000;
  const lines = reference.yearly.map((v, i) => ({
    idade: ia + i,
    Referencia: v,
    Preservando: preserving.yearly[i],
    Consumindo: consuming.yearly[i],
  }));
  return {
    fin,
    realAc,
    realAp,
    mAc,
    mAp,
    pRet,
    pvPost,
    wCons,
    wPres,
    reference,
    preserving,
    consuming,
    needMonthly,
    needUnique,
    enough,
    hasChanges: changes.length > 0,
    succession,
    suggestedInsurance,
    lines,
    run,
  };
}
export type Projection = ReturnType<typeof project>;
