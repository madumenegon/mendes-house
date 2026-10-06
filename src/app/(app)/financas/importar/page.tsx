import { carregarCategorias, carregarLancamentos } from "@/lib/dados";
import { hojeISO, inicioDoMes, mesDe, somarMeses } from "@/lib/datas";
import { Cabecalho } from "@/components/ui";
import { AbasFinancas, mesDaUrl } from "../comum";
import { ImportarCliente } from "./ImportarCliente";

export default async function ImportarPage({ searchParams }: PageProps<"/financas/importar">) {
  const mes = mesDaUrl((await searchParams).mes);
  const atual = mesDe(hojeISO());
  const [categorias, historico] = await Promise.all([
    carregarCategorias(),
    carregarLancamentos(mesDe(somarMeses(inicioDoMes(atual), -12)), mesDe(somarMeses(inicioDoMes(atual), 1))),
  ]);
  return (
    <div>
      <Cabecalho titulo="Finanças" subtitulo="Envie o PDF do extrato ou da fatura e o app transforma em lançamentos." />
      <AbasFinancas ativo="/financas/importar" mes={mes} />
      <ImportarCliente
        categorias={categorias}
        historico={historico.map((l) => ({ data: l.data, valor: l.valor, tipo: l.tipo, descricao: l.descricao, categoria_id: l.categoria_id }))}
        temIA={!!process.env.ANTHROPIC_API_KEY}
      />
    </div>
  );
}
