import type { Categoria, TipoLancamento } from "@/lib/types";

export interface No {
  c: Categoria;
  nivel: number;
  filhos: No[];
}

const ordenar = (a: Categoria, b: Categoria) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR");

/** Monta a árvore de categorias (grande conta → classe → subclasse…). Pai inexistente = raiz. */
export function montarArvore(cats: Categoria[], tipo: TipoLancamento = "despesa"): No[] {
  const lista = cats.filter((c) => c.tipo === tipo);
  const ids = new Set(lista.map((c) => c.id));
  const filhosDe = new Map<string | null, Categoria[]>();
  for (const c of lista) {
    const pai = c.parent_id && ids.has(c.parent_id) ? c.parent_id : null;
    filhosDe.set(pai, [...(filhosDe.get(pai) ?? []), c]);
  }
  const visitados = new Set<string>();
  const montar = (pai: string | null, nivel: number): No[] =>
    (filhosDe.get(pai) ?? []).sort(ordenar).filter((c) => !visitados.has(c.id) && visitados.add(c.id)).map((c) => ({ c, nivel, filhos: montar(c.id, nivel + 1) }));
  return montar(null, 0);
}

/** A árvore achatada na ordem de leitura, para listas e selects. */
export function achatar(nos: No[]): No[] {
  return nos.flatMap((n) => [n, ...achatar(n.filhos)]);
}

/** Opções de select com recuo pela profundidade. */
export function opcoesCategoria(cats: Categoria[], tipo: TipoLancamento) {
  return achatar(montarArvore(cats, tipo)).map((n) => ({
    id: n.c.id,
    label: `${"   ".repeat(n.nivel)}${n.c.emoji} ${n.c.nome}`,
  }));
}

/** Soma o próprio valor com o de todos os descendentes. */
export function somarComFilhos(n: No, valores: Record<string, number>): number {
  return (valores[n.c.id] ?? 0) + n.filhos.reduce((s, f) => s + somarComFilhos(f, valores), 0);
}

/** Profundidade de cada categoria (0 = grande conta), para preferir a mais específica. */
export function profundidades(cats: Categoria[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const tipo of ["despesa", "receita"] as const) for (const n of achatar(montarArvore(cats, tipo))) m.set(n.c.id, n.nivel);
  return m;
}
