import Link from "next/link";
import { exigirMembro } from "@/lib/auth";
import {
  agruparFaturas, autoGerarSePreciso, carregarCartoes, carregarCategorias, carregarContasFixas, carregarLancamentos,
  carregarResumoTempo, rendaBase, resumirMes,
} from "@/lib/dados";
import { dataCurta, hojeISO, inicioDaSemana, nomeMes, somarDias } from "@/lib/datas";
import { FORMAS, pct } from "@/lib/format";
import { Cabecalho, DonoBadge, Secao, StatTile, Vazio } from "@/components/ui";
import { TempoDisponivel, TempoPorValor } from "@/components/Tempo";
import { AbasFinancas, SeletorMes, mesDaUrl } from "./comum";
import { Alertas, Comparativo } from "./Comparativo";
import { BotaoPagarFatura, BotaoPago } from "./BotaoPago";
import { Din } from "@/components/Privacidade";

export default async function FinancasPage({ searchParams }: PageProps<"/financas">) {
  const membro = await exigirMembro();
  const mes = mesDaUrl((await searchParams).mes);
  await autoGerarSePreciso(mes, membro);

  const hoje = hojeISO();
  const semIni = inicioDaSemana(hoje);
  const [lancs, categorias, tempo, cartoes, contasFixas] = await Promise.all([
    carregarLancamentos(mes),
    carregarCategorias(),
    carregarResumoTempo(semIni, somarDias(semIni, 6)),
    carregarCartoes(),
    carregarContasFixas(),
  ]);
  const renda = rendaBase(lancs, contasFixas);
  const r = resumirMes(lancs, categorias, [], renda);

  // orçado = soma das grandes contas (% da renda); realizado = despesas do mês por categoria
  const pctOrcado = categorias.filter((c) => c.grande_conta).reduce((s, c) => s + (c.orcamento_pct ?? 0), 0);
  const orcado = Math.round(renda * pctOrcado) / 100;
  const ids = new Set(categorias.map((c) => c.id));
  const gastoPorCat: Record<string, number> = {};
  let semCategoria = 0;
  for (const l of lancs.filter((x) => x.tipo === "despesa")) {
    if (l.categoria_id && ids.has(l.categoria_id)) gastoPorCat[l.categoria_id] = (gastoPorCat[l.categoria_id] ?? 0) + l.valor;
    else semCategoria += l.valor;
  }

  // contas em aberto: compras no cartão aparecem agrupadas como uma fatura
  const faturas = agruparFaturas(lancs.filter((l) => !l.pago), cartoes);
  const pendentes = lancs.filter((l) => !l.pago && !(l.cartao_id && faturas.some((f) => f.cartao.id === l.cartao_id))).sort((a, b) => a.data.localeCompare(b.data));
  const nAbertos = pendentes.length + faturas.length;
  const catMap = new Map(categorias.map((c) => [c.id, c]));

  return (
    <div>
      <Cabecalho titulo="Finanças" subtitulo="O que planejamos (orçado) e o que está acontecendo (realizado)." acao={<SeletorMes mes={mes} base="/financas" />} />
      <AbasFinancas ativo="/financas" mes={mes} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile rotulo="Receitas" valor={<Din v={r.receitas} />} icone="💼" cor="#16a34a"
          detalhe={<><Din v={r.recebido} /> recebidos · <Din v={r.aReceber} /> a receber</>} />
        <StatTile rotulo="Orçado" valor={<Din v={orcado} />} icone="🎯" cor="#6366f1"
          detalhe={<>{pctOrcado.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% da renda distribuídos</>} />
        <StatTile rotulo="Realizado" valor={<Din v={r.despesas} />} icone="🧾" cor="#e8508a"
          detalhe={orcado > 0 ? <>{pct(r.despesas, orcado)}% do orçado · <Din v={r.aPagar} /> a pagar</> : <><Din v={r.aPagar} /> a pagar</>} />
        <StatTile rotulo="Sobra do mês" valor={<Din v={r.saldo} />} icone={r.saldo >= 0 ? "😊" : "😬"} cor={r.saldo >= 0 ? "#e0601a" : "#dc2626"} destaque
          detalhe={r.receitas > 0 ? <>Gastamos {pct(r.despesas, r.receitas)}% do que entrou</> : "Lance as receitas do mês"} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Secao titulo="🎯 Orçado × ✅ Realizado" className="lg:col-span-2"
          acao={<Link href={`/financas/realizado?mes=${mes}`} className="text-xs font-bold text-casa-principal">Ver detalhado →</Link>}>
          <Comparativo categorias={categorias} gasto={gastoPorCat} renda={renda} semCategoria={semCategoria} />
          <p className="mt-3 text-xs text-casa-muted">Clique numa grande conta para ver as classes. Orçado = % definido na aba Orçado × renda do mês (<Din v={renda} />).</p>
        </Secao>
        <Secao titulo="⚠️ Atenção">
          <Alertas categorias={categorias} gasto={gastoPorCat} renda={renda} />
          <p className="mt-3 text-xs text-casa-muted">Classes que já usaram mais de 80% do orçado.</p>
        </Secao>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Secao titulo={`Contas em aberto em ${nomeMes(mes)} (${nAbertos})`} className="lg:col-span-3"
          acao={<Link href={`/financas/realizado?mes=${mes}`} className="text-xs font-bold text-casa-principal">Ver todos →</Link>}>
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

      </div>

      <div className="mt-5">
        <Secao titulo="⏳ Orçamento de tempo da semana"
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
