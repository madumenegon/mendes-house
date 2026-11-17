import { extractText, getDocumentProxy } from "unpdf";

/** Leitura simples de PDF com texto (sem IA). Roda no servidor e no navegador. */
export interface TransacaoExtrato {
  data: string; // YYYY-MM-DD
  descricao: string;
  valor: number; // sempre positivo
  tipo: "receita" | "despesa";
}

const RE_LINHA = /^(\d{2})[/.-](\d{2})(?:[/.-](\d{2,4}))?\s+(.+?)\s+(-?\s?R?\$?\s?-?\d{1,3}(?:\.\d{3})*,\d{2})\s*([DC-])?(?:\s+-?R?\$?\s?\d{1,3}(?:\.\d{3})*,\d{2}\s*[DC]?)?$/i;
const IGNORAR = /saldo|s\s*a\s*l\s*d\s*o|total|limite|a transportar|anterior/i;

export async function lerComTexto(pdf: Uint8Array): Promise<TransacaoExtrato[]> {
  const doc = await getDocumentProxy(pdf);
  const { text } = await extractText(doc, { mergePages: true });
  const anoAtual = new Date().getFullYear();
  const anoDoc = Number(text.match(/\b(20\d{2})\b/)?.[1] ?? anoAtual);
  const out: TransacaoExtrato[] = [];
  for (const bruta of text.split(/\r?\n/)) {
    const linha = bruta.replace(/\s+/g, " ").trim();
    const m = linha.match(RE_LINHA);
    if (!m) continue;
    const [, dd, mm, aa, desc, valorTxt, dc] = m;
    if (IGNORAR.test(desc)) continue;
    const ano = aa ? (aa.length === 2 ? 2000 + Number(aa) : Number(aa)) : anoDoc;
    const negativo = /-/.test(valorTxt) || dc?.toUpperCase() === "D" || dc === "-";
    const valor = Number(valorTxt.replace(/[^\d,]/g, "").replace(",", "."));
    if (!valor || Number(mm) > 12 || Number(dd) > 31) continue;
    out.push({
      data: `${ano}-${mm}-${dd}`,
      descricao: desc.trim(),
      valor,
      tipo: negativo ? "despesa" : "receita",
    });
  }
  return out;
}
