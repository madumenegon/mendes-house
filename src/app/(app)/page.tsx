import Link from "next/link";
import { exigirMembro } from "@/lib/auth";
import { db } from "@/lib/supabase";
import {
  agruparFaturas, autoGerarSePreciso, carregarCaixinhas, carregarCartoes, carregarCategorias, carregarEventos, carregarFamilia, carregarFeitas, carregarLancamentos,
  carregarTarefas, carregarValores, movimentosDoMes, resumirMes,
} from "@/lib/dados";
import { agoraHHMM, dataCurta, dataLonga, hhmm, hojeISO, inicioDaSemana, mesDe, somarDias } from "@/lib/datas";
import { expandirEventos, expandirTarefas } from "@/lib/recorrencia";
import { resumirTempo } from "@/lib/tempo";
import { CORES, moeda } from "@/lib/format";
import { DonoBadge, Secao, StatTile, Vazio } from "@/components/ui";
import { CompromissosPessoas } from "@/components/Tempo";
import { ItemChecklist } from "./casa/TarefasCliente";
import { BotaoPagarFatura, BotaoPago } from "./financas/BotaoPago";

export default async function InicioPage() {
  const membro = await exigirMembro();
  const hoje = hojeISO();
  const mes = mesDe(hoje);
  const semIni = inicioDaSemana(hoje);
  const semFim = somarDias(semIni, 6);
  await autoGerarSePreciso(mes, membro);

  const supa = db();
  const [familia, valores, eventos, tarefas, feitas, lancs, categorias, { movimentos }, { data: estoque }, { count: naLista }, cartoes] = await Promise.all([
    carregarFamilia(), carregarValores(), carregarEventos(semIni, somarDias(hoje, 7) > semFim ? somarDias(hoje, 7) : semFim), carregarTarefas(),
    carregarFeitas(semIni, semFim), carregarLancamentos(mes, mesDe(somarDias(hoje, 7))), carregarCategorias(), carregarCaixinhas(),
    supa.from("estoque").select("id, nome, quantidade, minimo, unidade"),
    supa.from("compras").select("id", { count: "exact", head: true }).eq("comprado", false),
    carregarCartoes(),
  ]);

  const resumo = resumirTempo(eventos, tarefas, feitas, valores, semIni, semFim, familia.horas_acordadas_dia);
  const doDia = expandirEventos(eventos, hoje, hoje);
  const amanha = expandirEventos(eventos, somarDias(hoje, 1), somarDias(hoje, 1));
  const tarefasHoje = expandirTarefas(tarefas, feitas, hoje, hoje);
  const r = resumirMes(lancs.filter((l) => l.competencia === mes), categorias, movimentosDoMes(movimentos, mes));
  const limite = somarDias(hoje, 7);
  const emAberto = lancs.filter((l) => !l.pago && l.tipo === "despesa" && l.data <= limite);
  const faturas = agruparFaturas(emAberto, cartoes);
  const naFatura = new Set(faturas.flatMap((f) => f.itens.map((l) => l.id)));
  const vencendo = [
    ...emAberto.filter((l) => !naFatura.has(l.id)).map((l) => ({ chave: l.id, titulo: l.descricao, data: l.data, valor: l.valor, lanc: l, fatura: null })),
    ...faturas.map((f) => ({ chave: f.cartao.id, titulo: `Fatura ${f.cartao.nome}`, data: f.vencimento, valor: f.aPagar, lanc: null, fatura: f })),
  ].sort((a, b) => a.data.localeCompare(b.data));
  const acabando = (estoque ?? []).filter((i) => Number(i.quantidade) <= Number(i.minimo));
  const valorMap = new Map(valores.map((v) => [v.id, v]));

  const hora = Number(agoraHHMM().slice(0, 2));
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-5">
      <div className="card relative overflow-hidden bg-[linear-gradient(120deg,#fcdde0,#fff_55%,#d9ecfa)] p-5 sm:p-6">
        <p className="text-sm font-semibold text-casa-muted">{dataLonga(hoje)}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">
          {saudacao}, <span style={{ color: CORES[membro] }}>{membro === "madu" ? "Madu" : "Gabriel"}</span>!
        </h1>
        {(familia.lema || familia.missao) && (
          <p className="mt-2 max-w-2xl text-sm italic text-casa-muted">“{familia.lema || familia.missao.split("\n")[0]}”</p>
        )}
      </div>

      <CompromissosPessoas resumo={resumo} />

      <div className="grid gap-5 lg:grid-cols-3">
        <Secao titulo="📅 Hoje na agenda" className="lg:col-span-2" acao={<Link href="/agenda" className="text-xs font-bold text-casa-principal">Agenda →</Link>}>
          {doDia.length === 0 ? (
            <Vazio icone="🌤️">Nenhum compromisso hoje.</Vazio>
          ) : (
            <ul className="space-y-2">
              {doDia.map(({ evento: ev }) => {
                const v = valorMap.get(ev.valor_id);
                return (
                  <li key={ev.id} className="flex items-center gap-3 rounded-xl border border-casa-line p-2.5">
                    <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: ev.cor || CORES[ev.dono] }} />
                    <span className="w-24 shrink-0 text-sm font-bold tabular-nums">{ev.dia_inteiro ? "Dia todo" : `${hhmm(ev.hora_inicio)}–${hhmm(ev.hora_fim)}`}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{ev.titulo}</span>
                      <span className="flex flex-wrap items-center gap-1.5 text-xs text-casa-muted">
                        <DonoBadge dono={ev.dono} pequeno />{v && <span>{v.emoji} {v.nome}</span>}{ev.local && <span>· {ev.local}</span>}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {amanha.length > 0 && (
            <p className="mt-3 text-xs text-casa-muted">
              Amanhã: {amanha.slice(0, 3).map((o) => `${o.evento.dia_inteiro ? "" : hhmm(o.evento.hora_inicio) + " "}${o.evento.titulo}`).join(" · ")}
              {amanha.length > 3 && ` +${amanha.length - 3}`}
            </p>
          )}
        </Secao>

        <Secao titulo="🧹 Tarefas de hoje" acao={<Link href="/casa" className="text-xs font-bold text-casa-principal">Casa →</Link>}>
          {tarefasHoje.length === 0 ? <Vazio icone="😌">Nenhuma tarefa para hoje.</Vazio> : (
            <ul className="space-y-1">{tarefasHoje.map((o) => <ItemChecklist key={o.tarefa.id} o={o} />)}</ul>
          )}
        </Secao>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile rotulo="Saldo do mês" valor={moeda(r.saldo)} icone="💰" cor={r.saldo >= 0 ? "#e0601a" : "#dc2626"} destaque />
        <StatTile rotulo="A pagar no mês" valor={moeda(r.aPagar)} icone="🧾" cor="#e8508a" detalhe={`${moeda(r.pago)} já pagos`} />
        <StatTile rotulo="Lista de compras" valor={`${naLista ?? 0} itens`} icone="🛒" cor="#3fa79f" detalhe={<Link href="/casa/compras" className="font-bold underline">abrir lista</Link>} />
        <StatTile rotulo="Acabando em casa" valor={acabando.length} icone="🥫" cor="#d97706" detalhe={<Link href="/casa/despensa" className="font-bold underline">ver despensa</Link>} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Secao titulo="⏰ Contas dos próximos 7 dias" acao={<Link href="/financas" className="text-xs font-bold text-casa-principal">Finanças →</Link>}>
          {vencendo.length === 0 ? <Vazio icone="🎉">Nenhuma conta vencendo.</Vazio> : (
            <ul className="divide-y divide-casa-line">
              {vencendo.slice(0, 6).map((v) => (
                <li key={v.chave} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{v.fatura ? "💳 " : ""}{v.titulo}</p>
                    <p className={`text-xs ${v.data < hoje ? "font-bold text-perigo" : "text-casa-muted"}`}>{v.data < hoje ? "Venceu" : "Vence"} {dataCurta(v.data)}</p>
                  </div>
                  <span className="font-bold tabular-nums">{moeda(v.valor)}</span>
                  {v.fatura ? (
                    <BotaoPagarFatura cartaoId={v.fatura.cartao.id} competencia={v.data.slice(0, 7)} pago={false} />
                  ) : (
                    v.lanc && <BotaoPago id={v.lanc.id} pago={v.lanc.pago} tipo={v.lanc.tipo} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Secao>
        <Secao titulo="🥫 Está acabando">
          {acabando.length === 0 ? <Vazio icone="✅">Despensa em dia.</Vazio> : (
            <div className="flex flex-wrap gap-2">
              {acabando.map((i) => (
                <span key={i.id} className={`rounded-full px-3 py-1 text-sm font-semibold ${Number(i.quantidade) <= 0 ? "bg-perigoclaro text-perigo" : "bg-alertaclaro text-alerta"}`}>
                  {i.nome} · {Number(i.quantidade)} {i.unidade}
                </span>
              ))}
            </div>
          )}
        </Secao>
      </div>
    </div>
  );
}
