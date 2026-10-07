import { exigirMembro } from "@/lib/auth";
import { autoGerarSePreciso, carregarCartoes, carregarCategorias, carregarLancamentos } from "@/lib/dados";
import { hojeISO, mesDe } from "@/lib/datas";
import { Cabecalho } from "@/components/ui";
import { AbasFinancas, SeletorMes, mesDaUrl } from "../comum";
import { LancamentosCliente } from "./LancamentosCliente";

export default async function LancamentosPage({ searchParams }: PageProps<"/financas/lancamentos">) {
  const membro = await exigirMembro();
  const mes = mesDaUrl((await searchParams).mes);
  await autoGerarSePreciso(mes, membro);
  const [lancamentos, categorias, cartoes] = await Promise.all([carregarLancamentos(mes), carregarCategorias(), carregarCartoes()]);
  const hoje = hojeISO();
  return (
    <div>
      <Cabecalho titulo="Finanças" subtitulo="Tudo o que entrou e saiu no mês." acao={<SeletorMes mes={mes} base="/financas/lancamentos" />} />
      <AbasFinancas ativo="/financas/lancamentos" mes={mes} />
      <LancamentosCliente
        lancamentos={lancamentos}
        categorias={categorias}
        cartoes={cartoes}
        membro={membro}
        dataPadrao={mesDe(hoje) === mes ? hoje : `${mes}-01`}
      />
    </div>
  );
}
