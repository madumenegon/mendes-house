"use client";

import { useState } from "react";
import clsx from "clsx";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Segmentos } from "@/components/Escolhas";
import { useAcao } from "@/components/useAcao";
import { DonoBadge, Secao, Vazio } from "@/components/ui";
import { CORES, FORMAS, moeda } from "@/lib/format";
import { nomeMes } from "@/lib/datas";
import type { Categoria, ContaFixa, Pessoa, TipoLancamento } from "@/lib/types";
import { excluirContaFixa, gerarMes, salvarContaFixa } from "../actions";

export function ContasFixasCliente({ contas, categorias, mes }: { contas: ContaFixa[]; categorias: Categoria[]; mes: string }) {
  const [editar, setEditar] = useState<ContaFixa | TipoLancamento | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const { rodar, pendente, erro } = useAcao();
  const catMap = new Map(categorias.map((c) => [c.id, c]));

  const bloco = (tipo: TipoLancamento) => {
    const lista = contas.filter((c) => c.tipo === tipo);
    return (
      <Secao
        titulo={tipo === "receita" ? "💼 Entradas fixas (salários, vales…)" : "📌 Contas fixas"}
        acao={<button className="btn-secundario" onClick={() => setEditar(tipo)}><Plus size={15} /> Adicionar</button>}
      >
        {lista.length === 0 ? (
          <Vazio icone={tipo === "receita" ? "💼" : "📌"}>
            {tipo === "receita" ? "Cadastre o salário da Madu, do Gabriel e os vales." : "Aluguel, luz, internet, dízimo, plano de saúde…"}
          </Vazio>
        ) : (
          <ul className="divide-y divide-casa-line">
            {lista.map((c) => {
              const cat = c.categoria_id ? catMap.get(c.categoria_id) : null;
              return (
                <li key={c.id} onClick={() => setEditar(c)} className={clsx("flex cursor-pointer items-center gap-3 py-2.5 hover:bg-casa-bg/50", !c.ativa && "opacity-50")}>
                  <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-casa-bg leading-none">
                    <span className="text-[9px] font-bold uppercase text-casa-muted">dia</span>
                    <span className="font-display text-lg font-semibold">{c.dia}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{cat?.emoji} {c.descricao}{!c.ativa && " (pausada)"}</p>
                    <p className="flex items-center gap-1.5 text-xs text-casa-muted">{cat?.nome ?? "Sem categoria"} · {FORMAS[c.forma] ?? c.forma} <DonoBadge dono={c.pessoa} pequeno /></p>
                  </div>
                  <span className={clsx("font-bold tabular-nums", tipo === "receita" && "text-ok")}>{moeda(c.valor)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Secao>
    );
  };

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-casa-muted">
          As contas fixas viram lançamentos automaticamente no mês atual e no próximo. Para outro mês, gere manualmente.
        </p>
        <button
          className="btn-primario"
          disabled={pendente}
          onClick={() => rodar(async () => {
            const r = await gerarMes(mes);
            if (!r.erro) setAviso(r.criados ? `${r.criados} lançamento(s) criados em ${nomeMes(mes)}.` : `Tudo já estava lançado em ${nomeMes(mes)}.`);
            return r;
          })}
        >
          <RefreshCw size={15} /> Gerar {nomeMes(mes)}
        </button>
        {aviso && <p className="w-full rounded-xl bg-okclaro px-3 py-2 text-sm font-semibold text-ok">{aviso}</p>}
        {erro && <p className="w-full text-sm text-perigo">{erro}</p>}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {bloco("receita")}
        {bloco("despesa")}
      </div>
      <Modal aberto={editar !== null} onFechar={() => setEditar(null)} titulo={typeof editar === "object" && editar ? "Editar" : "Nova conta fixa"}>
        {editar !== null && (
          <FormConta conta={typeof editar === "string" ? null : editar} tipo={typeof editar === "string" ? editar : editar.tipo} categorias={categorias} onFechar={() => setEditar(null)} />
        )}
      </Modal>
    </div>
  );
}

function FormConta({ conta, tipo, categorias, onFechar }: { conta: ContaFixa | null; tipo: TipoLancamento; categorias: Categoria[]; onFechar: () => void }) {
  const [pessoa, setPessoa] = useState<Pessoa>(conta?.pessoa ?? "casal");
  const { pendente, erro, rodar } = useAcao();
  return (
    <form action={(fd) => rodar(() => salvarContaFixa(fd), onFechar)} className="space-y-4">
      {conta && <input type="hidden" name="id" value={conta.id} />}
      <input type="hidden" name="tipo" value={tipo} />
      <div>
        <label className="rotulo">Descrição</label>
        <input name="descricao" defaultValue={conta?.descricao} className="campo" required placeholder={tipo === "receita" ? "Salário Madu" : "Aluguel"} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo">Valor (R$)</label>
          <input name="valor" inputMode="decimal" defaultValue={conta ? String(conta.valor).replace(".", ",") : ""} className="campo" required />
        </div>
        <div>
          <label className="rotulo">{tipo === "receita" ? "Dia que cai" : "Dia do vencimento"}</label>
          <input name="dia" type="number" min={1} max={31} defaultValue={conta?.dia ?? (tipo === "receita" ? 5 : 10)} className="campo" required />
        </div>
        <div>
          <label className="rotulo">Categoria</label>
          <select name="categoria_id" defaultValue={conta?.categoria_id ?? ""} className="campo">
            <option value="">—</option>
            {categorias.filter((c) => c.tipo === tipo).map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="rotulo">Forma</label>
          <select name="forma" defaultValue={conta?.forma ?? (tipo === "receita" ? "transferencia" : "boleto")} className="campo">
            {Object.entries(FORMAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="rotulo">De quem</label>
        <Segmentos
          opcoes={[{ valor: "casal", label: "Casal", cor: CORES.casal }, { valor: "madu", label: "Madu", cor: CORES.madu }, { valor: "gabriel", label: "Gabriel", cor: CORES.gabriel }]}
          valor={pessoa}
          onChange={setPessoa}
          nome="pessoa"
        />
      </div>
      {conta && (
        <div>
          <label className="rotulo">Situação</label>
          <select name="ativa" defaultValue={conta.ativa ? "on" : "off"} className="campo">
            <option value="on">Ativa</option>
            <option value="off">Pausada</option>
          </select>
        </div>
      )}
      {erro && <p className="rounded-xl bg-perigoclaro px-3 py-2 text-sm text-perigo">{erro}</p>}
      <div className="flex justify-between gap-2">
        {conta ? (
          <button type="button" className="btn-perigo" disabled={pendente} onClick={() => confirm("Excluir esta conta fixa? (Os lançamentos já gerados continuam.)") && rodar(() => excluirContaFixa(conta.id), onFechar)}>
            <Trash2 size={15} /> Excluir
          </button>
        ) : <span />}
        <button className="btn-primario" disabled={pendente}>{pendente ? "Salvando…" : "Salvar"}</button>
      </div>
    </form>
  );
}
