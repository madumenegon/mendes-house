import * as XLSX from "xlsx";

export interface TransacaoPlanilha {
  data: string;
  descricao: string;
  valor: number;
  tipo: "receita" | "despesa";
}

type Celula = string | number | boolean | Date | null | undefined;

const normalizar = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

function paraData(v: Celula, anoPadrao: number): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) {
    const d = new Date(v.getTime() + 12 * 3600 * 1000); // evita virar o dia por fuso
    return d.toISOString().slice(0, 10);
  }
  if (typeof v === "number" && v > 20000 && v < 80000) {
    // número de série de data do Excel
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  if (typeof v === "string") {
    const s = v.trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = s.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
    if (m) {
      const dia = Number(m[1]);
      const mes = Number(m[2]);
      if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;
      const ano = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : anoPadrao;
      return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    }
  }
  return null;
}

/** Aceita 1234.5, "R$ -1.234,56", "(123,45)", "123,45 D". Retorna null se não for valor. */
function paraNumero(v: Celula): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v !== "string") return null;
  let s = v.trim();
  if (!s || !/\d/.test(s)) return null;
  let negativo = /^\(.*\)$/.test(s) || /-/.test(s) || /\bD$/i.test(s);
  if (/\bC$/i.test(s)) negativo = false;
  s = s.replace(/[^\d,.]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if ((s.match(/\./g) ?? []).length > 1) s = s.replace(/\./g, "");
  const n = Number(s);
  if (!isFinite(n)) return null;
  return negativo ? -n : n;
}

interface Colunas { data: number; descricao: number; valor?: number; debito?: number; credito?: number }

function acharCabecalho(linhas: Celula[][]): { indice: number; cols: Colunas } | null {
  for (let i = 0; i < Math.min(linhas.length, 40); i++) {
    const h = linhas[i].map((c) => normalizar(String(c ?? "")));
    const idx = (re: RegExp) => h.findIndex((x) => re.test(x));
    const data = idx(/^data|^dt\b|vencimento|^dia$/);
    const descricao = idx(/descri|historico|lancamento|estabelecimento|^item|detalhe|^nome|^conta$|titulo/);
    const valor = idx(/^valor|^quantia|^montante|^total|^r\$/);
    const debito = idx(/debito|saida|despesa|^pago/);
    const credito = idx(/credito|entrada|receita|recebido/);
    if (data >= 0 && descricao >= 0 && (valor >= 0 || debito >= 0 || credito >= 0)) {
      return { indice: i, cols: { data, descricao, valor: valor >= 0 ? valor : undefined, debito: debito >= 0 ? debito : undefined, credito: credito >= 0 ? credito : undefined } };
    }
  }
  return null;
}

/** Sem cabeçalho reconhecível: escolhe as colunas pelo conteúdo. */
function adivinharColunas(linhas: Celula[][], ano: number): Colunas | null {
  const n = Math.max(0, ...linhas.map((l) => l.length));
  const amostra = linhas.slice(0, 200);
  let melhorData = -1, melhorValor = -1, melhorTexto = -1;
  let pData = 0, pValor = 0, pTexto = 0;
  for (let c = 0; c < n; c++) {
    const vals = amostra.map((l) => l[c]).filter((v) => v !== null && v !== undefined && String(v).trim() !== "");
    if (!vals.length) continue;
    const datas = vals.filter((v) => paraData(v, ano)).length / vals.length;
    const nums = vals.filter((v) => paraData(v, ano) === null && paraNumero(v) !== null).length / vals.length;
    const texto = vals.filter((v) => typeof v === "string" && /[a-zA-Z]{3}/.test(v)).length / vals.length;
    if (datas > pData) { pData = datas; melhorData = c; }
    if (nums > pValor) { pValor = nums; melhorValor = c; }
    if (texto > pTexto) { pTexto = texto; melhorTexto = c; }
  }
  if (pData < 0.5 || pValor < 0.5 || pTexto < 0.3) return null;
  return { data: melhorData, descricao: melhorTexto, valor: melhorValor };
}

/** Lê .xlsx/.xls/.csv e devolve as transações encontradas em todas as abas.
 * Valores negativos = saída. Se a planilha só tem valores positivos, eles
 * vêm como saídas (dá para inverter na revisão). */
export function lerPlanilha(buffer: ArrayBuffer): { transacoes: TransacaoPlanilha[]; aviso?: string } {
  const b = new Uint8Array(buffer.slice(0, 4));
  const binario = (b[0] === 0x50 && b[1] === 0x4b) || (b[0] === 0xd0 && b[1] === 0xcf); // xlsx (zip) ou xls
  // CSV/texto: lê tudo como texto para interpretar datas e valores no padrão brasileiro
  const wb = binario ? XLSX.read(buffer, { type: "array", cellDates: true }) : XLSX.read(buffer, { type: "array", raw: true });
  const ano = new Date().getFullYear();
  const todas: { data: string; descricao: string; valor: number }[] = [];
  for (const nome of wb.SheetNames) {
    const linhas = XLSX.utils.sheet_to_json<Celula[]>(wb.Sheets[nome], { header: 1, raw: true, defval: null });
    if (!linhas.length) continue;
    const cab = acharCabecalho(linhas);
    const cols = cab?.cols ?? adivinharColunas(linhas, ano);
    if (!cols) continue;
    for (const l of linhas.slice(cab ? cab.indice + 1 : 0)) {
      const data = paraData(l[cols.data], ano);
      const descricao = String(l[cols.descricao] ?? "").trim();
      let valor: number | null = null;
      if (cols.valor !== undefined) valor = paraNumero(l[cols.valor]);
      if ((valor === null || valor === 0) && (cols.debito !== undefined || cols.credito !== undefined)) {
        const deb = cols.debito !== undefined ? Math.abs(paraNumero(l[cols.debito]) ?? 0) : 0;
        const cred = cols.credito !== undefined ? Math.abs(paraNumero(l[cols.credito]) ?? 0) : 0;
        valor = cred - deb;
      }
      if (!data || !descricao || !valor || /^(saldo|total)/i.test(normalizar(descricao))) continue;
      todas.push({ data, descricao, valor });
    }
  }
  const temNegativo = todas.some((t) => t.valor < 0);
  return {
    transacoes: todas.map((t) => ({
      data: t.data,
      descricao: t.descricao,
      valor: Math.round(Math.abs(t.valor) * 100) / 100,
      tipo: temNegativo ? (t.valor < 0 ? "despesa" : "receita") : "despesa",
    })),
    aviso: !temNegativo && todas.length ? "A planilha só tem valores positivos: considerei todos como saídas (clique no valor para inverter)." : undefined,
  };
}
