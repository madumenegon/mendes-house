import { exigirMembro } from "@/lib/auth";
import { autoGerarSePreciso, carregarCategorias, carregarLancamentos } from "@/lib/dados";
import { hojeISO, mesDe } from "@/lib/datas";
import { Cabecalho } from "@/components/ui";
import { AbasFinancas, SeletorMes, mesDaUrl } from "../comum";
import { LancamentosCliente } from "./LancamentosCliente";

export default async function LancamentosPage({ searchParams }: PageProps<"/financas/lancamentos">) {
  const membro = await exigirMembro();
  const mes = mesDaUrl((await searchParams).mes);
  await autoGerarSePreciso(mes, membro);
  const [lancamentos, categorias] = await Promise.all([carregarLancamentos(mes), carregarCategorias()]);
  const hoje = hojeISO();
  return (
    <div>
      <Cabecalho titulo="Finanças" subtitulo="Tudo o que entrou e saiu no mês." acao={<SeletorMes mes={mes} base="/financas/lancamentos" />} />
      <AbasFinancas ativo="/financas/lancamentos" mes={mes} />
      <LancamentosCliente
        lancamentos={lancamentos}
        categorias={categorias}
        membro={membro}
        dataPadrao={mesDe(hoje) === mes ? hoje : `${mes}-01`}
      />
    </div>
  );
}
