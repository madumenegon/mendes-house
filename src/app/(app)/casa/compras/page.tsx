import { db } from "@/lib/supabase";
import type { ItemCompra } from "@/lib/types";
import { Abas, Cabecalho } from "@/components/ui";
import { ABAS_CASA } from "../abas";
import { ComprasCliente } from "./ComprasCliente";

export default async function ComprasPage() {
  const supa = db();
  const [{ data }, { data: estoque }] = await Promise.all([
    supa.from("compras").select("*").order("categoria").order("created_at"),
    supa.from("estoque").select("nome").order("nome"),
  ]);
  const itens = ((data ?? []) as ItemCompra[]).map((i) => ({
    ...i, quantidade: Number(i.quantidade), preco_estimado: i.preco_estimado === null ? null : Number(i.preco_estimado),
  }));
  return (
    <div>
      <Cabecalho titulo="Casa" subtitulo="A lista de compras da semana — os dois veem e marcam ao mesmo tempo." />
      <Abas itens={ABAS_CASA} ativo="/casa/compras" />
      <ComprasCliente itens={itens} sugestoes={(estoque ?? []).map((e) => e.nome as string)} />
    </div>
  );
}
