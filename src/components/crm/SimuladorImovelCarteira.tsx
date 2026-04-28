import { useState, useMemo } from "react";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType,
  HeadingLevel, BorderStyle, WidthType, ShadingType, LevelFormat, PageBreak, PageOrientation } from "docx";
import { saveAs } from "file-saver";
import { supabase } from "@/integrations/supabase/client"; // ajuste o path conforme seu projeto

// =====================================================================
// TIPOS
// =====================================================================
type CenarioKey = "conservador" | "base" | "otimista";

interface PremissaCenario {
  vacancia: number;
  valorizacaoImovel: number;
  rendaCarteira: number;
  valorizacaoCarteira: number;
}

interface InputsState {
  valorImovel: number;
  custoOriginal: number;
  aluguelBruto: number;
  horizonte: number;
  taxaImobiliaria: number;
  manutencao: number;
  irAluguel: number;
  corretagem: number;
  regraIsencao: string;
  cenarios: Record<CenarioKey, PremissaCenario>;
}

interface CalculoResultado {
  aluguelLiquidoMensal: number;
  aluguelLiquidoAnual: number;
  rendaMensalCarteira: number;
  liquidoVenda: number;
  patrimImovel: (anos: number) => number;
  patrimCarteira: (anos: number) => number;
  ganho: number;
  irGanho: number;
  isento: boolean;
  corretagemValor: number;
}

// =====================================================================
// PROPS
// =====================================================================
interface Props {
  clienteId: string;
  clienteNome: string;
}

// =====================================================================
// COMPONENTE
// =====================================================================
export function SimuladorImovelCarteira({ clienteId, clienteNome }: Props) {
  const [inputs, setInputs] = useState<InputsState>({
    valorImovel: 480000,
    custoOriginal: 480000,
    aluguelBruto: 2400,
    horizonte: 20,
    taxaImobiliaria: 10,
    manutencao: 0,
    irAluguel: 27.5,
    corretagem: 0,
    regraIsencao: "nenhuma",
    cenarios: {
      conservador: { vacancia: 0, valorizacaoImovel: 2, rendaCarteira: 12, valorizacaoCarteira: 0 },
      base:        { vacancia: 0, valorizacaoImovel: 4, rendaCarteira: 14, valorizacaoCarteira: 0 },
      otimista:    { vacancia: 0, valorizacaoImovel: 6, rendaCarteira: 15, valorizacaoCarteira: 0 },
    },
  });

  const [modo, setModo] = useState<"renda" | "patrimonio">("renda");
  const [gerando, setGerando] = useState(false);

  // ============== CÁLCULO ==============
  const calcular = (cen: PremissaCenario): CalculoResultado => {
    const p = inputs;
    const vac = cen.vacancia / 100;
    const valImo = cen.valorizacaoImovel / 100;
    const dy = cen.rendaCarteira / 100;
    const valFii = cen.valorizacaoCarteira / 100;

    // Aluguel líquido
    const aluguelAnualBruto = p.aluguelBruto * 12 * (1 - vac);
    const aposTaxa = aluguelAnualBruto * (1 - p.taxaImobiliaria / 100);
    const manutencao = p.valorImovel * (p.manutencao / 100);
    const aposCustos = aposTaxa - manutencao;
    const aluguelLiquidoAnual = aposCustos * (1 - p.irAluguel / 100);
    const aluguelLiquidoMensal = aluguelLiquidoAnual / 12;

    // Patrimônio mantendo imóvel (reinveste aluguel à taxa da carteira)
    const patrimImovel = (anos: number) => {
      let patrim = p.valorImovel;
      let caixa = 0;
      for (let i = 0; i < anos; i++) {
        patrim = patrim * (1 + valImo);
        const aluguelAno = aluguelLiquidoAnual * Math.pow(1 + valImo, i);
        caixa = caixa * (1 + dy + valFii) + aluguelAno;
      }
      return patrim + caixa;
    };

    // Venda
    const corretagemValor = p.valorImovel * (p.corretagem / 100);
    const ganho = Math.max(0, p.valorImovel - p.custoOriginal);
    const isento = isencaoAplicavel(p.regraIsencao, p.valorImovel);
    const irGanho = isento ? 0 : ganho * 0.15;
    const liquidoVenda = p.valorImovel - corretagemValor - irGanho;

    const rendaMensalCarteira = (liquidoVenda * dy) / 12;
    const patrimCarteira = (anos: number) => liquidoVenda * Math.pow(1 + dy + valFii, anos);

    return {
      aluguelLiquidoMensal,
      aluguelLiquidoAnual,
      rendaMensalCarteira,
      liquidoVenda,
      patrimImovel,
      patrimCarteira,
      ganho,
      irGanho,
      isento,
      corretagemValor,
    };
  };

  const resultados = useMemo(() => ({
    conservador: calcular(inputs.cenarios.conservador),
    base: calcular(inputs.cenarios.base),
    otimista: calcular(inputs.cenarios.otimista),
  }), [inputs]);

  // ============== HELPERS DE FORMATAÇÃO ==============
  const fmt = (n: number) => "R$ " + Math.round(n).toLocaleString("pt-BR");
  const fmtMi = (n: number) => {
    if (Math.abs(n) >= 1e6) return "R$ " + (n / 1e6).toFixed(2) + " mi";
    if (Math.abs(n) >= 1e3) return "R$ " + (n / 1e3).toFixed(0) + " mil";
    return fmt(n);
  };

  const updateCenario = (cen: CenarioKey, campo: keyof PremissaCenario, val: number) => {
    setInputs(prev => ({
      ...prev,
      cenarios: { ...prev.cenarios, [cen]: { ...prev.cenarios[cen], [campo]: val } },
    }));
  };

  // ============== GERAR WORD + SALVAR ==============
  const gerarDocumento = async () => {
    setGerando(true);
    try {
      const blob = await gerarWordBlob(inputs, resultados, clienteNome);
      const fileName = `analise_patrimonial_${slug(clienteNome)}_${dataHoje()}.docx`;

      // 1. Download local
      saveAs(blob, fileName);

      // 2. Upload para Supabase Storage + registrar em arquivos_cliente
      const path = `clientes/${clienteId}/${fileName}`;
      const { error: upErr } = await supabase.storage
        .from("arquivos-clientes")
        .upload(path, blob, {
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          upsert: true,
        });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("arquivos-clientes").getPublicUrl(path);

      const { error: dbErr } = await supabase.from("arquivos_cliente").insert({
        cliente_id: clienteId,
        nome: fileName,
        url: pub.publicUrl,
        tipo: "analise_patrimonial",
        criado_em: new Date().toISOString(),
      });
      if (dbErr) throw dbErr;

      alert("Documento gerado, baixado e anexado ao histórico do cliente.");
    } catch (e: any) {
      console.error(e);
      alert("Erro ao gerar documento: " + e.message);
    } finally {
      setGerando(false);
    }
  };

  // ============== UI ==============
  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-baseline">
        <h2 className="text-xl font-semibold">Imóvel alugado vs. Carteira de investimentos</h2>
      </div>

      {/* DADOS DO IMÓVEL */}
      <Card titulo="Dados do imóvel">
        <Grid cols={4}>
          <Field label="Valor de mercado (R$)" value={inputs.valorImovel}
            onChange={v => setInputs({ ...inputs, valorImovel: v })} />
          <Field label="Custo original (R$)" value={inputs.custoOriginal}
            onChange={v => setInputs({ ...inputs, custoOriginal: v })} />
          <Field label="Aluguel bruto/mês (R$)" value={inputs.aluguelBruto}
            onChange={v => setInputs({ ...inputs, aluguelBruto: v })} />
          <Field label="Horizonte (anos)" value={inputs.horizonte}
            onChange={v => setInputs({ ...inputs, horizonte: v })} />
        </Grid>
      </Card>

      {/* REGRA DE ISENÇÃO */}
      <Card titulo="Regra de isenção (IR ganho de capital)">
        <select className="w-full p-2 border rounded text-sm"
          value={inputs.regraIsencao}
          onChange={e => setInputs({ ...inputs, regraIsencao: e.target.value })}>
          <option value="nenhuma">Sem isenção — paga 15% sobre o ganho</option>
          <option value="unico440">Único imóvel até R$ 440k, sem outra venda em 5 anos (Lei 9.250 art. 39)</option>
          <option value="reinvest180">Reinvestimento em outro residencial em 180 dias (não se aplica aqui)</option>
          <option value="antigo1969">Imóvel adquirido até 1969</option>
          <option value="abaixo35k">Venda abaixo de R$ 35.000</option>
        </select>
      </Card>

      {/* CUSTOS */}
      <Card titulo="Custos do imóvel (cenário 'manter')">
        <Grid cols={4}>
          <Field label="Taxa imobiliária (%)" value={inputs.taxaImobiliaria}
            onChange={v => setInputs({ ...inputs, taxaImobiliaria: v })} />
          <Field label="Manutenção anual (% imóvel)" value={inputs.manutencao}
            onChange={v => setInputs({ ...inputs, manutencao: v })} />
          <Field label="IR sobre aluguel (%)" value={inputs.irAluguel}
            onChange={v => setInputs({ ...inputs, irAluguel: v })} />
          <Field label="Corretagem venda (%)" value={inputs.corretagem}
            onChange={v => setInputs({ ...inputs, corretagem: v })} />
        </Grid>
      </Card>

      {/* PREMISSAS DOS CENÁRIOS */}
      <Card titulo="Premissas dos 3 cenários (% ao ano)">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500">
              <th className="text-left py-2">Premissa</th>
              <th className="py-2">Conservador</th>
              <th className="py-2">Base</th>
              <th className="py-2">Otimista</th>
            </tr>
          </thead>
          <tbody>
            {[
              { campo: "vacancia" as const, label: "Vacância imóvel (%)" },
              { campo: "valorizacaoImovel" as const, label: "Valorização imóvel" },
              { campo: "rendaCarteira" as const, label: "Renda mensal carteira" },
              { campo: "valorizacaoCarteira" as const, label: "Valorização carteira" },
            ].map(({ campo, label }) => (
              <tr key={campo}>
                <td className="py-1">{label}</td>
                {(["conservador", "base", "otimista"] as CenarioKey[]).map(cen => (
                  <td key={cen}>
                    <input type="number" step="0.5"
                      className="w-full text-center p-1 border rounded text-sm"
                      value={inputs.cenarios[cen][campo]}
                      onChange={e => updateCenario(cen, campo, parseFloat(e.target.value) || 0)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* TOGGLE */}
      <div className="flex gap-2 items-center">
        <span className="text-sm text-gray-600">Visualizar:</span>
        <button onClick={() => setModo("renda")}
          className={`px-3 py-1 text-sm rounded ${modo === "renda" ? "bg-blue-100 text-blue-700 border border-blue-300" : "bg-gray-100"}`}>
          Renda mensal
        </button>
        <button onClick={() => setModo("patrimonio")}
          className={`px-3 py-1 text-sm rounded ${modo === "patrimonio" ? "bg-blue-100 text-blue-700 border border-blue-300" : "bg-gray-100"}`}>
          Patrimônio em {inputs.horizonte} anos
        </button>
      </div>

      {/* CARDS DE RESULTADO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(["conservador", "base", "otimista"] as CenarioKey[]).map(cen => {
          const r = resultados[cen];
          const valImo = modo === "renda" ? r.aluguelLiquidoMensal : r.patrimImovel(inputs.horizonte);
          const valCar = modo === "renda" ? r.rendaMensalCarteira : r.patrimCarteira(inputs.horizonte);
          const diff = valCar - valImo;
          const diffPct = valImo > 0 ? (diff / valImo) * 100 : 0;
          const formatter = modo === "renda" ? fmt : fmtMi;
          return (
            <div key={cen} className={`p-4 rounded-lg border ${cen === "base" ? "border-2 border-blue-500" : "border-gray-200"}`}>
              <div className="text-xs text-gray-500 capitalize mb-2">{cen}</div>
              <div className="py-2 border-b">
                <div className="text-xs text-gray-500">Imóvel</div>
                <div className="font-semibold">{formatter(valImo)}</div>
              </div>
              <div className="py-2">
                <div className="text-xs text-gray-500">Carteira</div>
                <div className="font-semibold">{formatter(valCar)}</div>
              </div>
              <div className={`text-xs mt-2 px-2 py-1 inline-block rounded ${diff >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                {diff >= 0 ? "+" : ""}{formatter(Math.abs(diff))} ({diffPct >= 0 ? "+" : ""}{diffPct.toFixed(0)}%)
              </div>
            </div>
          );
        })}
      </div>

      {/* DETALHAMENTO DO CENÁRIO BASE */}
      <Card titulo="Detalhamento do cenário base">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs uppercase text-gray-500 mb-2">Manter imóvel</div>
            <Linha label="Aluguel bruto/mês" valor={fmt(inputs.aluguelBruto)} />
            <Linha label="Aluguel líquido/mês" valor={fmt(resultados.base.aluguelLiquidoMensal)} bold />
            <Linha label="Eficiência" valor={`${(resultados.base.aluguelLiquidoMensal / inputs.aluguelBruto * 100).toFixed(0)}%`} />
            <Linha label="Yield líquido a.a." valor={`${(resultados.base.aluguelLiquidoMensal * 12 / inputs.valorImovel * 100).toFixed(2)}%`} />
          </div>
          <div>
            <div className="text-xs uppercase text-gray-500 mb-2">Vender e migrar</div>
            <Linha label="Valor venda bruto" valor={fmt(inputs.valorImovel)} />
            <Linha label="Corretagem (-)" valor={fmt(resultados.base.corretagemValor)} cor="red" />
            <Linha label="Ganho de capital" valor={fmt(resultados.base.ganho)} />
            <Linha label={`IR ganho capital ${resultados.base.isento ? "(isento)" : ""}`}
              valor={fmt(resultados.base.irGanho)} cor={resultados.base.isento ? "green" : "red"} />
            <Linha label="Líquido na conta" valor={fmt(resultados.base.liquidoVenda)} bold />
            <Linha label="Renda/mês" valor={fmt(resultados.base.rendaMensalCarteira)} bold />
          </div>
        </div>
      </Card>

      {/* BOTÃO GERAR */}
      <div className="flex justify-end pt-4 border-t">
        <button onClick={gerarDocumento} disabled={gerando}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
          {gerando ? "Gerando..." : "Gerar relatório em Word + anexar ao cliente"}
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// COMPONENTES AUXILIARES
// =====================================================================
function Card({ titulo, children }: any) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
      <div className="text-sm font-medium mb-3 text-gray-600 dark:text-gray-300">{titulo}</div>
      {children}
    </div>
  );
}

function Grid({ cols, children }: any) {
  return <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-3`}>{children}</div>;
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full p-2 border rounded text-sm" />
    </div>
  );
}

function Linha({ label, valor, bold, cor }: { label: string; valor: string; bold?: boolean; cor?: "red" | "green" }) {
  const corClasse = cor === "red" ? "text-red-600" : cor === "green" ? "text-green-600" : "";
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-gray-600">{label}</span>
      <span className={`${bold ? "font-semibold" : ""} ${corClasse}`}>{valor}</span>
    </div>
  );
}

// =====================================================================
// LÓGICA AUXILIAR
// =====================================================================
function isencaoAplicavel(regra: string, valorVenda: number): boolean {
  if (regra === "nenhuma") return false;
  if (regra === "unico440") return valorVenda <= 440000;
  if (regra === "reinvest180") return false;
  if (regra === "antigo1969") return true;
  if (regra === "abaixo35k") return valorVenda <= 35000;
  return false;
}

function slug(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function dataHoje(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
}

// =====================================================================
// GERADOR DE WORD — replica o documento entregue
// =====================================================================
async function gerarWordBlob(
  inputs: InputsState,
  resultados: Record<CenarioKey, CalculoResultado>,
  clienteNome: string
): Promise<Blob> {
  const NAVY = "1F2A4D";
  const NAVY_LIGHT = "E8ECF4";
  const ACCENT = "2E75B6";
  const TEXT_GRAY = "4A4A4A";
  const LIGHT_GRAY = "F5F5F5";

  const thin = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
  const cellBorders = { top: thin, bottom: thin, left: thin, right: thin };

  const fmt = (n: number) => "R$ " + Math.round(n).toLocaleString("pt-BR");
  const fmtMi = (n: number) => {
    if (Math.abs(n) >= 1e6) return "R$ " + (n / 1e6).toFixed(2) + " milhões";
    if (Math.abs(n) >= 1e3) return "R$ " + (n / 1e3).toFixed(0) + " mil";
    return fmt(n);
  };

  const para = (text: string, opts: any = {}) => new Paragraph({
    alignment: opts.align || AlignmentType.JUSTIFIED,
    spacing: { after: opts.after || 160, before: opts.before || 0, line: 300 },
    children: [new TextRun({
      text, font: "Calibri", size: opts.size || 22, bold: opts.bold || false,
      italics: opts.italics || false, color: opts.color || "2C2C2C"
    })],
  });

  const h1 = (text: string) => new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, font: "Calibri", size: 32, bold: true, color: NAVY })],
  });

  const h3 = (text: string) => new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, font: "Calibri", size: 22, bold: true, color: ACCENT })],
  });

  const headerCell = (text: string, width: number, align = AlignmentType.CENTER) => new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: NAVY, type: ShadingType.CLEAR, color: "auto" },
    margins: { top: 120, bottom: 120, left: 140, right: 140 },
    children: [new Paragraph({
      alignment: align, spacing: { after: 0 },
      children: [new TextRun({ text, font: "Calibri", size: 20, bold: true, color: "FFFFFF" })],
    })],
  });

  const cell = (text: string, width: number, opts: any = {}) => new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.LEFT, spacing: { after: 0 },
      children: [new TextRun({ text, font: "Calibri", size: 20, bold: opts.bold || false, color: opts.color || "2C2C2C" })],
    })],
  });

  const bullet = (text: string) => new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 100, line: 280 },
    children: [new TextRun({ text, font: "Calibri", size: 22, color: "2C2C2C" })],
  });

  const horizontes = [10, 15, 20, 30];
  const cenLabels: Record<CenarioKey, string> = { conservador: "Conservador", base: "Base", otimista: "Otimista" };
  const children: any[] = [];

  // CAPA
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 2400, after: 200 },
    children: [new TextRun({ text: "ANÁLISE PATRIMONIAL", font: "Calibri", size: 22, color: ACCENT, bold: true })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 240 },
    children: [new TextRun({ text: "Imóvel alugado ou carteira de investimentos?", font: "Calibri", size: 44, bold: true, color: NAVY })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 600 },
    children: [new TextRun({ text: "Uma comparação patrimonial para os próximos 10, 15, 20 e 30 anos", font: "Calibri", size: 24, italics: true, color: TEXT_GRAY })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 1200, after: 100 },
    children: [new TextRun({ text: "Cliente", font: "Calibri", size: 18, color: TEXT_GRAY })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 600 },
    children: [new TextRun({ text: clienteNome, font: "Calibri", size: 26, bold: true, color: NAVY })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 2400, after: 100 },
    children: [new TextRun({ text: "Preparado por", font: "Calibri", size: 18, color: TEXT_GRAY })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [new TextRun({ text: "Nexa Investimentos", font: "Calibri", size: 22, bold: true, color: NAVY })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Consultoria patrimonial independente", font: "Calibri", size: 18, color: TEXT_GRAY })],
  }));
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // 1. RESUMO EXECUTIVO
  children.push(h1("1. Resumo executivo"));
  children.push(para("Este documento foi preparado para apoiar uma decisão patrimonial concreta: manter um imóvel residencial alugado ou vendê-lo e migrar o capital para uma carteira de investimentos diversificada."));
  children.push(para("Decisões desse porte costumam ser tomadas com base na renda mensal aparente, comparando-se o aluguel bruto com a renda projetada de uma carteira. Essa comparação, embora intuitiva, é incompleta. O aluguel bruto não é o que entra no bolso. Sobre ele incidem taxa de administração imobiliária, manutenção, vacância e imposto de renda."));
  children.push(para("A análise correta precisa olhar para a renda líquida real, a evolução patrimonial ao longo do tempo, a tributação de cada alternativa, a liquidez, a diversificação e o risco de concentração em um único ativo. Este documento apresenta essa comparação nos horizontes de 10, 15, 20 e 30 anos, em três cenários distintos: conservador, base e otimista."));

  // 2. PREMISSAS
  children.push(h1("2. Premissas da simulação"));
  children.push(h3("Dados do imóvel"));
  children.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    rows: [
      new TableRow({ children: [cell("Valor de mercado", 4680, { bold: true, fill: NAVY_LIGHT }), cell(fmt(inputs.valorImovel), 4680, { align: AlignmentType.RIGHT })] }),
      new TableRow({ children: [cell("Custo de aquisição", 4680, { bold: true, fill: NAVY_LIGHT }), cell(fmt(inputs.custoOriginal), 4680, { align: AlignmentType.RIGHT })] }),
      new TableRow({ children: [cell("Aluguel bruto mensal", 4680, { bold: true, fill: NAVY_LIGHT }), cell(fmt(inputs.aluguelBruto), 4680, { align: AlignmentType.RIGHT })] }),
      new TableRow({ children: [cell("Taxa imobiliária", 4680, { bold: true, fill: NAVY_LIGHT }), cell(`${inputs.taxaImobiliaria}%`, 4680, { align: AlignmentType.RIGHT })] }),
      new TableRow({ children: [cell("IR sobre aluguel", 4680, { bold: true, fill: NAVY_LIGHT }), cell(`${inputs.irAluguel}%`, 4680, { align: AlignmentType.RIGHT })] }),
      new TableRow({ children: [cell("Líquido disponível para investir", 4680, { bold: true, fill: NAVY_LIGHT }), cell(fmt(resultados.base.liquidoVenda), 4680, { align: AlignmentType.RIGHT, bold: true, color: NAVY })] }),
    ],
  }));
  children.push(para(" ", { after: 200 }));

  children.push(h3("Premissas dos três cenários (% ao ano)"));
  children.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3360, 2000, 2000, 2000],
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell("Premissa", 3360, AlignmentType.LEFT), headerCell("Conservador", 2000), headerCell("Base", 2000), headerCell("Otimista", 2000)] }),
      ...(["vacancia", "valorizacaoImovel", "rendaCarteira", "valorizacaoCarteira"] as const).map((campo, i) => {
        const labels = ["Vacância do imóvel", "Valorização do imóvel", "Renda da carteira", "Valorização da carteira"];
        return new TableRow({ children: [
          cell(labels[i], 3360),
          cell(`${inputs.cenarios.conservador[campo]}%`, 2000, { align: AlignmentType.CENTER }),
          cell(`${inputs.cenarios.base[campo]}%`, 2000, { align: AlignmentType.CENTER }),
          cell(`${inputs.cenarios.otimista[campo]}%`, 2000, { align: AlignmentType.CENTER }),
        ]});
      })
    ],
  }));

  // 3. SITUAÇÃO ATUAL
  children.push(h1("3. Situação atual do imóvel"));
  children.push(para(`O imóvel hoje gera um aluguel bruto de ${fmt(inputs.aluguelBruto)} por mês. Esse, no entanto, é o número que aparece no contrato — não o que efetivamente entra no caixa do proprietário.`));

  const taxaValor = inputs.aluguelBruto * (inputs.taxaImobiliaria / 100);
  const aposTaxa = inputs.aluguelBruto - taxaValor;
  const irValor = aposTaxa * (inputs.irAluguel / 100);

  children.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    rows: [
      new TableRow({ children: [cell("Aluguel bruto mensal", 4680, { fill: NAVY_LIGHT, bold: true }), cell(fmt(inputs.aluguelBruto), 4680, { align: AlignmentType.RIGHT })] }),
      new TableRow({ children: [cell(`Taxa imobiliária (${inputs.taxaImobiliaria}%)`, 4680, { fill: LIGHT_GRAY }), cell(`− ${fmt(taxaValor)}`, 4680, { align: AlignmentType.RIGHT, color: "A82828" })] }),
      new TableRow({ children: [cell(`Imposto de renda (${inputs.irAluguel}%)`, 4680, { fill: LIGHT_GRAY }), cell(`− ${fmt(irValor)}`, 4680, { align: AlignmentType.RIGHT, color: "A82828" })] }),
      new TableRow({ children: [cell("Aluguel líquido mensal", 4680, { fill: NAVY_LIGHT, bold: true }), cell(fmt(resultados.base.aluguelLiquidoMensal), 4680, { align: AlignmentType.RIGHT, bold: true, color: NAVY })] }),
      new TableRow({ children: [cell("Eficiência do aluguel", 4680, { fill: LIGHT_GRAY }), cell(`${(resultados.base.aluguelLiquidoMensal / inputs.aluguelBruto * 100).toFixed(0)}%`, 4680, { align: AlignmentType.RIGHT })] }),
      new TableRow({ children: [cell("Yield líquido anual", 4680, { fill: LIGHT_GRAY }), cell(`${(resultados.base.aluguelLiquidoMensal * 12 / inputs.valorImovel * 100).toFixed(2)}%`, 4680, { align: AlignmentType.RIGHT })] }),
    ],
  }));

  // 4. COMPARAÇÃO PATRIMONIAL
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(h1("4. Comparação patrimonial"));
  children.push(para("A tabela a seguir consolida a evolução patrimonial das duas alternativas em quatro horizontes e três cenários. Os valores consideram a valorização do imóvel ou da carteira somada ao reinvestimento da renda gerada."));

  const compRows: TableRow[] = [
    new TableRow({ tableHeader: true, children: [
      headerCell("Horizonte", 1100), headerCell("Cenário", 1500), headerCell("Imóvel", 1900),
      headerCell("Carteira", 1900), headerCell("Diferença", 1700), headerCell("Variação", 1260),
    ]}),
  ];

  horizontes.forEach((h, hi) => {
    (["conservador", "base", "otimista"] as CenarioKey[]).forEach((cen, ci) => {
      const r = resultados[cen];
      const valImo = r.patrimImovel(h);
      const valCar = r.patrimCarteira(h);
      const diff = valCar - valImo;
      const diffPct = valImo > 0 ? (diff / valImo) * 100 : 0;
      const isFirst = ci === 0;
      const fillColor = isFirst ? NAVY_LIGHT : (ci % 2 === 0 ? "FFFFFF" : LIGHT_GRAY);
      compRows.push(new TableRow({ children: [
        cell(isFirst ? `${h} anos` : "", 1100, { align: AlignmentType.CENTER, bold: isFirst, fill: fillColor }),
        cell(cenLabels[cen], 1500, { fill: fillColor }),
        cell(fmtMi(valImo), 1900, { align: AlignmentType.RIGHT, fill: fillColor }),
        cell(fmtMi(valCar), 1900, { align: AlignmentType.RIGHT, fill: fillColor, color: NAVY, bold: true }),
        cell(`+${fmtMi(diff)}`, 1700, { align: AlignmentType.RIGHT, fill: fillColor, color: "1B5E20" }),
        cell(`+${diffPct.toFixed(0)}%`, 1260, { align: AlignmentType.CENTER, fill: fillColor, color: "1B5E20", bold: true }),
      ]}));
    });
  });

  children.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1100, 1500, 1900, 1900, 1700, 1260],
    rows: compRows,
  }));

  // 5. RENDA MENSAL
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(h1("5. Comparação de renda mensal"));
  children.push(para("Além do patrimônio acumulado, é fundamental observar a renda mensal estimada gerada por cada alternativa logo no primeiro ano de simulação. A diferença é significativa, e revela um ponto que costuma surpreender o cliente."));

  children.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3360, 2000, 2000, 2000],
    rows: [
      new TableRow({ tableHeader: true, children: [
        headerCell("Alternativa", 3360, AlignmentType.LEFT), headerCell("Renda mensal", 2000),
        headerCell("Diferença", 2000), headerCell("Variação", 2000),
      ]}),
      new TableRow({ children: [
        cell("Imóvel alugado (líquido)", 3360, { fill: NAVY_LIGHT, bold: true }),
        cell(fmt(resultados.base.aluguelLiquidoMensal), 2000, { align: AlignmentType.CENTER, bold: true }),
        cell("—", 2000, { align: AlignmentType.CENTER }),
        cell("—", 2000, { align: AlignmentType.CENTER }),
      ]}),
      ...(["conservador", "base", "otimista"] as CenarioKey[]).map(cen => {
        const r = resultados[cen];
        const diff = r.rendaMensalCarteira - resultados.base.aluguelLiquidoMensal;
        const pct = resultados.base.aluguelLiquidoMensal > 0 ? (diff / resultados.base.aluguelLiquidoMensal) * 100 : 0;
        return new TableRow({ children: [
          cell(`Carteira — cenário ${cen}`, 3360),
          cell(fmt(r.rendaMensalCarteira), 2000, { align: AlignmentType.CENTER, bold: true, color: NAVY }),
          cell(`+${fmt(diff)}`, 2000, { align: AlignmentType.CENTER, color: "1B5E20" }),
          cell(`+${pct.toFixed(0)}%`, 2000, { align: AlignmentType.CENTER, color: "1B5E20", bold: true }),
        ]});
      })
    ],
  }));

  // 6. ANÁLISE POR CENÁRIO
  children.push(h1("6. Análise por cenário"));
  children.push(h3("Cenário conservador"));
  children.push(para(`Mesmo na hipótese mais conservadora — em que a carteira gera ${inputs.cenarios.conservador.rendaCarteira}% ao ano em renda corrente e o imóvel se valoriza a apenas ${inputs.cenarios.conservador.valorizacaoImovel}% ao ano — a alternativa de investimentos supera a manutenção do imóvel em todos os horizontes analisados. Esse cenário mostra que a vantagem dos investimentos não depende de premissas otimistas para se sustentar.`));

  children.push(h3("Cenário base"));
  children.push(para(`No cenário central, com renda da carteira de ${inputs.cenarios.base.rendaCarteira}% ao ano e valorização do imóvel de ${inputs.cenarios.base.valorizacaoImovel}% ao ano, a diferença patrimonial cresce de forma expressiva à medida que o horizonte se alonga. Esse resultado evidencia o efeito do reinvestimento contínuo: cada renda recebida volta a render, ano após ano.`));

  children.push(h3("Cenário otimista"));
  children.push(para(`No cenário otimista, o imóvel se valoriza ${inputs.cenarios.otimista.valorizacaoImovel}% ao ano e a carteira entrega ${inputs.cenarios.otimista.rendaCarteira}% de renda. Aqui o imóvel apresenta sua melhor performance. Ainda assim, a carteira mantém vantagem patrimonial relevante. A maior geração de renda corrente, quando reinvestida, supera a valorização do ativo físico. Vale notar que valorização imobiliária real consistentemente acima da inflação histórica é uma hipótese que merece ser ponderada.`));

  // 7. O QUE OS NÚMEROS MOSTRAM
  children.push(h1("7. O que os números mostram"));
  children.push(bullet(`A renda líquida do imóvel é substancialmente menor do que o aluguel bruto. De ${fmt(inputs.aluguelBruto)} anunciados, apenas ${fmt(resultados.base.aluguelLiquidoMensal)} chegam ao bolso.`));
  children.push(bullet(`A carteira de investimentos, mesmo no cenário mais conservador, parte de uma renda mensal inicial de ${fmt(resultados.conservador.rendaMensalCarteira)}.`));
  children.push(bullet("Em horizontes de 20 e 30 anos, o efeito do reinvestimento composto amplia significativamente a vantagem da carteira."));
  children.push(bullet("A concentração patrimonial em um único imóvel é um fator de risco que não aparece nos números absolutos."));
  children.push(bullet("A carteira permite ajustes, rebalanceamentos e mudanças de estratégia ao longo do tempo, com liquidez muito superior à do imóvel físico."));

  // 8. O QUE OS NÚMEROS NÃO MOSTRAM
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(h1("8. O que os números não mostram sozinhos"));
  children.push(para("A simulação é uma fotografia matemática. Mas a decisão entre manter um imóvel ou migrar para uma carteira envolve dimensões que os números, isoladamente, não capturam."));

  const qualitativos: [string, string][] = [
    ["Liquidez", "Um imóvel pode demorar de meses a mais de um ano para ser vendido, e geralmente exige desconto sobre o preço inicial. Uma carteira de investimentos é convertida em caixa em D+1 ou D+2, sem necessidade de negociação."],
    ["Concentração patrimonial", `Ter ${fmt(inputs.valorImovel)} em um único imóvel significa depender de um único ativo, em uma única rua, em uma única cidade, com um único inquilino por vez. Qualquer evento adverso afeta integralmente essa parcela do patrimônio.`],
    ["Risco de inadimplência e vacância", "Mesmo com inquilinos selecionados, sempre há risco de atrasos, ações judiciais e vacância. Cada mês sem inquilino é um mês de zero renda, somado ao IPTU, condomínio e manutenção que continuam correndo."],
    ["Custos invisíveis do imóvel", "Reformas entre locações, manutenção preventiva, taxas de cartório, eventuais regularizações documentais e o custo do tempo dedicado a administrar o imóvel raramente entram nas contas iniciais."],
    ["Tributação", "O aluguel é tributado pela tabela progressiva do imposto de renda, podendo chegar a 27,5% via carnê-leão. Já uma parcela relevante dos ativos de uma carteira diversificada — fundos imobiliários, fundos de infraestrutura, LCIs, LCAs, debêntures incentivadas — pode ser isenta de imposto de renda para pessoa física."],
    ["Diversificação e flexibilidade", "Uma carteira pode estar exposta a diferentes setores, classes de ativo, indexadores e prazos. Pode ser ajustada a qualquer momento conforme mudanças no cenário macroeconômico, no perfil de risco ou nos objetivos do cliente."],
    ["Controle sobre a geração de renda", "Em uma carteira, é possível modular a renda — receber mais dividendos hoje e menos amanhã, ou vice-versa — conforme a fase de vida do investidor. O imóvel oferece pouca margem para esse tipo de ajuste fino."],
  ];
  qualitativos.forEach(([titulo, texto]) => { children.push(h3(titulo)); children.push(para(texto)); });

  // 9. CONCLUSÃO
  children.push(h1("9. Conclusão consultiva"));
  children.push(para("Com base nas premissas adotadas e nos números apresentados, vender o imóvel e migrar o capital para uma carteira de investimentos diversificada apresenta vantagem relevante em ambas as dimensões avaliadas: renda mensal líquida e evolução patrimonial. Essa vantagem se sustenta em todos os cenários — do mais conservador ao mais otimista — e em todos os horizontes analisados, de 10 a 30 anos."));
  children.push(para("Esse resultado, no entanto, não esgota a decisão. Manter o imóvel pode fazer sentido em situações específicas: quando o cliente valoriza o vínculo emocional com o ativo, quando há expectativa de valorização excepcional da região, quando o desejo é manter parte do patrimônio em ativo físico, ou quando a estabilidade percebida do imóvel traz uma segurança subjetiva que o cliente prefere preservar."));
  children.push(para("A escolha mais adequada depende do conjunto completo do planejamento patrimonial: dos objetivos de vida, da necessidade de renda no curto prazo, do perfil de risco, do horizonte de tempo, da liquidez desejada e do quanto o cliente valoriza simplicidade, controle e flexibilidade na gestão dos próprios recursos."));

  // 10. AVISO
  children.push(h1("10. Aviso importante"));
  children.push(para("Esta simulação utiliza premissas estimadas e não representa garantia de rentabilidade futura. Os resultados podem variar conforme condições de mercado, tributação, custos, liquidez dos ativos, vacância, inflação e perfil do investidor. A análise deve ser usada como ferramenta de apoio à decisão dentro de um planejamento financeiro completo.", { italics: true, color: TEXT_GRAY, size: 20 }));

  const doc = new Document({
    creator: "Nexa Investimentos",
    title: "Análise patrimonial",
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      }],
    },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children,
    }],
  });

  return await Packer.toBlob(doc);
}
