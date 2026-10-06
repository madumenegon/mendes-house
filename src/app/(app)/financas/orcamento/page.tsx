import { carregarCaixinhas, carregarCategorias, carregarContasFixas, carregarLancamentos } from "@/lib/dados";
import { Cabecalho } from "@/components/ui";
import { AbasFinancas, mesDaUrl } from "../comum";
import { OrcamentoCliente } from "./OrcamentoCliente";

export default async function OrcamentoPage({ searchParams }: PageProps<"/financas/orcamento">) {
  const mes = mesDaUrl((await searchParams).mes);
  const [categorias, lancs, { caixinhas }, contas] = await Promise.all([
    carregarCategorias(), carregarLancamentos(mes), carregarCaixinhas(), carregarContasFixas(),
  ]);
  const gasto: Record<string, number> = {};
  for (const l of lancs) if (l.tipo === "despesa" && l.categoria_id) gasto[l.categoria_id] = (gasto[l.categoria_id] ?? 0) + l.valor;
  const receitasMes = lancs.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valor, 0);
  const receitasFixas = contas.filter((c) => c.ativa && c.tipo === "receita").reduce((s, c) => s + c.valor, 0);

  return (
    <div>
      <Cabecalho titulo="Finanças" subtitulo="Dar um destino a cada real antes que ele vá embora sozinho." />
      <AbasFinancas ativo="/financas/orcamento" mes={mes} />
      <OrcamentoCliente
        mes={mes}
        categorias={categorias}
        gasto={gasto}
        renda={Math.max(receitasMes, receitasFixas)}
        caixinhas={caixinhas.filter((c) => !c.arquivada)}
      />
    </div>
  );
}
