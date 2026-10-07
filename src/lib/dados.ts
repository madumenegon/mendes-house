import "server-only";
import { db } from "@/lib/supabase";
import { fimDoMes, hojeISO, inicioDoMes, mesDe, somarMeses, ultimoDiaDoMes } from "@/lib/datas";
import { resumirTempo } from "@/lib/tempo";
import type {
  Caixinha, Cartao, Categoria, ContaFixa, Evento, FamiliaInfo, Lancamento, MovimentoCaixinha, Tarefa, TarefaFeita, Valor,
} from "@/lib/types";

function falhar(contexto: string, error: { message: string } | null) {
  if (error) throw new Error(`${contexto}: ${error.message}`);
}

export async function carregarFamilia(): Promise<FamiliaInfo> {
  const { data, error } = await db().from("familia_info").select("*").eq("id", 1).single();
  falhar("familia_info", error);
  return {
    ...(data as FamiliaInfo),
    horas_acordadas_dia: Number(data!.horas_acordadas_dia),
    dia_salario: data!.dia_salario ?? 5,
    dia_contas: data!.dia_contas ?? 10,
  };
}

export async function carregarValores(): Promise<Valor[]> {
  const { data, error } = await db().from("valores").select("*").order("ordem").order("nome");
  falhar("valores", error);
  return (data ?? []) as Valor[];
}

/** Eventos que podem ter ocorrência no intervalo (inclui recorrentes que
 * começaram antes). A expansão em datas é feita por expandirEventos. */
export async function carregarEventos(inicio: string, fim: string): Promise<Evento[]> {
  const { data, error } = await db()
    .from("eventos")
    .select("*")
    .or(`and(recorrencia.eq.nenhuma,data.gte.${inicio},data.lte.${fim}),and(recorrencia.neq.nenhuma,data.lte.${fim})`);
  falhar("eventos", error);
  return ((data ?? []) as Evento[]).filter((e) => e.recorrencia === "nenhuma" || !e.recorrencia_fim || e.recorrencia_fim >= inicio);
}

export async function carregarTarefas(apenasAtivas = true): Promise<Tarefa[]> {
  let q = db().from("tarefas").select("*").order("titulo");
  if (apenasAtivas) q = q.eq("ativa", true);
  const { data, error } = await q;
  falhar("tarefas", error);
  return (data ?? []) as Tarefa[];
}

export async function carregarFeitas(inicio: string, fim: string): Promise<TarefaFeita[]> {
  const { data, error } = await db().from("tarefas_feitas").select("*").gte("data", inicio).lte("data", fim);
  falhar("tarefas_feitas", error);
  return (data ?? []) as TarefaFeita[];
}

export async function carregarResumoTempo(inicio: string, fim: string) {
  const [familia, valores, eventos, tarefas, feitas] = await Promise.all([
    carregarFamilia(), carregarValores(), carregarEventos(inicio, fim), carregarTarefas(), carregarFeitas(inicio, fim),
  ]);
  return {
    familia,
    valores,
    resumo: resumirTempo(eventos, tarefas, feitas, valores, inicio, fim, familia.horas_acordadas_dia),
  };
}

// ------------------------------------------------------------------ finanças

const num = <T extends object>(rows: T[], campos: (keyof T)[]) =>
  rows.map((r) => {
    const c = { ...r };
    for (const k of campos) if (c[k] !== null && c[k] !== undefined) (c[k] as unknown) = Number(c[k]);
    return c;
  });

export async function carregarCategorias(): Promise<Categoria[]> {
  const { data, error } = await db().from("categorias").select("*").order("tipo").order("ordem").order("nome");
  falhar("categorias", error);
  return num((data ?? []) as Categoria[], ["orcamento_mensal"]);
}

export async function carregarContasFixas(): Promise<ContaFixa[]> {
  const { data, error } = await db().from("contas_fixas").select("*").order("dia");
  falhar("contas_fixas", error);
  return num((data ?? []) as ContaFixa[], ["valor"]);
}

export async function carregarLancamentos(mesInicio: string, mesFim = mesInicio): Promise<Lancamento[]> {
  const { data, error } = await db()
    .from("lancamentos")
    .select("*")
    .gte("competencia", mesInicio)
    .lte("competencia", mesFim)
    .order("data")
    .order("created_at");
  falhar("lancamentos", error);
  return num((data ?? []) as Lancamento[], ["valor"]);
}

export async function carregarCaixinhas(): Promise<{ caixinhas: Caixinha[]; movimentos: MovimentoCaixinha[] }> {
  const [c, m] = await Promise.all([
    db().from("caixinhas").select("*").order("created_at"),
    db().from("caixinha_movimentos").select("*").order("data", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  falhar("caixinhas", c.error);
  falhar("caixinha_movimentos", m.error);
  return {
    caixinhas: num((c.data ?? []) as Caixinha[], ["meta", "aporte_mensal"]),
    movimentos: num((m.data ?? []) as MovimentoCaixinha[], ["valor"]),
  };
}

export function saldoCaixinha(id: string, movimentos: MovimentoCaixinha[]) {
  return movimentos
    .filter((m) => m.caixinha_id === id)
    .reduce((s, m) => s + (m.tipo === "deposito" ? m.valor : -m.valor), 0);
}

/** Cria os lançamentos do mês a partir das contas fixas ativas (salário,
 * aluguel, internet…). Idempotente: só cria as que ainda não existem. */
export async function gerarContasFixasDoMes(mes: string, membro: string | null): Promise<number> {
  const supa = db();
  const [{ data: contas }, { data: existentes }] = await Promise.all([
    supa.from("contas_fixas").select("*").eq("ativa", true),
    supa.from("lancamentos").select("conta_fixa_id").eq("competencia", mes).not("conta_fixa_id", "is", null),
  ]);
  const ja = new Set((existentes ?? []).map((l) => l.conta_fixa_id as string));
  const [a, m] = mes.split("-").map(Number);
  const ultimo = ultimoDiaDoMes(a, m);
  const novos = ((contas ?? []) as ContaFixa[])
    .filter((c) => !ja.has(c.id))
    .map((c) => ({
      tipo: c.tipo,
      descricao: c.descricao,
      valor: c.valor,
      data: `${mes}-${String(Math.min(c.dia, ultimo)).padStart(2, "0")}`,
      competencia: mes,
      categoria_id: c.categoria_id,
      natureza: "fixo",
      pessoa: c.pessoa,
      forma: c.forma,
      conta_fixa_id: c.id,
      origem: "recorrente",
      created_by: membro,
    }));
  if (!novos.length) return 0;
  const { error } = await supa.from("lancamentos").insert(novos);
  if (error && error.code !== "23505") throw new Error(error.message);
  return novos.length;
}

/** Gera automaticamente só para o mês atual e o próximo (não mexe no passado). */
export async function autoGerarSePreciso(mes: string, membro: string | null) {
  const atual = mesDe(hojeISO());
  const proximo = mesDe(somarMeses(inicioDoMes(atual), 1));
  if (mes === atual || mes === proximo) await gerarContasFixasDoMes(mes, membro);
}

export interface ResumoMes {
  receitas: number;
  despesas: number;
  pago: number;
  aPagar: number;
  recebido: number;
  aReceber: number;
  fixo: number;
  variavel: number;
  valeRecebido: number;
  valeGasto: number;
  porCategoria: { id: string; nome: string; emoji: string; cor: string; natureza: string; total: number; orcamento: number | null }[];
  depositos: number;
  retiradas: number;
  saldo: number; // receitas − despesas
  livre: number; // saldo − guardado nas caixinhas + retiradas
}

export function resumirMes(lancs: Lancamento[], categorias: Categoria[], movimentosDoMes: MovimentoCaixinha[]): ResumoMes {
  const catMap = new Map(categorias.map((c) => [c.id, c]));
  const r: ResumoMes = {
    receitas: 0, despesas: 0, pago: 0, aPagar: 0, recebido: 0, aReceber: 0, fixo: 0, variavel: 0,
    valeRecebido: 0, valeGasto: 0, porCategoria: [], depositos: 0, retiradas: 0, saldo: 0, livre: 0,
  };
  const porCat = new Map<string, ResumoMes["porCategoria"][number]>();
  for (const l of lancs) {
    if (l.tipo === "receita") {
      r.receitas += l.valor;
      if (l.pago) r.recebido += l.valor;
      else r.aReceber += l.valor;
      if (l.forma === "vale") r.valeRecebido += l.valor;
    } else {
      r.despesas += l.valor;
      if (l.pago) r.pago += l.valor;
      else r.aPagar += l.valor;
      if (l.natureza === "fixo") r.fixo += l.valor;
      else r.variavel += l.valor;
      if (l.forma === "vale") r.valeGasto += l.valor;
      const c = l.categoria_id ? catMap.get(l.categoria_id) : undefined;
      const key = c?.id ?? "sem";
      const atual = porCat.get(key) ?? {
        id: key, nome: c?.nome ?? "Sem categoria", emoji: c?.emoji ?? "❔", cor: c?.cor ?? "#94a3b8",
        natureza: c?.natureza ?? "variavel", total: 0, orcamento: c?.orcamento_mensal ?? null,
      };
      atual.total += l.valor;
      porCat.set(key, atual);
    }
  }
  for (const m of movimentosDoMes) {
    if (m.tipo === "deposito") r.depositos += m.valor;
    else r.retiradas += m.valor;
  }
  r.porCategoria = [...porCat.values()].sort((a, b) => b.total - a.total);
  r.saldo = r.receitas - r.despesas;
  r.livre = r.saldo - r.depositos + r.retiradas;
  return r;
}

export function movimentosDoMes(movs: MovimentoCaixinha[], mes: string) {
  const i = inicioDoMes(mes);
  const f = fimDoMes(mes);
  return movs.filter((m) => m.data >= i && m.data <= f);
}

export async function carregarCartoes(): Promise<Cartao[]> {
  const { data, error } = await db().from("cartoes").select("*").order("nome");
  // antes da migração dos cartões a tabela não existe: segue sem cartões
  if (error) return [];
  return num((data ?? []) as Cartao[], ["limite"]);
}

export interface Fatura {
  cartao: Cartao;
  vencimento: string;
  total: number;
  aPagar: number;
  pago: boolean;
  itens: Lancamento[];
}

/** Agrupa as compras no cartão de um mês (de pagamento) em faturas. */
export function agruparFaturas(lancs: Lancamento[], cartoes: Cartao[]): Fatura[] {
  const porCartao = new Map<string, Fatura>();
  const cartaoMap = new Map(cartoes.map((c) => [c.id, c]));
  for (const l of lancs) {
    if (l.tipo !== "despesa" || !l.cartao_id) continue;
    const cartao = cartaoMap.get(l.cartao_id);
    if (!cartao) continue;
    const f = porCartao.get(cartao.id) ?? { cartao, vencimento: l.data, total: 0, aPagar: 0, pago: true, itens: [] };
    f.total += l.valor;
    if (!l.pago) {
      f.aPagar += l.valor;
      f.pago = false;
    }
    if (l.data < f.vencimento) f.vencimento = l.data;
    f.itens.push(l);
    porCartao.set(cartao.id, f);
  }
  return [...porCartao.values()].sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}
