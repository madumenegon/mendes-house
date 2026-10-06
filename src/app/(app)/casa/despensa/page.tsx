import { db } from "@/lib/supabase";
import type { ItemEstoque } from "@/lib/types";
import { Abas, Cabecalho, StatTile } from "@/components/ui";
import { ABAS_CASA } from "../abas";
import { DespensaCliente } from "./DespensaCliente";

export default async function DespensaPage() {
  const supa = db();
  const [{ data }, { data: naLista }] = await Promise.all([
    supa.from("estoque").select("*").order("categoria").order("nome"),
    supa.from("compras").select("estoque_id").eq("comprado", false).not("estoque_id", "is", null),
  ]);
  const itens = ((data ?? []) as ItemEstoque[]).map((i) => ({ ...i, quantidade: Number(i.quantidade), minimo: Number(i.minimo) }));
  const acabou = itens.filter((i) => i.quantidade <= 0).length;
  const acabando = itens.filter((i) => i.quantidade > 0 && i.quantidade <= i.minimo).length;

  return (
    <div>
      <Cabecalho titulo="Casa" subtitulo="O que temos em casa e o que está acabando." />
      <Abas itens={ABAS_CASA} ativo="/casa/despensa" />
      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatTile rotulo="Itens" valor={itens.length} icone="🥫" cor="#b5573a" />
        <StatTile rotulo="Acabando" valor={acabando} icone="⚠️" cor="#d97706" />
        <StatTile rotulo="Acabou" valor={acabou} icone="🚫" cor="#dc2626" />
      </div>
      <DespensaCliente itens={itens} naLista={(naLista ?? []).map((c) => c.estoque_id as string)} />
    </div>
  );
}
