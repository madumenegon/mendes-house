"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Din } from "@/components/Privacidade";
import { Barra, DonoBadge, Secao, StatTile, Vazio } from "@/components/ui";
import { dataCurta, nomeMes } from "@/lib/datas";
import { pct } from "@/lib/format";
import type { Cartao, Categoria, Lancamento, MembroId } from "@/lib/types";
import { FormLancamento } from "../lancamentos/LancamentosCliente";
import { BotaoPago } from "../BotaoPago";

export interface Carteira {
  id: string;
  nome: string;
  emoji: string;
  cor: string;
  recebidoMes: number;
  gastoMes: number;
  saldoAcumulado: number;
}

interface Props {
  mes: string;
  carteiras: Carteira[];
  lancamentos: Lancamento[];
  categorias: Categoria[];
  cartoes: Cartao[];
  membro: MembroId;
  dataPadrao: string;
}

export function ValeCliente(p: Props) {
  const [editar, setEditar] = useState<Lancamento | "receita" | "despesa" | null>(null);
  const catMap = new Map(p.categorias.map((c) => [c.id, c]));
  const recebido = p.carteiras.reduce((s, c) => s + c.recebidoMes, 0);
  const gasto = p.carteiras.reduce((s, c) => s + c.gastoMes, 0);
  const acumulado = p.carteiras.reduce((s, c) => s + c.saldoAcumulado, 0);

  // gastos do vale por categoria (mercado, alimentação fora, combustível…)
  const porCat = new Map<string, { nome: string; emoji: string; cor: string; total: number }>();
  for (const l of p.lancamentos.filter((x) => x.tipo === "despesa")) {
    const c = l.categoria_id ? catMap.get(l.categoria_id) : null;
    const k = c?.id ?? "sem";
    const atual = porCat.get(k) ?? { nome: c?.nome ?? "Sem categoria", emoji: c?.emoji ?? "💸", cor: c?.cor ?? "#94a3b8", total: 0 };
    atual.total += l.valor;
    porCat.set(k, atual);
  }
  const cats = [...porCat.values()].sort((a, b) => b.total - a.total);
  const ordenados = [...p.lancamentos].sort((a, b) => (b.data_compra ?? b.data).localeCompare(a.data_compra ?? a.data));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile rotulo={`Recebido em ${nomeMes(p.mes)}`} valor={<Din v={recebido} />} icone="🎫" cor="#16a34a" />
        <StatTile rotulo="Gasto no mês" valor={<Din v={gasto} />} icone="🛒" cor="#e8508a" detalhe={recebido > 0 ? `${pct(gasto, recebido)}% do que entrou` : undefined} />
        <StatTile rotulo="Saldo nos vales" valor={<Din v={acumulado} />} icone="💳" cor="#65a30d" destaque detalhe="acumulado até este mês" />
      </div>

      <Secao
        titulo="Carteiras"
        acao={
          <div className="flex gap-2">
            <button className="btn-secundario" onClick={() => setEditar("receita")}><Plus size={15} /> Entrada</button>
            <button className="btn-primario" onClick={() => setEditar("despesa")}><Plus size={15} /> Gasto no vale</button>
          </div>
        }
      >
        {p.carteiras.length === 0 ? (
          <Vazio icone="🎫">Cadastre os vales em Contas fixas como receita com a forma “Vale”.</Vazio>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {p.carteiras.map((c) => (
              <div key={c.id} className="rounded-2xl border border-casa-line p-4" style={{ background: `linear-gradient(135deg, ${c.cor}1a, #fff 70%)` }}>
                <p className="flex items-center gap-2 font-bold"><span className="text-xl">{c.emoji}</span>{c.nome}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><p className="text-[11px] font-bold uppercase text-casa-muted">Entrou</p><p className="font-semibold tabular-nums"><Din v={c.recebidoMes} /></p></div>
                  <div><p className="text-[11px] font-bold uppercase text-casa-muted">Gasto</p><p className="font-semibold tabular-nums"><Din v={c.gastoMes} /></p></div>
                </div>
                <div className="mt-2"><Barra valor={c.gastoMes} total={Math.max(c.recebidoMes, c.gastoMes, 1)} cor={c.gastoMes > c.recebidoMes ? "#dc2626" : c.cor} /></div>
                <p className="mt-2 text-xs text-casa-muted">
                  Saldo acumulado: <b className={c.saldoAcumulado < 0 ? "text-perigo" : "text-ok"}><Din v={c.saldoAcumulado} /></b>
                </p>
              </div>
            ))}
          </div>
        )}
      </Secao>

      <div className="grid gap-5 lg:grid-cols-5">
        <Secao titulo="Com o que usamos o vale" className="lg:col-span-2">
          {cats.length === 0 ? (
            <p className="text-sm text-casa-muted">Nenhum gasto com vale neste mês.</p>
          ) : (
            <ul className="space-y-2.5">
              {cats.map((c) => (
                <li key={c.nome}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold">{c.emoji} {c.nome}</span>
                    <span className="tabular-nums"><b><Din v={c.total} /></b> <span className="text-casa-muted">· {pct(c.total, gasto)}%</span></span>
                  </div>
                  <Barra valor={c.total} total={cats[0].total} cor={c.cor} />
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <Secao titulo={`Movimentos do vale (${p.lancamentos.length})`} className="lg:col-span-3">
          {ordenados.length === 0 ? (
            <Vazio icone="🎫">Nada lançado com vale em {nomeMes(p.mes)}.</Vazio>
          ) : (
            <ul className="divide-y divide-casa-line">
              {ordenados.map((l) => {
                const c = l.categoria_id ? catMap.get(l.categoria_id) : null;
                const carteira = l.tipo === "despesa" && l.vale_categoria_id ? catMap.get(l.vale_categoria_id) : null;
                return (
                  <li key={l.id} onClick={() => setEditar(l)} className="flex cursor-pointer items-center gap-3 py-2 hover:bg-casa-bg/50">
                    <span className="w-11 shrink-0 text-xs tabular-nums text-casa-muted">{dataCurta(l.data_compra ?? l.data)}</span>
                    <span className="text-lg">{c?.emoji ?? "💸"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{l.descricao}</p>
                      <p className="flex flex-wrap items-center gap-1.5 text-xs text-casa-muted">
                        {c?.nome ?? "Sem categoria"}
                        {carteira && <span>· {carteira.emoji} {carteira.nome}</span>}
                        <DonoBadge dono={l.pessoa} pequeno />
                      </p>
                    </div>
                    <span className={`font-bold tabular-nums ${l.tipo === "receita" ? "text-ok" : ""}`}>
                      {l.tipo === "receita" ? "+" : "−"}<Din v={l.valor} />
                    </span>
                    <BotaoPago id={l.id} pago={l.pago} tipo={l.tipo} compacto />
                  </li>
                );
              })}
            </ul>
          )}
        </Secao>
      </div>

      <Modal
        aberto={editar !== null}
        onFechar={() => setEditar(null)}
        titulo={editar === "receita" ? "Entrada de vale" : editar === "despesa" ? "Gasto com vale" : "Editar lançamento"}
      >
        {editar !== null && (
          <FormLancamento
            lancamento={typeof editar === "string" ? null : editar}
            tipoInicial={typeof editar === "string" ? editar : editar.tipo}
            formaInicial="vale"
            categorias={p.categorias}
            cartoes={p.cartoes}
            membro={p.membro}
            dataPadrao={p.dataPadrao}
            onFechar={() => setEditar(null)}
          />
        )}
      </Modal>
    </div>
  );
}
