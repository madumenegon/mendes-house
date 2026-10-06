import Link from "next/link";
import clsx from "clsx";
import { db } from "@/lib/supabase";
import { carregarResumoTempo } from "@/lib/dados";
import { dataCurta, fimDoMes, hojeISO, inicioDaSemana, inicioDoMes, mesDe, somarDias } from "@/lib/datas";
import { horas } from "@/lib/format";
import type { Prioridade } from "@/lib/types";
import { Cabecalho, Secao } from "@/components/ui";
import { CompromissosPessoas, TempoDisponivel, TempoPorValor } from "@/components/Tempo";
import { ValoresCliente } from "./ValoresCliente";
import { GraficoValores } from "./GraficoValores";

export default async function ValoresPage({ searchParams }: PageProps<"/valores">) {
  const sp = await searchParams;
  const periodo = sp.periodo === "mes" ? "mes" : "semana";
  const hoje = hojeISO();
  const inicio = periodo === "mes" ? inicioDoMes(mesDe(hoje)) : inicioDaSemana(hoje);
  const fim = periodo === "mes" ? fimDoMes(mesDe(hoje)) : somarDias(inicio, 6);

  const [{ familia, valores, resumo }, { data: prioridades }] = await Promise.all([
    carregarResumoTempo(inicio, fim),
    db().from("prioridades").select("*").order("ordem"),
  ]);

  const totalMin = resumo.valores.reduce((s, v) => s + v.minutos, 0);
  const top = resumo.valores[0];

  return (
    <div className="space-y-5">
      <Cabecalho titulo="Valores & prioridades" subtitulo="Quem somos, o que importa e para onde vai o nosso tempo." />

      <ValoresCliente familia={familia} valores={valores} prioridades={(prioridades ?? []) as Prioridade[]} />

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <h2 className="font-display text-2xl font-semibold">Para onde vai o nosso tempo</h2>
        <div className="flex gap-1 rounded-2xl bg-white p-1 ring-1 ring-casa-line">
          {(["semana", "mes"] as const).map((p) => (
            <Link
              key={p}
              href={`/valores?periodo=${p}`}
              className={clsx("rounded-xl px-3 py-1.5 text-sm font-semibold", periodo === p ? "bg-casa-verde text-white" : "text-casa-muted")}
            >
              {p === "semana" ? "Esta semana" : "Este mês"}
            </Link>
          ))}
        </div>
      </div>
      <p className="-mt-3 text-sm text-casa-muted">
        {dataCurta(inicio)} a {dataCurta(fim)} · {horas(totalMin)} dedicadas aos valores
        {top && top.minutos > 0 && <> · o que mais consome tempo: <b>{top.emoji} {top.nome}</b></>}
      </p>

      <CompromissosPessoas resumo={resumo} periodo={periodo === "mes" ? "no mês" : "na semana"} />

      <div className="grid gap-5 lg:grid-cols-5">
        <Secao titulo="Tempo por valor" className="lg:col-span-3">
          <TempoPorValor resumo={resumo} />
        </Secao>
        <div className="space-y-5 lg:col-span-2">
          <Secao titulo="Distribuição">
            <GraficoValores dados={resumo.valores.filter((v) => v.minutos > 0).map((v) => ({ nome: `${v.emoji} ${v.nome}`, minutos: v.minutos, cor: v.cor }))} />
          </Secao>
          <Secao titulo="Tempo disponível">
            <TempoDisponivel resumo={resumo} />
            <p className="mt-3 text-xs text-casa-muted">
              Considerando {familia.horas_acordadas_dia}h acordados por dia (ajuste em &quot;Nossa missão&quot; acima).
            </p>
          </Secao>
        </div>
      </div>
    </div>
  );
}
