import { exigirMembro } from "@/lib/auth";
import { autoGerarSePreciso, carregarCartoes, carregarCategorias, carregarContasFixas, carregarLancamentos, rendaBase } from "@/lib/dados";
import { hojeISO, mesDe, nomeMes } from "@/lib/datas";
import { Cabecalho, Secao } from "@/components/ui";
import { AbasFinancas, SeletorMes, mesDaUrl } from "../comum";
import { Comparativo } from "../Comparativo";
import { LancamentosCliente } from "../lancamentos/LancamentosCliente";

export default async function RealizadoPage({ searchParams }: PageProps<"/financas/realizado">) {
  const membro = await exigirMembro();
  const mes = mesDaUrl((await searchParams).mes);
  await autoGerarSePreciso(mes, membro);
  const [lancamentos, categorias, cartoes, contas] = await Promise.all([carregarLancamentos(mes), carregarCategorias(), carregarCartoes(), carregarContasFixas()]);
  const ids = new Set(categorias.map((c) => c.id));
  const gasto: Record<string, number> = {};
  let semCategoria = 0;
  for (const l of lancamentos.filter((x) => x.tipo === "despesa")) {
    if (l.categoria_id && ids.has(l.categoria_id)) gasto[l.categoria_id] = (gasto[l.categoria_id] ?? 0) + l.valor;
    else semCategoria += l.valor;
  }
  const hoje = hojeISO();
  return (
    <div>
      <Cabecalho titulo="Finanças" subtitulo="O que de fato entrou e saiu, conta por conta." acao={<SeletorMes mes={mes} base="/financas/realizado" />} />
      <AbasFinancas ativo="/financas/realizado" mes={mes} />
      <div className="space-y-5">
        <Secao titulo={`Como o orçado está sendo realizado em ${nomeMes(mes)}`}>
          <Comparativo categorias={categorias} gasto={gasto} renda={rendaBase(lancamentos, contas)} abrirAte={1} semCategoria={semCategoria} />
        </Secao>
        <Secao titulo="Lançamentos do mês">
          <LancamentosCliente
            lancamentos={lancamentos}
            categorias={categorias}
            cartoes={cartoes}
            membro={membro}
            dataPadrao={mesDe(hoje) === mes ? hoje : `${mes}-01`}
          />
        </Secao>
      </div>
    </div>
  );
}
