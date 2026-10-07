"use client";

import { useState } from "react";
import clsx from "clsx";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Segmentos } from "@/components/Escolhas";
import { useAcao } from "@/components/useAcao";
import { DonoBadge, Vazio } from "@/components/ui";
import { CORES, FORMAS, NOMES, moeda } from "@/lib/format";
import { dataCurta, dataLonga, nomeMes } from "@/lib/datas";
import { vencimentoFatura } from "@/lib/cartao";
import type { Cartao, Categoria, Lancamento, MembroId, Natureza, Pessoa, TipoLancamento } from "@/lib/types";
import { excluirLancamento, salvarLancamento } from "../actions";
import { BotaoPago } from "../BotaoPago";

const PESSOAS: { valor: Pessoa; label: string; cor: string }[] = [
  { valor: "casal", label: "Casal", cor: CORES.casal },
  { valor: "madu", label: "Madu", cor: CORES.madu },
  { valor: "gabriel", label: "Gabriel", cor: CORES.gabriel },
];

type Filtro = "todos" | "receita" | "despesa" | "aberto" | "fixo" | "variavel";

export function LancamentosCliente({
  lancamentos, categorias, cartoes, membro, dataPadrao,
}: { lancamentos: Lancamento[]; categorias: Categoria[]; cartoes: Cartao[]; membro: MembroId; dataPadrao: string }) {
  const [editar, setEditar] = useState<Lancamento | TipoLancamento | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [categoria, setCategoria] = useState("");
  const [busca, setBusca] = useState("");
  const catMap = new Map(categorias.map((c) => [c.id, c]));
  const cartaoMap = new Map(cartoes.map((c) => [c.id, c]));

  const lista = lancamentos.filter((l) => {
    if (filtro === "receita" || filtro === "despesa") { if (l.tipo !== filtro) return false; }
    else if (filtro === "aberto") { if (l.pago) return false; }
    else if (filtro === "fixo" || filtro === "variavel") { if (l.tipo !== "despesa" || l.natureza !== filtro) return false; }
    if (categoria && l.categoria_id !== categoria) return false;
    if (busca && !l.descricao.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });
  const entradas = lista.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valor, 0);
  const saidas = lista.filter((l) => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0);
  const datas = Array.from(new Set(lista.map((l) => l.data))).sort().reverse();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button className="btn bg-ok text-white hover:brightness-95" onClick={() => setEditar("receita")}><Plus size={16} /> Receita</button>
        <button className="btn bg-madu text-white hover:brightness-95" onClick={() => setEditar("despesa")}><Minus size={16} /> Despesa</button>
        <div className="relative min-w-40 flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-casa-muted" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar…" className="campo pl-9" />
        </div>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="campo w-auto">
          <option value="">Todas as categorias</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.nome}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {([
            ["todos", "Todos"], ["receita", "Receitas"], ["despesa", "Despesas"], ["aberto", "Em aberto"], ["fixo", "Fixos"], ["variavel", "Variáveis"],
          ] as [Filtro, string][]).map(([f, l]) => (
            <button key={f} onClick={() => setFiltro(f)} className={clsx("rounded-full px-3 py-1 text-xs font-bold", filtro === f ? "bg-casa-principal text-white" : "bg-white text-casa-muted ring-1 ring-casa-line")}>{l}</button>
          ))}
        </div>
        <p className="text-sm">
          <span className="font-bold text-ok">+{moeda(entradas)}</span> · <span className="font-bold text-madu">−{moeda(saidas)}</span>
        </p>
      </div>

      {lista.length === 0 ? (
        <Vazio icone="🧾">Nenhum lançamento por aqui.</Vazio>
      ) : (
        <div className="space-y-3">
          {datas.map((d) => (
            <section key={d} className="card overflow-hidden">
              <h3 className="bg-casa-bg/70 px-4 py-1.5 text-xs font-bold text-casa-muted">{dataLonga(d)}</h3>
              <ul className="divide-y divide-casa-line">
                {lista.filter((l) => l.data === d).map((l) => {
                  const c = l.categoria_id ? catMap.get(l.categoria_id) : null;
                  return (
                    <li key={l.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-casa-bg/50 sm:px-4" onClick={() => setEditar(l)}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: `${c?.cor ?? "#94a3b8"}1f` }}>{c?.emoji ?? "💸"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{l.descricao}</p>
                        <p className="flex flex-wrap items-center gap-1.5 text-xs text-casa-muted">
                          {c?.nome ?? "Sem categoria"}
                          {l.tipo === "despesa" && <span className="rounded bg-casa-bg px-1 text-[10px] font-bold">{l.natureza === "fixo" ? "fixo" : "variável"}</span>}
                          · {l.cartao_id && cartaoMap.get(l.cartao_id) ? `💳 ${cartaoMap.get(l.cartao_id)!.nome}` : FORMAS[l.forma] ?? l.forma}
                          {l.data_compra && l.data_compra !== l.data && <span>· compra {dataCurta(l.data_compra)}</span>}
                          <DonoBadge dono={l.pessoa} pequeno />
                          {l.origem === "extrato" && <span title="Importado do extrato">📄</span>}
                          {l.origem === "recorrente" && <span title="Gerado das contas fixas">📌</span>}
                        </p>
                      </div>
                      <span className={clsx("whitespace-nowrap font-bold tabular-nums", l.tipo === "receita" ? "text-ok" : "text-casa-ink")}>
                        {l.tipo === "receita" ? "+" : "−"}{moeda(l.valor)}
                      </span>
                      <BotaoPago id={l.id} pago={l.pago} tipo={l.tipo} compacto />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Modal
        aberto={editar !== null}
        onFechar={() => setEditar(null)}
        titulo={typeof editar === "string" ? (editar === "receita" ? "Nova receita" : "Nova despesa") : "Editar lançamento"}
      >
        {editar !== null && (
          <FormLancamento
            lancamento={typeof editar === "string" ? null : editar}
            tipoInicial={typeof editar === "string" ? editar : editar.tipo}
            categorias={categorias}
            cartoes={cartoes}
            membro={membro}
            dataPadrao={dataPadrao}
            onFechar={() => setEditar(null)}
          />
        )}
      </Modal>
    </div>
  );
}

export function FormLancamento({
  lancamento, tipoInicial, categorias, cartoes, membro, dataPadrao, onFechar,
}: { lancamento: Lancamento | null; tipoInicial: TipoLancamento; categorias: Categoria[]; cartoes: Cartao[]; membro: MembroId; dataPadrao: string; onFechar: () => void }) {
  const l = lancamento;
  const ativos = cartoes.filter((c) => c.ativo || c.id === l?.cartao_id);
  const [cartaoId, setCartaoId] = useState(l?.cartao_id ?? ativos[0]?.id ?? "");
  const [dataInformada, setDataInformada] = useState(l?.data_compra ?? l?.data ?? dataPadrao);
  const [tipo, setTipo] = useState<TipoLancamento>(tipoInicial);
  const [pessoa, setPessoa] = useState<Pessoa>(l?.pessoa ?? (tipoInicial === "receita" ? membro : "casal"));
  const [categoriaId, setCategoriaId] = useState(l?.categoria_id ?? "");
  const [natureza, setNatureza] = useState<Natureza>(l?.natureza ?? "variavel");
  const [forma, setForma] = useState(l?.forma ?? (tipoInicial === "receita" ? "transferencia" : "pix"));
  const noCartao = tipo === "despesa" && forma === "credito";
  const cartaoSel = ativos.find((c) => c.id === cartaoId);
  const { pendente, erro, rodar } = useAcao();
  const cats = categorias.filter((c) => c.tipo === tipo);

  const escolherCategoria = (id: string) => {
    setCategoriaId(id);
    const c = categorias.find((x) => x.id === id);
    if (c) {
      setNatureza(c.natureza);
      if (c.tipo === "receita" && /vale/i.test(c.nome)) setForma("vale");
    }
  };

  return (
    <form action={(fd) => rodar(() => salvarLancamento(fd), onFechar)} className="space-y-4">
      {l && <input type="hidden" name="id" value={l.id} />}
      <Segmentos
        opcoes={[{ valor: "despesa", label: "Despesa", cor: CORES.madu }, { valor: "receita", label: "Receita", cor: "#16a34a" }]}
        valor={tipo}
        onChange={(t) => { setTipo(t); setCategoriaId(""); }}
        nome="tipo"
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="rotulo">Descrição</label>
          <input name="descricao" defaultValue={l?.descricao} className="campo" required placeholder={tipo === "receita" ? "Ex.: Salário Gabriel" : "Ex.: Conta de luz"} />
        </div>
        <div>
          <label className="rotulo">Valor (R$)</label>
          <input name="valor" inputMode="decimal" defaultValue={l ? String(l.valor).replace(".", ",") : ""} className="campo text-lg font-bold" required placeholder="0,00" />
        </div>
        <div>
          <label className="rotulo">{tipo === "receita" ? "Data" : noCartao ? "Data da compra" : "Vencimento / data"}</label>
          <input type="date" name="data" value={dataInformada} onChange={(e) => setDataInformada(e.target.value)} className="campo" required />
        </div>
      </div>

      <div>
        <label className="rotulo">Categoria</label>
        <input type="hidden" name="categoria_id" value={categoriaId} />
        <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
          {cats.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => escolherCategoria(c.id)}
              className="rounded-full border-2 px-2.5 py-1 text-xs font-bold"
              style={categoriaId === c.id ? { borderColor: c.cor, background: `${c.cor}1c`, color: c.cor } : { borderColor: "#f0e2c4", color: "#5c534c" }}
            >
              {c.emoji} {c.nome}
            </button>
          ))}
        </div>
      </div>

      {tipo === "despesa" && (
        <div>
          <label className="rotulo">Tipo de custo</label>
          <Segmentos
            opcoes={[{ valor: "fixo", label: "📌 Fixo (todo mês)", cor: "#6366f1" }, { valor: "variavel", label: "🌀 Variável", cor: "#f97316" }]}
            valor={natureza}
            onChange={setNatureza}
            nome="natureza"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo">Forma</label>
          <select name="forma" value={forma} onChange={(e) => setForma(e.target.value)} className="campo">
            {Object.entries(FORMAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {!l && tipo === "despesa" && (
          <div>
            <label className="rotulo">Parcelas</label>
            <input name="parcelas" type="number" min={1} max={48} defaultValue={1} className="campo" />
          </div>
        )}
      </div>

      {noCartao && (
        <div className="rounded-2xl bg-casa-destaqueclaro p-3">
          {ativos.length === 0 ? (
            <p className="text-sm">
              Cadastre seus cartões na aba <b>💳 Cartões</b> para a compra ir sozinha para a fatura certa. Sem cartão, ela fica na data informada.
            </p>
          ) : (
            <>
              <label className="rotulo">Qual cartão?</label>
              <select name="cartao_id" value={cartaoId} onChange={(e) => setCartaoId(e.target.value)} className="campo">
                {ativos.map((c) => <option key={c.id} value={c.id}>{c.nome} (fecha dia {c.dia_fechamento}, vence dia {c.dia_vencimento})</option>)}
              </select>
              {l && l.cartao_id && (
                <div className="mt-3">
                  <label className="rotulo">Vencimento da fatura</label>
                  <input type="date" name="vencimento_fatura" defaultValue={l.data} className="campo" />
                  <p className="mt-1 text-xs text-casa-muted">Mude aqui se a compra caiu na fatura errada.</p>
                </div>
              )}
              {!(l && l.cartao_id) && cartaoSel && dataInformada && (
                <p className="mt-2 text-sm">
                  💳 Entra na fatura que vence em <b>{dataCurta(vencimentoFatura(dataInformada, cartaoSel))}</b> — conta no mês de{" "}
                  <b>{nomeMes(vencimentoFatura(dataInformada, cartaoSel).slice(0, 7))}</b>.
                </p>
              )}
            </>
          )}
        </div>
      )}

      <div>
        <label className="rotulo">{tipo === "receita" ? "De quem é a receita" : "De quem é o gasto"}</label>
        <Segmentos opcoes={PESSOAS} valor={pessoa} onChange={setPessoa} nome="pessoa" />
      </div>

      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="pago" defaultChecked={l?.pago ?? false} className="h-4 w-4 accent-casa-principal" />
        {tipo === "receita" ? "Já recebemos" : "Já está pago"}
      </label>

      <div>
        <label className="rotulo">Observação</label>
        <input name="observacao" defaultValue={l?.observacao} className="campo" />
      </div>

      {l && (
        <p className="rounded-xl bg-casa-bg px-3 py-2 text-xs text-casa-muted">
          Lançado por <b>{l.created_by ? NOMES[l.created_by] : "—"}</b> em {new Date(l.created_at).toLocaleDateString("pt-BR")}
          {l.pago && l.pago_por && <> · {l.tipo === "receita" ? "recebido" : "pago"} marcado por <b>{NOMES[l.pago_por]}</b></>}
          {l.origem === "recorrente" && " · gerado pelas contas fixas"}
          {l.origem === "extrato" && " · importado do extrato"}
        </p>
      )}

      {erro && <p className="rounded-xl bg-perigoclaro px-3 py-2 text-sm text-perigo">{erro}</p>}
      <div className="flex justify-between gap-2">
        {l ? (
          <button type="button" className="btn-perigo" disabled={pendente} onClick={() => confirm("Excluir este lançamento?") && rodar(() => excluirLancamento(l.id), onFechar)}>
            <Trash2 size={15} /> Excluir
          </button>
        ) : <span />}
        <button className="btn-primario" disabled={pendente}>{pendente ? "Salvando…" : "Salvar"}</button>
      </div>
    </form>
  );
}
