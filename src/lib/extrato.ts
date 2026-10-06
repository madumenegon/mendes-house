import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { extractText, getDocumentProxy } from "unpdf";

export interface TransacaoExtrato {
  data: string; // YYYY-MM-DD
  descricao: string;
  valor: number; // sempre positivo
  tipo: "receita" | "despesa";
}

const Esquema = z.object({
  transacoes: z.array(
    z.object({
      data: z.string().describe("Data da transação no formato YYYY-MM-DD"),
      descricao: z.string().describe("Descrição como aparece no extrato, sem o valor"),
      valor: z.number().describe("Valor absoluto, positivo, em reais"),
      tipo: z.enum(["receita", "despesa"]).describe("receita = entrada/crédito; despesa = saída/débito"),
    })
  ),
});

/** Lê um extrato/fatura em PDF. Usa o Claude quando ANTHROPIC_API_KEY está
 * configurada (entende qualquer banco); senão cai num leitor de texto que
 * reconhece o formato comum "dd/mm  descrição  -1.234,56". */
export async function lerExtrato(pdf: Uint8Array): Promise<{ transacoes: TransacaoExtrato[]; metodo: "ia" | "texto"; aviso?: string }> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const transacoes = await lerComClaude(pdf);
      return { transacoes, metodo: "ia" };
    } catch (e) {
      const texto = await lerComTexto(pdf);
      return { transacoes: texto, metodo: "texto", aviso: `A leitura inteligente falhou (${e instanceof Error ? e.message : "erro"}); usei a leitura simples.` };
    }
  }
  return { transacoes: await lerComTexto(pdf), metodo: "texto" };
}

async function lerComClaude(pdf: Uint8Array): Promise<TransacaoExtrato[]> {
  const client = new Anthropic();
  const resposta = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(Esquema) },
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: Buffer.from(pdf).toString("base64") } },
          {
            type: "text",
            text:
              "Este é um extrato bancário ou fatura de cartão brasileiro. Extraia todas as transações (uma por linha do extrato). " +
              "Ignore linhas de saldo (saldo anterior, saldo do dia, saldo final), totais, limites e juros previstos. " +
              "Em fatura de cartão, compras são despesas e pagamentos da fatura/estornos são receitas. " +
              "Se o ano não aparecer na linha, deduza pelo período do documento.",
          },
        ],
      },
    ],
  });
  if (resposta.stop_reason === "refusal" || !resposta.parsed_output) throw new Error("não foi possível interpretar o PDF");
  return resposta.parsed_output.transacoes
    .filter((t) => /^\d{4}-\d{2}-\d{2}$/.test(t.data) && t.valor > 0)
    .map((t) => ({ ...t, valor: Math.round(Math.abs(t.valor) * 100) / 100, descricao: t.descricao.trim() }));
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
