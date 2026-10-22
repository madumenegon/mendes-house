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
import { limiteCategoria } from "@/lib/orcamento";
import type { Caixinha, Categoria, Natureza, TipoLancamento } from "@/lib/types";
import { excluirCategoria, salvarCategoria, salvarOrcamento } from "../actions";
import { Din, useMoeda } from "@/components/Privacidade";

export function OrcamentoCliente({
  mes, categorias, gasto, renda, caixinhas,
}: { mes: string; categorias: Categoria[]; gasto: Record<string, number>; renda: number; caixinhas: Caixinha[] }) {
  const [editar, setEditar] = useState<Categoria | TipoLancamento | null>(null);
  const fmt = useMoeda();
  // categorias com limite primeiro, depois as que mais gastam
  const despesas = categorias
    .filter((c) => c.tipo === "despesa")
    .sort((a, b) => Number(!!limiteCategoria(b, renda)) - Number(!!limiteCategoria(a, renda)) || (gasto[b.id] ?? 0) - (gasto[a.id] ?? 0));
  const receitas = categorias.filter((c) => c.tipo === "receita");
  const comLimite = despesas.filter((c) => limiteCategoria(c, renda));
  const totalLimites = comLimite.reduce((s, c) => s + (limiteCategoria(c, renda) ?? 0), 0);
  const aportes = caixinhas.reduce((s, c) => s + (c.aporte_mensal ?? 0), 0);
  const destinado = totalLimites + aportes;
  const livre = renda - destinado;
  const base = Math.max(renda, destinado, 1);

  const segmentos = [
    ...comLimite.map((c) => ({ nome: `${c.emoji} ${c.nome}`, valor: limiteCategoria(c, renda) ?? 0, cor: c.cor })),
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
          Defina quanto da renda vai para cada categoria (em % ou em R$) e um aporte mensal em cada <Link href={`/financas/caixinhas?mes=${mes}`} className="font-bold text-casa-principal underline">caixinha</Link>.
          Renda considerada: <b>salários e outras rendas, sem os vales</b>, lançados em {nomeMes(mes)} (ou as entradas fixas, o que for maior).
        </p>
      </Secao>

      <Secao titulo="Limites por categoria" acao={<button className="btn-secundario" onClick={() => setEditar("despesa")}><Plus size={15} /> Categoria</button>}>
        <p className="-mt-1 mb-2 text-xs text-casa-muted">
          Coloque o <b>%</b> da renda (o app calcula o valor) <b>ou</b> um valor fixo em <b>R$</b>. Gastos pagos com vale não entram aqui — veja na aba 🥗 Vale.
        </p>
        <div className="hidden grid-cols-[minmax(0,14rem)_5rem_8rem_1fr_auto] gap-x-3 pb-1 text-[11px] font-bold uppercase text-casa-muted sm:grid">
          <span>Categoria</span><span className="text-right">% renda</span><span className="text-right">Limite R$</span><span>Gasto no mês</span><span />
        </div>
        <ul className="divide-y divide-casa-line">
          {despesas.map((c) => <LinhaCategoria key={c.id} c={c} gasto={gasto[c.id] ?? 0} renda={renda} onEditar={() => setEditar(c)} />)}
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

// referência comum de orçamento doméstico, só como sugestão no campo vazio
const SUGESTAO_PCT: Record<string, number> = {
  moradia: 30, transporte: 12, "dizimo e ofertas": 10, mercado: 12, "contas da casa": 8, "saude e plano": 8,
  educacao: 5, lazer: 5, "alimentacao fora": 5,
};
const chave = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function LinhaCategoria({ c, gasto, renda, onEditar }: { c: Categoria; gasto: number; renda: number; onEditar: () => void }) {
  const br = (n: number | null | undefined) => (n ? String(n).replace(".", ",") : "");
  const [pctTxt, setPctTxt] = useState(br(c.orcamento_pct));
  const [valor, setValor] = useState(c.orcamento_pct ? "" : br(c.orcamento_mensal));
  const { rodar, pendente, erro } = useAcao();
  const limite = limiteCategoria(c, renda);
  const estourou = limite !== null && gasto > limite;
  const pctDigitado = pctTxt ? parseValor(pctTxt) : null;

  const salvarPct = () => {
    const n = pctTxt ? parseValor(pctTxt) : null;
    if ((n || null) === (c.orcamento_pct || null)) return;
    if (n) setValor("");
    rodar(() => salvarOrcamento(c.id, n ? null : parseValor(valor) || null, n || null));
  };
  const salvarValor = () => {
    const n = valor ? parseValor(valor) : null;
    if (!c.orcamento_pct && (n || null) === (c.orcamento_mensal || null)) return;
    if (n) setPctTxt("");
    rodar(() => salvarOrcamento(c.id, n, null));
  };
  const enterSai = (e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && e.currentTarget.blur();

  return (
    <li className="grid grid-cols-[1fr_5rem_7rem_auto] items-center gap-x-2 gap-y-1.5 py-3 sm:grid-cols-[minmax(0,14rem)_5rem_8rem_1fr_auto] sm:gap-x-3">
      <span className="col-span-4 flex min-w-0 items-center gap-2 font-semibold sm:col-span-1">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base" style={{ background: `${c.cor}1f` }}>{c.emoji}</span>
        <span className="truncate">{c.nome}</span>
        <span className="rounded bg-casa-bg px-1 text-[10px] font-bold text-casa-muted">{c.natureza === "fixo" ? "fixo" : "var."}</span>
      </span>
      <div className="relative">
        <input
          value={pctTxt}
          onChange={(e) => setPctTxt(e.target.value)}
          onBlur={salvarPct}
          onKeyDown={enterSai}
          inputMode="decimal"
          placeholder={SUGESTAO_PCT[chave(c.nome)] ? `ex. ${SUGESTAO_PCT[chave(c.nome)]}` : "—"}
          disabled={pendente}
          className="campo py-1.5 pr-6 text-right"
          title="% da renda"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-casa-muted">%</span>
      </div>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-casa-muted">R$</span>
        <input
          value={pctDigitado ? br(Math.round(renda * pctDigitado) / 100) : valor}
          onChange={(e) => { setValor(e.target.value); setPctTxt(""); }}
          onBlur={salvarValor}
          onKeyDown={enterSai}
          inputMode="decimal"
          placeholder="sem limite"
          disabled={pendente}
          readOnly={!!pctDigitado}
          className={`campo py-1.5 pl-8 text-right ${pctDigitado ? "bg-casa-bg text-casa-muted" : ""}`}
          title={pctDigitado ? "Calculado a partir do %" : "Valor fixo"}
        />
      </div>
      <button className="btn-fantasma p-1.5 sm:order-last" onClick={onEditar} title="Editar categoria"><Pencil size={14} /></button>
      <div className="col-span-4 sm:col-span-1">
        <div className="mb-1 flex justify-between text-xs">
          <span className={estourou ? "font-bold text-perigo" : "text-casa-muted"}><Din v={gasto} /> gastos</span>
          {limite !== null && <span className={estourou ? "font-bold text-perigo" : "text-casa-muted"}>{estourou ? <><Din v={gasto - limite} /> acima</> : <><Din v={limite - gasto} /> restantes</>}</span>}
        </div>
        <Barra valor={gasto} total={limite ?? Math.max(gasto, 1)} cor={estourou ? "#dc2626" : limite !== null && gasto / limite > 0.8 ? "#d97706" : c.cor} />
        {erro && <p className="mt-1 text-xs text-perigo">{erro}</p>}
      </div>
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
