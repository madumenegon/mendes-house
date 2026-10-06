"use client";

import { useState } from "react";
import clsx from "clsx";
import { Minus, Plus, ShoppingCart, Trash2, Search } from "lucide-react";
import { Modal } from "@/components/Modal";
import { useAcao } from "@/components/useAcao";
import { Vazio } from "@/components/ui";
import { NOMES } from "@/lib/format";
import type { ItemEstoque } from "@/lib/types";
import { ajustarEstoque, excluirItemEstoque, mandarAcabandoParaLista, mandarParaLista, salvarItemEstoque } from "../actions";

export const CATEGORIAS_MERCADO = [
  "Hortifruti", "Carnes e ovos", "Laticínios", "Padaria", "Grãos e massas", "Enlatados e molhos", "Temperos",
  "Café da manhã", "Bebidas", "Congelados", "Doces e lanches", "Limpeza", "Higiene", "Pets", "Outros",
];
const LOCAIS = ["Despensa", "Geladeira", "Freezer", "Lavanderia", "Banheiro"];
const UNIDADES = ["un", "kg", "g", "L", "ml", "pct", "cx", "lata", "dz"];

function status(i: ItemEstoque) {
  if (i.quantidade <= 0) return { label: "Acabou", cor: "#dc2626", fundo: "#fee2e2" };
  if (i.quantidade <= i.minimo) return { label: "Acabando", cor: "#d97706", fundo: "#fef3c7" };
  return { label: "OK", cor: "#16a34a", fundo: "#dcfce7" };
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export function DespensaCliente({ itens, naLista }: { itens: ItemEstoque[]; naLista: string[] }) {
  const [editar, setEditar] = useState<ItemEstoque | "novo" | null>(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "baixo">("todos");
  const [aviso, setAviso] = useState<string | null>(null);
  const { rodar, pendente } = useAcao();
  const listaSet = new Set(naLista);

  const visiveis = itens.filter(
    (i) => (filtro === "todos" || i.quantidade <= i.minimo) && i.nome.toLowerCase().includes(busca.toLowerCase())
  );
  const grupos = new Map<string, ItemEstoque[]>();
  for (const i of visiveis) grupos.set(i.categoria, [...(grupos.get(i.categoria) ?? []), i]);
  const baixos = itens.filter((i) => i.quantidade <= i.minimo && !listaSet.has(i.id)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-casa-muted" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar item…" className="campo pl-9" />
        </div>
        <div className="flex rounded-xl bg-white p-0.5 ring-1 ring-casa-line">
          {(["todos", "baixo"] as const).map((f) => (
            <button key={f} onClick={() => setFiltro(f)} className={clsx("rounded-lg px-3 py-1.5 text-xs font-bold", filtro === f ? "bg-casa-verde text-white" : "text-casa-muted")}>
              {f === "todos" ? "Todos" : "Acabando"}
            </button>
          ))}
        </div>
        <button
          className="btn-secundario"
          disabled={pendente || baixos === 0}
          onClick={() =>
            rodar(async () => {
              const r = await mandarAcabandoParaLista();
              if (!r.erro) setAviso(`${r.adicionados ?? 0} item(ns) enviados para a lista de compras.`);
              return r;
            })
          }
        >
          <ShoppingCart size={15} /> Acabando → lista {baixos > 0 && `(${baixos})`}
        </button>
        <button className="btn-primario" onClick={() => setEditar("novo")}><Plus size={16} /> Item</button>
      </div>
      {aviso && <p className="rounded-xl bg-okclaro px-3 py-2 text-sm font-semibold text-ok">{aviso}</p>}

      {itens.length === 0 ? (
        <Vazio icone="🥫">Cadastre o que vocês costumam ter em casa e o mínimo de cada item — o app avisa quando estiver acabando.</Vazio>
      ) : (
        <div className="space-y-5">
          {[...grupos.entries()].map(([cat, lista]) => (
            <section key={cat}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-casa-muted">{cat}</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {lista.map((i) => {
                  const s = status(i);
                  return (
                    <div key={i.id} className="card flex items-center gap-3 p-3" style={{ borderLeft: `4px solid ${s.cor}` }}>
                      <button className="min-w-0 flex-1 text-left" onClick={() => setEditar(i)}>
                        <p className="truncate font-bold">{i.nome}</p>
                        <p className="flex flex-wrap items-center gap-1 text-xs text-casa-muted">
                          <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: s.fundo, color: s.cor }}>{s.label}</span>
                          {i.local} · mín. {fmt(i.minimo)} {i.unidade}
                          {listaSet.has(i.id) && <span className="text-casa-verde">· 🛒 na lista</span>}
                        </p>
                      </button>
                      <div className="flex items-center gap-1">
                        <button className="btn-secundario h-8 w-8 p-0" disabled={pendente || i.quantidade <= 0} onClick={() => rodar(() => ajustarEstoque(i.id, -1))}><Minus size={14} /></button>
                        <span className="w-12 text-center font-display text-lg font-semibold tabular-nums">
                          {fmt(i.quantidade)}<span className="block text-[10px] font-sans font-semibold text-casa-muted">{i.unidade}</span>
                        </span>
                        <button className="btn-secundario h-8 w-8 p-0" disabled={pendente} onClick={() => rodar(() => ajustarEstoque(i.id, 1))}><Plus size={14} /></button>
                        {!listaSet.has(i.id) && (
                          <button className="btn-fantasma h-8 w-8 p-0" title="Adicionar à lista de compras" disabled={pendente} onClick={() => rodar(() => mandarParaLista([i.id]))}>
                            <ShoppingCart size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal aberto={editar !== null} onFechar={() => setEditar(null)} titulo={editar === "novo" ? "Novo item na despensa" : "Editar item"}>
        {editar !== null && <FormItem item={editar === "novo" ? null : editar} onFechar={() => setEditar(null)} />}
      </Modal>
    </div>
  );
}

function FormItem({ item, onFechar }: { item: ItemEstoque | null; onFechar: () => void }) {
  const { pendente, erro, rodar } = useAcao();
  return (
    <form action={(fd) => rodar(() => salvarItemEstoque(fd), onFechar)} className="space-y-4">
      {item && <input type="hidden" name="id" value={item.id} />}
      <div>
        <label className="rotulo">Item</label>
        <input name="nome" defaultValue={item?.nome} className="campo" required placeholder="Ex.: Arroz" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo">Categoria</label>
          <select name="categoria" defaultValue={item?.categoria ?? "Outros"} className="campo">
            {CATEGORIAS_MERCADO.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="rotulo">Onde fica</label>
          <select name="local" defaultValue={item?.local ?? "Despensa"} className="campo">
            {LOCAIS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="rotulo">Quantidade atual</label>
          <input name="quantidade" type="number" step="0.01" min={0} defaultValue={item?.quantidade ?? 1} className="campo" />
        </div>
        <div>
          <label className="rotulo">Unidade</label>
          <select name="unidade" defaultValue={item?.unidade ?? "un"} className="campo">
            {UNIDADES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="rotulo">Avisar quando tiver só (mínimo)</label>
          <input name="minimo" type="number" step="0.01" min={0} defaultValue={item?.minimo ?? 1} className="campo" />
        </div>
      </div>
      {item?.updated_by && (
        <p className="text-xs text-casa-muted">Última atualização por {NOMES[item.updated_by]} em {new Date(item.updated_at).toLocaleString("pt-BR")}</p>
      )}
      {erro && <p className="rounded-xl bg-perigoclaro px-3 py-2 text-sm text-perigo">{erro}</p>}
      <div className="flex justify-between gap-2">
        {item ? (
          <button type="button" className="btn-perigo" disabled={pendente} onClick={() => confirm(`Excluir "${item.nome}"?`) && rodar(() => excluirItemEstoque(item.id), onFechar)}>
            <Trash2 size={15} /> Excluir
          </button>
        ) : <span />}
        <button className="btn-primario" disabled={pendente}>{pendente ? "Salvando…" : "Salvar"}</button>
      </div>
    </form>
  );
}
