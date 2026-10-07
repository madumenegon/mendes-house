import Link from "next/link";
import { exigirMembro } from "@/lib/auth";
import {
  agruparFaturas, autoGerarSePreciso, carregarCaixinhas, carregarCartoes, carregarCategorias, carregarFamilia, carregarLancamentos,
  carregarResumoTempo, movimentosDoMes, resumirMes, saldoCaixinha,
} from "@/lib/dados";
import { dataCurta, hojeISO, inicioDaSemana, inicioDoMes, mesDe, nomeMes, somarDias, somarMeses } from "@/lib/datas";
import { FORMAS, pct } from "@/lib/format";
import { Barra, Cabecalho, DonoBadge, Secao, StatTile, Vazio } from "@/components/ui";
import { TempoDisponivel, TempoPorValor } from "@/components/Tempo";
import { AbasFinancas, SeletorMes, mesDaUrl } from "./comum";
import { DonutFixoVariavel, EvolucaoMeses } from "./Graficos";
import { BotaoPagarFatura, BotaoPago } from "./BotaoPago";
import { mesConsumo } from "@/lib/cartao";
import type { Lancamento } from "@/lib/types";
import { Din } from "@/components/Privacidade";

export default async function FinancasPage({ searchParams }: PageProps<"/financas">) {
  const membro = await exigirMembro();
  const sp = await searchParams;
  const mes = mesDaUrl(sp.mes);
  const visao = sp.visao === "consumo" ? "consumo" : "caixa";
  await autoGerarSePreciso(mes, membro);

  const mesIni6 = mesDe(somarMeses(inicioDoMes(mes), -5));
  // no consumo, parcelas de compras deste mês podem cair até 4 anos depois
  const mesFimBusca = mesDe(somarMeses(inicioDoMes(mes), visao === "consumo" ? 48 : 2));
  const hoje = hojeISO();
  const semIni = inicioDaSemana(hoje);
  const [lancsTodos, categorias, { caixinhas, movimentos }, tempo, cartoes, familia] = await Promise.all([
    carregarLancamentos(mesIni6, mesFimBusca),
    carregarCategorias(),
    carregarCaixinhas(),
    carregarResumoTempo(semIni, somarDias(semIni, 6)),
    carregarCartoes(),
    carregarFamilia(),
  ]);
  // caixa = mês em que o dinheiro entra/sai; consumo = mês em que o gasto aconteceu
  const mesDoLanc = (l: Lancamento) => (visao === "consumo" ? mesConsumo(l) : l.competencia);
  const lancs = lancsTodos.filter((l) => mesDoLanc(l) === mes);
  const r = resumirMes(lancs, categorias, movimentosDoMes(movimentos, mes));

  const evolucao = Array.from({ length: 6 }, (_, i) => {
    const m = mesDe(somarMeses(inicioDoMes(mesIni6), i));
    const doMes = lancsTodos.filter((l) => mesDoLanc(l) === m);
    return {
      mes: nomeMes(m, true),
      receitas: doMes.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valor, 0),
      despesas: doMes.filter((l) => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0),
    };
  });

  // Peso do mês passado: do que sai do caixa neste mês, quanto foi gasto em meses anteriores (cartão)
  const caixaDoMes = lancsTodos.filter((l) => l.competencia === mes);
  const receitasCaixa = caixaDoMes.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valor, 0);
  const gastoAnterior = caixaDoMes.filter((l) => l.tipo === "despesa" && mesConsumo(l) < mes).reduce((s, l) => s + l.valor, 0);
  const pesoPassado = pct(gastoAnterior, receitasCaixa);
  const proxMes = mesDe(somarMeses(inicioDoMes(mes), 1));
  const jaComprometido = lancsTodos
    .filter((l) => l.competencia === proxMes && l.tipo === "despesa" && mesConsumo(l) <= mes)
    .reduce((s, l) => s + l.valor, 0);

  // contas em aberto: compras no cartão aparecem agrupadas como uma fatura
  const faturas = agruparFaturas(caixaDoMes.filter((l) => !l.pago), cartoes);
  const pendentes = caixaDoMes.filter((l) => !l.pago && !(l.cartao_id && faturas.some((f) => f.cartao.id === l.cartao_id))).sort((a, b) => a.data.localeCompare(b.data));
  const nAbertos = pendentes.length + faturas.length;
  const rCaixa = visao === "caixa" ? r : resumirMes(caixaDoMes, categorias, []);
  const catMap = new Map(categorias.map((c) => [c.id, c]));
  const maxCat = Math.max(1, ...r.porCategoria.map((c) => c.total));
  const ativas = caixinhas.filter((c) => !c.arquivada);
  const totalGuardado = ativas.reduce((s, c) => s + saldoCaixinha(c.id, movimentos), 0);
  const salarios = lancs.filter((l) => l.tipo === "receita" && l.forma !== "vale").reduce((s, l) => s + l.valor, 0);

  return (
    <div>
      <Cabecalho titulo="Finanças" subtitulo="Para onde vai o nosso dinheiro — e o nosso tempo." acao={<SeletorMes mes={mes} base="/financas" />} />
      <AbasFinancas ativo="/financas" mes={mes} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-2xl bg-white p-1 ring-1 ring-casa-line">
          {([
            ["caixa", "💵 Caixa", "quando o dinheiro entra e sai"],
            ["consumo", "🛍️ Consumo", "quando o gasto aconteceu"],
          ] as const).map(([v, label, dica]) => (
            <Link
              key={v}
              href={`/financas?mes=${mes}${v === "consumo" ? "&visao=consumo" : ""}`}
              title={dica}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${visao === v ? "bg-casa-principal text-white" : "text-casa-muted"}`}
            >
              {label}
            </Link>
          ))}
        </div>
        <p className="text-xs text-casa-muted">
          {visao === "caixa"
            ? `O que entra e sai em ${nomeMes(mes)} — inclui a fatura do cartão gasta no mês anterior.`
            : `O que vocês gastaram em ${nomeMes(mes)}, mesmo que o cartão só seja pago depois.`}
        </p>
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2" style={{ background: "linear-gradient(135deg, #fbf1cf, #fff 70%)" }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-casa-destaqueescuro">⏮️ Peso do mês passado</p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{receitasCaixa > 0 ? `${pesoPassado}%` : "—"}</p>
              <p className="text-xs text-casa-muted">
                do que entra em {nomeMes(mes)} paga gastos de meses anteriores (<Din v={gastoAnterior} />, principalmente cartão)
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wide text-casa-muted">Já comprometido de {nomeMes(proxMes)}</p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums"><Din v={jaComprometido} /></p>
              <p className="text-xs text-casa-muted">faturas e parcelas já lançadas</p>
            </div>
          </div>
          <div className="mt-3"><Barra valor={gastoAnterior} total={Math.max(receitasCaixa, gastoAnterior, 1)} cor="#edc45a" alto /></div>
          <p className="mt-2 text-xs text-casa-muted">Meta: ver essa barra diminuir mês a mês, até o salário do mês pagar só o próprio mês.</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-casa-muted">🔁 Nosso ciclo</p>
          <ul className="mt-2 space-y-2 text-sm">
            <li className="flex items-center justify-between"><span>💼 Salários até dia {familia.dia_salario}</span><b className={rCaixa.aReceber > 0 ? "text-alerta" : "text-ok"}>{rCaixa.aReceber > 0 ? <>falta <Din v={rCaixa.aReceber} /></> : "recebido ✓"}</b></li>
            <li className="flex items-center justify-between"><span>🧾 Contas até dia {familia.dia_contas}</span><b className={rCaixa.aPagar > 0 ? "text-alerta" : "text-ok"}>{rCaixa.aPagar > 0 ? <>falta <Din v={rCaixa.aPagar} /></> : "tudo pago ✓"}</b></li>
          </ul>
          <Link href={`/financas/cartoes?mes=${mes}`} className="mt-3 inline-block text-xs font-bold text-casa-principal">Cartões e faturas →</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile rotulo="Receitas" valor={<Din v={r.receitas} />} icone="💼" cor="#16a34a"
          detalhe={<>Salários/rendas <Din v={salarios} /> · Vales <Din v={r.valeRecebido} /></>} />
        <StatTile rotulo="Despesas" valor={<Din v={r.despesas} />} icone="🧾" cor="#e8508a"
          detalhe={<><Din v={r.pago} /> pagos · <Din v={r.aPagar} /> a pagar</>} />
        <StatTile rotulo="Saldo do mês" valor={<Din v={r.saldo} />} icone={r.saldo >= 0 ? "😊" : "😬"} cor={r.saldo >= 0 ? "#e0601a" : "#dc2626"} destaque
          detalhe={r.receitas > 0 ? <>Gastamos {pct(r.despesas, r.receitas)}% do que entrou</> : "Lance as receitas do mês"} />
        <StatTile rotulo="Livre após caixinhas" valor={<Din v={r.livre} />} icone="🐷" cor="#0ea5e9"
          detalhe={<>Guardado no mês: <Din v={r.depositos - r.retiradas} /></>} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Secao titulo="Fixos × variáveis" className="lg:col-span-1">
          <DonutFixoVariavel fixo={r.fixo} variavel={r.variavel} />
        </Secao>

        <Secao titulo="Com o que mais gastamos" className="lg:col-span-2"
          acao={<Link href={`/financas/orcamento?mes=${mes}`} className="text-xs font-bold text-casa-principal">Definir limites →</Link>}>
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
                        <b><Din v={c.total} /></b>
                        <span className="text-casa-muted"> · {pct(c.total, r.despesas)}%</span>
                        {c.orcamento !== null && (
                          <span className={estourou ? "font-bold text-perigo" : "text-casa-muted"}> / <Din v={c.orcamento} /></span>
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
        <Secao titulo={`Contas em aberto em ${nomeMes(mes)} (${nAbertos})`} className="lg:col-span-2"
          acao={<Link href={`/financas/lancamentos?mes=${mes}`} className="text-xs font-bold text-casa-principal">Ver todos →</Link>}>
          {nAbertos === 0 ? (
            <Vazio icone="🎉">Tudo pago e recebido neste mês!</Vazio>
          ) : (
            <ul className="divide-y divide-casa-line">
              {faturas.map((f) => {
                const vencida = f.vencimento < hoje;
                return (
                  <li key={f.cartao.id} className="flex items-center gap-3 py-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg text-white" style={{ background: f.cartao.cor }}>💳</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">Fatura {f.cartao.nome}</p>
                      <p className="text-xs text-casa-muted">
                        <span className={vencida ? "font-bold text-perigo" : ""}>{vencida ? "venceu " : "vence "}{dataCurta(f.vencimento)}</span>
                        {" "}· {f.itens.length} compra(s)
                      </p>
                    </div>
                    <span className="font-bold tabular-nums"><Din v={f.aPagar} /></span>
                    <BotaoPagarFatura cartaoId={f.cartao.id} competencia={mes} pago={false} />
                  </li>
                );
              })}
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
                    <span className={`font-bold tabular-nums ${l.tipo === "receita" ? "text-ok" : ""}`}>{l.tipo === "receita" ? "+" : ""}<Din v={l.valor} /></span>
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
              <div><p className="text-[11px] font-bold uppercase text-casa-muted">Recebido</p><p className="font-display text-lg font-semibold"><Din v={r.valeRecebido} /></p></div>
              <div><p className="text-[11px] font-bold uppercase text-casa-muted">Usado</p><p className="font-display text-lg font-semibold"><Din v={r.valeGasto} /></p></div>
              <div><p className="text-[11px] font-bold uppercase text-casa-muted">Sobra</p><p className={`font-display text-lg font-semibold ${r.valeRecebido - r.valeGasto < 0 ? "text-perigo" : "text-ok"}`}><Din v={r.valeRecebido - r.valeGasto} /></p></div>
            </div>
            <div className="mt-3"><Barra valor={r.valeGasto} total={Math.max(r.valeRecebido, r.valeGasto)} cor="#65a30d" alto /></div>
            <p className="mt-2 text-xs text-casa-muted">Lance gastos pagos com o vale usando a forma “Vale (VA/VR)”.</p>
          </Secao>

          <Secao titulo="Caixinhas" acao={<Link href={`/financas/caixinhas?mes=${mes}`} className="text-xs font-bold text-casa-principal">Abrir →</Link>}>
            <p className="mb-3 font-display text-2xl font-semibold"><Din v={totalGuardado} /> <span className="font-sans text-xs font-semibold text-casa-muted">guardados</span></p>
            <ul className="space-y-2.5">
              {ativas.slice(0, 4).map((c) => {
                const saldo = saldoCaixinha(c.id, movimentos);
                return (
                  <li key={c.id}>
                    <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{c.emoji} {c.nome}</span><span className="tabular-nums"><Din v={saldo} />{c.meta ? <span className="text-casa-muted"> / <Din v={c.meta} /></span> : null}</span></div>
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
          acao={<Link href="/valores" className="text-xs font-bold text-casa-principal">Valores →</Link>}>
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
