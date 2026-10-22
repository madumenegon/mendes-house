import { exigirMembro } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { autoGerarSePreciso, carregarCartoes, carregarCategorias } from "@/lib/dados";
import { hojeISO, mesDe } from "@/lib/datas";
import type { Lancamento } from "@/lib/types";
import { Cabecalho } from "@/components/ui";
import { AbasFinancas, SeletorMes, mesDaUrl } from "../comum";
import { ValeCliente, type Carteira } from "./ValeCliente";

export default async function ValePage({ searchParams }: PageProps<"/financas/vale">) {
  const membro = await exigirMembro();
  const mes = mesDaUrl((await searchParams).mes);
  await autoGerarSePreciso(mes, membro);
  const [categorias, cartoes, { data }] = await Promise.all([
    carregarCategorias(),
    carregarCartoes(),
    // todo o histórico do vale (é pouco) para calcular o saldo acumulado de cada carteira
    db().from("lancamentos").select("*").eq("forma", "vale").order("data"),
  ]);
  const vales = ((data ?? []) as Lancamento[]).map((l) => ({ ...l, valor: Number(l.valor) }));

  // carteira = categoria de receita do vale (Vale alimentação, Vale automobilístico…)
  const carteiraDe = (l: Lancamento) => (l.tipo === "receita" ? l.categoria_id : l.vale_categoria_id ?? null) ?? "sem";
  const catMap = new Map(categorias.map((c) => [c.id, c]));
  const ids = new Set<string>([
    ...categorias.filter((c) => c.tipo === "receita" && /vale/i.test(c.nome)).map((c) => c.id),
    ...vales.map(carteiraDe),
  ]);
  const carteiras: Carteira[] = [...ids].map((id) => {
    const c = catMap.get(id);
    const daCarteira = vales.filter((l) => carteiraDe(l) === id);
    const soma = (ls: Lancamento[], tipo: "receita" | "despesa") => ls.filter((l) => l.tipo === tipo).reduce((s, l) => s + l.valor, 0);
    const doMes = daCarteira.filter((l) => l.competencia === mes);
    const ateOMes = daCarteira.filter((l) => l.competencia <= mes);
    return {
      id,
      // categoria genérica (ex.: "Outras receitas"): mostra o nome do lançamento (ex.: "Automobilistico")
      nome: c && /vale/i.test(c.nome) ? c.nome : [...new Set(daCarteira.filter((l) => l.tipo === "receita").map((l) => l.descricao))].join(" / ") || c?.nome || "Vale (sem carteira definida)",
      emoji: c?.emoji ?? "🎫",
      cor: c?.cor ?? "#94a3b8",
      recebidoMes: soma(doMes, "receita"),
      gastoMes: soma(doMes, "despesa"),
      saldoAcumulado: soma(ateOMes, "receita") - soma(ateOMes, "despesa"),
    };
  }).filter((c) => c.id !== "sem" || c.recebidoMes || c.gastoMes || c.saldoAcumulado)
    .sort((a, b) => b.recebidoMes - a.recebidoMes);

  const hoje = hojeISO();
  return (
    <div>
      <Cabecalho titulo="Finanças" subtitulo="O vale tem vida própria: aqui ele é controlado à parte das contas gerais." acao={<SeletorMes mes={mes} base="/financas/vale" />} />
      <AbasFinancas ativo="/financas/vale" mes={mes} />
      <ValeCliente
        mes={mes}
        carteiras={carteiras}
        lancamentos={vales.filter((l) => l.competencia === mes)}
        categorias={categorias}
        cartoes={cartoes}
        membro={membro}
        dataPadrao={mesDe(hoje) === mes ? hoje : `${mes}-01`}
      />
    </div>
  );
}
