import type { Cartao, Lancamento } from "@/lib/types";

function ultimoDia(ano: number, mes1a12: number) {
  return new Date(Date.UTC(ano, mes1a12, 0)).getUTCDate();
}

function montar(ano: number, mesZeroBased: number, dia: number) {
  const dt = new Date(Date.UTC(ano, mesZeroBased, 1));
  const a = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + 1;
  return `${a}-${String(m).padStart(2, "0")}-${String(Math.min(dia, ultimoDia(a, m))).padStart(2, "0")}`;
}

/** Em que dia vence a fatura em que esta compra cai. Compras no dia do
 * fechamento ou depois vão para a fatura seguinte. `parcela` (0, 1, 2…)
 * empurra para as faturas dos meses seguintes. */
export function vencimentoFatura(dataCompra: string, cartao: Pick<Cartao, "dia_fechamento" | "dia_vencimento">, parcela = 0): string {
  const [a, m, d] = dataCompra.split("-").map(Number);
  const fechamentoEsteMes = Math.min(cartao.dia_fechamento, ultimoDia(a, m));
  let mesFechamento = m - 1 + (d >= fechamentoEsteMes ? 1 : 0); // zero-based
  if (cartao.dia_vencimento <= cartao.dia_fechamento) mesFechamento += 1; // vence no mês seguinte ao fechamento
  return montar(a, mesFechamento + parcela, cartao.dia_vencimento);
}

/** Mês em que o gasto aconteceu (visão de consumo). */
export function mesConsumo(l: Pick<Lancamento, "data" | "data_compra">): string {
  return (l.data_compra ?? l.data).slice(0, 7);
}
