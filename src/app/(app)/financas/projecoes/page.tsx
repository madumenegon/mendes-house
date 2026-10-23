import { exigirMembro } from "@/lib/auth";
import { autoGerarSePreciso, carregarCartoes, carregarCategorias, carregarContasFixas, carregarLancamentos } from "@/lib/dados";
import { hojeISO, inicioDoMes, mesDe, somarMeses, ultimoDiaDoMes } from "@/lib/datas";
import { Cabecalho } from "@/components/ui";
import { AbasFinancas, mesDaUrl } from "../comum";
import { ProjecoesCliente, type ItemProjecao } from "./ProjecoesCliente";

const HORIZONTES = [3, 6, 12];

export default async function ProjecoesPage({ searchParams }: PageProps<"/financas/projecoes">) {
  const sp = await searchParams;
  const membro = await exigirMembro();
  const mes = mesDaUrl(sp.mes);
  const n = HORIZONTES.includes(Number(sp.meses)) ? Number(sp.meses) : 6;
  const meses = Array.from({ length: n }, (_, i) => mesDe(somarMeses(inicioDoMes(mes), i)));
  // mês atual e o próximo já têm as contas fixas lançadas de verdade
  for (const m of meses.slice(0, 2)) await autoGerarSePreciso(m, membro);

  const [lancs, contas, categorias, cartoes] = await Promise.all([
    carregarLancamentos(meses[0], meses[meses.length - 1]), carregarContasFixas(), carregarCategorias(), carregarCartoes(),
  ]);
  const catMap = new Map(categorias.map((c) => [c.id, c]));
  const cartaoMap = new Map(cartoes.map((c) => [c.id, c]));
  const proximo = mesDe(somarMeses(inicioDoMes(mesDe(hojeISO())), 1));

  const itens: ItemProjecao[] = lancs.map((l) => {
    const c = l.categoria_id ? catMap.get(l.categoria_id) : null;
    return {
      id: l.id, mes: l.competencia, data: l.data, descricao: l.descricao, valor: l.valor, tipo: l.tipo, pago: l.pago, previsto: false,
      grupo: l.tipo === "receita" ? "receita" : l.cartao_id ? "cartao" : l.conta_fixa_id || l.natureza === "fixo" ? "fixa" : "outra",
      emoji: c?.emoji ?? (l.tipo === "receita" ? "💰" : "💸"), categoria: c?.nome ?? "Sem categoria",
      cartao: l.cartao_id ? cartaoMap.get(l.cartao_id)?.nome ?? "Cartão" : null, forma: l.forma,
    };
  });
  // contas fixas ainda não lançadas nos meses mais à frente entram como previsão
  for (const m of meses.filter((x) => x > proximo)) {
    const ja = new Set(lancs.filter((l) => l.competencia === m && l.conta_fixa_id).map((l) => l.conta_fixa_id));
    const [a, mm] = m.split("-").map(Number);
    for (const cf of contas.filter((x) => x.ativa && !ja.has(x.id))) {
      const c = cf.categoria_id ? catMap.get(cf.categoria_id) : null;
      itens.push({
        id: `prev-${cf.id}-${m}`, mes: m, data: `${m}-${String(Math.min(cf.dia, ultimoDiaDoMes(a, mm))).padStart(2, "0")}`,
        descricao: cf.descricao, valor: cf.valor, tipo: cf.tipo, pago: false, previsto: true,
        grupo: cf.tipo === "receita" ? "receita" : "fixa",
        emoji: c?.emoji ?? (cf.tipo === "receita" ? "💰" : "📌"), categoria: c?.nome ?? "Conta fixa", cartao: null, forma: cf.forma,
      });
    }
  }
  itens.sort((x, y) => x.data.localeCompare(y.data));

  return (
    <div>
      <Cabecalho titulo="Finanças" subtitulo="O que já está combinado para os próximos meses: contas fixas, parcelas e lançamentos futuros." />
      <AbasFinancas ativo="/financas/projecoes" mes={mes} />
      <ProjecoesCliente mes={mes} meses={meses} horizonte={n} itens={itens} />
    </div>
  );
}
