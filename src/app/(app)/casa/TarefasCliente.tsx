"use client";

import { useState } from "react";
import clsx from "clsx";
import { Check, Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Segmentos } from "@/components/Escolhas";
import { useAcao } from "@/components/useAcao";
import { DonoBadge, Secao, Vazio } from "@/components/ui";
import { CORES, NOMES, horas } from "@/lib/format";
import { DIAS_CURTOS, DIAS_LONGOS, dataCurta, dataLonga, diaDaSemana, hhmm } from "@/lib/datas";
import type { Frequencia, OcorrenciaTarefa, Responsavel, Tarefa, Valor } from "@/lib/types";
import { alternarTarefaFeita, excluirTarefa, salvarTarefa } from "./actions";

const RESPONSAVEIS: { valor: Responsavel; label: string; cor: string }[] = [
  { valor: "madu", label: "Madu", cor: CORES.madu },
  { valor: "gabriel", label: "Gabriel", cor: CORES.gabriel },
  { valor: "compartilhado", label: "Juntos", cor: CORES.compartilhado },
  { valor: "revezar", label: "Revezar semanal", cor: CORES.revezar },
];

const FREQUENCIAS: { valor: Frequencia; label: string }[] = [
  { valor: "diaria", label: "Diária" },
  { valor: "semanal", label: "Semanal" },
  { valor: "quinzenal", label: "Quinzenal" },
  { valor: "mensal", label: "Mensal" },
  { valor: "unica", label: "Uma vez" },
];

const COMODOS = ["Cozinha", "Sala", "Quarto", "Banheiro", "Lavanderia", "Área externa", "Geral"];

export function descreverFrequencia(t: Tarefa) {
  const dias = (t.dias_semana ?? []).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DIAS_CURTOS[d]).join(", ");
  switch (t.frequencia) {
    case "diaria": return dias ? `Todo dia (${dias})` : "Todo dia";
    case "semanal": return `Toda semana · ${dias}`;
    case "quinzenal": return `A cada 2 semanas · ${dias}`;
    case "mensal": return `Todo dia ${t.dia_mes ?? Number(t.data_inicio.slice(8))} do mês`;
    case "unica": return `Uma vez · ${dataCurta(t.data_inicio)}`;
  }
}

export function TarefasCliente({ hoje, semana, tarefas, valores }: { hoje: string; semana: OcorrenciaTarefa[]; tarefas: Tarefa[]; valores: Valor[] }) {
  const [editar, setEditar] = useState<Tarefa | "nova" | null>(null);
  const dias = Array.from(new Set(semana.map((o) => o.data)));
  const porComodo = new Map<string, Tarefa[]>();
  for (const t of tarefas) {
    const k = t.comodo || "Geral";
    porComodo.set(k, [...(porComodo.get(k) ?? []), t]);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <Secao titulo="Checklist da semana" className="lg:col-span-3">
        {semana.length === 0 ? (
          <Vazio icone="🧺">Cadastre as tarefas da rotina ao lado e elas aparecem aqui e na agenda.</Vazio>
        ) : (
          <div className="space-y-4">
            {dias.map((d) => (
              <div key={d}>
                <h3 className={clsx("mb-1.5 text-xs font-bold uppercase tracking-wide", d === hoje ? "text-casa-destaqueescuro" : "text-casa-muted", d < hoje && "opacity-60")}>
                  {d === hoje ? "Hoje · " : ""}{dataLonga(d)}
                </h3>
                <ul className="space-y-1">
                  {semana.filter((o) => o.data === d).map((o) => <ItemChecklist key={o.tarefa.id + d} o={o} />)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Secao>

      <Secao
        titulo="Rotina da casa"
        className="lg:col-span-2"
        acao={<button className="btn-primario" onClick={() => setEditar("nova")}><Plus size={16} /> Tarefa</button>}
      >
        {tarefas.length === 0 ? (
          <Vazio icone="📝">Ex.: “Lavar roupa” toda segunda e quinta, “Faxina do banheiro” quinzenal…</Vazio>
        ) : (
          <div className="space-y-4">
            {[...porComodo.entries()].sort().map(([comodo, lista]) => (
              <div key={comodo}>
                <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-casa-muted">{comodo}</h3>
                <ul className="space-y-1">
                  {lista.map((t) => (
                    <li key={t.id}>
                      <button onClick={() => setEditar(t)} className={clsx("group flex w-full items-center gap-2 rounded-xl p-2 text-left hover:bg-casa-bg", !t.ativa && "opacity-50")}>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{t.titulo}{!t.ativa && " (pausada)"}</span>
                          <span className="block text-xs text-casa-muted">
                            {descreverFrequencia(t)}{t.hora && ` · ${hhmm(t.hora)}`} · {horas(t.duracao_min)}
                          </span>
                        </span>
                        <DonoBadge dono={t.responsavel} pequeno />
                        <Pencil size={13} className="text-casa-muted opacity-0 group-hover:opacity-100" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Secao>

      <Modal aberto={editar !== null} onFechar={() => setEditar(null)} titulo={editar === "nova" ? "Nova tarefa" : "Editar tarefa"}>
        {editar !== null && <FormTarefa tarefa={editar === "nova" ? null : editar} hoje={hoje} valores={valores} onFechar={() => setEditar(null)} />}
      </Modal>
    </div>
  );
}

export function ItemChecklist({ o }: { o: OcorrenciaTarefa }) {
  const { rodar, pendente } = useAcao();
  const feita = !!o.feita;
  return (
    <li>
      <button
        disabled={pendente}
        onClick={() => rodar(() => alternarTarefaFeita(o.tarefa.id, o.data, !feita))}
        className={clsx("flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition", feita ? "border-transparent bg-okclaro/60" : "border-casa-line hover:bg-casa-bg")}
      >
        <span className={clsx("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition", feita ? "border-ok bg-ok text-white" : "border-casa-line")}>
          {feita && <Check size={15} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={clsx("block truncate font-semibold", feita && "text-casa-muted line-through")}>{o.tarefa.titulo}</span>
          <span className="flex items-center gap-1 text-xs text-casa-muted">
            {o.tarefa.hora && <><Clock size={11} /> {hhmm(o.tarefa.hora)} · </>}
            {horas(o.tarefa.duracao_min)}
            {o.tarefa.comodo && ` · ${o.tarefa.comodo}`}
            {feita && o.feita?.feita_por && ` · feita por ${NOMES[o.feita.feita_por]}`}
          </span>
        </span>
        <DonoBadge dono={o.quem} pequeno />
      </button>
    </li>
  );
}

function FormTarefa({ tarefa, hoje, valores, onFechar }: { tarefa: Tarefa | null; hoje: string; valores: Valor[]; onFechar: () => void }) {
  const [responsavel, setResponsavel] = useState<Responsavel>(tarefa?.responsavel ?? "compartilhado");
  const [frequencia, setFrequencia] = useState<Frequencia>(tarefa?.frequencia ?? "semanal");
  const [dias, setDias] = useState<number[]>(tarefa?.dias_semana ?? [diaDaSemana(hoje)]);
  const { pendente, erro, rodar } = useAcao();
  const usaDias = frequencia === "semanal" || frequencia === "quinzenal" || frequencia === "diaria";

  return (
    <form action={(fd) => rodar(() => salvarTarefa(fd), onFechar)} className="space-y-4">
      {tarefa && <input type="hidden" name="id" value={tarefa.id} />}
      <input name="titulo" defaultValue={tarefa?.titulo} className="campo py-2.5 text-base font-semibold" placeholder="Ex.: Limpar o banheiro" required />
      <div>
        <label className="rotulo">Cômodo</label>
        <input name="comodo" list="comodos" defaultValue={tarefa?.comodo} className="campo" placeholder="Cozinha, banheiro…" />
        <datalist id="comodos">{COMODOS.map((c) => <option key={c} value={c} />)}</datalist>
      </div>
      <div>
        <label className="rotulo">Quem faz</label>
        <Segmentos opcoes={RESPONSAVEIS} valor={responsavel} onChange={setResponsavel} nome="responsavel" />
      </div>
      <div>
        <label className="rotulo">Frequência</label>
        <Segmentos opcoes={FREQUENCIAS} valor={frequencia} onChange={setFrequencia} nome="frequencia" />
      </div>
      {usaDias && (
        <div>
          <label className="rotulo">{frequencia === "diaria" ? "Só nestes dias (opcional)" : "Em quais dias"}</label>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const ativo = dias.includes(d);
              return (
                <label key={d} className={clsx("cursor-pointer rounded-xl border-2 px-2.5 py-1.5 text-xs font-bold", ativo ? "border-casa-principal bg-casa-principalclaro text-casa-principal" : "border-casa-line text-casa-muted")} title={DIAS_LONGOS[d]}>
                  <input
                    type="checkbox" name="dias_semana" value={d} checked={ativo} className="sr-only"
                    onChange={() => setDias((x) => (ativo ? x.filter((y) => y !== d) : [...x, d]))}
                  />
                  {DIAS_CURTOS[d]}
                </label>
              );
            })}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="rotulo">{frequencia === "unica" ? "Data" : "A partir de"}</label>
          <input type="date" name="data_inicio" defaultValue={tarefa?.data_inicio ?? hoje} className="campo" />
        </div>
        {frequencia === "mensal" && (
          <div>
            <label className="rotulo">Dia do mês</label>
            <input type="number" name="dia_mes" min={1} max={31} defaultValue={tarefa?.dia_mes ?? Number(hoje.slice(8))} className="campo" />
          </div>
        )}
        <div>
          <label className="rotulo">Horário (opcional)</label>
          <input type="time" name="hora" defaultValue={hhmm(tarefa?.hora)} className="campo" />
        </div>
        <div>
          <label className="rotulo">Duração (min)</label>
          <input type="number" name="duracao_min" min={5} step={5} defaultValue={tarefa?.duracao_min ?? 30} className="campo" />
        </div>
      </div>
      <p className="-mt-2 text-xs text-casa-muted">Com horário, a tarefa aparece na grade da agenda; sem horário, fica na faixa “dia todo”.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="rotulo">Valor ligado (opcional)</label>
          <select name="valor_id" defaultValue={tarefa?.valor_id ?? ""} className="campo">
            <option value="">— Tarefas da casa —</option>
            {valores.map((v) => <option key={v.id} value={v.id}>{v.emoji} {v.nome}</option>)}
          </select>
        </div>
        {tarefa && (
          <div>
            <label className="rotulo">Situação</label>
            <select name="ativa" defaultValue={tarefa.ativa ? "on" : "off"} className="campo">
              <option value="on">Ativa</option>
              <option value="off">Pausada</option>
            </select>
          </div>
        )}
      </div>
      {erro && <p className="rounded-xl bg-perigoclaro px-3 py-2 text-sm text-perigo">{erro}</p>}
      <div className="flex justify-between gap-2">
        {tarefa ? (
          <button type="button" className="btn-perigo" disabled={pendente}
            onClick={() => confirm(`Excluir a tarefa "${tarefa.titulo}" e seu histórico?`) && rodar(() => excluirTarefa(tarefa.id), onFechar)}>
            <Trash2 size={15} /> Excluir
          </button>
        ) : <span />}
        <button className="btn-primario" disabled={pendente}>{pendente ? "Salvando…" : "Salvar"}</button>
      </div>
    </form>
  );
}
