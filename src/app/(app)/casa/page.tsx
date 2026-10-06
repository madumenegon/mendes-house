import { carregarFeitas, carregarTarefas, carregarValores } from "@/lib/dados";
import { hojeISO, inicioDaSemana, somarDias } from "@/lib/datas";
import { expandirTarefas } from "@/lib/recorrencia";
import { horas, pct } from "@/lib/format";
import { Abas, Cabecalho, StatTile } from "@/components/ui";
import { ABAS_CASA } from "./abas";
import { TarefasCliente } from "./TarefasCliente";

export default async function CasaPage() {
  const hoje = hojeISO();
  const ini = inicioDaSemana(hoje);
  const fim = somarDias(ini, 6);
  const [todas, feitas, valores] = await Promise.all([carregarTarefas(false), carregarFeitas(ini, fim), carregarValores()]);
  const semana = expandirTarefas(todas.filter((t) => t.ativa), feitas, ini, fim);
  const deHoje = semana.filter((o) => o.data === hoje);

  const carga = { madu: 0, gabriel: 0 };
  for (const o of semana) {
    if (o.quem === "compartilhado") {
      carga.madu += o.tarefa.duracao_min;
      carga.gabriel += o.tarefa.duracao_min;
    } else carga[o.quem] += o.tarefa.duracao_min;
  }
  const feitasSemana = semana.filter((o) => o.feita).length;

  return (
    <div>
      <Cabecalho titulo="Casa" subtitulo="Rotina da casa, despensa e compras da semana." />
      <Abas itens={ABAS_CASA} ativo="/casa" />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile rotulo="Hoje" valor={`${deHoje.filter((o) => o.feita).length}/${deHoje.length}`} detalhe="tarefas feitas" icone="✅" cor="#16a34a" />
        <StatTile rotulo="Semana" valor={`${pct(feitasSemana, semana.length)}%`} detalhe={`${feitasSemana} de ${semana.length} concluídas`} icone="📅" cor="#0d9488" />
        <StatTile rotulo="Carga — Madu" valor={horas(carga.madu)} detalhe="de tarefas nesta semana" icone="🌷" cor="#e0527e" />
        <StatTile rotulo="Carga — Gabriel" valor={horas(carga.gabriel)} detalhe="de tarefas nesta semana" icone="🌊" cor="#3b7dd8" />
      </div>
      <TarefasCliente hoje={hoje} semana={semana} tarefas={todas} valores={valores} />
    </div>
  );
}
