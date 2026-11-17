"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import clsx from "clsx";
import { Din } from "@/components/Privacidade";
import { montarArvore, somarComFilhos, type No } from "@/lib/arvore";
import type { Categoria } from "@/lib/types";

const arred = (n: number) => Math.round(n * 100) / 100;

/** Situação de uma conta: quanto foi orçado (% da renda) e quanto já saiu. */
function situacao(n: No, gasto: Record<string, number>, renda: number) {
  const orcado = n.c.orcamento_pct ? arred((renda * n.c.orcamento_pct) / 100) : 0;
  const realizado = somarComFilhos(n, gasto);
  const uso = orcado > 0 ? realizado / orcado : realizado > 0 ? Infinity : 0;
  const cor = uso > 1 ? "#dc2626" : uso > 0.8 ? "#d97706" : n.c.cor;
  return { orcado, realizado, uso, cor };
}

/**
 * Orçado × realizado em árvore: grande conta → classe → subclasse.
 * `abrirAte` diz até que nível começa aberto (0 = só as grandes contas).
 */
export function Comparativo({
  categorias, gasto, renda, abrirAte = 0, semCategoria = 0,
}: { categorias: Categoria[]; gasto: Record<string, number>; renda: number; abrirAte?: number; semCategoria?: number }) {
  const arvore = montarArvore(categorias);
  const grandes = arvore.filter((n) => n.c.grande_conta);
  const soltas = arvore.filter((n) => !n.c.grande_conta);
  const foraTotal = soltas.reduce((s, n) => s + somarComFilhos(n, gasto), 0) + semCategoria;

  return (
    <div>
      <div className="hidden grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_minmax(0,10rem)] gap-x-3 border-b border-casa-line pb-1.5 text-[11px] font-bold uppercase text-casa-muted md:grid">
        <span>Conta</span><span className="text-right">Orçado</span><span className="text-right">Realizado</span><span>Uso do orçado</span>
      </div>
      <ul>{grandes.map((n) => <Linha key={n.c.id} n={n} gasto={gasto} renda={renda} abrirAte={abrirAte} />)}</ul>
      {foraTotal > 0 && (
        <div className="mt-2 flex items-center justify-between rounded-xl bg-casa-bg/70 px-3 py-2 text-sm">
          <span className="text-casa-muted">💸 Fora do orçado (sem categoria ou fora da arquitetura)</span>
          <b className="tabular-nums"><Din v={foraTotal} /></b>
        </div>
      )}
    </div>
  );
}

function Linha({ n, gasto, renda, abrirAte }: { n: No; gasto: Record<string, number>; renda: number; abrirAte: number }) {
  const [aberto, setAberto] = useState(n.nivel < abrirAte);
  const { orcado, realizado, uso, cor } = situacao(n, gasto, renda);
  const temFilhos = n.filhos.length > 0;
  const resta = orcado - realizado;

  return (
    <li>
      <div
        onClick={() => temFilhos && setAberto(!aberto)}
        className={clsx(
          "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-casa-line/70 py-2.5 md:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_minmax(0,10rem)]",
          temFilhos && "cursor-pointer hover:bg-casa-bg/50",
        )}
      >
        <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: n.nivel * 20 }}>
          <ChevronRight size={14} className={clsx("shrink-0 text-casa-muted transition", aberto && "rotate-90", !temFilhos && "invisible")} />
          <span className={clsx("flex shrink-0 items-center justify-center rounded-lg", n.nivel === 0 ? "h-8 w-8 text-base" : "h-6 w-6 text-xs")} style={{ background: `${n.c.cor}22` }}>{n.c.emoji}</span>
          <span className={clsx("truncate", n.nivel === 0 ? "font-bold" : n.nivel === 1 ? "font-semibold" : "text-sm")}>{n.c.nome}</span>
        </div>
        <span className="text-right text-sm tabular-nums text-casa-muted md:order-none">{orcado > 0 ? <Din v={orcado} /> : "—"}</span>
        <span className="hidden text-right text-sm font-bold tabular-nums md:block"><Din v={realizado} /></span>
        <div className="col-span-2 md:col-span-1" style={{ paddingLeft: n.nivel * 20 }}>
          <div className="mb-0.5 flex justify-between text-[11px]">
            <span className="font-bold md:hidden"><Din v={realizado} /></span>
            <span className={uso > 1 ? "font-bold text-perigo" : "text-casa-muted"}>
              {orcado > 0 ? (resta >= 0 ? <>resta <Din v={resta} /></> : <>passou <Din v={-resta} /></>) : realizado > 0 ? "sem orçado" : ""}
            </span>
            <span className={clsx("tabular-nums", uso > 1 ? "font-bold text-perigo" : "text-casa-muted")}>{orcado > 0 ? `${Math.round(uso * 100)}%` : ""}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/[0.06]">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (uso === Infinity ? 1 : uso) * 100)}%`, background: cor }} />
          </div>
        </div>
      </div>
      {aberto && temFilhos && <ul>{n.filhos.map((f) => <Linha key={f.c.id} n={f} gasto={gasto} renda={renda} abrirAte={abrirAte} />)}</ul>}
    </li>
  );
}

/** As contas que passaram (ou estão perto) do orçado, da mais estourada para a menos. */
export function Alertas({ categorias, gasto, renda }: { categorias: Categoria[]; gasto: Record<string, number>; renda: number }) {
  const lista: { n: No; orcado: number; realizado: number; uso: number }[] = [];
  const visitar = (n: No) => {
    const s = situacao(n, gasto, renda);
    if (n.nivel > 0 && s.orcado > 0 && s.uso > 0.8) lista.push({ n, ...s });
    n.filhos.forEach(visitar);
  };
  montarArvore(categorias).filter((n) => n.c.grande_conta).forEach(visitar);
  lista.sort((a, b) => b.uso - a.uso);
  if (lista.length === 0) return <p className="text-sm text-casa-muted">Tudo dentro do orçado até agora. 🎉</p>;
  return (
    <ul className="space-y-2">
      {lista.slice(0, 8).map(({ n, orcado, realizado, uso }) => (
        <li key={n.c.id} className="flex items-center gap-2 text-sm">
          <span className="text-base">{n.c.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{n.c.nome}</p>
            <p className="text-xs tabular-nums text-casa-muted"><Din v={realizado} /> de <Din v={orcado} /></p>
          </div>
          <span className={clsx("w-12 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold", uso > 1 ? "bg-perigoclaro text-perigo" : "bg-alertaclaro text-alerta")}>
            {Math.round(uso * 100)}%
          </span>
        </li>
      ))}
    </ul>
  );
}
