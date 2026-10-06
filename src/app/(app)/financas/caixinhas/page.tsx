import { carregarCaixinhas, saldoCaixinha } from "@/lib/dados";
import { hojeISO } from "@/lib/datas";
import { moeda } from "@/lib/format";
import { Cabecalho, StatTile } from "@/components/ui";
import { AbasFinancas, mesDaUrl } from "../comum";
import { CaixinhasCliente } from "./CaixinhasCliente";

export default async function CaixinhasPage({ searchParams }: PageProps<"/financas/caixinhas">) {
  const mes = mesDaUrl((await searchParams).mes);
  const { caixinhas, movimentos } = await carregarCaixinhas();
  const saldos = Object.fromEntries(caixinhas.map((c) => [c.id, saldoCaixinha(c.id, movimentos)]));
  const ativas = caixinhas.filter((c) => !c.arquivada);
  const total = ativas.reduce((s, c) => s + saldos[c.id], 0);
  const metas = ativas.reduce((s, c) => s + (c.meta ?? 0), 0);
  const aportes = ativas.reduce((s, c) => s + (c.aporte_mensal ?? 0), 0);
  return (
    <div>
      <Cabecalho titulo="Finanças" subtitulo="Nossas reservas: emergência, viagem e tudo o que estamos sonhando." />
      <AbasFinancas ativo="/financas/caixinhas" mes={mes} />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatTile rotulo="Total guardado" valor={moeda(total)} icone="🐷" cor="#10b981" destaque />
        <StatTile rotulo="Soma das metas" valor={moeda(metas)} icone="🎯" cor="#0ea5e9" detalhe={metas ? `${Math.round((total / metas) * 100)}% alcançado` : undefined} />
        <StatTile rotulo="Aporte planejado" valor={moeda(aportes)} icone="📅" cor="#8b55c9" detalhe="por mês" />
      </div>
      <CaixinhasCliente caixinhas={caixinhas} movimentos={movimentos} saldos={saldos} hoje={hojeISO()} />
    </div>
  );
}
