import type { Categoria } from "@/lib/types";

/** Limite da categoria em R$: o % da renda (se definido) ou o valor fixo. */
export function limiteCategoria(c: Pick<Categoria, "orcamento_mensal" | "orcamento_pct">, renda: number): number | null {
  if (c.orcamento_pct) return Math.round(((renda * c.orcamento_pct) / 100) * 100) / 100;
  return c.orcamento_mensal ?? null;
}
