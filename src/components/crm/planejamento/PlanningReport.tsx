import { type ReactNode, forwardRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
} from "recharts";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import logo from "@/assets/gofferje-logo.png";
import { brl, short, type PlanningData, type Projection } from "./calculations";
const color = (token: string) => `hsl(var(--${token}))`;
function Section({
  n,
  title,
  lead,
  children,
}: {
  n: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section data-pdf-section className="planning-report-section">
      <div className="planning-eyebrow">{n}</div>
      <h2>{title}</h2>
      {lead && <p className="planning-lead">{lead}</p>}
      {children}
    </section>
  );
}
function Kpis({ items }: { items: [string, string][] }) {
  return (
    <div className="planning-kpis">
      {items.map(([label, value]) => (
        <div key={label}>
          <span className="planning-kpi">{value}</span>
          <small>{label}</small>
        </div>
      ))}
    </div>
  );
}
function Alert({
  warning = false,
  children,
}: {
  warning?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`planning-alert ${warning ? "warning" : ""}`}>
      {warning ? (
        <TriangleAlert className="w-5 h-5 text-warning" />
      ) : (
        <CheckCircle2 className="w-5 h-5 text-accent" />
      )}
      <div>{children}</div>
    </div>
  );
}
function EventTable({
  d,
  output = false,
}: {
  d: PlanningData;
  output?: boolean;
}) {
  const items = output ? d.saidas : d.entradas;
  const changes = d.entradas
    .filter(
      (e) =>
        e.recorrencia === "novo_aporte" &&
        e.idade >= d.idadeAtual &&
        e.idade < d.idadeAposentadoria,
    )
    .sort((a, b) => a.idade - b.idade);
  const bands = [
    { idade: d.idadeAtual, valor: d.aporteMensal },
    ...changes,
  ].map((e, i, list) => ({
    from: e.idade,
    to: list[i + 1]?.idade ?? d.idadeAposentadoria,
    value: e.valor,
  }));
  return (
    <div className="planning-table-wrap">
      <table className="planning-table">
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Frequência</th>
            <th>Quando</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {output ? (
            <tr>
              <td>Renda na aposentadoria</td>
              <td>Todo mês</td>
              <td>
                {d.idadeAposentadoria} → {d.idadeLimite} anos
              </td>
              <td>{brl(d.rendaMensal)}</td>
            </tr>
          ) : (
            bands.map((b, i) => (
              <tr key={i}>
                <td>Aporte mensal</td>
                <td>Todo mês</td>
                <td>
                  {b.from} → {b.to} anos
                </td>
                <td>{brl(b.value)}</td>
              </tr>
            ))
          )}
          {items
            .filter((e) => e.recorrencia !== "novo_aporte")
            .map((e) => (
              <tr key={e.id}>
                <td>{e.descricao || "Sem descrição"}</td>
                <td>{e.recorrencia === "unica" ? "Uma vez" : "Todo mês"}</td>
                <td>
                  {e.idade}
                  {e.recorrencia === "mensal"
                    ? ` → ${e.idadeFim ?? (e.idade < d.idadeAposentadoria ? d.idadeAposentadoria : d.idadeLimite)}`
                    : ""}{" "}
                  anos
                </td>
                <td>{brl(e.valor)}</td>
              </tr>
            ))}
          {output && d.seguroAtivo && d.descontarSeguro && (
            <tr>
              <td>Prêmio do seguro de vida</td>
              <td>Todo mês</td>
              <td>
                {d.idadeAtual} → {d.coberturaAte ?? d.idadeLimite} anos
              </td>
              <td>{brl(d.premioSeguro)}</td>
            </tr>
          )}
          {!output && d.previdenciaAtiva && d.somarPrevidencia && (
            <tr>
              <td>Aporte na previdência (adicional)</td>
              <td>Todo mês</td>
              <td>
                {d.idadeAtual} → {d.idadeAposentadoria} anos
              </td>
              <td>{brl(d.aportePrevidencia)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
export const PlanningReport = forwardRef<
  HTMLDivElement,
  { data: PlanningData; projection: Projection }
>(function PlanningReport({ data: d, projection: p }, ref) {
  const total = p.fin + d.imoveisOutrosBens,
    ticks = p.lines
      .filter((_, i) => i % (d.idadeLimite - d.idadeAtual > 40 ? 10 : 5) === 0)
      .map((v) => v.idade),
    protect = d.seguroAtivo || d.previdenciaAtiva;
  return (
    <div ref={ref} className="planning-report">
      <section data-pdf-section className="planning-cover">
        <div className="flex items-center justify-between gap-4 mb-8">
          <img src={logo} alt="Gofferjé Investimentos" width="96" height="96" />
          <p className="text-xs text-secondary max-w-[230px] text-right">
            GESTÃO · PLANEJAMENTO · INVESTIMENTOS
          </p>
        </div>
        <p className="text-xs mb-4">RELATÓRIO DE PLANEJAMENTO PATRIMONIAL</p>
        <h2>Um plano para transformar patrimônio em tranquilidade.</h2>
        <div className="planning-cover-rule" />
        <p className="text-2xl">{d.nome || "Cliente"}</p>
        <div className="planning-cover-meta">
          <div>
            <small>DATA-BASE</small>
            <p>{d.data.split("-").reverse().join("/")}</p>
          </div>
          <div>
            <small>HORIZONTE</small>
            <p>
              Acumulação até {d.idadeAposentadoria} · projeção até{" "}
              {d.idadeLimite}
            </p>
          </div>
        </div>
      </section>
      <Section
        n="01 · RESUMO"
        title={`Aposentadoria aos ${d.idadeAposentadoria} anos com ${brl(d.rendaMensal)} por mês.`}
      >
        <Alert warning={!p.enough}>
          {p.enough ? (
            <>
              <strong>O plano funciona.</strong> Com os aportes planejados, o
              patrimônio chega a {brl(p.pRet)} aos {d.idadeAposentadoria} anos e
              sustenta {brl(d.rendaMensal)} por mês até os {d.idadeLimite},
              ainda sobrando {brl(p.reference.final)}.
            </>
          ) : (
            <>
              <strong>
                Atenção: o dinheiro acaba aos {p.reference.depleted} anos.
              </strong>{" "}
              Com {brl(p.pRet)} aos {d.idadeAposentadoria}, a renda que dura até
              os {d.idadeLimite} é de {brl(p.wCons)} por mês. Para manter{" "}
              {brl(d.rendaMensal)}, é preciso aportar mais, adiar a
              aposentadoria ou buscar mais rentabilidade.
            </>
          )}
        </Alert>
        <Kpis
          items={[
            [`Patrimônio aos ${d.idadeAposentadoria}`, brl(p.pRet)],
            ["Renda desejada /mês", brl(d.rendaMensal)],
            [`Saldo aos ${d.idadeLimite}`, brl(p.reference.final)],
            ["Patrimônio total hoje", brl(total)],
          ]}
        />
        <p className="planning-note">
          Todos os valores estão em <strong>dinheiro de hoje</strong> (já
          descontada a inflação).
        </p>
      </Section>
      <Section
        n="02 · PATRIMÔNIO HOJE"
        title="O que entra na conta e o que fica de fora."
      >
        <div className="planning-asset-bar">
          <div style={{ width: `${total > 0 ? (p.fin / total) * 100 : 0}%` }} />
        </div>
        <div className="planning-table-wrap">
          <table className="planning-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Na simulação?</th>
                <th>%</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Ativos financeiros</td>
                <td>Sim, rendem</td>
                <td>
                  {(total > 0 ? (p.fin / total) * 100 : 0).toLocaleString(
                    "pt-BR",
                    { maximumFractionDigits: 1 },
                  )}
                  %
                </td>
                <td>{brl(p.fin)}</td>
              </tr>
              <tr>
                <td>Imóveis e outros bens</td>
                <td>Somente quando vendidos</td>
                <td>
                  {(total > 0
                    ? (d.imoveisOutrosBens / total) * 100
                    : 0
                  ).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                  %
                </td>
                <td>{brl(d.imoveisOutrosBens)}</td>
              </tr>
              <tr className="font-semibold">
                <td>Total</td>
                <td>—</td>
                <td>{total > 0 ? "100%" : "0%"}</td>
                <td>{brl(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>
      <Section
        n="03 · ENTRADAS E SAÍDAS PLANEJADAS"
        title="O caminho do dinheiro."
      >
        <div className="planning-timeline">
          <div>
            <strong>Agora · {d.idadeAtual} anos</strong>
            {brl(p.fin)} investidos
          </div>
          {[
            ...d.entradas,
            ...d.saidas.filter((e) => e.idade < d.idadeAposentadoria),
          ]
            .sort((a, b) => a.idade - b.idade)
            .map((e) => (
              <div key={e.id}>
                <strong>
                  {e.idade} anos · {e.descricao}
                </strong>
                {d.saidas.includes(e) ? "− " : "+ "}
                {brl(e.valor)}
                {e.recorrencia === "novo_aporte" ? " /mês (novo aporte)" : ""}
              </div>
            ))}
          <div>
            <strong>{d.idadeAposentadoria} anos</strong>Início da renda
          </div>
        </div>
        <h3 className="text-xl font-semibold mb-2">
          Aportes · dinheiro que entra
        </h3>
        <EventTable d={d} />
        <h3 className="text-xl font-semibold mt-6 mb-2">
          Saídas · dinheiro que sai
        </h3>
        <EventTable d={d} output />
      </Section>
      <Section
        n="04 · FLUXO DE CAIXA"
        title={`Aportes até os ${d.idadeAposentadoria}, renda a partir daí.`}
      >
        <div className="planning-legend">
          <span>Aportes e entradas</span>
          <span>Retiradas e saídas</span>
        </div>
        <div className="h-[260px] w-full">
          <ResponsiveContainer>
            <BarChart
              data={p.reference.cash}
              stackOffset="sign"
              margin={{ top: 10, right: 8, bottom: 10, left: 8 }}
            >
              <CartesianGrid vertical={false} stroke={color("border")} />
              <XAxis
                dataKey="idade"
                ticks={ticks}
                tick={{ fontSize: 11, fill: color("muted-foreground") }}
              />
              <YAxis
                tickFormatter={short}
                width={86}
                tick={{ fontSize: 10, fill: color("muted-foreground") }}
              />
              <Tooltip
                formatter={(v: number) => brl(v)}
                labelFormatter={(v) => `${v} anos`}
              />
              <ReferenceLine y={0} stroke={color("foreground")} />
              <Bar
                dataKey="entradas"
                name="Entradas"
                stackId="cash"
                fill={color("planning-in")}
                isAnimationActive={false}
              />
              <Bar
                dataKey="saidas"
                name="Saídas"
                stackId="cash"
                fill={color("planning-out")}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="planning-note">
          Em dinheiro da época, {brl(d.rendaMensal)} de hoje equivalem a cerca
          de{" "}
          {brl(
            d.rendaMensal *
              Math.pow(
                1 + d.inflacao / 100,
                d.idadeAposentadoria - d.idadeAtual,
              ),
          )}{" "}
          por mês aos {d.idadeAposentadoria} anos.
        </p>
      </Section>
      <Section
        n="05 · TRÊS CENÁRIOS"
        title="Três formas de viver a aposentadoria."
      >
        <div className="planning-table-wrap">
          <table className="planning-table">
            <thead>
              <tr>
                <th>Cenário</th>
                <th>Renda mensal</th>
                <th>Sobra aos {d.idadeLimite}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="reference">
                <td>Referência</td>
                <td>{brl(d.rendaMensal)}</td>
                <td>{brl(p.reference.final)}</td>
              </tr>
              <tr>
                <td>Preservando</td>
                <td>{p.realAp > 0 ? brl(p.wPres) : "Não é possível"}</td>
                <td>{p.realAp > 0 ? brl(p.preserving.final) : "—"}</td>
              </tr>
              <tr>
                <td>Consumindo</td>
                <td>{brl(p.wCons)}</td>
                <td>{brl(p.consuming.final)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {p.realAp <= 0 && (
          <p className="planning-note">
            Não é possível preservar: a rentabilidade na aposentadoria não
            supera a inflação.
          </p>
        )}
        <div className="planning-legend">
          {[
            ["Referência", "accent"],
            ["Preservando", "planning-pres"],
            ["Consumindo", "planning-cons"],
          ].map(([name, token]) => (
            <span key={name}>
              <i style={{ background: color(token) }} />
              {name}
            </span>
          ))}
        </div>
        <div className="h-[310px] w-full">
          <ResponsiveContainer>
            <LineChart
              data={p.lines}
              margin={{ top: 35, right: 20, bottom: 10, left: 8 }}
            >
              <CartesianGrid vertical={false} stroke={color("border")} />
              <XAxis
                dataKey="idade"
                type="number"
                domain={[d.idadeAtual, d.idadeLimite]}
                ticks={ticks}
                tick={{ fontSize: 11, fill: color("muted-foreground") }}
              />
              <YAxis
                tickFormatter={short}
                width={86}
                tick={{ fontSize: 10, fill: color("muted-foreground") }}
              />
              <Tooltip
                formatter={(v: number) => brl(v)}
                labelFormatter={(v) => `${v} anos`}
              />
              <ReferenceLine
                x={d.idadeAposentadoria}
                stroke={color("planning-sky")}
                strokeDasharray="4 4"
                label={{
                  value: `Aposentadoria · ${d.idadeAposentadoria} anos`,
                  position: "top",
                  fill: color("accent"),
                  fontSize: 11,
                }}
              />
              <Line
                dataKey="Referencia"
                name="Referência"
                stroke={color("accent")}
                strokeWidth={2.6}
                dot={false}
                isAnimationActive={false}
              />
              {p.realAp > 0 && (
                <Line
                  dataKey="Preservando"
                  stroke={color("planning-pres")}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  isAnimationActive={false}
                />
              )}
              <Line
                dataKey="Consumindo"
                stroke={color("planning-cons")}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {p.pvPost !== 0 && (
          <p className="planning-note">
            Os eventos após a aposentadoria ajustam o patrimônio de referência
            do cenário Preservando; valor presente: {brl(p.pvPost)}.
          </p>
        )}
      </Section>
      <Section
        n="06 · QUANTO APORTAR"
        title={
          p.enough
            ? "O plano atual já é suficiente."
            : `Como garantir ${brl(d.rendaMensal)} por mês até os ${d.idadeLimite} anos.`
        }
      >
        {p.enough ? (
          <Alert>
            Os aportes planejados sustentam a renda desejada até o horizonte
            escolhido.
          </Alert>
        ) : p.needMonthly === null || p.needUnique === null ? (
          <Alert warning>Só aportes não bastam para esta renda.</Alert>
        ) : (
          <>
            <Kpis
              items={[
                [
                  `Caminho 1 · ${p.hasChanges ? "Aporte mensal extra" : "Aporte mensal necessário"}`,
                  brl(Math.ceil(p.needMonthly)),
                ],
                [
                  "Caminho 2 · Vender e aplicar hoje",
                  brl(Math.ceil(p.needUnique)),
                ],
              ]}
            />
            <p className="planning-lead">
              Caminho 1: dos {d.idadeAtual} aos {d.idadeAposentadoria} anos,{" "}
              {p.hasChanges
                ? "além de todos os aportes planejados"
                : "em substituição ao aporte mensal atual"}
              .
            </p>
            {d.imoveisOutrosBens > 0 && (
              <p className="planning-note">
                Caminho 2: cerca de{" "}
                {((p.needUnique / d.imoveisOutrosBens) * 100).toLocaleString(
                  "pt-BR",
                  { maximumFractionDigits: 1 },
                )}
                % dos {brl(d.imoveisOutrosBens)} em imóveis e outros bens.
              </p>
            )}
          </>
        )}
      </Section>
      {protect && (
        <Section
          n="07 · SUCESSÃO E PROTEÇÃO"
          title="Quanto custa a herança e quem paga a conta."
        >
          <Kpis
            items={[
              ["Custo da sucessão hoje", brl(p.succession[0].cost)],
              [
                "Dinheiro rápido para os herdeiros",
                brl(p.succession[0].liquidity),
              ],
            ]}
          />
          <Alert warning={p.succession.some((s) => s.missing > 0)}>
            {p.succession.every((s) => s.missing === 0) ? (
              <strong>A proteção cobre a sucessão.</strong>
            ) : (
              <>
                <strong>Falta proteção.</strong> Um seguro de vida de cerca de{" "}
                {brl(p.suggestedInsurance)} cobriria os custos estimados,
                descontada a previdência. Hoje a liquidez cobre{" "}
                {(p.succession[0].coverage * 100).toLocaleString("pt-BR", {
                  maximumFractionDigits: 0,
                })}
                %.
              </>
            )}
          </Alert>
          <div className="planning-table-wrap mt-5">
            <table className="planning-table">
              <thead>
                <tr>
                  <th>Se faltar aos</th>
                  {p.succession.map((s) => (
                    <th key={s.age}>{s.age} anos</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Patrimônio total", "total"],
                    ["Vai a inventário", "inventory"],
                    ["ITCMD", "itcmd"],
                    ["Advogado e custas", "fees"],
                    ["Custo da sucessão", "cost"],
                    ["Seguro de vida", "insurance"],
                    ["Previdência", "pension"],
                  ] as const
                ).map(([label, key]) => (
                  <tr
                    key={key}
                    className={key === "cost" ? "font-semibold" : ""}
                  >
                    <td>{label}</td>
                    {p.succession.map((s) => (
                      <td key={s.age}>{brl(s[key])}</td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td>Situação</td>
                  {p.succession.map((s) => (
                    <td key={s.age}>
                      {s.missing > 0 ? `Faltam ${brl(s.missing)}` : "Coberto"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <h3 className="text-xl font-semibold mt-5 mb-2">Vale a pena?</h3>
          <ul className="text-sm space-y-2 list-disc pl-5">
            {d.seguroAtivo && (
              <li>
                Seguro: prêmio anual {brl(d.premioSeguro * 12)} (
                {(d.capitalSeguro > 0
                  ? ((d.premioSeguro * 12) / d.capitalSeguro) * 100
                  : 0
                ).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                % do capital). Total de prêmios no horizonte:{" "}
                {brl(
                  d.premioSeguro *
                    12 *
                    Math.max(
                      0,
                      Math.min(d.coberturaAte ?? d.idadeLimite, d.idadeLimite) -
                        d.idadeAtual,
                    ),
                )}
                .
              </li>
            )}
            {d.previdenciaAtiva && (
              <li>
                Previdência: economia estimada de ITCMD e custos hoje{" "}
                {brl(p.succession[0].saving)}.
              </li>
            )}
          </ul>
          <p className="planning-note">
            Estimativa com as alíquotas informadas para {d.uf}. Seguro e
            previdência foram considerados fora da base do inventário neste
            cenário. O tratamento tributário e sucessório depende do caso
            concreto; confirme alíquotas e enquadramento com um advogado de
            família.
          </p>
        </Section>
      )}
      <Section
        n={`${protect ? "08" : "07"} · PREMISSAS`}
        title="As bases deste planejamento."
      >
        <Kpis
          items={[
            [
              "Rentabilidade na acumulação",
              `${d.rentabilidadeAcumulacao.toLocaleString("pt-BR")}% a.a.`,
            ],
            [
              "Rentabilidade aposentado",
              `${d.rentabilidadeAposentadoria.toLocaleString("pt-BR")}% a.a.`,
            ],
            ["Inflação", `${d.inflacao.toLocaleString("pt-BR")}% a.a.`],
            [
              "Janela da aposentadoria",
              `${d.idadeAposentadoria} → ${d.idadeLimite}`,
            ],
          ]}
        />
        <p className="planning-note">
          Ganho real na acumulação:{" "}
          {(p.realAc * 100).toLocaleString("pt-BR", {
            maximumFractionDigits: 2,
          })}
          % a.a.; aposentado:{" "}
          {(p.realAp * 100).toLocaleString("pt-BR", {
            maximumFractionDigits: 2,
          })}
          % a.a. Aportes reajustados anualmente pela inflação. Retiradas e
          eventos expressos em dinheiro de hoje.
        </p>
      </Section>
      <section data-pdf-section className="planning-report-section">
        <p className="planning-note">
          Este relatório tem caráter informativo e não constitui recomendação
          individual nem garantia de rentabilidade. As projeções são estimativas
          baseadas nas premissas informadas e não incluem tributação dos
          investimentos ou custos não cadastrados.
        </p>
        <div className="flex items-center justify-between gap-4 mt-5">
          <p className="text-xs text-muted-foreground">
            +55 47 99290-2210
            <br />
            contato@gofferjeinvestimentos.com.br
          </p>
          <img
            src={logo}
            alt="Gofferjé Investimentos"
            className="w-16 h-16 object-contain"
          />
        </div>
      </section>
    </div>
  );
});
