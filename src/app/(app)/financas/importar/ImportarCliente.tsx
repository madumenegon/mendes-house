"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { FileUp, Loader2, Sparkles } from "lucide-react";
import { useAcao } from "@/components/useAcao";
import { FORMAS, moeda } from "@/lib/format";
import { dataCurta, mesDe } from "@/lib/datas";
import type { Cartao, Categoria, Pessoa, TipoLancamento } from "@/lib/types";
import { vencimentoFatura } from "@/lib/cartao";
import { importarLancamentos, type LinhaImportada } from "../actions";

interface Historico { data: string; valor: number; tipo: TipoLancamento; descricao: string; categoria_id: string | null }
interface Linha extends LinhaImportada { incluir: boolean; duplicada: boolean }

const normalizar = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\d+/g, "").replace(/\s+/g, " ").trim();

export function ImportarCliente({
  categorias, historico, cartoes, temIA,
}: { categorias: Categoria[]; historico: Historico[]; cartoes: Cartao[]; temIA: boolean }) {
  const ativos = cartoes.filter((c) => c.ativo);
  const [tipoDoc, setTipoDoc] = useState<"extrato" | "fatura">("extrato");
  const [cartaoId, setCartaoId] = useState(ativos[0]?.id ?? "");
  const [vencimento, setVencimento] = useState("");
  const [faturaPaga, setFaturaPaga] = useState(false);
  const ehFatura = tipoDoc === "fatura" && !!cartaoId;
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [lendo, setLendo] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [erroLeitura, setErroLeitura] = useState<string | null>(null);
  const [pessoaPadrao, setPessoaPadrao] = useState<Pessoa>("casal");
  const [formaPadrao, setFormaPadrao] = useState("debito");
  const [concluido, setConcluido] = useState<string | null>(null);
  const { rodar, pendente, erro } = useAcao();

  const sugerirCategoria = (descricao: string, tipo: TipoLancamento) => {
    const n = normalizar(descricao);
    const anterior = historico.find((h) => h.tipo === tipo && h.categoria_id && normalizar(h.descricao) === n);
    if (anterior) return anterior.categoria_id;
    const cats = categorias.filter((c) => c.tipo === tipo);
    for (const c of cats) {
      const chaves = c.palavras_chave.split(",").map((k) => normalizar(k)).filter(Boolean);
      if (chaves.some((k) => n.includes(k))) return c.id;
    }
    return cats.find((c) => /^outr/i.test(c.nome))?.id ?? null;
  };

  const enviar = async (arquivo: File) => {
    setLendo(true);
    setErroLeitura(null);
    setInfo(null);
    setConcluido(null);
    try {
      let json: { transacoes: { data: string; descricao: string; valor: number; tipo: TipoLancamento }[]; metodo: string; aviso?: string };
      if (/\.(xlsx|xls|csv)$/i.test(arquivo.name)) {
        // planilha: lida aqui mesmo no navegador
        const { lerPlanilha } = await import("@/lib/planilha");
        json = { ...lerPlanilha(await arquivo.arrayBuffer()), metodo: "planilha" };
      } else {
        const fd = new FormData();
        fd.append("arquivo", arquivo);
        const resp = await fetch("/api/extrato", { method: "POST", body: fd });
        json = await resp.json();
        if (!resp.ok) throw new Error((json as unknown as { erro?: string }).erro ?? "Falha ao ler o arquivo.");
      }
      let lidas = json.transacoes;
      // na fatura, compras vêm positivas (seriam lidas como entrada): inverte
      const inverter = ehFatura && (json.metodo === "texto" || (json.metodo === "planilha" && !json.aviso));
      if (inverter) lidas = lidas.map((t) => ({ ...t, tipo: t.tipo === "receita" ? "despesa" : "receita" }));
      const cartaoSel = ativos.find((c) => c.id === cartaoId);
      if (ehFatura && cartaoSel && lidas.length) {
        const ultima = lidas.map((t) => t.data).sort().at(-1)!;
        setVencimento(vencimentoFatura(ultima, cartaoSel));
      }
      if (!lidas.length) {
        setErroLeitura("Não encontrei transações neste arquivo. " + (temIA ? "" : "Sem a leitura inteligente (IA), só funciona com extratos em texto no formato “dd/mm descrição valor”."));
        setLinhas(null);
        return;
      }
      const catMap = new Map(categorias.map((c) => [c.id, c]));
      setLinhas(
        lidas.map((t) => {
          const categoria_id = sugerirCategoria(t.descricao, t.tipo);
          const duplicada = historico.some((h) => h.data === t.data && h.tipo === t.tipo && Math.abs(h.valor - t.valor) < 0.005);
          return {
            ...t,
            categoria_id,
            natureza: (categoria_id && catMap.get(categoria_id)?.natureza) || "variavel",
            pessoa: pessoaPadrao,
            forma: formaPadrao,
            // na fatura, créditos costumam ser o pagamento da fatura anterior: vêm desmarcados
            incluir: !duplicada && !(ehFatura && t.tipo === "receita"),
            duplicada,
          };
        })
      );
      setInfo(`${lidas.length} transações encontradas (${json.metodo === "ia" ? "leitura inteligente" : json.metodo === "planilha" ? "planilha" : "leitura simples"}).${json.aviso ? " " + json.aviso : ""}`);
    } catch (e) {
      setErroLeitura(e instanceof Error ? e.message : "Falha ao ler o PDF.");
    } finally {
      setLendo(false);
    }
  };

  const atualizar = (i: number, campos: Partial<Linha>) =>
    setLinhas((ls) => ls && ls.map((l, j) => (j === i ? { ...l, ...campos } : l)));
  const aplicarATodas = (campos: Partial<Linha>) => setLinhas((ls) => ls && ls.map((l) => ({ ...l, ...campos })));

  const selecionadas = linhas?.filter((l) => l.incluir) ?? [];
  const totalSaidas = selecionadas.filter((l) => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0);
  const totalEntradas = selecionadas.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valor, 0);
  const meses = ehFatura && vencimento ? [mesDe(vencimento)] : Array.from(new Set(selecionadas.map((l) => mesDe(l.data))));

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <p className="rotulo">Que PDF é este?</p>
          <div className="flex rounded-xl bg-casa-bg p-0.5">
            {([["extrato", "🏦 Extrato da conta"], ["fatura", "💳 Fatura do cartão"]] as const).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => { setTipoDoc(v); setLinhas(null); }}
                className={clsx("rounded-lg px-3 py-1.5 text-sm font-semibold", tipoDoc === v ? "bg-white shadow-sm" : "text-casa-muted")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {tipoDoc === "fatura" && (ativos.length === 0 ? (
          <p className="text-sm text-casa-muted">
            Cadastre o cartão em <Link href="/financas/cartoes" className="font-bold text-casa-principal underline">💳 Cartões</Link> primeiro.
          </p>
        ) : (
          <>
            <div className="min-w-44">
              <label className="rotulo">Cartão</label>
              <select value={cartaoId} onChange={(e) => setCartaoId(e.target.value)} className="campo">
                {ativos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="rotulo">Vencimento da fatura</label>
              <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className="campo" />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm font-semibold">
              <input type="checkbox" checked={faturaPaga} onChange={(e) => setFaturaPaga(e.target.checked)} className="h-4 w-4 accent-casa-principal" />
              Já está paga
            </label>
            <p className="w-full text-xs text-casa-muted">
              As compras guardam a data em que foram feitas, mas contam no mês do vencimento (é quando o dinheiro sai). O vencimento é sugerido depois de ler o PDF.
            </p>
          </>
        ))}
      </div>

      <label
        className={clsx(
          "card flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed p-8 text-center transition hover:border-casa-principal hover:bg-casa-principalclaro/30",
          lendo && "pointer-events-none opacity-70"
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) enviar(f); }}
      >
        <input type="file" accept="application/pdf,.pdf,.xlsx,.xls,.csv,image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) enviar(f); e.target.value = ""; }} />
        {lendo ? <Loader2 className="animate-spin text-casa-principal" size={36} /> : <FileUp className="text-casa-principal" size={36} />}
        <p className="font-display text-lg font-semibold">{lendo ? "Lendo o arquivo…" : "Clique ou arraste o extrato ou a fatura"}</p>
        <p className="flex items-center gap-1 text-xs text-casa-muted">
          📄 PDF · 📊 Excel ou CSV · 📷 foto/print{temIA ? <> · <Sparkles size={13} className="text-casa-destaqueescuro" /> leitura inteligente ativada</> : " (fotos precisam da leitura inteligente)"}
        </p>
      </label>

      {erroLeitura && <p className="rounded-xl bg-perigoclaro px-3 py-2 text-sm text-perigo">{erroLeitura}</p>}
      {concluido && (
        <p className="rounded-xl bg-okclaro px-3 py-2 text-sm font-semibold text-ok">
          {concluido} <Link href={`/financas/lancamentos?mes=${meses[0] ?? ""}`} className="underline">Ver lançamentos →</Link>
        </p>
      )}

      {linhas && (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-casa-line p-4">
            <div>
              <p className="font-display text-lg font-semibold">Revise antes de importar</p>
              {info && <p className="text-xs text-casa-muted">{info} Linhas já lançadas (mesma data e valor) vêm desmarcadas.</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <select className="campo w-auto py-1.5" value={pessoaPadrao} onChange={(e) => { setPessoaPadrao(e.target.value as Pessoa); aplicarATodas({ pessoa: e.target.value as Pessoa }); }}>
                <option value="casal">Todas: Casal</option>
                <option value="madu">Todas: Madu</option>
                <option value="gabriel">Todas: Gabriel</option>
              </select>
              <select className="campo w-auto py-1.5" value={formaPadrao} onChange={(e) => { setFormaPadrao(e.target.value); aplicarATodas({ forma: e.target.value }); }}>
                {Object.entries(FORMAS).map(([k, v]) => <option key={k} value={k}>Todas: {v}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-casa-bg/70 text-left text-[11px] uppercase tracking-wide text-casa-muted">
                <tr>
                  <th className="p-2 pl-4"><input type="checkbox" className="accent-casa-principal" checked={selecionadas.length === linhas.length} onChange={(e) => aplicarATodas({ incluir: e.target.checked })} /></th>
                  <th className="p-2">Data</th>
                  <th className="p-2">Descrição</th>
                  <th className="p-2 text-right">Valor</th>
                  <th className="p-2">Categoria</th>
                  <th className="p-2">Tipo de custo</th>
                  <th className="p-2 pr-4">De quem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-casa-line">
                {linhas.map((l, i) => (
                  <tr key={i} className={clsx(!l.incluir && "opacity-45")}>
                    <td className="p-2 pl-4"><input type="checkbox" className="accent-casa-principal" checked={l.incluir} onChange={(e) => atualizar(i, { incluir: e.target.checked })} /></td>
                    <td className="whitespace-nowrap p-2 tabular-nums">{dataCurta(l.data)}</td>
                    <td className="p-2">
                      <input value={l.descricao} onChange={(e) => atualizar(i, { descricao: e.target.value })} className="w-full min-w-48 rounded-lg border border-transparent px-1.5 py-1 hover:border-casa-line focus:border-casa-principal focus:outline-none" />
                      {l.duplicada && <span className="ml-1.5 rounded bg-alertaclaro px-1.5 text-[10px] font-bold text-alerta">já lançado?</span>}
                    </td>
                    <td className={clsx("whitespace-nowrap p-2 text-right font-bold tabular-nums", l.tipo === "receita" ? "text-ok" : "")}>
                      <button type="button" title="Inverter entrada/saída" onClick={() => atualizar(i, { tipo: l.tipo === "receita" ? "despesa" : "receita", categoria_id: null })}>
                        {l.tipo === "receita" ? "+" : "−"}{moeda(l.valor)}
                      </button>
                    </td>
                    <td className="p-2">
                      <select
                        value={l.categoria_id ?? ""}
                        onChange={(e) => {
                          const c = categorias.find((x) => x.id === e.target.value);
                          atualizar(i, { categoria_id: e.target.value || null, ...(c ? { natureza: c.natureza } : {}) });
                        }}
                        className="campo py-1 text-xs"
                      >
                        <option value="">—</option>
                        {categorias.filter((c) => c.tipo === l.tipo).map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.nome}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      {l.tipo === "despesa" ? (
                        <select value={l.natureza} onChange={(e) => atualizar(i, { natureza: e.target.value as "fixo" | "variavel" })} className="campo py-1 text-xs">
                          <option value="fixo">Fixo</option>
                          <option value="variavel">Variável</option>
                        </select>
                      ) : <span className="text-xs text-casa-muted">—</span>}
                    </td>
                    <td className="p-2 pr-4">
                      <select value={l.pessoa} onChange={(e) => atualizar(i, { pessoa: e.target.value as Pessoa })} className="campo py-1 text-xs">
                        <option value="casal">Casal</option>
                        <option value="madu">Madu</option>
                        <option value="gabriel">Gabriel</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-casa-line bg-casa-bg/50 p-4">
            <p className="text-sm">
              <b>{selecionadas.length}</b> selecionadas · <span className="font-bold text-ok">+{moeda(totalEntradas)}</span> · <span className="font-bold text-madu">−{moeda(totalSaidas)}</span>
            </p>
            {erro && <p className="text-sm text-perigo">{erro}</p>}
            <button
              className="btn-primario"
              disabled={pendente || !selecionadas.length}
              onClick={() =>
                rodar(async () => {
                  const r = await importarLancamentos(selecionadas.map((l) => ({
                    data: l.data, descricao: l.descricao, valor: l.valor, tipo: l.tipo,
                    categoria_id: l.categoria_id, natureza: l.natureza, pessoa: l.pessoa, forma: l.forma,
                  })), ehFatura ? { cartao_id: cartaoId, vencimento, pago: faturaPaga } : undefined);
                  if (!r.erro) {
                    setConcluido(ehFatura ? `${r.inseridos} compras importadas na fatura que vence em ${dataCurta(vencimento)}.` : `${r.inseridos} lançamentos importados como pagos/recebidos.`);
                    setLinhas(null);
                  }
                  return r;
                })
              }
            >
              {pendente ? "Importando…" : `Importar ${selecionadas.length} lançamentos`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
