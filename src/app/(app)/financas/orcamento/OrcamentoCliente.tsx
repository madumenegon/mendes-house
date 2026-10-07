"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { SeletorCor, SeletorEmoji, Segmentos } from "@/components/Escolhas";
import { useAcao } from "@/components/useAcao";
import { Barra, Secao } from "@/components/ui";
import { parseValor, pct } from "@/lib/format";
import { nomeMes } from "@/lib/datas";
import type { Caixinha, Categoria, Natureza, TipoLancamento } from "@/lib/types";
import { excluirCategoria, salvarCategoria, salvarOrcamento } from "../actions";
import { Din, useMoeda } from "@/components/Privacidade";

export function OrcamentoCliente({
  mes, categorias, gasto, renda, caixinhas,
}: { mes: string; categorias: Categoria[]; gasto: Record<string, number>; renda: number; caixinhas: Caixinha[] }) {
  const [editar, setEditar] = useState<Categoria | TipoLancamento | null>(null);
  const fmt = useMoeda();
  const despesas = categorias.filter((c) => c.tipo === "despesa");
  const receitas = categorias.filter((c) => c.tipo === "receita");
  const comLimite = despesas.filter((c) => c.orcamento_mensal);
  const totalLimites = comLimite.reduce((s, c) => s + (c.orcamento_mensal ?? 0), 0);
  const aportes = caixinhas.reduce((s, c) => s + (c.aporte_mensal ?? 0), 0);
  const destinado = totalLimites + aportes;
  const livre = renda - destinado;
  const base = Math.max(renda, destinado, 1);

  const segmentos = [
    ...comLimite.map((c) => ({ nome: `${c.emoji} ${c.nome}`, valor: c.orcamento_mensal ?? 0, cor: c.cor })),
    ...caixinhas.filter((c) => c.aporte_mensal).map((c) => ({ nome: `${c.emoji} ${c.nome} (caixinha)`, valor: c.aporte_mensal ?? 0, cor: c.cor })),
  ];

  return (
    <div className="space-y-5">
      <Secao titulo="🎯 Destinação da renda">
        <div className="grid gap-3 sm:grid-cols-3">
          <div><p className="rotulo">Renda do mês</p><p className="font-display text-2xl font-semibold"><Din v={renda} /></p></div>
          <div><p className="rotulo">Já destinado</p><p className="font-display text-2xl font-semibold"><Din v={destinado} /> <span className="text-sm text-casa-muted">({pct(destinado, renda)}%)</span></p></div>
          <div><p className="rotulo">{livre >= 0 ? "Sem destino ainda" : "Passou da renda"}</p><p className={`font-display text-2xl font-semibold ${livre < 0 ? "text-perigo" : "text-ok"}`}><Din v={Math.abs(livre)} /></p></div>
        </div>
        <div className="mt-4 flex h-6 w-full overflow-hidden rounded-full bg-black/[0.06]">
          {segmentos.map((s) => (
            <div key={s.nome} className="h-full border-r-2 border-white last:border-r-0" style={{ width: `${(s.valor / base) * 100}%`, background: s.cor }} title={`${s.nome}: ${fmt(s.valor)}`} />
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-casa-muted">
          {segmentos.map((s) => (
            <li key={s.nome} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.cor }} />{s.nome} <Din v={s.valor} /></li>
          ))}
          {livre > 0 && <li className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-black/10" />Livre <Din v={livre} /></li>}
        </ul>
        <p className="mt-3 text-xs text-casa-muted">
          Defina um limite para cada categoria abaixo e um aporte mensal em cada <Link href={`/financas/caixinhas?mes=${mes}`} className="font-bold text-casa-principal underline">caixinha</Link>. Renda considerada: receitas lançadas em {nomeMes(mes)} (ou as entradas fixas, o que for maior).
        </p>
      </Secao>

      <Secao titulo="Limites por categoria" acao={<button className="btn-secundario" onClick={() => setEditar("despesa")}><Plus size={15} /> Categoria</button>}>
        <ul className="divide-y divide-casa-line">
          {despesas.map((c) => <LinhaCategoria key={c.id} c={c} gasto={gasto[c.id] ?? 0} onEditar={() => setEditar(c)} />)}
        </ul>
      </Secao>

      <Secao titulo="Categorias de receita" acao={<button className="btn-secundario" onClick={() => setEditar("receita")}><Plus size={15} /> Categoria</button>}>
        <div className="flex flex-wrap gap-2">
          {receitas.map((c) => (
            <button key={c.id} onClick={() => setEditar(c)} className="rounded-full border-2 px-3 py-1 text-sm font-bold" style={{ borderColor: `${c.cor}55`, color: c.cor }}>
              {c.emoji} {c.nome}
            </button>
          ))}
        </div>
      </Secao>

      <Modal aberto={editar !== null} onFechar={() => setEditar(null)} titulo={typeof editar === "string" ? "Nova categoria" : "Editar categoria"}>
        {editar !== null && (
          <FormCategoria categoria={typeof editar === "string" ? null : editar} tipo={typeof editar === "string" ? editar : editar.tipo} onFechar={() => setEditar(null)} />
        )}
      </Modal>
    </div>
  );
}

function LinhaCategoria({ c, gasto, onEditar }: { c: Categoria; gasto: number; onEditar: () => void }) {
  const [valor, setValor] = useState(c.orcamento_mensal ? String(c.orcamento_mensal).replace(".", ",") : "");
  const { rodar, pendente } = useAcao();
  const limite = c.orcamento_mensal;
  const estourou = limite !== null && gasto > limite;
  const salvar = () => {
    const n = valor ? parseValor(valor) : null;
    if ((n || null) !== (limite || null)) rodar(() => salvarOrcamento(c.id, n));
  };
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 py-3 sm:grid-cols-[minmax(0,14rem)_8rem_1fr_auto]">
      <span className="flex min-w-0 items-center gap-2 font-semibold">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base" style={{ background: `${c.cor}1f` }}>{c.emoji}</span>
        <span className="truncate">{c.nome}</span>
        <span className="rounded bg-casa-bg px-1 text-[10px] font-bold text-casa-muted">{c.natureza === "fixo" ? "fixo" : "var."}</span>
      </span>
      <div className="relative order-3 sm:order-none">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-casa-muted">R$</span>
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onBlur={salvar}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          inputMode="decimal"
          placeholder="sem limite"
          disabled={pendente}
          className="campo py-1.5 pl-8 text-right"
        />
      </div>
      <div className="order-4 col-span-2 sm:order-none sm:col-span-1">
        <div className="mb-1 flex justify-between text-xs">
          <span className={estourou ? "font-bold text-perigo" : "text-casa-muted"}><Din v={gasto} /> gastos</span>
          {limite !== null && <span className={estourou ? "font-bold text-perigo" : "text-casa-muted"}>{estourou ? <><Din v={gasto - limite} /> acima</> : <><Din v={limite - gasto} /> restantes</>}</span>}
        </div>
        <Barra valor={gasto} total={limite ?? Math.max(gasto, 1)} cor={estourou ? "#dc2626" : limite !== null && gasto / limite > 0.8 ? "#d97706" : c.cor} />
      </div>
      <button className="btn-fantasma p-1.5" onClick={onEditar} title="Editar categoria"><Pencil size={14} /></button>
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
        <p className="mt-1 text-xs text-casa-muted">Ao importar um extrato, linhas com essas palavras caem automaticamente nesta categoria.</p>
      </div>
      {erro && <p className="rounded-xl bg-perigoclaro px-3 py-2 text-sm text-perigo">{erro}</p>}
      <div className="flex justify-between gap-2">
        {categoria ? (
          <button type="button" className="btn-perigo" disabled={pendente} onClick={() => confirm(`Excluir a categoria "${categoria.nome}"? Os lançamentos ficam sem categoria.`) && rodar(() => excluirCategoria(categoria.id), onFechar)}>
            <Trash2 size={15} /> Excluir
          </button>
        ) : <span />}
        <button className="btn-primario" disabled={pendente}>{pendente ? "Salvando…" : "Salvar"}</button>
      </div>
    </form>
  );
}
