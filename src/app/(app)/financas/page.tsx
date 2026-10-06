import Link from "next/link";
import { exigirMembro } from "@/lib/auth";
import {
  autoGerarSePreciso, carregarCaixinhas, carregarCategorias, carregarLancamentos, carregarResumoTempo, movimentosDoMes, resumirMes, saldoCaixinha,
} from "@/lib/dados";
import { dataCurta, hojeISO, inicioDaSemana, inicioDoMes, mesDe, nomeMes, somarDias, somarMeses } from "@/lib/datas";
import { FORMAS, moeda, pct } from "@/lib/format";
import { Barra, Cabecalho, DonoBadge, Secao, StatTile, Vazio } from "@/components/ui";
import { TempoDisponivel, TempoPorValor } from "@/components/Tempo";
import { AbasFinancas, SeletorMes, mesDaUrl } from "./comum";
import { DonutFixoVariavel, EvolucaoMeses } from "./Graficos";
import { BotaoPago } from "./BotaoPago";

export default async function FinancasPage({ searchParams }: PageProps<"/financas">) {
  const membro = await exigirMembro();
  const mes = mesDaUrl((await searchParams).mes);
  await autoGerarSePreciso(mes, membro);

  const mesIni6 = mesDe(somarMeses(inicioDoMes(mes), -5));
  const hoje = hojeISO();
  const semIni = inicioDaSemana(hoje);
  const [lancs6, categorias, { caixinhas, movimentos }, tempo] = await Promise.all([
    carregarLancamentos(mesIni6, mes),
    carregarCategorias(),
    carregarCaixinhas(),
    carregarResumoTempo(semIni, somarDias(semIni, 6)),
  ]);
  const lancs = lancs6.filter((l) => l.competencia === mes);
  const r = resumirMes(lancs, categorias, movimentosDoMes(movimentos, mes));

  const evolucao = Array.from({ length: 6 }, (_, i) => {
    const m = mesDe(somarMeses(inicioDoMes(mesIni6), i));
    const doMes = lancs6.filter((l) => l.competencia === m);
    return {
      mes: nomeMes(m, true),
      receitas: doMes.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valor, 0),
      despesas: doMes.filter((l) => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0),
    };
  });

  const pendentes = lancs.filter((l) => !l.pago).sort((a, b) => a.data.localeCompare(b.data));
  const catMap = new Map(categorias.map((c) => [c.id, c]));
  const maxCat = Math.max(1, ...r.porCategoria.map((c) => c.total));
  const ativas = caixinhas.filter((c) => !c.arquivada);
  const totalGuardado = ativas.reduce((s, c) => s + saldoCaixinha(c.id, movimentos), 0);
  const salarios = lancs.filter((l) => l.tipo === "receita" && l.forma !== "vale").reduce((s, l) => s + l.valor, 0);

  return (
    <div>
      <Cabecalho titulo="Finanças" subtitulo="Para onde vai o nosso dinheiro — e o nosso tempo." acao={<SeletorMes mes={mes} base="/financas" />} />
      <AbasFinancas ativo="/financas" mes={mes} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile rotulo="Receitas" valor={moeda(r.receitas)} icone="💼" cor="#16a34a"
          detalhe={<>Salários/rendas {moeda(salarios)} · Vales {moeda(r.valeRecebido)}</>} />
        <StatTile rotulo="Despesas" valor={moeda(r.despesas)} icone="🧾" cor="#e0527e"
          detalhe={<>{moeda(r.pago)} pagos · {moeda(r.aPagar)} a pagar</>} />
        <StatTile rotulo="Saldo do mês" valor={moeda(r.saldo)} icone={r.saldo >= 0 ? "😊" : "😬"} cor={r.saldo >= 0 ? "#2f5d50" : "#dc2626"} destaque
          detalhe={r.receitas > 0 ? <>Gastamos {pct(r.despesas, r.receitas)}% do que entrou</> : "Lance as receitas do mês"} />
        <StatTile rotulo="Livre após caixinhas" valor={moeda(r.livre)} icone="🐷" cor="#0ea5e9"
          detalhe={<>Guardado no mês: {moeda(r.depositos - r.retiradas)}</>} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Secao titulo="Fixos × variáveis" className="lg:col-span-1">
          <DonutFixoVariavel fixo={r.fixo} variavel={r.variavel} />
        </Secao>

        <Secao titulo="Com o que mais gastamos" className="lg:col-span-2"
          acao={<Link href={`/financas/orcamento?mes=${mes}`} className="text-xs font-bold text-casa-verde">Definir limites →</Link>}>
          {r.porCategoria.length === 0 ? (
            <Vazio icone="🧾">Nenhuma despesa lançada em {nomeMes(mes)}.</Vazio>
          ) : (
            <ul className="space-y-2.5">
              {r.porCategoria.slice(0, 8).map((c) => {
                const estourou = c.orcamento !== null && c.total > c.orcamento;
                return (
                  <li key={c.id}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 font-semibold">
                        <span className="text-base">{c.emoji}</span>{c.nome}
                        <span className="rounded-full bg-casa-bg px-1.5 text-[10px] font-bold text-casa-muted">{c.natureza === "fixo" ? "fixo" : "variável"}</span>
                      </span>
                      <span className="tabular-nums">
                        <b>{moeda(c.total)}</b>
                        <span className="text-casa-muted"> · {pct(c.total, r.despesas)}%</span>
                        {c.orcamento !== null && (
                          <span className={estourou ? "font-bold text-perigo" : "text-casa-muted"}> / {moeda(c.orcamento)}</span>
                        )}
                      </span>
                    </div>
                    <Barra valor={c.total} total={c.orcamento !== null ? Math.max(c.orcamento, c.total) : maxCat} cor={estourou ? "#dc2626" : c.cor} />
                  </li>
                );
              })}
            </ul>
          )}
        </Secao>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Secao titulo={`Contas em aberto (${pendentes.length})`} className="lg:col-span-2"
          acao={<Link href={`/financas/lancamentos?mes=${mes}`} className="text-xs font-bold text-casa-verde">Ver todos →</Link>}>
          {pendentes.length === 0 ? (
            <Vazio icone="🎉">Tudo pago e recebido neste mês!</Vazio>
          ) : (
            <ul className="divide-y divide-casa-line">
              {pendentes.slice(0, 10).map((l) => {
                const c = l.categoria_id ? catMap.get(l.categoria_id) : null;
                const vencida = l.data < hoje && l.tipo === "despesa";
                return (
                  <li key={l.id} className="flex items-center gap-3 py-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: `${c?.cor ?? "#94a3b8"}1f` }}>{c?.emoji ?? "💸"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{l.descricao}</p>
                      <p className="flex flex-wrap items-center gap-1.5 text-xs text-casa-muted">
                        <span className={vencida ? "font-bold text-perigo" : ""}>{vencida ? "venceu " : "vence "}{dataCurta(l.data)}</span>
                        · {FORMAS[l.forma] ?? l.forma} <DonoBadge dono={l.pessoa} pequeno />
                      </p>
                    </div>
                    <span className={`font-bold tabular-nums ${l.tipo === "receita" ? "text-ok" : ""}`}>{l.tipo === "receita" ? "+" : ""}{moeda(l.valor)}</span>
                    <BotaoPago id={l.id} pago={l.pago} tipo={l.tipo} />
                  </li>
                );
              })}
            </ul>
          )}
        </Secao>

        <div className="space-y-5">
          <Secao titulo="Vale alimentação/refeição">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-[11px] font-bold uppercase text-casa-muted">Recebido</p><p className="font-display text-lg font-semibold">{moeda(r.valeRecebido)}</p></div>
              <div><p className="text-[11px] font-bold uppercase text-casa-muted">Usado</p><p className="font-display text-lg font-semibold">{moeda(r.valeGasto)}</p></div>
              <div><p className="text-[11px] font-bold uppercase text-casa-muted">Sobra</p><p className={`font-display text-lg font-semibold ${r.valeRecebido - r.valeGasto < 0 ? "text-perigo" : "text-ok"}`}>{moeda(r.valeRecebido - r.valeGasto)}</p></div>
            </div>
            <div className="mt-3"><Barra valor={r.valeGasto} total={Math.max(r.valeRecebido, r.valeGasto)} cor="#65a30d" alto /></div>
            <p className="mt-2 text-xs text-casa-muted">Lance gastos pagos com o vale usando a forma “Vale (VA/VR)”.</p>
          </Secao>

          <Secao titulo="Caixinhas" acao={<Link href={`/financas/caixinhas?mes=${mes}`} className="text-xs font-bold text-casa-verde">Abrir →</Link>}>
            <p className="mb-3 font-display text-2xl font-semibold">{moeda(totalGuardado)} <span className="font-sans text-xs font-semibold text-casa-muted">guardados</span></p>
            <ul className="space-y-2.5">
              {ativas.slice(0, 4).map((c) => {
                const saldo = saldoCaixinha(c.id, movimentos);
                return (
                  <li key={c.id}>
                    <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{c.emoji} {c.nome}</span><span className="tabular-nums">{moeda(saldo)}{c.meta ? <span className="text-casa-muted"> / {moeda(c.meta)}</span> : null}</span></div>
                    {c.meta ? <Barra valor={saldo} total={c.meta} cor={c.cor} /> : null}
                  </li>
                );
              })}
            </ul>
          </Secao>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <Secao titulo="Receitas × despesas (6 meses)" className="lg:col-span-3">
          <EvolucaoMeses dados={evolucao} />
        </Secao>
        <Secao titulo="⏳ Orçamento de tempo da semana" className="lg:col-span-2"
          acao={<Link href="/valores" className="text-xs font-bold text-casa-verde">Valores →</Link>}>
          <p className="-mt-1 mb-3 text-xs text-casa-muted">Assim como o dinheiro, o tempo também se destina. Livre = horas acordados − compromissos − tarefas da casa.</p>
          <TempoDisponivel resumo={tempo.resumo} compacto />
          <div className="mt-4 border-t border-casa-line pt-3">
            <p className="rotulo">Onde o tempo está indo</p>
            <TempoPorValor resumo={tempo.resumo} limite={4} />
          </div>
        </Secao>
      </div>
    </div>
  );
}
