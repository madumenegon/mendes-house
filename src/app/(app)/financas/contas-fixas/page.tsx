import { carregarCategorias, carregarContasFixas } from "@/lib/dados";
import { moeda } from "@/lib/format";
import { Cabecalho, StatTile } from "@/components/ui";
import { AbasFinancas, mesDaUrl } from "../comum";
import { ContasFixasCliente } from "./ContasFixasCliente";

export default async function ContasFixasPage({ searchParams }: PageProps<"/financas/contas-fixas">) {
  const mes = mesDaUrl((await searchParams).mes);
  const [contas, categorias] = await Promise.all([carregarContasFixas(), carregarCategorias()]);
  const ativas = contas.filter((c) => c.ativa);
  const entradas = ativas.filter((c) => c.tipo === "receita").reduce((s, c) => s + c.valor, 0);
  const saidas = ativas.filter((c) => c.tipo === "despesa").reduce((s, c) => s + c.valor, 0);
  return (
    <div>
      <Cabecalho titulo="Finanças" subtitulo="Salários, vales e contas que se repetem todo mês — o app lança sozinho a cada mês." />
      <AbasFinancas ativo="/financas/contas-fixas" mes={mes} />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatTile rotulo="Entradas fixas" valor={moeda(entradas)} icone="💼" cor="#16a34a" />
        <StatTile rotulo="Custo fixo mensal" valor={moeda(saidas)} icone="📌" cor="#6366f1" />
        <StatTile rotulo="Sobra prevista" valor={moeda(entradas - saidas)} icone="✨" cor={entradas - saidas >= 0 ? "#e0601a" : "#dc2626"} detalhe="antes dos gastos variáveis" />
      </div>
      <ContasFixasCliente contas={contas} categorias={categorias} mes={mes} />
    </div>
  );
}
