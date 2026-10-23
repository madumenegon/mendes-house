import { carregarCategorias, carregarContasFixas, carregarLancamentos, ehVale, rendaBase } from "@/lib/dados";
import { Cabecalho } from "@/components/ui";
import { AbasFinancas, mesDaUrl } from "../comum";
import { OrcamentoCliente } from "./OrcamentoCliente";

export default async function OrcamentoPage({ searchParams }: PageProps<"/financas/orcamento">) {
  const mes = mesDaUrl((await searchParams).mes);
  const [categorias, lancs, contas] = await Promise.all([carregarCategorias(), carregarLancamentos(mes), carregarContasFixas()]);
  // gastos gerais: sem o que foi pago com vale (o vale tem controle próprio)
  const gasto: Record<string, number> = {};
  for (const l of lancs) if (l.tipo === "despesa" && !ehVale(l) && l.categoria_id) gasto[l.categoria_id] = (gasto[l.categoria_id] ?? 0) + l.valor;

  return (
    <div>
      <Cabecalho titulo="Finanças" subtitulo="Dar um destino a cada real antes que ele vá embora sozinho." />
      <AbasFinancas ativo="/financas/orcamento" mes={mes} />
      <OrcamentoCliente mes={mes} categorias={categorias} gasto={gasto} renda={rendaBase(lancs, contas)} />
    </div>
  );
}
