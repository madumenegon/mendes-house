"use client";

import { useState } from "react";
import clsx from "clsx";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { SeletorCor, SeletorEmoji, Segmentos } from "@/components/Escolhas";
import { useAcao } from "@/components/useAcao";
import { DonoBadge } from "@/components/ui";
import { NOMES } from "@/lib/format";
import type { Escopo, FamiliaInfo, Prioridade, Valor } from "@/lib/types";
import {
  alternarPrioridade, excluirPrioridade, excluirValor, reordenarPrioridades, salvarFamilia, salvarPrioridade, salvarValor,
} from "./actions";

const OPCOES_ESCOPO: { valor: Escopo; label: string; cor: string }[] = [
  { valor: "familiar", label: "Familiar", cor: "#8b5cf6" },
  { valor: "madu", label: "Madu", cor: "#e0527e" },
  { valor: "gabriel", label: "Gabriel", cor: "#3b7dd8" },
];

const GRUPOS: { escopo: Escopo; titulo: string; cor: string }[] = [
  { escopo: "familiar", titulo: "Valores da família", cor: "#8b5cf6" },
  { escopo: "madu", titulo: "Valores da Madu", cor: "#e0527e" },
  { escopo: "gabriel", titulo: "Valores do Gabriel", cor: "#3b7dd8" },
];

export function ValoresCliente({ familia, valores, prioridades }: { familia: FamiliaInfo; valores: Valor[]; prioridades: Prioridade[] }) {
  return (
    <div className="space-y-5">
      <Missao familia={familia} />
      <ListaValores valores={valores} />
      <ListaPrioridades prioridades={prioridades} valores={valores} />
    </div>
  );
}

function Missao({ familia }: { familia: FamiliaInfo }) {
  const [editando, setEditando] = useState(false);
  const { pendente, erro, rodar } = useAcao();
  const vazia = !familia.missao && !familia.lema;

  if (editando) {
    return (
      <form
        className="card space-y-3 p-5"
        action={(fd) => rodar(() => salvarFamilia(fd), () => setEditando(false))}
      >
        <div>
          <label className="rotulo">Nossa missão como família</label>
          <textarea name="missao" defaultValue={familia.missao} rows={4} className="campo" placeholder="Ex.: Ser um lar que reflete o amor de Deus, onde…" />
        </div>
        <div>
          <label className="rotulo">Lema / versículo</label>
          <input name="lema" defaultValue={familia.lema} className="campo" placeholder="Ex.: Eu e a minha casa serviremos ao Senhor — Js 24:15" />
        </div>
        <div className="max-w-xs">
          <label className="rotulo">Horas acordados por dia (para calcular tempo livre)</label>
          <input name="horas_acordadas_dia" type="number" step="0.5" min="1" max="24" defaultValue={familia.horas_acordadas_dia} className="campo" />
        </div>
        {erro && <p className="text-sm text-perigo">{erro}</p>}
        <div className="flex gap-2">
          <button className="btn-primario" disabled={pendente}>{pendente ? "Salvando…" : "Salvar"}</button>
          <button type="button" className="btn-secundario" onClick={() => setEditando(false)}>Cancelar</button>
        </div>
      </form>
    );
  }

  return (
    <div className="card relative overflow-hidden bg-[linear-gradient(135deg,#2f5d50,#3f7a69)] p-6 text-white sm:p-8">
      <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
      <div className="absolute -bottom-16 right-24 h-36 w-36 rounded-full bg-casa-terra/30" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Nossa missão</p>
          <button onClick={() => setEditando(true)} className="btn bg-white/15 px-2.5 py-1.5 text-white hover:bg-white/25">
            <Pencil size={14} /> Editar
          </button>
        </div>
        {vazia ? (
          <p className="mt-3 max-w-2xl font-display text-xl text-white/90">
            Escrevam aqui a missão da família Mendes — o porquê de tudo o que vocês fazem juntos.
          </p>
        ) : (
          <>
            <p className="mt-3 max-w-3xl whitespace-pre-line font-display text-xl leading-relaxed sm:text-2xl">{familia.missao}</p>
            {familia.lema && <p className="mt-4 text-sm italic text-white/80">“{familia.lema}”</p>}
          </>
        )}
        {familia.updated_by && (
          <p className="mt-4 text-[11px] text-white/60">
            Atualizado por {NOMES[familia.updated_by]} em {new Date(familia.updated_at).toLocaleDateString("pt-BR")}
          </p>
        )}
      </div>
    </div>
  );
}

function ListaValores({ valores }: { valores: Valor[] }) {
  const [editar, setEditar] = useState<Valor | "novo" | null>(null);
  const [escopoNovo, setEscopoNovo] = useState<Escopo>("familiar");

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {GRUPOS.map((g) => {
        const lista = valores.filter((v) => v.escopo === g.escopo);
        return (
          <section key={g.escopo} className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold" style={{ color: g.cor }}>{g.titulo}</h2>
              <button
                className="btn-fantasma p-1.5"
                title="Novo valor"
                onClick={() => { setEscopoNovo(g.escopo); setEditar("novo"); }}
              >
                <Plus size={18} />
              </button>
            </div>
            {lista.length === 0 ? (
              <button
                onClick={() => { setEscopoNovo(g.escopo); setEditar("novo"); }}
                className="w-full rounded-xl border-2 border-dashed border-casa-line p-4 text-sm text-casa-muted hover:bg-casa-bg"
              >
                + Adicionar o primeiro valor
              </button>
            ) : (
              <ul className="space-y-2">
                {lista.map((v) => (
                  <li key={v.id}>
                    <button
                      onClick={() => setEditar(v)}
                      className="group flex w-full items-start gap-3 rounded-xl p-2 text-left transition hover:bg-casa-bg"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: `${v.cor}22` }}>{v.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold" style={{ color: v.cor }}>{v.nome}</span>
                        {v.descricao && <span className="block text-xs text-casa-muted">{v.descricao}</span>}
                      </span>
                      <Pencil size={14} className="mt-1 text-casa-muted opacity-0 group-hover:opacity-100" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      <Modal aberto={editar !== null} onFechar={() => setEditar(null)} titulo={editar === "novo" ? "Novo valor" : "Editar valor"}>
        {editar !== null && (
          <FormValor valor={editar === "novo" ? null : editar} escopoInicial={escopoNovo} onFechar={() => setEditar(null)} />
        )}
      </Modal>
    </div>
  );
}

function FormValor({ valor, escopoInicial, onFechar }: { valor: Valor | null; escopoInicial: Escopo; onFechar: () => void }) {
  const [escopo, setEscopo] = useState<Escopo>(valor?.escopo ?? escopoInicial);
  const [cor, setCor] = useState(valor?.cor ?? "#8b5cf6");
  const [emoji, setEmoji] = useState(valor?.emoji ?? "✨");
  const { pendente, erro, rodar } = useAcao();

  return (
    <form action={(fd) => rodar(() => salvarValor(fd), onFechar)} className="space-y-4">
      {valor && <input type="hidden" name="id" value={valor.id} />}
      <div>
        <label className="rotulo">Nome do valor</label>
        <input name="nome" defaultValue={valor?.nome} className="campo" required placeholder="Ex.: Generosidade" />
      </div>
      <div>
        <label className="rotulo">O que significa para nós</label>
        <textarea name="descricao" defaultValue={valor?.descricao} rows={2} className="campo" />
      </div>
      <div>
        <label className="rotulo">É um valor…</label>
        <Segmentos opcoes={OPCOES_ESCOPO} valor={escopo} onChange={setEscopo} nome="escopo" />
      </div>
      <div>
        <label className="rotulo">Ícone</label>
        <SeletorEmoji valor={emoji} onChange={setEmoji} />
      </div>
      <div>
        <label className="rotulo">Cor</label>
        <SeletorCor valor={cor} onChange={setCor} />
      </div>
      {erro && <p className="rounded-xl bg-perigoclaro px-3 py-2 text-sm text-perigo">{erro}</p>}
      <div className="flex justify-between gap-2">
        {valor ? (
          <button
            type="button"
            className="btn-perigo"
            disabled={pendente}
            onClick={() => confirm(`Excluir o valor "${valor.nome}"?`) && rodar(() => excluirValor(valor.id), onFechar)}
          >
            <Trash2 size={15} /> Excluir
          </button>
        ) : <span />}
        <button className="btn-primario" disabled={pendente}>{pendente ? "Salvando…" : "Salvar"}</button>
      </div>
    </form>
  );
}

function ListaPrioridades({ prioridades, valores }: { prioridades: Prioridade[]; valores: Valor[] }) {
  const [editar, setEditar] = useState<Prioridade | "nova" | null>(null);
  const { rodar } = useAcao();
  const valorMap = new Map(valores.map((v) => [v.id, v]));

  const mover = (i: number, dir: -1 | 1) => {
    const ids = prioridades.map((p) => p.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    rodar(() => reordenarPrioridades(ids));
  };

  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">🎯 Gestão de prioridades</h2>
        <button className="btn-primario" onClick={() => setEditar("nova")}><Plus size={16} /> Prioridade</button>
      </div>
      <p className="mb-3 text-sm text-casa-muted">Em ordem de importância. Use as setas para reorganizar.</p>
      {prioridades.length === 0 ? (
        <p className="rounded-xl bg-casa-bg p-4 text-sm text-casa-muted">Ex.: “Quitar o carro até dezembro”, “Uma noite a dois por semana”, “Ler a Bíblia juntos”.</p>
      ) : (
        <ol className="space-y-2">
          {prioridades.map((p, i) => {
            const v = p.valor_id ? valorMap.get(p.valor_id) : null;
            return (
              <li key={p.id} className={clsx("flex items-center gap-3 rounded-xl border border-casa-line p-2.5", p.concluida && "opacity-55")}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-casa-terraclaro font-display font-semibold text-casa-terra">{i + 1}</span>
                <button
                  onClick={() => rodar(() => alternarPrioridade(p.id, !p.concluida))}
                  className={clsx("flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2", p.concluida ? "border-ok bg-ok text-white" : "border-casa-line")}
                  title="Concluída"
                >
                  {p.concluida && <Check size={14} />}
                </button>
                <button className="min-w-0 flex-1 text-left" onClick={() => setEditar(p)}>
                  <p className={clsx("font-semibold", p.concluida && "line-through")}>{p.titulo}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <DonoBadge dono={p.escopo === "familiar" ? "compartilhado" : p.escopo} pequeno />
                    {v && <span className="text-xs text-casa-muted">{v.emoji} {v.nome}</span>}
                    {p.descricao && <span className="truncate text-xs text-casa-muted">· {p.descricao}</span>}
                  </div>
                </button>
                <div className="flex flex-col">
                  <button className="btn-fantasma p-1" onClick={() => mover(i, -1)} disabled={i === 0}><ArrowUp size={14} /></button>
                  <button className="btn-fantasma p-1" onClick={() => mover(i, 1)} disabled={i === prioridades.length - 1}><ArrowDown size={14} /></button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <Modal aberto={editar !== null} onFechar={() => setEditar(null)} titulo={editar === "nova" ? "Nova prioridade" : "Editar prioridade"}>
        {editar !== null && <FormPrioridade prioridade={editar === "nova" ? null : editar} valores={valores} onFechar={() => setEditar(null)} />}
      </Modal>
    </section>
  );
}

function FormPrioridade({ prioridade, valores, onFechar }: { prioridade: Prioridade | null; valores: Valor[]; onFechar: () => void }) {
  const [escopo, setEscopo] = useState<Escopo>(prioridade?.escopo ?? "familiar");
  const { pendente, erro, rodar } = useAcao();
  return (
    <form action={(fd) => rodar(() => salvarPrioridade(fd), onFechar)} className="space-y-4">
      {prioridade && <input type="hidden" name="id" value={prioridade.id} />}
      <div>
        <label className="rotulo">Prioridade</label>
        <input name="titulo" defaultValue={prioridade?.titulo} className="campo" required />
      </div>
      <div>
        <label className="rotulo">Detalhes</label>
        <textarea name="descricao" defaultValue={prioridade?.descricao} rows={2} className="campo" />
      </div>
      <div>
        <label className="rotulo">De quem</label>
        <Segmentos opcoes={OPCOES_ESCOPO} valor={escopo} onChange={setEscopo} nome="escopo" />
      </div>
      <div>
        <label className="rotulo">Ligada a qual valor?</label>
        <select name="valor_id" defaultValue={prioridade?.valor_id ?? ""} className="campo">
          <option value="">— nenhum —</option>
          {valores.map((v) => <option key={v.id} value={v.id}>{v.emoji} {v.nome}</option>)}
        </select>
      </div>
      {erro && <p className="rounded-xl bg-perigoclaro px-3 py-2 text-sm text-perigo">{erro}</p>}
      <div className="flex justify-between gap-2">
        {prioridade ? (
          <button type="button" className="btn-perigo" disabled={pendente}
            onClick={() => confirm("Excluir esta prioridade?") && rodar(() => excluirPrioridade(prioridade.id), onFechar)}>
            <Trash2 size={15} /> Excluir
          </button>
        ) : <span />}
        <button className="btn-primario" disabled={pendente}>{pendente ? "Salvando…" : "Salvar"}</button>
      </div>
    </form>
  );
}
