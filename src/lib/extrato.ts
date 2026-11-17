import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { lerComTexto, type TransacaoExtrato } from "./extratoTexto";

export { lerComTexto, type TransacaoExtrato };

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

export const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type TipoImagem = (typeof TIPOS_IMAGEM)[number];

/** Foto/print de extrato: só dá para ler com a IA (não há texto no arquivo). */
export async function lerFoto(img: Uint8Array, tipo: TipoImagem): Promise<{ transacoes: TransacaoExtrato[]; metodo: "ia" }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Para ler fotos é preciso ativar a leitura inteligente (IA). Por enquanto, envie o PDF ou a planilha.");
  }
  const transacoes = await lerComClaude({ type: "image", source: { type: "base64", media_type: tipo, data: Buffer.from(img).toString("base64") } });
  return { transacoes, metodo: "ia" };
}

async function lerComClaude(arquivo: Uint8Array | Anthropic.ImageBlockParam): Promise<TransacaoExtrato[]> {
  const client = new Anthropic();
  const bloco: Anthropic.ContentBlockParam =
    arquivo instanceof Uint8Array
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: Buffer.from(arquivo).toString("base64") } }
      : arquivo;
  const resposta = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(Esquema) },
    messages: [
      {
        role: "user",
        content: [
          bloco,
          {
            type: "text",
            text:
              "Este é um extrato bancário ou fatura de cartão brasileiro (pode ser PDF, foto ou print). Extraia todas as transações (uma por linha do extrato). " +
              "Ignore linhas de saldo (saldo anterior, saldo do dia, saldo final), totais, limites e juros previstos. " +
              "Em fatura de cartão, compras são despesas e pagamentos da fatura/estornos são receitas. " +
              "Se o ano não aparecer na linha, deduza pelo período do documento.",
          },
        ],
      },
    ],
  });
  if (resposta.stop_reason === "refusal" || !resposta.parsed_output) throw new Error("não foi possível interpretar o arquivo");
  return resposta.parsed_output.transacoes
    .filter((t) => /^\d{4}-\d{2}-\d{2}$/.test(t.data) && t.valor > 0)
    .map((t) => ({ ...t, valor: Math.round(Math.abs(t.valor) * 100) / 100, descricao: t.descricao.trim() }));
}

