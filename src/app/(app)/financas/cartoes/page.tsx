import { agruparFaturas, carregarCartoes, carregarCategorias, carregarFamilia, carregarLancamentos } from "@/lib/dados";
import { inicioDoMes, mesDe, somarMeses } from "@/lib/datas";
import { Cabecalho } from "@/components/ui";
import { AbasFinancas, SeletorMes, mesDaUrl } from "../comum";
import { CartoesCliente } from "./CartoesCliente";

export default async function CartoesPage({ searchParams }: PageProps<"/financas/cartoes">) {
  const mes = mesDaUrl((await searchParams).mes);
  const proximo = mesDe(somarMeses(inicioDoMes(mes), 1));
  const [cartoes, familia, lancs, categorias] = await Promise.all([
    carregarCartoes(), carregarFamilia(), carregarLancamentos(mes, proximo), carregarCategorias(),
  ]);
  return (
    <div>
      <Cabecalho titulo="Finanças" subtitulo="Cartões, faturas e o nosso ciclo do mês." acao={<SeletorMes mes={mes} base="/financas/cartoes" />} />
      <AbasFinancas ativo="/financas/cartoes" mes={mes} />
      <CartoesCliente
        mes={mes}
        proximo={proximo}
        cartoes={cartoes}
        faturasMes={agruparFaturas(lancs.filter((l) => l.competencia === mes), cartoes)}
        faturasProximo={agruparFaturas(lancs.filter((l) => l.competencia === proximo), cartoes)}
        categorias={categorias}
        diaSalario={familia.dia_salario}
        diaContas={familia.dia_contas}
      />
    </div>
  );
}
