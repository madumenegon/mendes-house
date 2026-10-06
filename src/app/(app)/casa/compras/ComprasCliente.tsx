"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Check, PackageCheck, Plus, X } from "lucide-react";
import { useAcao } from "@/components/useAcao";
import { Barra, Vazio } from "@/components/ui";
import { NOMES, moeda } from "@/lib/format";
import type { ItemCompra } from "@/lib/types";
import { adicionarCompra, alternarComprado, excluirCompra, finalizarCompras } from "../actions";
import { CATEGORIAS_MERCADO } from "../despensa/DespensaCliente";

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export function ComprasCliente({ itens, sugestoes }: { itens: ItemCompra[]; sugestoes: string[] }) {
  const form = useRef<HTMLFormElement>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const { pendente, erro, rodar } = useAcao();

  const comprados = itens.filter((i) => i.comprado).length;
  const total = itens.reduce((s, i) => s + (i.preco_estimado ?? 0) * i.quantidade, 0);
  const grupos = new Map<string, ItemCompra[]>();
  for (const i of [...itens].sort((a, b) => Number(a.comprado) - Number(b.comprado))) {
    grupos.set(i.categoria, [...(grupos.get(i.categoria) ?? []), i]);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <form
          ref={form}
          action={(fd) => rodar(() => adicionarCompra(fd), () => form.current?.reset())}
          className="card flex flex-wrap items-end gap-2 p-3"
        >
          <div className="min-w-40 flex-[2]">
            <label className="rotulo">Item</label>
            <input name="nome" list="sugestoes" className="campo" placeholder="Ex.: Leite" required autoComplete="off" />
            <datalist id="sugestoes">{sugestoes.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
          <div className="w-20">
            <label className="rotulo">Qtd</label>
            <input name="quantidade" type="number" step="0.01" min="0.01" defaultValue={1} className="campo" />
          </div>
          <div className="min-w-32 flex-1">
            <label className="rotulo">Categoria</label>
            <select name="categoria" className="campo" defaultValue="">
              <option value="">Automática</option>
              {CATEGORIAS_MERCADO.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-28">
            <label className="rotulo">R$ un. (opc.)</label>
            <input name="preco_estimado" inputMode="decimal" className="campo" placeholder="0,00" />
          </div>
          <button className="btn-primario h-[38px]" disabled={pendente}><Plus size={16} /> Adicionar</button>
          {erro && <p className="w-full text-sm text-perigo">{erro}</p>}
        </form>

        {itens.length === 0 ? (
          <Vazio icone="🛒">
            Lista vazia! Adicione itens acima ou envie da{" "}
            <Link href="/casa/despensa" className="font-bold text-casa-principal underline">despensa</Link> o que está acabando.
          </Vazio>
        ) : (
          [...grupos.entries()].map(([cat, lista]) => (
            <section key={cat} className="card p-3 sm:p-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-casa-muted">{cat}</h3>
              <ul className="divide-y divide-casa-line">
                {lista.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-2">
                    <button
                      onClick={() => rodar(() => alternarComprado(i.id, !i.comprado))}
                      className={clsx("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition", i.comprado ? "border-ok bg-ok text-white" : "border-casa-line hover:border-casa-principal")}
                    >
                      {i.comprado && <Check size={15} />}
                    </button>
                    <div className={clsx("min-w-0 flex-1", i.comprado && "text-casa-muted line-through")}>
                      <p className="truncate font-semibold">{i.nome}</p>
                      <p className="text-xs text-casa-muted">
                        {fmt(i.quantidade)} {i.unidade}
                        {i.preco_estimado ? ` · ${moeda(i.preco_estimado * i.quantidade)}` : ""}
                        {i.estoque_id && " · 🥫 despensa"}
                        {i.comprado && i.comprado_por && ` · pego por ${NOMES[i.comprado_por]}`}
                      </p>
                    </div>
                    <button className="btn-fantasma p-1.5" onClick={() => rodar(() => excluirCompra(i.id))} title="Remover"><X size={15} /></button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <aside className="space-y-4">
        <div className="card p-5">
          <p className="rotulo">Progresso da compra</p>
          <p className="font-display text-3xl font-semibold">{comprados}<span className="text-lg text-casa-muted">/{itens.length}</span></p>
          <div className="my-3"><Barra valor={comprados} total={itens.length} cor="#16a34a" alto /></div>
          {total > 0 && <p className="text-sm text-casa-muted">Estimativa: <b className="text-casa-ink">{moeda(total)}</b></p>}
          <button
            className="btn-primario mt-4 w-full"
            disabled={pendente || comprados === 0}
            onClick={() =>
              rodar(async () => {
                const r = await finalizarCompras(true);
                if (!r.erro) setAviso(`Compra finalizada! ${r.atualizados ?? 0} item(ns) atualizados na despensa.`);
                return r;
              })
            }
          >
            <PackageCheck size={16} /> Finalizar e guardar na despensa
          </button>
          <p className="mt-2 text-xs text-casa-muted">Soma os itens marcados ao estoque da despensa (e cadastra os novos) e limpa da lista.</p>
          {aviso && <p className="mt-3 rounded-xl bg-okclaro px-3 py-2 text-sm font-semibold text-ok">{aviso}</p>}
        </div>
        <div className="card p-4 text-sm text-casa-muted">
          💡 Dica: lance o valor gasto no mercado em <Link href="/financas/lancamentos" className="font-bold text-casa-principal underline">Finanças</Link> na categoria Mercado (dá para pagar com o vale!).
        </div>
      </aside>
    </div>
  );
}
