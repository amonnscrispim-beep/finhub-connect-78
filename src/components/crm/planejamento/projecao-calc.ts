export type Recorrencia = 'Mensal' | 'Anual' | 'Único';
export interface FluxoPlanejado { id: string; nome: string; recorrencia: Recorrencia; idadeInicio: number; idadeFim: number; taxaReajuste: number; valor: number; }
export interface ParametrosProjecao { rentabilidadeAnual: number; rentabilidadeAposentadoria: number; inflacao: number; idadeAposentadoria: number; idadeLimite: number; rendaMensalDesejada: number; }
export interface EvolucaoAnual { idade: number; ano: number; patrimonio: number; aportes: number; retiradas: number; }
export interface CenarioEvolucao { ano: number; idade: number; referencia: number; preservando: number; consumindo: number; }
export interface SensibilidadeRow { percentual: number; aporte: number; rendas: { idade: number; renda: number | null }[]; }

const mensal = (anual: number) => Math.pow(1 + anual / 100, 1 / 12) - 1;
const taxaRealMensal = (rent: number, inf: number) => mensal(((1 + rent / 100) / (1 + inf / 100) - 1) * 100);

function valorNoMes(f: FluxoPlanejado, idade: number, mesDoFluxo: number): number {
  if (f.recorrencia === 'Único') return mesDoFluxo === 0 ? f.valor : 0;
  if (idade < f.idadeInicio || idade >= f.idadeFim) return 0;
  const anos = Math.floor(idade - f.idadeInicio);
  const v = f.valor * Math.pow(1 + f.taxaReajuste / 100, anos);
  if (f.recorrencia === 'Mensal') return v;
  return mesDoFluxo % 12 === 0 ? v : 0;
}

/** Simulação mensal com aportes e retiradas planejados (valores nominais). */
export function calcularProjecao(inicial: number, aportes: FluxoPlanejado[], objetivos: FluxoPlanejado[], p: ParametrosProjecao, idadeAtual: number) {
  const meses = Math.max(0, (p.idadeLimite - idadeAtual) * 12);
  const ra = mensal(p.rentabilidadeAnual), rp = mensal(p.rentabilidadeAposentadoria);
  const anoBase = new Date().getFullYear();
  let pat = inicial, patApos = inicial, totalAportes = 0, mesesAporte = 0;
  const evolucao: EvolucaoAnual[] = [{ idade: idadeAtual, ano: anoBase, patrimonio: inicial, aportes: 0, retiradas: 0 }];
  let accAp = 0, accRet = 0;
  for (let m = 0; m < meses; m++) {
    const idade = idadeAtual + m / 12;
    if (Math.abs(idade - p.idadeAposentadoria) < 1e-9 || (m === 0 && idade >= p.idadeAposentadoria)) patApos = pat;
    pat *= 1 + (idade >= p.idadeAposentadoria ? rp : ra);
    const ap = aportes.reduce((s, f) => s + valorNoMes(f, idade, Math.round((idade - f.idadeInicio) * 12)), 0);
    const rt = objetivos.reduce((s, f) => s + valorNoMes(f, idade, Math.round((idade - f.idadeInicio) * 12)), 0);
    if (ap > 0) { totalAportes += ap; mesesAporte++; }
    pat = Math.max(0, pat + ap - rt);
    accAp += ap; accRet += rt;
    if ((m + 1) % 12 === 0) {
      evolucao.push({ idade: idadeAtual + (m + 1) / 12, ano: anoBase + (m + 1) / 12, patrimonio: Math.round(pat), aportes: Math.round(accAp), retiradas: -Math.round(accRet) });
      accAp = 0; accRet = 0;
    }
  }
  if (p.idadeAposentadoria >= p.idadeLimite) patApos = pat;
  return { evolucao, patrimonioNaAposentadoria: patApos, patrimonioFinal: pat, aporteMedioMensal: mesesAporte ? totalAportes / mesesAporte : 0 };
}

/** Patrimônio acumulado até a aposentadoria considerando só os aportes (sem retiradas). */
export function acumularAte(inicial: number, aportes: FluxoPlanejado[], p: ParametrosProjecao, idadeAtual: number, idadeAlvo: number, fator = 1) {
  const ra = mensal(p.rentabilidadeAnual);
  let pat = inicial;
  for (let m = 0; m < Math.max(0, (idadeAlvo - idadeAtual) * 12); m++) {
    const idade = idadeAtual + m / 12;
    pat = pat * (1 + ra) + fator * aportes.reduce((s, f) => s + valorNoMes(f, idade, Math.round((idade - f.idadeInicio) * 12)), 0);
  }
  return pat;
}

/** Renda mensal (em valores de hoje, reajustada pela inflação) que zera o patrimônio na idade limite. */
export function rendaConsumindo(pv: number, rent: number, inf: number, idadeAp: number, idadeLim: number) {
  const n = (idadeLim - idadeAp) * 12;
  if (n <= 0 || pv <= 0) return 0;
  const i = taxaRealMensal(rent, inf);
  return i === 0 ? pv / n : (pv * i) / (1 - Math.pow(1 + i, -n));
}
/** Renda mensal que retira apenas o rendimento real e preserva o patrimônio. */
export function rendaPreservando(pv: number, rent: number, inf: number) {
  return Math.max(0, pv * taxaRealMensal(rent, inf));
}

export function idadesSensibilidade(idadeAtual: number, idadeLimite: number, idadeAp: number) {
  const out = new Set<number>([idadeAp]);
  for (let i = Math.ceil((idadeAtual + 1) / 5) * 5; i <= idadeLimite - 5 && out.size < 5; i += 5) out.add(i);
  return [...out].filter((i) => i < idadeLimite).sort((a, b) => a - b).slice(0, 5);
}

export function sensibilidade(inicial: number, aportes: FluxoPlanejado[], p: ParametrosProjecao, idadeAtual: number, aporteBase: number, tipo: 'consumindo' | 'preservando'): SensibilidadeRow[] {
  const idades = idadesSensibilidade(idadeAtual, p.idadeLimite, p.idadeAposentadoria);
  return [0.5, 0.7, 1, 1.25, 1.5].map((pct) => ({
    percentual: pct,
    aporte: aporteBase * pct,
    rendas: idades.map((idade) => {
      if (idade <= idadeAtual) return { idade, renda: null };
      const pat = acumularAte(inicial, aportes, p, idadeAtual, idade, pct);
      return { idade, renda: tipo === 'consumindo' ? rendaConsumindo(pat, p.rentabilidadeAposentadoria, p.inflacao, idade, p.idadeLimite) : rendaPreservando(pat, p.rentabilidadeAposentadoria, p.inflacao) };
    }),
  }));
}

/** Três cenários anuais: renda desejada, preservando e consumindo (retiradas reajustadas pela inflação). */
export function gerarCenarios(inicial: number, aportes: FluxoPlanejado[], p: ParametrosProjecao, idadeAtual: number, rRef: number, rPres: number, rCons: number): CenarioEvolucao[] {
  const ra = mensal(p.rentabilidadeAnual), rp = mensal(p.rentabilidadeAposentadoria), im = mensal(p.inflacao);
  const out: CenarioEvolucao[] = [];
  let a = inicial, b = inicial, c = inicial, mesesApos = 0;
  const anoBase = new Date().getFullYear();
  for (let m = 0; m <= (p.idadeLimite - idadeAtual) * 12; m++) {
    const idade = idadeAtual + m / 12;
    if (m % 12 === 0) out.push({ ano: anoBase + m / 12, idade: Math.round(idade), referencia: Math.round(Math.max(0, a)), preservando: Math.round(Math.max(0, b)), consumindo: Math.round(Math.max(0, c)) });
    const apos = idade >= p.idadeAposentadoria;
    const ap = apos ? 0 : aportes.reduce((s, f) => s + valorNoMes(f, idade, Math.round((idade - f.idadeInicio) * 12)), 0);
    const inf = apos ? Math.pow(1 + im, mesesApos) : 0;
    const r = apos ? rp : ra;
    a = Math.max(0, a * (1 + r) + ap - rRef * inf);
    b = Math.max(0, b * (1 + r) + ap - rPres * inf);
    c = Math.max(0, c * (1 + r) + ap - rCons * inf);
    if (apos) mesesApos++;
  }
  return out;
}
