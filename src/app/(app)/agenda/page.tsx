import { carregarEventos, carregarFamilia, carregarFeitas, carregarTarefas, carregarValores } from "@/lib/dados";
import { dataValida, fimDoMes, hojeISO, inicioDaSemana, inicioDoMes, mesDe, somarDias } from "@/lib/datas";
import { expandirEventos, expandirTarefas } from "@/lib/recorrencia";
import { resumirTempo } from "@/lib/tempo";
import { exigirMembro } from "@/lib/auth";
import { CompromissosPessoas } from "@/components/Tempo";
import { AgendaCliente, type Visao } from "./AgendaCliente";

export default async function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  const membro = await exigirMembro();
  const sp = await searchParams;
  const hoje = hojeISO();
  const ref = dataValida(sp.data as string) ? (sp.data as string) : hoje;
  const visao: Visao = sp.ver === "mes" || sp.ver === "lista" ? sp.ver : "semana";

  let inicio: string, fim: string;
  if (visao === "mes") {
    inicio = inicioDaSemana(inicioDoMes(mesDe(ref)));
    fim = somarDias(inicio, 41);
  } else if (visao === "lista") {
    inicio = ref;
    fim = somarDias(ref, 20);
  } else {
    inicio = inicioDaSemana(ref);
    fim = somarDias(inicio, 6);
  }
  const semIni = inicioDaSemana(ref);
  const semFim = somarDias(semIni, 6);
  const carregaIni = inicio < semIni ? inicio : semIni;
  const carregaFim = fim > semFim ? fim : semFim;

  const [familia, valores, eventos, tarefas, feitas] = await Promise.all([
    carregarFamilia(), carregarValores(), carregarEventos(carregaIni, carregaFim), carregarTarefas(), carregarFeitas(carregaIni, carregaFim),
  ]);
  const resumoSemana = resumirTempo(eventos, tarefas, feitas, valores, semIni, semFim, familia.horas_acordadas_dia);

  return (
    <div className="space-y-5">
      <CompromissosPessoas resumo={resumoSemana} />
      <AgendaCliente
        membro={membro}
        visao={visao}
        referencia={ref}
        hoje={hoje}
        inicio={inicio}
        fim={fim}
        mesRef={mesDe(ref)}
        fimMes={fimDoMes(mesDe(ref))}
        ocorrencias={expandirEventos(eventos, inicio, fim)}
        tarefas={expandirTarefas(tarefas, feitas, inicio, fim)}
        valores={valores}
      />
    </div>
  );
}
