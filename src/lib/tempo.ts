import { diasEntre, duracaoMin } from "@/lib/datas";
import { expandirEventos, expandirTarefas } from "@/lib/recorrencia";
import type { Evento, MembroId, Tarefa, TarefaFeita, Valor } from "@/lib/types";

export interface TempoPessoa {
  compromissos: number; // próprios + compartilhados
  proprios: number;
  compartilhados: number;
  minEventos: number;
  minTarefas: number;
  capacidade: number; // minutos acordados no período
  disponivel: number;
}

export interface TempoValor {
  id: string;
  nome: string;
  emoji: string;
  cor: string;
  escopo: Valor["escopo"] | "casa";
  ocorrencias: number;
  minutos: number; // tempo de calendário (compartilhado conta uma vez)
  minMadu: number;
  minGabriel: number;
}

export interface ResumoTempo {
  pessoas: Record<MembroId, TempoPessoa>;
  valores: TempoValor[]; // ordenado por minutos desc
  totalOcorrencias: number;
}

const SEM_VALOR = "__casa__";

/** Indicadores de tempo de um período: quantos compromissos cada um tem,
 * quanto tempo cada valor consome e quanto sobra de tempo livre
 * (horas acordadas − compromissos − tarefas da casa). */
export function resumirTempo(
  eventos: Evento[],
  tarefas: Tarefa[],
  feitas: TarefaFeita[],
  valores: Valor[],
  inicio: string,
  fim: string,
  horasAcordadasDia: number
): ResumoTempo {
  const dias = diasEntre(inicio, fim) + 1;
  const capacidade = Math.round(horasAcordadasDia * 60 * dias);
  const nova = (): TempoPessoa => ({
    compromissos: 0, proprios: 0, compartilhados: 0, minEventos: 0, minTarefas: 0, capacidade, disponivel: capacidade,
  });
  const pessoas: Record<MembroId, TempoPessoa> = { madu: nova(), gabriel: nova() };

  const porValor = new Map<string, TempoValor>();
  const valorMap = new Map(valores.map((v) => [v.id, v]));
  const bucket = (id: string | null): TempoValor => {
    const key = id && valorMap.has(id) ? id : SEM_VALOR;
    let b = porValor.get(key);
    if (!b) {
      const v = valorMap.get(key);
      b = v
        ? { id: v.id, nome: v.nome, emoji: v.emoji, cor: v.cor, escopo: v.escopo, ocorrencias: 0, minutos: 0, minMadu: 0, minGabriel: 0 }
        : { id: SEM_VALOR, nome: "Tarefas da casa", emoji: "🧹", cor: "#94a3b8", escopo: "casa", ocorrencias: 0, minutos: 0, minMadu: 0, minGabriel: 0 };
      porValor.set(key, b);
    }
    return b;
  };

  const ocorrencias = expandirEventos(eventos, inicio, fim);
  for (const { evento: ev } of ocorrencias) {
    const min = ev.dia_inteiro ? 0 : duracaoMin(ev.hora_inicio, ev.hora_fim);
    const quem: MembroId[] = ev.dono === "compartilhado" ? ["madu", "gabriel"] : [ev.dono];
    for (const p of quem) {
      pessoas[p].compromissos++;
      if (ev.dono === "compartilhado") pessoas[p].compartilhados++;
      else pessoas[p].proprios++;
      pessoas[p].minEventos += min;
    }
    const b = bucket(ev.valor_id);
    b.ocorrencias++;
    b.minutos += min;
    if (quem.includes("madu")) b.minMadu += min;
    if (quem.includes("gabriel")) b.minGabriel += min;
  }

  for (const oc of expandirTarefas(tarefas, feitas, inicio, fim)) {
    const min = oc.tarefa.duracao_min || 0;
    const quem: MembroId[] = oc.quem === "compartilhado" ? ["madu", "gabriel"] : [oc.quem];
    for (const p of quem) pessoas[p].minTarefas += min;
    const b = bucket(oc.tarefa.valor_id);
    b.ocorrencias++;
    b.minutos += min;
    if (quem.includes("madu")) b.minMadu += min;
    if (quem.includes("gabriel")) b.minGabriel += min;
  }

  for (const p of Object.values(pessoas)) {
    p.disponivel = Math.max(0, p.capacidade - p.minEventos - p.minTarefas);
  }

  return {
    pessoas,
    valores: [...porValor.values()].sort((a, b) => b.minutos - a.minutos || b.ocorrencias - a.ocorrencias),
    totalOcorrencias: ocorrencias.length,
  };
}
