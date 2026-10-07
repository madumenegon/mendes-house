"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Check, ChevronLeft, ChevronRight, MapPin, Plus, Repeat, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { SeletorCor, Segmentos } from "@/components/Escolhas";
import { useAcao } from "@/components/useAcao";
import { DonoBadge } from "@/components/ui";
import { CORES, NOMES, horas } from "@/lib/format";
import {
  DIAS_CURTOS, dataCurta, dataLonga, diaDaSemana, duracaoMin, hhmm, minutosDoDia, nomeMes, somarDias, somarMeses,
} from "@/lib/datas";
import type { Dono, Evento, MembroId, Ocorrencia, OcorrenciaTarefa, Recorrencia, Valor } from "@/lib/types";
import { excluirEvento, salvarEvento } from "./actions";
import { alternarTarefaFeita } from "../casa/actions";

export type Visao = "semana" | "mes" | "lista";

const H_INI = 6;
const H_FIM = 24;
const PX_H = 48;

const DONOS: { valor: Dono; label: string; cor: string }[] = [
  { valor: "madu", label: "Madu", cor: CORES.madu },
  { valor: "gabriel", label: "Gabriel", cor: CORES.gabriel },
  { valor: "compartilhado", label: "Juntos", cor: CORES.compartilhado },
];

const REPETICOES: { valor: Recorrencia; label: string }[] = [
  { valor: "nenhuma", label: "Não repete" },
  { valor: "diaria", label: "Todo dia" },
  { valor: "semanal", label: "Toda semana" },
  { valor: "quinzenal", label: "A cada 2 semanas" },
  { valor: "mensal", label: "Todo mês" },
];

const corDe = (ev: Evento) => ev.cor || CORES[ev.dono];

interface Props {
  membro: MembroId;
  visao: Visao;
  referencia: string;
  hoje: string;
  inicio: string;
  fim: string;
  mesRef: string;
  fimMes: string;
  ocorrencias: Ocorrencia[];
  tarefas: OcorrenciaTarefa[];
  valores: Valor[];
}

type Edicao = { evento: Evento | null; data: string; hora?: string };

export function AgendaCliente(p: Props) {
  const [filtro, setFiltro] = useState<Record<Dono | "tarefas", boolean>>({ madu: true, gabriel: true, compartilhado: true, tarefas: true });
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const valorMap = useMemo(() => new Map(p.valores.map((v) => [v.id, v])), [p.valores]);

  const ocs = p.ocorrencias.filter((o) => filtro[o.evento.dono]);
  const tfs = filtro.tarefas
    ? p.tarefas.filter((t) => (t.quem === "compartilhado" ? filtro.madu || filtro.gabriel : filtro[t.quem]))
    : [];

  const passo = (dir: 1 | -1) =>
    p.visao === "mes" ? somarMeses(p.referencia, dir) : somarDias(p.referencia, dir * (p.visao === "lista" ? 21 : 7));
  const href = (data: string, ver: Visao = p.visao) => `/agenda?ver=${ver}&data=${data}`;

  const titulo =
    p.visao === "mes"
      ? nomeMes(p.mesRef)
      : `${dataCurta(p.inicio)} – ${dataCurta(p.fim)}`;

  const novo = (data: string, hora?: string) => setEdicao({ evento: null, data, hora });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="titulo-pagina mr-1">{p.visao === "mes" ? nomeMes(p.mesRef) : "Agenda"}</h1>
        </div>
        <button className="btn-primario" onClick={() => novo(p.referencia < p.hoje && p.visao !== "lista" ? p.hoje : p.referencia)}>
          <Plus size={16} /> Compromisso
        </button>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-3 p-2.5">
        <div className="flex items-center gap-1">
          <Link href={href(passo(-1))} className="btn-secundario p-2"><ChevronLeft size={16} /></Link>
          <Link href={href(p.hoje)} className="btn-secundario">Hoje</Link>
          <Link href={href(passo(1))} className="btn-secundario p-2"><ChevronRight size={16} /></Link>
          <span className="ml-2 text-sm font-bold">{titulo}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {[...DONOS, { valor: "tarefas" as const, label: "🧹 Tarefas", cor: "#3fa79f" }].map((d) => (
              <button
                key={d.valor}
                onClick={() => setFiltro((f) => ({ ...f, [d.valor]: !f[d.valor] }))}
                className="rounded-full border px-2.5 py-1 text-xs font-bold transition"
                style={filtro[d.valor] ? { background: `${d.cor}18`, borderColor: d.cor, color: d.cor } : { borderColor: "#f0e2c4", color: "#b3a99f", textDecoration: "line-through" }}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-xl bg-casa-bg p-0.5">
            {(["semana", "mes", "lista"] as const).map((v) => (
              <Link
                key={v}
                href={href(p.referencia, v)}
                className={clsx("rounded-lg px-2.5 py-1 text-xs font-bold", p.visao === v ? "bg-white shadow-sm" : "text-casa-muted")}
              >
                {v === "semana" ? "Semana" : v === "mes" ? "Mês" : "Lista"}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {p.visao === "semana" && (
        <VisaoSemana {...p} ocs={ocs} tfs={tfs} valorMap={valorMap} onNovo={novo} onAbrir={(o) => setEdicao({ evento: o.evento, data: o.data })} />
      )}
      {p.visao === "mes" && (
        <VisaoMes {...p} ocs={ocs} tfs={tfs} onNovo={novo} onAbrir={(o) => setEdicao({ evento: o.evento, data: o.data })} hrefDia={(d) => href(d, "semana")} />
      )}
      {p.visao === "lista" && (
        <VisaoLista {...p} ocs={ocs} tfs={tfs} valorMap={valorMap} onAbrir={(o) => setEdicao({ evento: o.evento, data: o.data })} />
      )}

      <Modal aberto={edicao !== null} onFechar={() => setEdicao(null)} titulo={edicao?.evento ? "Editar compromisso" : "Novo compromisso"}>
        {edicao && <FormEvento edicao={edicao} membro={p.membro} valores={p.valores} onFechar={() => setEdicao(null)} />}
      </Modal>
    </div>
  );
}

// ------------------------------------------------------------------ semana

type Bloco = { o: Ocorrencia; ini: number; fim: number; lane: number; lanes: number };

function organizar(lista: Ocorrencia[]): Bloco[] {
  const blocos: Bloco[] = lista
    .map((o) => {
      const ini = minutosDoDia(o.evento.hora_inicio!);
      const fim = Math.max(ini + 25, o.evento.hora_fim ? minutosDoDia(o.evento.hora_fim) : ini + 60);
      return { o, ini, fim, lane: 0, lanes: 1 };
    })
    .sort((a, b) => a.ini - b.ini || b.fim - a.fim);
  let grupo: Bloco[] = [];
  let grupoFim = -1;
  const fechar = () => {
    const n = Math.max(1, ...grupo.map((b) => b.lane + 1));
    grupo.forEach((b) => (b.lanes = n));
  };
  for (const b of blocos) {
    if (b.ini >= grupoFim && grupo.length) {
      fechar();
      grupo = [];
    }
    const ocupadas = new Set(grupo.filter((g) => g.fim > b.ini).map((g) => g.lane));
    let l = 0;
    while (ocupadas.has(l)) l++;
    b.lane = l;
    grupo.push(b);
    grupoFim = Math.max(grupoFim, b.fim);
  }
  if (grupo.length) fechar();
  return blocos;
}

function VisaoSemana({
  inicio, hoje, ocs, tfs, valorMap, onNovo, onAbrir,
}: Props & { ocs: Ocorrencia[]; tfs: OcorrenciaTarefa[]; valorMap: Map<string, Valor>; onNovo: (d: string, h?: string) => void; onAbrir: (o: Ocorrencia) => void }) {
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
  const horasGrade = Array.from({ length: H_FIM - H_INI }, (_, i) => H_INI + i);

  return (
    <div className="card overflow-x-auto">
      <div className="min-w-[760px]">
        {/* cabeçalho dos dias */}
        <div className="grid grid-cols-[52px_repeat(7,1fr)] border-b border-casa-line">
          <div />
          {dias.map((d) => (
            <button key={d} onClick={() => onNovo(d)} className="py-2 text-center hover:bg-casa-bg">
              <p className="text-[11px] font-bold uppercase text-casa-muted">{DIAS_CURTOS[diaDaSemana(d)]}</p>
              <p className={clsx("mx-auto mt-0.5 flex h-8 w-8 items-center justify-center rounded-full font-display text-lg font-semibold", d === hoje && "bg-casa-destaque text-casa-ink")}>
                {Number(d.slice(8))}
              </p>
            </button>
          ))}
        </div>

        {/* dia inteiro + tarefas sem horário */}
        <div className="grid grid-cols-[52px_repeat(7,1fr)] border-b border-casa-line bg-casa-bg/50">
          <div className="px-1 py-1.5 text-right text-[10px] font-bold uppercase leading-tight text-casa-muted">dia todo</div>
          {dias.map((d) => (
            <div key={d} className="min-h-10 space-y-1 border-l border-casa-line p-1">
              {ocs.filter((o) => o.data === d && o.evento.dia_inteiro).map((o) => (
                <ChipEvento key={o.evento.id + d} o={o} onClick={() => onAbrir(o)} />
              ))}
              {tfs.filter((t) => t.data === d && !t.tarefa.hora).map((t) => (
                <ChipTarefa key={t.tarefa.id + d} t={t} />
              ))}
            </div>
          ))}
        </div>

        {/* grade de horários */}
        <div className="relative grid grid-cols-[52px_repeat(7,1fr)]" style={{ height: (H_FIM - H_INI) * PX_H }}>
          <div className="relative">
            {horasGrade.map((h) => (
              <span key={h} className="absolute right-1.5 -translate-y-1/2 text-[10px] font-semibold text-casa-muted" style={{ top: (h - H_INI) * PX_H }}>
                {h > H_INI ? `${String(h).padStart(2, "0")}h` : ""}
              </span>
            ))}
          </div>
          {dias.map((d) => {
            const blocos = organizar(ocs.filter((o) => o.data === d && !o.evento.dia_inteiro && o.evento.hora_inicio));
            const tarefasHora = tfs.filter((t) => t.data === d && t.tarefa.hora);
            return (
              <div key={d} className={clsx("relative border-l border-casa-line", d === hoje && "bg-casa-destaqueclaro/30")}>
                {horasGrade.map((h) => (
                  <button
                    key={h}
                    onClick={() => onNovo(d, `${String(h).padStart(2, "0")}:00`)}
                    className="absolute inset-x-0 border-t border-casa-line/70 hover:bg-casa-principalclaro/40"
                    style={{ top: (h - H_INI) * PX_H, height: PX_H }}
                    aria-label={`Novo às ${h}h`}
                  />
                ))}
                {tarefasHora.map((t) => {
                  const ini = Math.max(H_INI * 60, minutosDoDia(t.tarefa.hora!));
                  return (
                    <div
                      key={t.tarefa.id}
                      className="absolute left-0.5 right-0.5 overflow-hidden"
                      style={{ top: ((ini - H_INI * 60) / 60) * PX_H, height: Math.max(22, (t.tarefa.duracao_min / 60) * PX_H - 2) }}
                    >
                      <ChipTarefa t={t} cheio />
                    </div>
                  );
                })}
                {blocos.map((b) => {
                  const ev = b.o.evento;
                  const cor = corDe(ev);
                  const ini = Math.max(b.ini, H_INI * 60);
                  const v = valorMap.get(ev.valor_id);
                  const altura = Math.max(22, ((b.fim - ini) / 60) * PX_H - 2);
                  return (
                    <button
                      key={ev.id + d}
                      onClick={() => onAbrir(b.o)}
                      className="absolute flex flex-col justify-start overflow-hidden rounded-lg border-l-4 px-1.5 py-1 text-left text-white shadow-sm transition hover:z-10 hover:brightness-105"
                      style={{
                        top: ((ini - H_INI * 60) / 60) * PX_H + 1,
                        height: altura,
                        left: `calc(${(b.lane / b.lanes) * 100}% + 2px)`,
                        width: `calc(${100 / b.lanes}% - 4px)`,
                        background: cor,
                        borderLeftColor: CORES[ev.dono],
                      }}
                      title={`${ev.titulo} · ${NOMES[ev.dono]}${v ? ` · ${v.nome}` : ""}`}
                    >
                      <p className="flex items-center gap-1 truncate text-[11px] font-bold leading-tight">
                        <MarcaDono dono={ev.dono} />
                        {ev.titulo}
                      </p>
                      {altura > 34 && (
                        <p className="truncate text-[10px] leading-tight text-white/85">
                          {hhmm(ev.hora_inicio)}–{hhmm(ev.hora_fim)} {v && `· ${v.emoji}`}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MarcaDono({ dono }: { dono: Dono }) {
  return (
    <span
      className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-white text-[8px] font-black"
      style={{ color: CORES[dono] }}
    >
      {dono === "madu" ? "M" : dono === "gabriel" ? "G" : "♥"}
    </span>
  );
}

function ChipEvento({ o, onClick, comHora }: { o: Ocorrencia; onClick: () => void; comHora?: boolean }) {
  const ev = o.evento;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="flex w-full items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-bold text-white"
      style={{ background: corDe(ev) }}
      title={ev.titulo}
    >
      <MarcaDono dono={ev.dono} />
      {comHora && !ev.dia_inteiro && <span className="font-semibold opacity-85">{hhmm(ev.hora_inicio)}</span>}
      <span className="truncate">{ev.titulo}</span>
    </button>
  );
}

function ChipTarefa({ t, cheio }: { t: OcorrenciaTarefa; cheio?: boolean }) {
  const { rodar, pendente } = useAcao();
  const feita = !!t.feita;
  const cor = CORES[t.quem];
  return (
    <button
      disabled={pendente}
      onClick={(e) => { e.stopPropagation(); rodar(() => alternarTarefaFeita(t.tarefa.id, t.data, !feita)); }}
      className={clsx(
        "flex w-full items-center gap-1 truncate rounded-md border border-dashed px-1.5 py-0.5 text-left text-[11px] font-semibold",
        cheio && "h-full items-start",
        feita && "opacity-50 line-through"
      )}
      style={{ borderColor: cor, color: cor, background: `${cor}10` }}
      title={`Tarefa: ${t.tarefa.titulo} (${NOMES[t.quem]}) — clique para marcar como feita`}
    >
      <span className={clsx("flex h-3 w-3 shrink-0 items-center justify-center rounded-sm border", feita && "text-white")} style={{ borderColor: cor, background: feita ? cor : "transparent" }}>
        {feita && <Check size={9} />}
      </span>
      <span className="truncate">{t.tarefa.titulo}</span>
    </button>
  );
}

// ------------------------------------------------------------------ mês

function VisaoMes({
  inicio, hoje, mesRef, ocs, tfs, onNovo, onAbrir, hrefDia,
}: Props & { ocs: Ocorrencia[]; tfs: OcorrenciaTarefa[]; onNovo: (d: string) => void; onAbrir: (o: Ocorrencia) => void; hrefDia: (d: string) => string }) {
  const dias = Array.from({ length: 42 }, (_, i) => somarDias(inicio, i));
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-casa-line bg-casa-bg/60">
        {[0, 1, 2, 3, 4, 5, 6].map((d) => (
          <p key={d} className="py-2 text-center text-[11px] font-bold uppercase text-casa-muted">{DIAS_CURTOS[d]}</p>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((d) => {
          const doDia = ocs.filter((o) => o.data === d);
          const nTarefas = tfs.filter((t) => t.data === d).length;
          const fora = d.slice(0, 7) !== mesRef;
          return (
            <div
              key={d}
              onClick={() => onNovo(d)}
              className={clsx("min-h-24 cursor-pointer border-b border-l border-casa-line p-1 hover:bg-casa-bg/60 sm:min-h-28", fora && "bg-casa-bg/40 opacity-60")}
            >
              <div className="mb-1 flex items-center justify-between">
                <Link
                  href={hrefDia(d)}
                  onClick={(e) => e.stopPropagation()}
                  className={clsx("flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold hover:bg-casa-line", d === hoje && "bg-casa-destaque text-casa-ink hover:bg-casa-destaque")}
                >
                  {Number(d.slice(8))}
                </Link>
                {nTarefas > 0 && <span className="text-[10px] font-bold text-teal-600" title="Tarefas da casa">🧹{nTarefas}</span>}
              </div>
              <div className="space-y-0.5">
                {doDia.slice(0, 3).map((o) => <ChipEvento key={o.evento.id} o={o} comHora onClick={() => onAbrir(o)} />)}
                {doDia.length > 3 && <p className="px-1 text-[10px] font-bold text-casa-muted">+{doDia.length - 3} mais</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ lista

function VisaoLista({
  inicio, fim, hoje, ocs, tfs, valorMap, onAbrir,
}: Props & { ocs: Ocorrencia[]; tfs: OcorrenciaTarefa[]; valorMap: Map<string, Valor>; onAbrir: (o: Ocorrencia) => void }) {
  const dias: string[] = [];
  for (let d = inicio; d <= fim; d = somarDias(d, 1)) dias.push(d);
  const comItens = dias.filter((d) => ocs.some((o) => o.data === d) || tfs.some((t) => t.data === d));
  if (!comItens.length) return <p className="card p-6 text-center text-sm text-casa-muted">Nada marcado nestas três semanas. 🌤️</p>;
  return (
    <div className="space-y-3">
      {comItens.map((d) => (
        <section key={d} className="card p-3 sm:p-4">
          <h3 className={clsx("mb-2 text-sm font-bold", d === hoje ? "text-casa-destaqueescuro" : "text-casa-muted")}>
            {d === hoje ? "Hoje · " : ""}{dataLonga(d)}
          </h3>
          <ul className="space-y-1.5">
            {ocs.filter((o) => o.data === d).map((o) => {
              const ev = o.evento;
              const v = valorMap.get(ev.valor_id);
              return (
                <li key={ev.id}>
                  <button onClick={() => onAbrir(o)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-casa-bg">
                    <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: corDe(ev) }} />
                    <span className="w-20 shrink-0 text-xs font-bold tabular-nums text-casa-muted">
                      {ev.dia_inteiro ? "dia todo" : `${hhmm(ev.hora_inicio)}–${hhmm(ev.hora_fim)}`}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{ev.titulo}</span>
                      <span className="flex flex-wrap items-center gap-1.5 text-xs text-casa-muted">
                        <DonoBadge dono={ev.dono} pequeno />
                        {v && <span>{v.emoji} {v.nome}</span>}
                        {ev.local && <span className="flex items-center gap-0.5"><MapPin size={11} />{ev.local}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {tfs.filter((t) => t.data === d).map((t) => (
              <li key={t.tarefa.id} className="pl-2"><div className="max-w-sm"><ChipTarefa t={t} /></div></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ formulário

function FormEvento({ edicao, membro, valores, onFechar }: { edicao: Edicao; membro: MembroId; valores: Valor[]; onFechar: () => void }) {
  const ev = edicao.evento;
  const [dono, setDono] = useState<Dono>(ev?.dono ?? membro);
  const [cor, setCor] = useState<string>(ev?.cor ?? CORES[ev?.dono ?? membro]);
  const [corManual, setCorManual] = useState(!!ev?.cor);
  const [diaInteiro, setDiaInteiro] = useState(ev?.dia_inteiro ?? false);
  const [recorrencia, setRecorrencia] = useState<Recorrencia>(ev?.recorrencia ?? "nenhuma");
  const [valorId, setValorId] = useState(ev?.valor_id ?? "");
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const { pendente, erro, rodar } = useAcao();

  const horaIni = ev?.hora_inicio ? hhmm(ev.hora_inicio) : edicao.hora ?? "09:00";
  const horaFim = ev?.hora_fim
    ? hhmm(ev.hora_fim)
    : `${String(Math.min(23, Number(horaIni.slice(0, 2)) + 1)).padStart(2, "0")}:${horaIni.slice(3, 5)}`;

  const trocarDono = (d: Dono) => {
    setDono(d);
    if (!corManual) setCor(CORES[d]);
  };

  // valores sugeridos primeiro: os da pessoa dona + familiares
  const ordenados = [...valores].sort((a, b) => {
    const peso = (v: Valor) => (v.escopo === "familiar" ? 1 : v.escopo === dono ? 0 : 2);
    return peso(a) - peso(b) || a.ordem - b.ordem;
  });

  return (
    <form action={(fd) => rodar(() => salvarEvento(fd), onFechar)} className="space-y-4">
      {ev && <input type="hidden" name="id" value={ev.id} />}
      <input name="titulo" defaultValue={ev?.titulo} className="campo py-2.5 text-base font-semibold" placeholder="Título do compromisso" required autoFocus={!ev} />

      <div>
        <label className="rotulo">De quem é?</label>
        <Segmentos opcoes={DONOS} valor={dono} onChange={trocarDono} nome="dono" />
      </div>

      <div>
        <label className="rotulo">Qual valor este compromisso representa? *</label>
        <input type="hidden" name="valor_id" value={valorId} />
        <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
          {ordenados.map((v) => (
            <button
              type="button"
              key={v.id}
              onClick={() => setValorId(v.id)}
              className="flex items-center gap-1 rounded-full border-2 px-2.5 py-1 text-xs font-bold transition"
              style={valorId === v.id ? { borderColor: v.cor, background: `${v.cor}1c`, color: v.cor } : { borderColor: "#f0e2c4", color: "#5c534c" }}
              title={v.escopo === "familiar" ? "Valor familiar" : `Valor de ${NOMES[v.escopo]}`}
            >
              {v.emoji} {v.nome}
              {v.escopo !== "familiar" && <span className="text-[9px] opacity-70">({NOMES[v.escopo]})</span>}
            </button>
          ))}
        </div>
        {valores.length === 0 && <p className="text-xs text-perigo">Cadastre os valores na aba Valores primeiro.</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="rotulo">Data</label>
          <input type="date" name="data" defaultValue={ev?.data ?? edicao.data} className="campo" required />
        </div>
        <label className="col-span-2 flex items-center gap-2 self-end pb-2 text-sm font-semibold sm:col-span-1">
          <input type="checkbox" name="dia_inteiro" checked={diaInteiro} onChange={(e) => setDiaInteiro(e.target.checked)} className="h-4 w-4 accent-casa-principal" />
          Dia inteiro
        </label>
        {!diaInteiro && (
          <>
            <div>
              <label className="rotulo">Início</label>
              <input type="time" name="hora_inicio" defaultValue={horaIni} className="campo" required />
            </div>
            <div>
              <label className="rotulo">Fim</label>
              <input type="time" name="hora_fim" defaultValue={horaFim} className="campo" />
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo">Repetir</label>
          <select name="recorrencia" value={recorrencia} onChange={(e) => setRecorrencia(e.target.value as Recorrencia)} className="campo">
            {REPETICOES.map((r) => <option key={r.valor} value={r.valor}>{r.label}</option>)}
          </select>
        </div>
        {recorrencia !== "nenhuma" && (
          <div>
            <label className="rotulo">Até (opcional)</label>
            <input type="date" name="recorrencia_fim" defaultValue={ev?.recorrencia_fim ?? ""} className="campo" />
          </div>
        )}
      </div>

      <div>
        <label className="rotulo">Cor</label>
        <input type="hidden" name="cor" value={corManual ? cor : ""} />
        <SeletorCor valor={cor} onChange={(c) => { setCor(c); setCorManual(true); }} nome="_cor" />
        {corManual && (
          <button type="button" className="mt-1 text-xs font-semibold text-casa-muted underline" onClick={() => { setCorManual(false); setCor(CORES[dono]); }}>
            usar a cor padrão de {NOMES[dono]}
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="rotulo">Local</label>
          <input name="local" defaultValue={ev?.local} className="campo" />
        </div>
        <div>
          <label className="rotulo">Observações</label>
          <input name="descricao" defaultValue={ev?.descricao} className="campo" />
        </div>
      </div>

      {ev && (
        <p className="rounded-xl bg-casa-bg px-3 py-2 text-xs text-casa-muted">
          Criado por <b>{ev.created_by ? NOMES[ev.created_by] : "—"}</b> em {new Date(ev.created_at).toLocaleDateString("pt-BR")}
          {ev.updated_by && ev.updated_at !== ev.created_at && <> · editado por <b>{NOMES[ev.updated_by]}</b></>}
          {ev.recorrencia !== "nenhuma" && <> · <Repeat size={11} className="inline" /> alterações valem para todas as repetições</>}
          {!ev.dia_inteiro && <> · {horas(duracaoMin(ev.hora_inicio, ev.hora_fim))}</>}
        </p>
      )}

      {erro && <p className="rounded-xl bg-perigoclaro px-3 py-2 text-sm text-perigo">{erro}</p>}

      {confirmarExclusao && ev ? (
        <div className="space-y-2 rounded-2xl bg-perigoclaro p-3">
          <p className="text-sm font-semibold text-perigo">Excluir este compromisso?</p>
          <div className="flex flex-wrap gap-2">
            {ev.recorrencia !== "nenhuma" && (
              <button type="button" className="btn-secundario" disabled={pendente} onClick={() => rodar(() => excluirEvento(ev.id, "esta", edicao.data), onFechar)}>
                Só o de {dataCurta(edicao.data)}
              </button>
            )}
            <button type="button" className="btn bg-perigo text-white" disabled={pendente} onClick={() => rodar(() => excluirEvento(ev.id, "todos"), onFechar)}>
              {ev.recorrencia !== "nenhuma" ? "Todas as repetições" : "Excluir"}
            </button>
            <button type="button" className="btn-fantasma" onClick={() => setConfirmarExclusao(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between gap-2">
          {ev ? (
            <button type="button" className="btn-perigo" onClick={() => setConfirmarExclusao(true)}><Trash2 size={15} /> Excluir</button>
          ) : <span />}
          <button className="btn-primario" disabled={pendente || !valorId}>{pendente ? "Salvando…" : "Salvar"}</button>
        </div>
      )}
    </form>
  );
}

