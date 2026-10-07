"use client";

import { useState } from "react";
import clsx from "clsx";
import { ChevronDown, CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { SeletorCor, Segmentos } from "@/components/Escolhas";
import { useAcao } from "@/components/useAcao";
import { DonoBadge, Secao, Vazio } from "@/components/ui";
import { CORES, moeda } from "@/lib/format";
import { dataCurta, nomeMes } from "@/lib/datas";
import type { Cartao, Categoria, Pessoa } from "@/lib/types";
import type { Fatura } from "@/lib/dados";
import { excluirCartao, salvarCartao, salvarCiclo } from "../actions";
import { BotaoPagarFatura } from "../BotaoPago";

interface Props {
  mes: string;
  proximo: string;
  cartoes: Cartao[];
  faturasMes: Fatura[];
  faturasProximo: Fatura[];
  categorias: Categoria[];
  diaSalario: number;
  diaContas: number;
}

export function CartoesCliente(p: Props) {
  const [editar, setEditar] = useState<Cartao | "novo" | null>(null);
  const totalMes = p.faturasMes.reduce((s, f) => s + f.total, 0);
  const totalProximo = p.faturasProximo.reduce((s, f) => s + f.total, 0);

  return (
    <div className="space-y-5">
      <Ciclo diaSalario={p.diaSalario} diaContas={p.diaContas} />

      <Secao
        titulo={`Faturas de ${nomeMes(p.mes)}`}
        acao={<span className="text-sm text-casa-muted">Total <b className="text-casa-ink">{moeda(totalMes)}</b></span>}
      >
        {p.cartoes.length === 0 ? (
          <Vazio icone="💳">Cadastre os cartões abaixo. As compras no crédito vão sozinhas para a fatura do mês em que vocês pagam.</Vazio>
        ) : p.faturasMes.length === 0 ? (
          <p className="text-sm text-casa-muted">Nenhuma fatura vence em {nomeMes(p.mes)}.</p>
        ) : (
          <div className="space-y-3">
            {p.faturasMes.map((f) => <LinhaFatura key={f.cartao.id} f={f} mes={p.mes} categorias={p.categorias} />)}
          </div>
        )}
      </Secao>

      {p.faturasProximo.length > 0 && (
        <Secao
          titulo={`Faturas em aberto — vencem em ${nomeMes(p.proximo)}`}
          acao={<span className="text-sm text-casa-muted">Já acumulado <b className="text-casa-ink">{moeda(totalProximo)}</b></span>}
        >
          <p className="-mt-1 mb-3 text-xs text-casa-muted">É o que já está comprometido do salário do mês que vem.</p>
          <div className="space-y-3">
            {p.faturasProximo.map((f) => <LinhaFatura key={f.cartao.id} f={f} mes={p.proximo} categorias={p.categorias} />)}
          </div>
        </Secao>
      )}

      <Secao titulo="Nossos cartões" acao={<button className="btn-primario" onClick={() => setEditar("novo")}><Plus size={16} /> Cartão</button>}>
        {p.cartoes.length === 0 ? (
          <p className="text-sm text-casa-muted">Nenhum cartão cadastrado ainda.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {p.cartoes.map((c) => {
              const usado = p.faturasProximo.find((f) => f.cartao.id === c.id)?.total ?? 0;
              return (
                <button
                  key={c.id}
                  onClick={() => setEditar(c)}
                  className={clsx("group relative overflow-hidden rounded-2xl p-4 text-left text-white shadow-sm transition hover:brightness-105", !c.ativo && "opacity-50")}
                  style={{ background: `linear-gradient(135deg, ${c.cor}, ${c.cor}cc)` }}
                >
                  <div className="flex items-start justify-between">
                    <CreditCard size={22} />
                    <Pencil size={14} className="opacity-0 group-hover:opacity-100" />
                  </div>
                  <p className="mt-3 text-lg font-bold">{c.nome}{!c.ativo && " (inativo)"}</p>
                  <p className="text-xs text-white/85">Fecha dia {c.dia_fechamento} · vence dia {c.dia_vencimento}</p>
                  <p className="mt-0.5 text-xs text-white/85">Melhor dia de compra: {c.dia_fechamento}</p>
                  {c.limite ? (
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-[11px] text-white/90"><span>Fatura aberta {moeda(usado)}</span><span>limite {moeda(c.limite)}</span></div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
                        <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, (usado / c.limite) * 100)}%` }} />
                      </div>
                    </div>
                  ) : null}
                  <span className="absolute bottom-3 right-3 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                    {c.dono === "casal" ? "Casal" : c.dono === "madu" ? "Madu" : "Gabriel"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Secao>

      <Modal aberto={editar !== null} onFechar={() => setEditar(null)} titulo={editar === "novo" ? "Novo cartão" : "Editar cartão"}>
        {editar !== null && <FormCartao cartao={editar === "novo" ? null : editar} onFechar={() => setEditar(null)} />}
      </Modal>
    </div>
  );
}

function LinhaFatura({ f, mes, categorias }: { f: Fatura; mes: string; categorias: Categoria[] }) {
  const [aberta, setAberta] = useState(false);
  const catMap = new Map(categorias.map((c) => [c.id, c]));
  const itens = [...f.itens].sort((a, b) => (a.data_compra ?? a.data).localeCompare(b.data_compra ?? b.data));
  return (
    <div className="rounded-2xl border border-casa-line">
      <div className="flex flex-wrap items-center gap-3 p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: f.cartao.cor }}>
          <CreditCard size={18} />
        </span>
        <button className="min-w-0 flex-1 text-left" onClick={() => setAberta((x) => !x)}>
          <p className="flex items-center gap-1 font-bold">
            {f.cartao.nome} <ChevronDown size={14} className={clsx("transition", aberta && "rotate-180")} />
          </p>
          <p className="text-xs text-casa-muted">Vence {dataCurta(f.vencimento)} · {f.itens.length} lançamento(s)</p>
        </button>
        <span className="font-bold tabular-nums">{moeda(f.total)}</span>
        <BotaoPagarFatura cartaoId={f.cartao.id} competencia={mes} pago={f.pago} />
      </div>
      {aberta && (
        <ul className="divide-y divide-casa-line border-t border-casa-line px-3">
          {itens.map((l) => {
            const c = l.categoria_id ? catMap.get(l.categoria_id) : null;
            return (
              <li key={l.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="w-12 shrink-0 text-xs tabular-nums text-casa-muted">{dataCurta(l.data_compra ?? l.data)}</span>
                <span>{c?.emoji ?? "💸"}</span>
                <span className="min-w-0 flex-1 truncate">{l.descricao}</span>
                <DonoBadge dono={l.pessoa} pequeno />
                <span className="tabular-nums">{moeda(l.valor)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Ciclo({ diaSalario, diaContas }: { diaSalario: number; diaContas: number }) {
  const [editando, setEditando] = useState(false);
  const { pendente, erro, rodar } = useAcao();
  const pos = (d: number) => `${((d - 1) / 30) * 100}%`;
  return (
    <Secao titulo="🔁 Nosso ciclo do mês" acao={!editando && <button className="btn-fantasma" onClick={() => setEditando(true)}><Pencil size={14} /> Ajustar</button>}>
      <div className="relative mx-2 mb-8 mt-10 h-2 rounded-full bg-casa-line">
        <div className="absolute inset-y-0 left-0 rounded-l-full bg-ok/70" style={{ width: pos(diaSalario) }} />
        <div className="absolute inset-y-0 rounded-full bg-casa-principal/70" style={{ left: pos(diaSalario), width: `calc(${pos(diaContas)} - ${pos(diaSalario)})` }} />
        {[
          { d: diaSalario, t: `Salários até dia ${diaSalario}`, cor: "#16a34a", e: "💼" },
          { d: diaContas, t: `Contas até dia ${diaContas}`, cor: "#e0601a", e: "🧾" },
        ].map((m, i) => (
          <div key={m.t}>
            <span className="absolute h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white shadow" style={{ left: pos(m.d), top: -4, background: m.cor }} />
            {/* um rótulo acima e outro abaixo da linha, para não se sobreporem */}
            <p className="absolute whitespace-nowrap text-xs font-bold" style={{ left: pos(m.d), color: m.cor, ...(i === 0 ? { top: -24 } : { top: 16 }) }}>
              {m.e} {m.t}
            </p>
          </div>
        ))}
        <span className="absolute -left-1 top-4 text-[10px] text-casa-muted">dia 1</span>
        <span className="absolute -right-1 top-4 text-[10px] text-casa-muted">dia 31</span>
      </div>
      <p className="text-sm text-casa-muted">
        Hoje o salário de um mês paga, em boa parte, o cartão do mês anterior. Na <b>Visão geral</b>, o indicador
        <b> “Peso do mês passado”</b> mostra quanto do salário já chega comprometido — a meta é ver esse número diminuir.
      </p>
      {editando && (
        <form action={(fd) => rodar(() => salvarCiclo(fd), () => setEditando(false))} className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl bg-casa-bg p-3">
          <div className="w-36"><label className="rotulo">Salários até dia</label><input name="dia_salario" type="number" min={1} max={31} defaultValue={diaSalario} className="campo" /></div>
          <div className="w-36"><label className="rotulo">Contas até dia</label><input name="dia_contas" type="number" min={1} max={31} defaultValue={diaContas} className="campo" /></div>
          <button className="btn-primario" disabled={pendente}>{pendente ? "Salvando…" : "Salvar"}</button>
          <button type="button" className="btn-secundario" onClick={() => setEditando(false)}>Cancelar</button>
          {erro && <p className="w-full text-sm text-perigo">{erro}</p>}
        </form>
      )}
    </Secao>
  );
}

function FormCartao({ cartao, onFechar }: { cartao: Cartao | null; onFechar: () => void }) {
  const [dono, setDono] = useState<Pessoa>(cartao?.dono ?? "casal");
  const [cor, setCor] = useState(cartao?.cor ?? "#8e1b4f");
  const { pendente, erro, rodar } = useAcao();
  return (
    <form action={(fd) => rodar(() => salvarCartao(fd), onFechar)} className="space-y-4">
      {cartao && <input type="hidden" name="id" value={cartao.id} />}
      <div>
        <label className="rotulo">Nome do cartão</label>
        <input name="nome" defaultValue={cartao?.nome} className="campo" required placeholder="Ex.: Nubank Madu" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="rotulo">Fecha dia</label><input name="dia_fechamento" type="number" min={1} max={31} defaultValue={cartao?.dia_fechamento ?? 3} className="campo" required /></div>
        <div><label className="rotulo">Vence dia</label><input name="dia_vencimento" type="number" min={1} max={31} defaultValue={cartao?.dia_vencimento ?? 10} className="campo" required /></div>
        <div><label className="rotulo">Limite (opc.)</label><input name="limite" inputMode="decimal" defaultValue={cartao?.limite ? String(cartao.limite).replace(".", ",") : ""} className="campo" /></div>
      </div>
      <p className="-mt-2 text-xs text-casa-muted">Compras feitas no dia do fechamento ou depois entram na fatura seguinte.</p>
      <div>
        <label className="rotulo">De quem</label>
        <Segmentos
          opcoes={[{ valor: "casal", label: "Casal", cor: CORES.casal }, { valor: "madu", label: "Madu", cor: CORES.madu }, { valor: "gabriel", label: "Gabriel", cor: CORES.gabriel }]}
          valor={dono}
          onChange={setDono}
          nome="dono"
        />
      </div>
      <div><label className="rotulo">Cor</label><SeletorCor valor={cor} onChange={setCor} /></div>
      {cartao && (
        <div>
          <label className="rotulo">Situação</label>
          <select name="ativo" defaultValue={cartao.ativo ? "on" : "off"} className="campo">
            <option value="on">Ativo</option>
            <option value="off">Inativo</option>
          </select>
        </div>
      )}
      {erro && <p className="rounded-xl bg-perigoclaro px-3 py-2 text-sm text-perigo">{erro}</p>}
      <div className="flex justify-between gap-2">
        {cartao ? (
          <button type="button" className="btn-perigo" disabled={pendente}
            onClick={() => confirm(`Excluir o cartão "${cartao.nome}"? As compras continuam, mas sem cartão.`) && rodar(() => excluirCartao(cartao.id), onFechar)}>
            <Trash2 size={15} /> Excluir
          </button>
        ) : <span />}
        <button className="btn-primario" disabled={pendente}>{pendente ? "Salvando…" : "Salvar"}</button>
      </div>
    </form>
  );
}

