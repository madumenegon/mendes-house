import { diaDaSemana, diasEntre, somarDias, somarMeses, ultimoDiaDoMes } from "@/lib/datas";
import type { Dono, Evento, Ocorrencia, OcorrenciaTarefa, Tarefa, TarefaFeita } from "@/lib/types";

/** Expande os eventos (inclusive recorrentes) em ocorrências entre
 * `inicio` e `fim` (inclusive), já ordenadas por data/hora. */
export function expandirEventos(eventos: Evento[], inicio: string, fim: string): Ocorrencia[] {
  const out: Ocorrencia[] = [];
  for (const ev of eventos) {
    const limite = ev.recorrencia_fim && ev.recorrencia_fim < fim ? ev.recorrencia_fim : fim;
    const pular = new Set(ev.excecoes ?? []);
    const add = (d: string) => {
      if (d >= inicio && d <= limite && !pular.has(d)) out.push({ evento: ev, data: d });
    };

    if (ev.recorrencia === "nenhuma") {
      if (ev.data >= inicio && ev.data <= fim) out.push({ evento: ev, data: ev.data });
      continue;
    }
    if (ev.data > limite) continue;

    if (ev.recorrencia === "mensal") {
      for (let i = 0; i < 600; i++) {
        const d = somarMeses(ev.data, i);
        if (d > limite) break;
        add(d);
      }
      continue;
    }

    const passo = ev.recorrencia === "diaria" ? 1 : ev.recorrencia === "semanal" ? 7 : 14;
    // pula direto para perto do início do intervalo
    let d = ev.data;
    if (d < inicio) {
      const saltos = Math.floor(diasEntre(d, inicio) / passo);
      d = somarDias(d, saltos * passo);
    }
    for (; d <= limite; d = somarDias(d, passo)) add(d);
  }
  return out.sort((a, b) => {
    if (a.data !== b.data) return a.data < b.data ? -1 : 1;
    if (a.evento.dia_inteiro !== b.evento.dia_inteiro) return a.evento.dia_inteiro ? -1 : 1;
    return (a.evento.hora_inicio ?? "").localeCompare(b.evento.hora_inicio ?? "");
  });
}

/** A tarefa acontece nessa data? */
export function tarefaCaiEm(t: Tarefa, d: string): boolean {
  if (!t.ativa || d < t.data_inicio) return false;
  const dow = diaDaSemana(d);
  const dias = t.dias_semana?.length ? t.dias_semana : [diaDaSemana(t.data_inicio)];
  switch (t.frequencia) {
    case "unica":
      return d === t.data_inicio;
    case "diaria":
      return t.dias_semana?.length ? t.dias_semana.includes(dow) : true;
    case "semanal":
      return dias.includes(dow);
    case "quinzenal": {
      const semanas = Math.floor(diasEntre(segunda(t.data_inicio), segunda(d)) / 7);
      return semanas % 2 === 0 && dias.includes(dow);
    }
    case "mensal": {
      const [a, m, dia] = d.split("-").map(Number);
      const alvo = Math.min(t.dia_mes ?? Number(t.data_inicio.slice(8)), ultimoDiaDoMes(a, m));
      return dia === alvo;
    }
  }
}

function segunda(iso: string) {
  const dow = diaDaSemana(iso);
  return somarDias(iso, dow === 0 ? -6 : 1 - dow);
}

/** No "revezar", cada semana é de um: começa pela Madu. */
export function quemFaz(t: Tarefa, d: string): Dono {
  if (t.responsavel !== "revezar") return t.responsavel;
  const semanas = Math.floor(diasEntre(segunda(t.data_inicio), segunda(d)) / 7);
  return semanas % 2 === 0 ? "madu" : "gabriel";
}

export function expandirTarefas(
  tarefas: Tarefa[],
  feitas: TarefaFeita[],
  inicio: string,
  fim: string
): OcorrenciaTarefa[] {
  const mapa = new Map(feitas.map((f) => [`${f.tarefa_id}|${f.data}`, f]));
  const out: OcorrenciaTarefa[] = [];
  for (let d = inicio; d <= fim; d = somarDias(d, 1)) {
    for (const t of tarefas) {
      if (tarefaCaiEm(t, d)) {
        out.push({ tarefa: t, data: d, quem: quemFaz(t, d), feita: mapa.get(`${t.id}|${d}`) ?? null });
      }
    }
  }
  return out.sort((a, b) =>
    a.data !== b.data ? (a.data < b.data ? -1 : 1) : (a.tarefa.hora ?? "99").localeCompare(b.tarefa.hora ?? "99")
  );
}
