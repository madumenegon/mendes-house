"use client";

import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { Modal } from "@/components/Modal";
import { SeletorCor, SeletorEmoji, Segmentos } from "@/components/Escolhas";
import { useAcao } from "@/components/useAcao";
import { NOMES, moeda, pct } from "@/lib/format";
import { dataCurta, diasEntre } from "@/lib/datas";
import type { Caixinha, MovimentoCaixinha } from "@/lib/types";
import { excluirCaixinha, excluirMovimento, movimentarCaixinha, salvarCaixinha } from "../actions";

export function CaixinhasCliente({
  caixinhas, movimentos, saldos, hoje,
}: { caixinhas: Caixinha[]; movimentos: MovimentoCaixinha[]; saldos: Record<string, number>; hoje: string }) {
  const [editar, setEditar] = useState<Caixinha | "nova" | null>(null);
  const [mover, setMover] = useState<{ c: Caixinha; tipo: "deposito" | "retirada" } | null>(null);
  const [historico, setHistorico] = useState<Caixinha | null>(null);
  const [verArquivadas, setVerArquivadas] = useState(false);
  const lista = caixinhas.filter((c) => verArquivadas || !c.arquivada);

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-casa-muted">
          <input type="checkbox" checked={verArquivadas} onChange={(e) => setVerArquivadas(e.target.checked)} className="accent-casa-principal" /> Mostrar arquivadas
        </label>
        <button className="btn-primario" onClick={() => setEditar("nova")}><Plus size={16} /> Nova caixinha</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((c) => {
          const saldo = saldos[c.id] ?? 0;
          const p = c.meta ? Math.min(100, pct(saldo, c.meta)) : null;
          const faltam = c.meta ? Math.max(0, c.meta - saldo) : 0;
          const mesesRestantes = c.prazo ? Math.max(1, Math.ceil(diasEntre(hoje, c.prazo) / 30)) : null;
          const sugestao = c.meta && mesesRestantes && faltam > 0 ? faltam / mesesRestantes : null;
          const r = 34;
          const circ = 2 * Math.PI * r;
          return (
            <div key={c.id} className={`card overflow-hidden ${c.arquivada ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3 p-4" style={{ background: `linear-gradient(135deg, ${c.cor}22, transparent 70%)` }}>
                <div className="relative h-20 w-20 shrink-0">
                  <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
                    <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(0,0,0,.07)" strokeWidth="8" />
                    {p !== null && (
                      <circle cx="40" cy="40" r={r} fill="none" stroke={c.cor} strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - p / 100)} />
                    )}
                  </svg>
                  <span className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl">{c.emoji}</span>
                    {p !== null && <span className="text-[10px] font-bold" style={{ color: c.cor }}>{p}%</span>}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="font-display text-lg font-semibold leading-tight">{c.nome}</h3>
                    <button className="btn-fantasma -mr-2 -mt-1 p-1.5" onClick={() => setEditar(c)}><Pencil size={14} /></button>
                  </div>
                  <p className="font-display text-2xl font-semibold tabular-nums" style={{ color: c.cor }}>{moeda(saldo)}</p>
                  {c.meta && <p className="text-xs text-casa-muted">meta {moeda(c.meta)}{faltam > 0 ? ` · faltam ${moeda(faltam)}` : " · meta batida! 🎉"}</p>}
                </div>
              </div>
              <div className="space-y-1 px-4 pb-2 text-xs text-casa-muted">
                {c.descricao && <p>{c.descricao}</p>}
                {c.prazo && <p>📅 Prazo: {dataCurta(c.prazo)}/{c.prazo.slice(2, 4)}{sugestao ? ` · guardar ~${moeda(sugestao)}/mês` : ""}</p>}
                {c.aporte_mensal ? <p>🔁 Aporte planejado: {moeda(c.aporte_mensal)}/mês</p> : null}
              </div>
              <div className="grid grid-cols-3 border-t border-casa-line">
                <button className="flex items-center justify-center gap-1 py-2.5 text-sm font-bold text-ok hover:bg-okclaro/50" onClick={() => setMover({ c, tipo: "deposito" })}>
                  <ArrowDownCircle size={15} /> Guardar
                </button>
                <button className="flex items-center justify-center gap-1 border-x border-casa-line py-2.5 text-sm font-bold text-casa-destaqueescuro hover:bg-casa-destaqueclaro/50" onClick={() => setMover({ c, tipo: "retirada" })}>
                  <ArrowUpCircle size={15} /> Resgatar
                </button>
                <button className="py-2.5 text-sm font-bold text-casa-muted hover:bg-casa-bg" onClick={() => setHistorico(c)}>Histórico</button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal aberto={editar !== null} onFechar={() => setEditar(null)} titulo={editar === "nova" ? "Nova caixinha" : "Editar caixinha"}>
        {editar !== null && <FormCaixinha caixinha={editar === "nova" ? null : editar} onFechar={() => setEditar(null)} />}
      </Modal>
      <Modal aberto={mover !== null} onFechar={() => setMover(null)} titulo={mover ? `${mover.tipo === "deposito" ? "Guardar em" : "Resgatar de"} ${mover.c.emoji} ${mover.c.nome}` : ""}>
        {mover && <FormMovimento caixinha={mover.c} tipoInicial={mover.tipo} hoje={hoje} onFechar={() => setMover(null)} />}
      </Modal>
      <Modal aberto={historico !== null} onFechar={() => setHistorico(null)} titulo={historico ? `${historico.emoji} ${historico.nome}` : ""}>
        {historico && <Historico movimentos={movimentos.filter((m) => m.caixinha_id === historico.id)} />}
      </Modal>
    </div>
  );
}

function Historico({ movimentos }: { movimentos: MovimentoCaixinha[] }) {
  const { rodar, pendente } = useAcao();
  if (!movimentos.length) return <p className="text-sm text-casa-muted">Nenhuma movimentação ainda.</p>;
  return (
    <ul className="divide-y divide-casa-line">
      {movimentos.map((m) => (
        <li key={m.id} className="flex items-center gap-3 py-2">
          <span className={m.tipo === "deposito" ? "text-ok" : "text-casa-destaqueescuro"}>{m.tipo === "deposito" ? <ArrowDownCircle size={18} /> : <ArrowUpCircle size={18} />}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{m.descricao || (m.tipo === "deposito" ? "Depósito" : "Resgate")}</p>
            <p className="text-xs text-casa-muted">{dataCurta(m.data)}/{m.data.slice(2, 4)} · por {m.created_by ? NOMES[m.created_by] : "—"}</p>
          </div>
          <span className={`font-bold tabular-nums ${m.tipo === "deposito" ? "text-ok" : "text-casa-destaqueescuro"}`}>{m.tipo === "deposito" ? "+" : "−"}{moeda(m.valor)}</span>
          <button className="btn-fantasma p-1" disabled={pendente} onClick={() => confirm("Apagar esta movimentação?") && rodar(() => excluirMovimento(m.id))}><X size={14} /></button>
        </li>
      ))}
    </ul>
  );
}

function FormMovimento({ caixinha, tipoInicial, hoje, onFechar }: { caixinha: Caixinha; tipoInicial: "deposito" | "retirada"; hoje: string; onFechar: () => void }) {
  const [tipo, setTipo] = useState(tipoInicial);
  const { pendente, erro, rodar } = useAcao();
  return (
    <form action={(fd) => rodar(() => movimentarCaixinha(fd), onFechar)} className="space-y-4">
      <input type="hidden" name="caixinha_id" value={caixinha.id} />
      <Segmentos opcoes={[{ valor: "deposito", label: "Guardar", cor: "#16a34a" }, { valor: "retirada", label: "Resgatar", cor: "#d9774b" }]} valor={tipo} onChange={setTipo} nome="tipo" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo">Valor (R$)</label>
          <input name="valor" inputMode="decimal" defaultValue={tipo === "deposito" && caixinha.aporte_mensal ? String(caixinha.aporte_mensal).replace(".", ",") : ""} className="campo text-lg font-bold" required autoFocus />
        </div>
        <div>
          <label className="rotulo">Data</label>
          <input type="date" name="data" defaultValue={hoje} className="campo" />
        </div>
      </div>
      <div>
        <label className="rotulo">Descrição</label>
        <input name="descricao" className="campo" placeholder={tipo === "deposito" ? "Ex.: Aporte de outubro" : "Ex.: Pagamento da passagem"} />
      </div>
      {erro && <p className="rounded-xl bg-perigoclaro px-3 py-2 text-sm text-perigo">{erro}</p>}
      <button className="btn-primario w-full" disabled={pendente}>{pendente ? "Salvando…" : "Confirmar"}</button>
    </form>
  );
}

function FormCaixinha({ caixinha, onFechar }: { caixinha: Caixinha | null; onFechar: () => void }) {
  const [cor, setCor] = useState(caixinha?.cor ?? "#10b981");
  const [emoji, setEmoji] = useState(caixinha?.emoji ?? "🐷");
  const { pendente, erro, rodar } = useAcao();
  const br = (n: number | null | undefined) => (n ? String(n).replace(".", ",") : "");
  return (
    <form action={(fd) => rodar(() => salvarCaixinha(fd), onFechar)} className="space-y-4">
      {caixinha && <input type="hidden" name="id" value={caixinha.id} />}
      <div>
        <label className="rotulo">Nome</label>
        <input name="nome" defaultValue={caixinha?.nome} className="campo" required placeholder="Ex.: Viagem para Gramado" />
      </div>
      <div>
        <label className="rotulo">Para quê</label>
        <input name="descricao" defaultValue={caixinha?.descricao} className="campo" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="rotulo">Meta (R$)</label><input name="meta" inputMode="decimal" defaultValue={br(caixinha?.meta)} className="campo" /></div>
        <div><label className="rotulo">Aporte/mês</label><input name="aporte_mensal" inputMode="decimal" defaultValue={br(caixinha?.aporte_mensal)} className="campo" /></div>
        <div><label className="rotulo">Prazo</label><input type="date" name="prazo" defaultValue={caixinha?.prazo ?? ""} className="campo" /></div>
      </div>
      <div><label className="rotulo">Ícone</label><SeletorEmoji valor={emoji} onChange={setEmoji} /></div>
      <div><label className="rotulo">Cor</label><SeletorCor valor={cor} onChange={setCor} /></div>
      {caixinha && (
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="arquivada" defaultChecked={caixinha.arquivada} className="accent-casa-principal" /> Arquivar (objetivo concluído)
        </label>
      )}
      {erro && <p className="rounded-xl bg-perigoclaro px-3 py-2 text-sm text-perigo">{erro}</p>}
      <div className="flex justify-between gap-2">
        {caixinha ? (
          <button type="button" className="btn-perigo" disabled={pendente} onClick={() => confirm(`Excluir a caixinha "${caixinha.nome}" e todo o histórico?`) && rodar(() => excluirCaixinha(caixinha.id), onFechar)}>
            <Trash2 size={15} /> Excluir
          </button>
        ) : <span />}
        <button className="btn-primario" disabled={pendente}>{pendente ? "Salvando…" : "Salvar"}</button>
      </div>
    </form>
  );
}
