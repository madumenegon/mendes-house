"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Secao, StatTile } from "@/components/ui";
import { Din, useMoeda, useOcultar } from "@/components/Privacidade";
import { dataCurta, hojeISO, inicioDoMes, mesDe, nomeMes, somarMeses } from "@/lib/datas";
import type { TipoLancamento } from "@/lib/types";

export type GrupoProjecao = "receita" | "fixa" | "cartao" | "outra";

export interface ItemProjecao {
  id: string;
  mes: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: TipoLancamento;
  pago: boolean;
  previsto: boolean; // conta fixa ainda não lançada
  grupo: GrupoProjecao;
  emoji: string;
  categoria: string;
  cartao: string | null;
  forma: string;
}

const GRUPOS: Record<GrupoProjecao, { nome: string; cor: string }> = {
  receita: { nome: "Receitas", cor: "#16a34a" },
  fixa: { nome: "Contas fixas", cor: "#6366f1" },
  cartao: { nome: "Cartão (faturas e parcelas)", cor: "#e0601a" },
  outra: { nome: "Outras despesas", cor: "#c0398a" },
};
const DESPESAS: GrupoProjecao[] = ["fixa", "cartao", "outra"];

interface Mes {
  mes: string;
  receitas: number;
  porGrupo: Record<GrupoProjecao, number>;
  despesas: number;
  saldo: number;
  acumulado: number;
}

export function ProjecoesCliente({ mes, meses, horizonte, itens }: { mes: string; meses: string[]; horizonte: number; itens: ItemProjecao[] }) {
  const [sel, setSel] = useState(meses[0]);
  let acc = 0;
  const resumo: Mes[] = meses.map((m) => {
    const doMes = itens.filter((i) => i.mes === m);
    const porGrupo = { receita: 0, fixa: 0, cartao: 0, outra: 0 } as Record<GrupoProjecao, number>;
    for (const i of doMes) porGrupo[i.grupo] += i.valor;
    const despesas = porGrupo.fixa + porGrupo.cartao + porGrupo.outra;
    const saldo = porGrupo.receita - despesas;
    acc += saldo;
    return { mes: m, receitas: porGrupo.receita, porGrupo, despesas, saldo, acumulado: acc };
  });
  const totRec = resumo.reduce((s, r) => s + r.receitas, 0);
  const totDesp = resumo.reduce((s, r) => s + r.despesas, 0);
  const apertado = resumo.reduce((a, b) => (b.saldo < a.saldo ? b : a), resumo[0]);
  const ant = mesDe(somarMeses(inicioDoMes(mes), -1));
  const prox = mesDe(somarMeses(inicioDoMes(mes), 1));
  const atual = mesDe(hojeISO());
  const url = (m: string, n = horizonte) => `/financas/projecoes?mes=${m}&meses=${n}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-2xl bg-white p-1 ring-1 ring-casa-line">
          <Link href={url(ant)} className="btn-fantasma p-1.5" title="Começar um mês antes"><ChevronLeft size={16} /></Link>
          <span className="min-w-40 text-center text-sm font-bold">A partir de {nomeMes(mes)}</span>
          <Link href={url(prox)} className="btn-fantasma p-1.5" title="Começar um mês depois"><ChevronRight size={16} /></Link>
          {mes !== atual && <Link href={url(atual)} className="btn-fantasma px-2 py-1 text-xs">Hoje</Link>}
        </div>
        <div className="flex gap-1 rounded-2xl bg-white p-1 ring-1 ring-casa-line">
          {[3, 6, 12].map((n) => (
            <Link key={n} href={url(mes, n)} className={clsx("rounded-xl px-3 py-1.5 text-sm font-bold", n === horizonte ? "bg-casa-principal text-white" : "text-casa-muted hover:bg-casa-bg")}>
              {n} meses
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile rotulo="Receitas previstas" valor={<Din v={totRec} />} icone="💼" cor="#16a34a" detalhe={`em ${horizonte} meses`} />
        <StatTile rotulo="Despesas previstas" valor={<Din v={totDesp} />} icone="🧾" cor="#e8508a" detalhe="fixas, cartão e já lançadas" />
        <StatTile rotulo="Sobra no período" valor={<Din v={totRec - totDesp} />} icone={totRec - totDesp >= 0 ? "😊" : "😬"} cor={totRec - totDesp >= 0 ? "#e0601a" : "#dc2626"} destaque
          detalhe="antes dos gastos do dia a dia" />
        <StatTile rotulo="Mês mais apertado" valor={nomeMes(apertado.mes, true)} icone="⚠️" cor="#d97706" detalhe={<>sobra <Din v={apertado.saldo} /></>} />
      </div>

      <Secao titulo="Mês a mês">
        <Grafico resumo={resumo} sel={sel} onSel={setSel} />
        <Legenda />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-casa-line text-left text-[11px] font-bold uppercase text-casa-muted">
                <th className="py-1.5">Mês</th>
                <th className="text-right">Receitas</th>
                <th className="text-right">Fixas</th>
                <th className="text-right">Cartão</th>
                <th className="text-right">Outras</th>
                <th className="text-right">Sobra</th>
                <th className="text-right">Acumulado</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {resumo.map((r) => (
                <tr key={r.mes} onClick={() => setSel(r.mes)} className={clsx("cursor-pointer border-b border-casa-line/60 hover:bg-casa-bg/60", sel === r.mes && "bg-casa-principalclaro/60")}>
                  <td className="py-2 font-bold">{nomeMes(r.mes, true)}</td>
                  <td className="text-right"><Din v={r.receitas} /></td>
                  <td className="text-right"><Din v={r.porGrupo.fixa} /></td>
                  <td className="text-right"><Din v={r.porGrupo.cartao} /></td>
                  <td className="text-right"><Din v={r.porGrupo.outra} /></td>
                  <td className={clsx("text-right font-bold", r.saldo < 0 ? "text-perigo" : "text-ok")}><Din v={r.saldo} /></td>
                  <td className={clsx("text-right", r.acumulado < 0 ? "text-perigo" : "")}><Din v={r.acumulado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Secao>

      <DetalheMes r={resumo.find((r) => r.mes === sel) ?? resumo[0]} itens={itens.filter((i) => i.mes === sel)} />
    </div>
  );
}

function Legenda() {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-casa-muted">
      {(Object.keys(GRUPOS) as GrupoProjecao[]).map((g) => (
        <li key={g} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: GRUPOS[g].cor }} />{GRUPOS[g].nome}</li>
      ))}
    </ul>
  );
}

function Grafico({ resumo, sel, onSel }: { resumo: Mes[]; sel: string; onSel: (m: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const fmt = useMoeda();
  const oculto = useOcultar();
  const colW = 76, H = 200, topo = 12, base = H - 34, larg = resumo.length * colW + 48;
  const max = Math.max(1, ...resumo.flatMap((r) => [r.receitas, r.despesas]));
  const y = (v: number) => base - (v / max) * (base - topo);
  const passos = [0, 0.5, 1].map((f) => f * max);
  const curto = (v: number) => (oculto ? "•••" : v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : String(Math.round(v)));
  const h = resumo.find((r) => r.mes === hover);

  return (
    <div className="relative overflow-x-auto">
      <svg viewBox={`0 0 ${larg} ${H}`} className="h-[220px] min-w-full" style={{ width: Math.max(larg, 320) }} role="img" aria-label="Receitas e despesas previstas por mês">
        {passos.map((v) => (
          <g key={v}>
            <line x1={44} x2={larg} y1={y(v)} y2={y(v)} stroke="rgba(0,0,0,0.07)" />
            <text x={40} y={y(v)} textAnchor="end" dominantBaseline="central" fontSize={10} className="fill-casa-muted">{curto(v)}</text>
          </g>
        ))}
        {resumo.map((r, i) => {
          const x = 48 + i * colW;
          const w = 22;
          let topoDesp = base;
          return (
            <g key={r.mes} onMouseEnter={() => setHover(r.mes)} onMouseLeave={() => setHover(null)} onClick={() => onSel(r.mes)} className="cursor-pointer">
              <rect x={x} y={topo} width={colW - 4} height={H - topo} fill={sel === r.mes ? "rgba(224,96,26,0.08)" : "transparent"} rx={8} />
              {r.receitas > 0 && <rect x={x + 10} y={y(r.receitas)} width={w} height={base - y(r.receitas)} rx={4} fill={GRUPOS.receita.cor} />}
              {DESPESAS.map((g) => {
                const v = r.porGrupo[g];
                if (v <= 0) return null;
                const alt = base - y(v);
                topoDesp -= alt;
                return <rect key={g} x={x + 10 + w + 4} y={topoDesp} width={w} height={Math.max(alt - 2, 1)} rx={3} fill={GRUPOS[g].cor} />;
              })}
              <text x={x + 10 + w + 2} y={base + 14} textAnchor="middle" fontSize={11} fontWeight={700} className="fill-casa-ink">{nomeMes(r.mes, true)}</text>
              <text x={x + 10 + w + 2} y={base + 28} textAnchor="middle" fontSize={10} fontWeight={700} className={r.saldo < 0 ? "fill-perigo" : "fill-ok"}>
                {oculto ? "•••" : `${r.saldo >= 0 ? "+" : "−"}${curto(Math.abs(r.saldo))}`}
              </text>
            </g>
          );
        })}
        <line x1={44} x2={larg} y1={base} y2={base} stroke="rgba(0,0,0,0.2)" />
      </svg>
      {h && (
        <div className="pointer-events-none absolute left-1/2 top-0 z-10 w-60 -translate-x-1/2 rounded-xl border border-casa-line bg-white p-3 text-xs shadow-lg">
          <p className="mb-1 font-bold">{nomeMes(h.mes)}</p>
          {(Object.keys(GRUPOS) as GrupoProjecao[]).map((g) => (
            <p key={g} className="flex justify-between gap-2">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: GRUPOS[g].cor }} />{GRUPOS[g].nome}</span>
              <b className="tabular-nums">{fmt(h.porGrupo[g])}</b>
            </p>
          ))}
          <p className="mt-1 flex justify-between border-t border-casa-line pt-1"><span>Sobra</span><b className={h.saldo < 0 ? "text-perigo" : "text-ok"}>{fmt(h.saldo)}</b></p>
        </div>
      )}
    </div>
  );
}

function DetalheMes({ r, itens }: { r: Mes; itens: ItemProjecao[] }) {
  const grupos = (Object.keys(GRUPOS) as GrupoProjecao[]).map((g) => ({ g, lista: itens.filter((i) => i.grupo === g) })).filter((x) => x.lista.length);
  const previstos = itens.filter((i) => i.previsto).length;
  return (
    <Secao
      titulo={`${nomeMes(r.mes)} em detalhe`}
      acao={<Link href={`/financas/lancamentos?mes=${r.mes}`} className="text-xs font-bold text-casa-principal">Ver lançamentos do mês →</Link>}
    >
      {previstos > 0 && (
        <p className="-mt-1 mb-3 text-xs text-casa-muted">
          {previstos} {previstos === 1 ? "conta fixa aparece" : "contas fixas aparecem"} como <b>previstas</b>: o app lança de verdade quando o mês chegar.
        </p>
      )}
      {grupos.length === 0 ? (
        <p className="text-sm text-casa-muted">Nada previsto para este mês ainda.</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {grupos.map(({ g, lista }) => (
            <div key={g} className="min-w-0">
              <div className="mb-1.5 flex items-center justify-between border-b-2 pb-1" style={{ borderColor: GRUPOS[g].cor }}>
                <p className="flex items-center gap-1.5 text-sm font-bold"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: GRUPOS[g].cor }} />{GRUPOS[g].nome}</p>
                <b className="text-sm tabular-nums"><Din v={lista.reduce((s, i) => s + i.valor, 0)} /></b>
              </div>
              <ul className="divide-y divide-casa-line/70">
                {lista.map((i) => (
                  <li key={i.id} className="flex items-center gap-2 py-1.5 text-sm">
                    <span className="w-11 shrink-0 text-xs tabular-nums text-casa-muted">{dataCurta(i.data)}</span>
                    <span>{i.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{i.descricao}</p>
                      <p className="truncate text-[11px] text-casa-muted">{i.cartao ? `${i.cartao} · ` : ""}{i.categoria}</p>
                    </div>
                    {i.previsto && <span className="rounded-full bg-casa-bg px-1.5 py-0.5 text-[10px] font-bold text-casa-muted">previsto</span>}
                    {i.pago && <span className="rounded-full bg-okclaro px-1.5 py-0.5 text-[10px] font-bold text-ok">{i.tipo === "receita" ? "recebido" : "pago"}</span>}
                    <span className={clsx("shrink-0 font-bold tabular-nums", i.tipo === "receita" && "text-ok")}><Din v={i.valor} /></span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Secao>
  );
}
