"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";
import { Modal } from "@/components/Modal";
import { SeletorCor, SeletorEmoji, Segmentos } from "@/components/Escolhas";
import { useAcao } from "@/components/useAcao";
import { Barra, Secao } from "@/components/ui";
import { parseValor } from "@/lib/format";
import { nomeMes } from "@/lib/datas";
import { achatar, montarArvore, somarComFilhos, type No } from "@/lib/arvore";
import type { Categoria, Natureza, TipoLancamento } from "@/lib/types";
import { criarConta, excluirCategoria, moverConta, renomearConta, salvarCategoria, salvarOrcamento } from "../actions";
import { Din } from "@/components/Privacidade";

type PctDe = (c: Categoria) => number | null;
interface Ctx {
  pctDe: PctDe;
  mudarPct: (id: string, v: number | null) => void;
  renda: number;
  gasto: Record<string, number>;
  onEditar: (c: Categoria) => void;
}

const arred = (n: number) => Math.round(n * 100) / 100;
const fmtPct = (n: number) => `${arred(n).toLocaleString("pt-BR")}%`;
const valorDe = (pct: number, renda: number) => arred((renda * pct) / 100);
const somaFilhos = (n: No, pctDe: PctDe) => n.filhos.reduce((s, f) => s + (pctDe(f.c) ?? 0), 0);

export function OrcamentoCliente({ mes, categorias, gasto, renda }: { mes: string; categorias: Categoria[]; gasto: Record<string, number>; renda: number }) {
  // % digitados ainda não confirmados pelo servidor: deixam as somas ao vivo
  const [editados, setEditados] = useState<Record<string, number | null>>({});
  const [aberta, setAberta] = useState<string | null>(null);
  const [editar, setEditar] = useState<Categoria | TipoLancamento | null>(null);
  const pctDe: PctDe = (c) => (c.id in editados ? editados[c.id] : c.orcamento_pct ?? null);
  const ctx: Ctx = { pctDe, mudarPct: (id, v) => setEditados((e) => ({ ...e, [id]: v })), renda, gasto, onEditar: setEditar };

  const arvore = montarArvore(categorias);
  const grandes = arvore.filter((n) => n.c.grande_conta);
  const soltas = arvore.filter((n) => !n.c.grande_conta);
  const distribuido = grandes.reduce((s, n) => s + (pctDe(n.c) ?? 0), 0);
  const falta = 100 - distribuido;
  const sel = grandes.find((n) => n.c.id === aberta) ?? null;
  const receitas = categorias.filter((c) => c.tipo === "receita");

  return (
    <div className="space-y-5">
      <Secao titulo="🎯 Arquitetura das contas">
        <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,280px)_1fr]">
          <Esferas grandes={grandes} pctDe={pctDe} aberta={aberta} onAbrir={(id) => setAberta(aberta === id ? null : id)} distribuido={distribuido} />
          <div className="grid min-w-0 grid-cols-3 gap-2 sm:grid-cols-1 sm:gap-3 xl:grid-cols-3">
            <Numero rotulo="Renda do mês"><Din v={renda} /></Numero>
            <Numero rotulo="Distribuído">{fmtPct(distribuido)} <span className="block text-xs font-normal text-casa-muted"><Din v={valorDe(distribuido, renda)} /></span></Numero>
            <Numero rotulo={falta >= 0 ? "Falta distribuir" : "Passou de 100%"} cor={Math.abs(falta) < 0.01 ? "text-ok" : falta < 0 ? "text-perigo" : "text-alerta"}>
              {fmtPct(Math.abs(falta))} <span className="block text-xs font-normal text-casa-muted"><Din v={valorDe(Math.abs(falta), renda)} /></span>
            </Numero>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
          {grandes.map((n) => <CartaoGrande key={n.c.id} n={n} ctx={ctx} aberto={aberta === n.c.id} onClick={() => setAberta(aberta === n.c.id ? null : n.c.id)} />)}
          <NovaConta parentId={null} rotulo="Grande conta" cartao />
        </div>
        <p className="mt-4 text-xs text-casa-muted">
          Todos os % são <b>da renda</b>: se Despesas tem 50%, as classes dentro dela somam 50%, e as subclasses somam o % da sua classe.
          Clique numa grande conta para abrir. Renda considerada: <b>salários e outras rendas, sem os vales</b>, de {nomeMes(mes)}.
        </p>
      </Secao>

      {sel && <PainelConta key={sel.c.id} n={sel} ctx={ctx} onFechar={() => setAberta(null)} />}

      {soltas.length > 0 && (
        <Secao titulo="Fora da arquitetura">
          <p className="-mt-1 mb-3 text-xs text-casa-muted">Categorias antigas que ainda não estão em nenhuma grande conta. Mova para onde fizer sentido ou exclua.</p>
          <ul className="divide-y divide-casa-line">
            {soltas.map((n) => <LinhaSolta key={n.c.id} n={n} grandes={grandes} ctx={ctx} />)}
          </ul>
        </Secao>
      )}

      <Secao titulo="Categorias de receita" acao={<button className="btn-secundario" onClick={() => setEditar("receita")}><Plus size={15} /> Categoria</button>}>
        <div className="flex flex-wrap gap-2">
          {receitas.map((c) => (
            <button key={c.id} onClick={() => setEditar(c)} className="rounded-full border-2 px-3 py-1 text-sm font-bold" style={{ borderColor: `${c.cor}55`, color: c.cor }}>
              {c.emoji} {c.nome}
            </button>
          ))}
        </div>
      </Secao>

      <Modal aberto={editar !== null} onFechar={() => setEditar(null)} titulo={typeof editar === "string" ? "Nova categoria" : "Editar conta"}>
        {editar !== null && (
          <FormCategoria categoria={typeof editar === "string" ? null : editar} tipo={typeof editar === "string" ? editar : editar.tipo} onFechar={() => setEditar(null)} />
        )}
      </Modal>
    </div>
  );
}

function Numero({ rotulo, cor = "", children }: { rotulo: string; cor?: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-casa-bg/70 p-2.5 sm:p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-casa-muted sm:text-[11px]">{rotulo}</p>
      <p className={`font-display text-sm font-semibold tabular-nums whitespace-nowrap sm:text-lg ${cor}`}>{children}</p>
    </div>
  );
}

// ------------------------------------------------------------------ esferas (gráfico de anéis)

function arco(a0: number, a1: number, ri: number, re: number) {
  a1 = Math.min(a1, a0 + 359.99);
  const p = (a: number, r: number) => {
    const t = ((a - 90) * Math.PI) / 180;
    return `${(r * Math.cos(t)).toFixed(2)} ${(r * Math.sin(t)).toFixed(2)}`;
  };
  const g = a1 - a0 > 180 ? 1 : 0;
  return `M${p(a0, re)} A${re} ${re} 0 ${g} 1 ${p(a1, re)} L${p(a1, ri)} A${ri} ${ri} 0 ${g} 0 ${p(a0, ri)}Z`;
}

function Esferas({ grandes, pctDe, aberta, onAbrir, distribuido }: { grandes: No[]; pctDe: PctDe; aberta: string | null; onAbrir: (id: string) => void; distribuido: number }) {
  const prof = (n: No): number => 1 + Math.max(0, ...n.filhos.map(prof));
  const aneis = Math.min(4, Math.max(1, ...grandes.map(prof)));
  const r0 = 50, R = 148, w = (R - r0) / aneis;
  const total = Math.max(100, distribuido);
  const fatias: ReactNode[] = [];

  // desenha a conta e, dentro do arco dela, os filhos (encolhidos se passarem do % da conta)
  const desenhar = (n: No, ini: number, escala: number, raiz: No): number => {
    const proprio = pctDe(n.c) ?? 0;
    if (proprio <= 0 || n.nivel >= aneis) return 0;
    const span = ((proprio * escala) / total) * 360;
    const ri = r0 + n.nivel * w, re = ri + w - 1;
    const meio = ((ini + span / 2 - 90) * Math.PI) / 180;
    const rm = (ri + re) / 2;
    fatias.push(
      <g key={n.c.id} onClick={() => onAbrir(raiz.c.id)} className="cursor-pointer" opacity={aberta && raiz.c.id !== aberta ? 0.28 : 1}>
        <path d={arco(ini, ini + span, ri, re)} fill={n.c.cor} fillOpacity={1 - n.nivel * 0.17} stroke="#fff" strokeWidth={1.5} />
        {span * (rm / 60) > 16 && (
          <text x={(rm * Math.cos(meio)).toFixed(2)} y={(rm * Math.sin(meio)).toFixed(2)} textAnchor="middle" dominantBaseline="central" fontSize={n.nivel === 0 ? 15 : 11} className="pointer-events-none select-none">
            {n.c.emoji}
          </text>
        )}
        <title>{`${n.c.nome}: ${fmtPct(proprio)} da renda`}</title>
      </g>,
    );
    const soma = somaFilhos(n, pctDe);
    const esc = soma > proprio ? (escala * proprio) / soma : escala;
    let a = ini;
    for (const f of n.filhos) a += desenhar(f, a, esc, raiz);
    return span;
  };
  let a = 0;
  for (const g of grandes) a += desenhar(g, a, 1, g);

  return (
    <svg viewBox="-150 -150 300 300" className="mx-auto w-full max-w-[300px]" role="img" aria-label="Distribuição da renda por grande conta">
      <circle r={(r0 + R) / 2} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth={R - r0} />
      {fatias}
      <text y={-6} textAnchor="middle" className="fill-casa-ink font-display" fontSize={24} fontWeight={600}>{fmtPct(distribuido)}</text>
      <text y={14} textAnchor="middle" className="fill-casa-muted" fontSize={10} fontWeight={700}>DA RENDA</text>
    </svg>
  );
}

// ------------------------------------------------------------------ grandes contas

function Distribuicao({ alvo, soma }: { alvo: number | null; soma: number }) {
  if (!alvo) return <span className="rounded-full bg-casa-bg px-2 py-0.5 text-[11px] font-bold text-casa-muted">defina o %</span>;
  const d = arred(alvo - soma);
  if (Math.abs(d) < 0.01) return <span className="rounded-full bg-okclaro px-2 py-0.5 text-[11px] font-bold text-ok">✓ tudo distribuído</span>;
  if (d > 0) return <span className="rounded-full bg-alertaclaro px-2 py-0.5 text-[11px] font-bold text-alerta">faltam {fmtPct(d)}</span>;
  return <span className="rounded-full bg-perigoclaro px-2 py-0.5 text-[11px] font-bold text-perigo">passou {fmtPct(-d)}</span>;
}

function CartaoGrande({ n, ctx, aberto, onClick }: { n: No; ctx: Ctx; aberto: boolean; onClick: () => void }) {
  const p = ctx.pctDe(n.c);
  const soma = somaFilhos(n, ctx.pctDe);
  const gasto = somarComFilhos(n, ctx.gasto);
  const valor = p ? valorDe(p, ctx.renda) : 0;
  return (
    <button
      onClick={onClick}
      className="min-w-0 rounded-2xl border-2 p-3 text-left transition hover:-translate-y-0.5"
      style={{ borderColor: aberto ? n.c.cor : `${n.c.cor}33`, background: `linear-gradient(135deg, ${n.c.cor}${aberto ? "26" : "12"}, #fff 75%)` }}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: `${n.c.cor}22` }}>{n.c.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{n.c.nome}</p>
          <p className="text-xs text-casa-muted">{n.filhos.length} {n.filhos.length === 1 ? "classe" : "classes"}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-semibold tabular-nums" style={{ color: n.c.cor }}>{p ? fmtPct(p) : "—"}</p>
          <p className="text-[11px] tabular-nums text-casa-muted"><Din v={valor} /></p>
        </div>
        <ChevronDown size={16} className={`shrink-0 text-casa-muted transition ${aberto ? "rotate-180" : ""}`} />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] text-casa-muted">
        <span>Classes: {fmtPct(soma)}{p ? ` de ${fmtPct(p)}` : ""}</span>
        {n.filhos.length > 0 && <Distribuicao alvo={p} soma={soma} />}
      </div>
      <div className="mt-1"><Barra valor={soma} total={Math.max(p ?? 0, soma, 1)} cor={p && soma > p + 0.001 ? "#dc2626" : n.c.cor} /></div>
      <p className="mt-2 text-[11px] text-casa-muted">
        Gasto no mês: <b className={valor && gasto > valor ? "text-perigo" : "text-casa-ink"}><Din v={gasto} /></b>
        {valor > 0 && <> de <Din v={valor} /></>}
      </p>
    </button>
  );
}

function PainelConta({ n, ctx, onFechar }: { n: No; ctx: Ctx; onFechar: () => void }) {
  const p = ctx.pctDe(n.c);
  return (
    <section className="card min-w-0 overflow-hidden" style={{ borderColor: `${n.c.cor}66` }}>
      <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5" style={{ background: `linear-gradient(135deg, ${n.c.cor}22, transparent 80%)` }}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ background: `${n.c.cor}2a` }}>{n.c.emoji}</span>
        <div className="min-w-0 flex-1">
          <NomeEditavel c={n.c} className="font-display text-xl font-semibold" />
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-casa-muted">
            <span>{p ? <><b>{fmtPct(p)}</b> da renda · <Din v={valorDe(p, ctx.renda)} /></> : "Sem % definido"}</span>
            {n.filhos.length > 0 && <Distribuicao alvo={p} soma={somaFilhos(n, ctx.pctDe)} />}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CampoPct c={n.c} ctx={ctx} grande />
          <button className="btn-fantasma p-2" onClick={() => ctx.onEditar(n.c)} title="Ícone, cor e palavras-chave"><Pencil size={15} /></button>
          <button className="btn-fantasma p-2" onClick={onFechar} title="Fechar"><X size={16} /></button>
        </div>
      </div>

      <div className="p-4 pt-2 sm:p-5 sm:pt-2">
        <div className="hidden grid-cols-[minmax(0,1fr)_5.5rem_7rem_9rem_5.5rem] gap-x-3 border-b border-casa-line pb-1.5 text-[11px] font-bold uppercase text-casa-muted md:grid">
          <span>Classe / subclasse</span><span className="text-right">% renda</span><span className="text-right">Valor</span><span>Gasto no mês</span><span />
        </div>
        {n.filhos.length === 0 ? (
          <p className="py-4 text-sm text-casa-muted">Nenhuma classe ainda. Comece criando a primeira abaixo.</p>
        ) : (
          <ul>{n.filhos.map((f) => <LinhaConta key={f.c.id} n={f} pai={n} ctx={ctx} />)}</ul>
        )}
        <div className="mt-3"><NovaConta parentId={n.c.id} rotulo="Classe" /></div>
      </div>
    </section>
  );
}

function LinhaConta({ n, pai, ctx }: { n: No; pai: No; ctx: Ctx }) {
  const [novo, setNovo] = useState(false);
  const { rodar, pendente, erro } = useAcao();
  const p = ctx.pctDe(n.c);
  const pp = ctx.pctDe(pai.c);
  const valor = p ? valorDe(p, ctx.renda) : null;
  const gasto = somarComFilhos(n, ctx.gasto);
  const estourou = valor !== null && gasto > valor;
  const recuo = (n.nivel - 1) * 22;

  const excluir = () => {
    const extra = n.filhos.length ? ` e as ${achatar(n.filhos).length} contas dentro dela` : "";
    if (confirm(`Excluir "${n.c.nome}"${extra}? Os lançamentos ficam sem categoria.`)) rodar(() => excluirCategoria(n.c.id));
  };

  return (
    <li>
      <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_auto] items-center gap-x-2 gap-y-1 border-b border-casa-line/70 py-2.5 md:grid-cols-[minmax(0,1fr)_5.5rem_7rem_9rem_5.5rem] md:gap-x-3">
        <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: recuo }}>
          {n.nivel > 1 && <span className="h-4 w-3 shrink-0 rounded-bl-md border-b-2 border-l-2 border-casa-line" />}
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm" style={{ background: `${n.c.cor}22` }}>{n.c.emoji}</span>
          <div className="min-w-0">
            <NomeEditavel c={n.c} className={n.nivel === 1 ? "font-bold" : "font-semibold text-casa-ink/85"} />
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-casa-muted">
              {p && pp ? <span>{fmtPct((p / pp) * 100)} de {pai.c.nome}</span> : null}
              {n.filhos.length > 0 && <Distribuicao alvo={p} soma={somaFilhos(n, ctx.pctDe)} />}
            </div>
          </div>
        </div>
        <CampoPct c={n.c} ctx={ctx} />
        <span className="hidden text-right text-sm font-semibold tabular-nums md:block">{valor !== null ? <Din v={valor} /> : <span className="text-casa-muted">—</span>}</span>
        <div className="col-span-3 row-start-2 md:col-span-1 md:row-start-auto" style={{ paddingLeft: recuo }}>
          <div className="mb-0.5 flex justify-between text-[11px]">
            <span className={estourou ? "font-bold text-perigo" : "text-casa-muted"}><Din v={gasto} /></span>
            <span className="text-casa-muted md:hidden">{valor !== null && <>de <Din v={valor} /></>}</span>
          </div>
          <Barra valor={gasto} total={valor ?? Math.max(gasto, 1)} cor={estourou ? "#dc2626" : valor && gasto / valor > 0.8 ? "#d97706" : n.c.cor} />
        </div>
        <div className="col-start-3 row-start-1 flex justify-end md:col-start-auto md:row-start-auto">
          <button className="btn-fantasma p-1.5" onClick={() => setNovo(true)} title="Criar subclasse"><Plus size={14} /></button>
          <button className="btn-fantasma p-1.5" onClick={() => ctx.onEditar(n.c)} title="Ícone, cor e palavras-chave"><Pencil size={14} /></button>
          <button className="btn-fantasma p-1.5 hover:text-perigo" onClick={excluir} disabled={pendente} title="Excluir"><Trash2 size={14} /></button>
        </div>
      </div>
      {erro && <p className="py-1 text-xs text-perigo">{erro}</p>}
      {n.filhos.length > 0 && <ul>{n.filhos.map((f) => <LinhaConta key={f.c.id} n={f} pai={n} ctx={ctx} />)}</ul>}
      {novo && (
        <div className="py-2" style={{ paddingLeft: recuo + 22 }}>
          <NovaConta parentId={n.c.id} rotulo="Subclasse" aberto onCancelar={() => setNovo(false)} />
        </div>
      )}
    </li>
  );
}

// ------------------------------------------------------------------ peças editáveis

function CampoPct({ c, ctx, grande }: { c: Categoria; ctx: Ctx; grande?: boolean }) {
  const br = (n: number | null | undefined) => (n ? String(n).replace(".", ",") : "");
  const [txt, setTxt] = useState(br(c.orcamento_pct));
  const { rodar, pendente, erro } = useAcao();
  const salvar = () => {
    const n = txt ? parseValor(txt) : null;
    if ((n || null) === (c.orcamento_pct || null)) return;
    rodar(() => salvarOrcamento(c.id, null, n || null));
  };
  return (
    <div className="relative" title={erro ?? "% da renda"}>
      <input
        value={txt}
        onChange={(e) => { setTxt(e.target.value); ctx.mudarPct(c.id, e.target.value ? parseValor(e.target.value) || null : null); }}
        onBlur={salvar}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        inputMode="decimal"
        placeholder="—"
        disabled={pendente}
        className={`campo pr-6 text-right font-bold tabular-nums ${grande ? "w-24 py-2 text-base" : "py-1.5"} ${erro ? "border-perigo" : ""}`}
      />
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-casa-muted">%</span>
    </div>
  );
}

function NomeEditavel({ c, className }: { c: Categoria; className: string }) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(c.nome);
  const { rodar, pendente } = useAcao();
  const salvar = () => {
    if (nome.trim() && nome.trim() !== c.nome) rodar(() => renomearConta(c.id, nome), () => setEditando(false));
    else { setNome(c.nome); setEditando(false); }
  };
  if (!editando)
    return (
      <button onClick={() => setEditando(true)} className={`block max-w-full truncate text-left hover:underline hover:decoration-dotted ${className}`} title="Clique para renomear">
        {c.nome}
      </button>
    );
  return (
    <input
      autoFocus
      value={nome}
      onChange={(e) => setNome(e.target.value)}
      onBlur={salvar}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setNome(c.nome); setEditando(false); } }}
      disabled={pendente}
      className="campo py-1"
    />
  );
}

function NovaConta({ parentId, rotulo, cartao, aberto: abertoInicial, onCancelar }: { parentId: string | null; rotulo: string; cartao?: boolean; aberto?: boolean; onCancelar?: () => void }) {
  const [aberto, setAberto] = useState(!!abertoInicial);
  const [nome, setNome] = useState("");
  const { rodar, pendente, erro } = useAcao();
  const fechar = () => { setNome(""); setAberto(false); onCancelar?.(); };
  const criar = () => nome.trim() && rodar(() => criarConta(parentId, nome), fechar);

  if (!aberto)
    return (
      <button
        onClick={() => setAberto(true)}
        className={cartao
          ? "flex min-h-24 items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-casa-line text-sm font-bold text-casa-muted hover:border-casa-principal hover:text-casa-principal"
          : "btn-secundario"}
      >
        <Plus size={15} /> {rotulo}
      </button>
    );
  return (
    <div className={cartao ? "rounded-2xl border-2 border-dashed border-casa-principal/50 p-3" : ""}>
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") criar(); if (e.key === "Escape") fechar(); }}
          placeholder={`Nome da ${rotulo.toLowerCase()}`}
          disabled={pendente}
          className="campo min-w-0 flex-1 py-1.5"
        />
        <button className="btn-primario p-2" onClick={criar} disabled={pendente || !nome.trim()} title="Criar"><Check size={15} /></button>
        <button className="btn-fantasma p-2" onClick={fechar} title="Cancelar"><X size={15} /></button>
      </div>
      {erro && <p className="mt-1 text-xs text-perigo">{erro}</p>}
    </div>
  );
}

function LinhaSolta({ n, grandes, ctx }: { n: No; grandes: No[]; ctx: Ctx }) {
  const { rodar, pendente, erro } = useAcao();
  const destinos = achatar(grandes);
  const gasto = somarComFilhos(n, ctx.gasto);
  return (
    <li className="flex flex-wrap items-center gap-2 py-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm" style={{ background: `${n.c.cor}22` }}>{n.c.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{n.c.nome}</p>
        <p className="text-[11px] text-casa-muted">Gasto no mês: <Din v={gasto} />{n.filhos.length > 0 && ` · ${n.filhos.length} dentro`}</p>
      </div>
      <select
        value=""
        disabled={pendente}
        onChange={(e) => e.target.value && rodar(() => moverConta(n.c.id, e.target.value === "raiz" ? null : e.target.value))}
        className="campo w-auto max-w-[14rem] py-1.5 text-xs"
      >
        <option value="">Mover para…</option>
        {destinos.map((d) => <option key={d.c.id} value={d.c.id}>{"   ".repeat(d.nivel)}{d.c.emoji} {d.c.nome}</option>)}
        <option value="raiz">⭐ Virar grande conta</option>
      </select>
      <button
        className="btn-fantasma p-1.5 hover:text-perigo"
        disabled={pendente}
        onClick={() => confirm(`Excluir "${n.c.nome}"? Os lançamentos ficam sem categoria.`) && rodar(() => excluirCategoria(n.c.id))}
        title="Excluir"
      >
        <Trash2 size={14} />
      </button>
      {erro && <p className="w-full text-xs text-perigo">{erro}</p>}
    </li>
  );
}

function FormCategoria({ categoria, tipo, onFechar }: { categoria: Categoria | null; tipo: TipoLancamento; onFechar: () => void }) {
  const [natureza, setNatureza] = useState<Natureza>(categoria?.natureza ?? "variavel");
  const [cor, setCor] = useState(categoria?.cor ?? "#64748b");
  const [emoji, setEmoji] = useState(categoria?.emoji ?? "💸");
  const { pendente, erro, rodar } = useAcao();
  return (
    <form action={(fd) => rodar(() => salvarCategoria(fd), onFechar)} className="space-y-4">
      {categoria && <input type="hidden" name="id" value={categoria.id} />}
      <input type="hidden" name="tipo" value={tipo} />
      {categoria?.orcamento_mensal ? <input type="hidden" name="orcamento_mensal" value={categoria.orcamento_mensal} /> : null}
      <div>
        <label className="rotulo">Nome</label>
        <input name="nome" defaultValue={categoria?.nome} className="campo" required />
      </div>
      {tipo === "despesa" && (
        <div>
          <label className="rotulo">Normalmente é um custo…</label>
          <Segmentos opcoes={[{ valor: "fixo", label: "Fixo", cor: "#6366f1" }, { valor: "variavel", label: "Variável", cor: "#f97316" }]} valor={natureza} onChange={setNatureza} nome="natureza" />
        </div>
      )}
      <div><label className="rotulo">Ícone</label><SeletorEmoji valor={emoji} onChange={setEmoji} /></div>
      <div><label className="rotulo">Cor</label><SeletorCor valor={cor} onChange={setCor} /></div>
      <div>
        <label className="rotulo">Palavras-chave do extrato (separadas por vírgula)</label>
        <input name="palavras_chave" defaultValue={categoria?.palavras_chave} className="campo" placeholder="ex.: angeloni, giassi, mercado" />
        <p className="mt-1 text-xs text-casa-muted">Ao importar um extrato, linhas com essas palavras caem automaticamente nesta conta.</p>
      </div>
      {erro && <p className="rounded-xl bg-perigoclaro px-3 py-2 text-sm text-perigo">{erro}</p>}
      <div className="flex justify-between gap-2">
        {categoria ? (
          <button type="button" className="btn-perigo" disabled={pendente} onClick={() => confirm(`Excluir "${categoria.nome}" e tudo o que estiver dentro dela? Os lançamentos ficam sem categoria.`) && rodar(() => excluirCategoria(categoria.id), onFechar)}>
            <Trash2 size={15} /> Excluir
          </button>
        ) : <span />}
        <button className="btn-primario" disabled={pendente}>{pendente ? "Salvando…" : "Salvar"}</button>
      </div>
    </form>
  );
}
