"use server";

import { exigirMembro } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { atualizarTudo, numeroOuNull, texto, textoOuNull, type Resultado } from "@/lib/acoes";
import { dataValida, hojeISO } from "@/lib/datas";
import type { ItemCompra, ItemEstoque } from "@/lib/types";

// ------------------------------------------------------------------ tarefas

export async function salvarTarefa(fd: FormData): Promise<Resultado> {
  const membro = await exigirMembro();
  const id = textoOuNull(fd, "id");
  const titulo = texto(fd, "titulo");
  const frequencia = texto(fd, "frequencia");
  const responsavel = texto(fd, "responsavel");
  const data_inicio = texto(fd, "data_inicio") || hojeISO();
  const dias_semana = fd.getAll("dias_semana").map(Number).filter((n) => n >= 0 && n <= 6);
  if (!titulo) return { erro: "Dê um nome à tarefa." };
  if (!["unica", "diaria", "semanal", "quinzenal", "mensal"].includes(frequencia)) return { erro: "Escolha a frequência." };
  if (!["madu", "gabriel", "compartilhado", "revezar"].includes(responsavel)) return { erro: "Escolha o responsável." };
  if (!dataValida(data_inicio)) return { erro: "Data de início inválida." };
  if ((frequencia === "semanal" || frequencia === "quinzenal") && !dias_semana.length)
    return { erro: "Escolha pelo menos um dia da semana." };

  const dados = {
    titulo,
    comodo: texto(fd, "comodo"),
    responsavel,
    frequencia,
    dias_semana,
    dia_mes: frequencia === "mensal" ? numeroOuNull(fd, "dia_mes") ?? Number(data_inicio.slice(8)) : null,
    data_inicio,
    hora: textoOuNull(fd, "hora"),
    duracao_min: Math.max(5, numeroOuNull(fd, "duracao_min") ?? 30),
    valor_id: textoOuNull(fd, "valor_id"),
    ativa: fd.get("ativa") !== "off",
  };
  const supa = db();
  const { error } = id
    ? await supa.from("tarefas").update(dados).eq("id", id)
    : await supa.from("tarefas").insert({ ...dados, created_by: membro });
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

export async function excluirTarefa(id: string): Promise<Resultado> {
  await exigirMembro();
  const { error } = await db().from("tarefas").delete().eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

export async function alternarTarefaFeita(tarefaId: string, data: string, feita: boolean): Promise<Resultado> {
  const membro = await exigirMembro();
  const supa = db();
  const { error } = feita
    ? await supa.from("tarefas_feitas").upsert({ tarefa_id: tarefaId, data, feita_por: membro }, { onConflict: "tarefa_id,data" })
    : await supa.from("tarefas_feitas").delete().eq("tarefa_id", tarefaId).eq("data", data);
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

// ------------------------------------------------------------------ despensa

export async function salvarItemEstoque(fd: FormData): Promise<Resultado> {
  const membro = await exigirMembro();
  const id = textoOuNull(fd, "id");
  const nome = texto(fd, "nome");
  if (!nome) return { erro: "Dê um nome ao item." };
  const dados = {
    nome,
    categoria: texto(fd, "categoria") || "Outros",
    local: texto(fd, "local") || "Despensa",
    unidade: texto(fd, "unidade") || "un",
    quantidade: Math.max(0, numeroOuNull(fd, "quantidade") ?? 0),
    minimo: Math.max(0, numeroOuNull(fd, "minimo") ?? 1),
    updated_by: membro,
    updated_at: new Date().toISOString(),
  };
  const supa = db();
  const { error } = id
    ? await supa.from("estoque").update(dados).eq("id", id)
    : await supa.from("estoque").insert({ ...dados, created_by: membro });
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

export async function ajustarEstoque(id: string, delta: number): Promise<Resultado> {
  const membro = await exigirMembro();
  const supa = db();
  const { data, error } = await supa.from("estoque").select("quantidade").eq("id", id).single();
  if (error) return { erro: error.message };
  const nova = Math.max(0, Number(data.quantidade) + delta);
  const { error: e2 } = await supa.from("estoque").update({ quantidade: nova, updated_by: membro, updated_at: new Date().toISOString() }).eq("id", id);
  if (e2) return { erro: e2.message };
  atualizarTudo();
  return {};
}

export async function excluirItemEstoque(id: string): Promise<Resultado> {
  await exigirMembro();
  const { error } = await db().from("estoque").delete().eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

/** Coloca itens do estoque na lista de compras (sem duplicar o que já está lá). */
export async function mandarParaLista(ids: string[]): Promise<Resultado & { adicionados?: number }> {
  const membro = await exigirMembro();
  const supa = db();
  const [{ data: itens }, { data: naLista }] = await Promise.all([
    supa.from("estoque").select("*").in("id", ids),
    supa.from("compras").select("estoque_id").eq("comprado", false).not("estoque_id", "is", null),
  ]);
  const ja = new Set((naLista ?? []).map((c) => c.estoque_id));
  const novos = ((itens ?? []) as ItemEstoque[])
    .filter((i) => !ja.has(i.id))
    .map((i) => ({
      nome: i.nome,
      quantidade: Math.max(1, Number(i.minimo) * 2 - Number(i.quantidade)),
      unidade: i.unidade,
      categoria: i.categoria,
      estoque_id: i.id,
      created_by: membro,
    }));
  if (novos.length) {
    const { error } = await supa.from("compras").insert(novos);
    if (error) return { erro: error.message };
  }
  atualizarTudo();
  return { adicionados: novos.length };
}

export async function mandarAcabandoParaLista(): Promise<Resultado & { adicionados?: number }> {
  await exigirMembro();
  const { data } = await db().from("estoque").select("id, quantidade, minimo");
  const ids = (data ?? []).filter((i) => Number(i.quantidade) <= Number(i.minimo)).map((i) => i.id as string);
  if (!ids.length) return { adicionados: 0 };
  return mandarParaLista(ids);
}

// ------------------------------------------------------------------ compras

export async function adicionarCompra(fd: FormData): Promise<Resultado> {
  const membro = await exigirMembro();
  const nome = texto(fd, "nome");
  if (!nome) return { erro: "Escreva o item." };
  const supa = db();
  // liga automaticamente a um item da despensa com o mesmo nome
  const { data: doEstoque } = await supa.from("estoque").select("id, categoria, unidade").ilike("nome", nome).limit(1);
  const e = doEstoque?.[0];
  const { error } = await supa.from("compras").insert({
    nome,
    quantidade: Math.max(0.01, numeroOuNull(fd, "quantidade") ?? 1),
    unidade: texto(fd, "unidade") || e?.unidade || "un",
    categoria: texto(fd, "categoria") || e?.categoria || "Outros",
    preco_estimado: numeroOuNull(fd, "preco_estimado"),
    estoque_id: e?.id ?? null,
    created_by: membro,
  });
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

export async function alternarComprado(id: string, comprado: boolean): Promise<Resultado> {
  const membro = await exigirMembro();
  const { error } = await db().from("compras").update({ comprado, comprado_por: comprado ? membro : null }).eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

export async function excluirCompra(id: string): Promise<Resultado> {
  await exigirMembro();
  const { error } = await db().from("compras").delete().eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

/** Fecha a compra: soma ao estoque o que foi comprado e tira da lista.
 * Itens novos (que não existiam na despensa) podem ser cadastrados lá. */
export async function finalizarCompras(cadastrarNovos: boolean): Promise<Resultado & { atualizados?: number }> {
  const membro = await exigirMembro();
  const supa = db();
  const { data } = await supa.from("compras").select("*").eq("comprado", true);
  const comprados = (data ?? []) as ItemCompra[];
  let atualizados = 0;
  for (const c of comprados) {
    if (c.estoque_id) {
      const { data: est } = await supa.from("estoque").select("quantidade").eq("id", c.estoque_id).single();
      if (est) {
        await supa
          .from("estoque")
          .update({ quantidade: Number(est.quantidade) + Number(c.quantidade), updated_by: membro, updated_at: new Date().toISOString() })
          .eq("id", c.estoque_id);
        atualizados++;
      }
    } else if (cadastrarNovos) {
      await supa.from("estoque").insert({
        nome: c.nome, categoria: c.categoria, unidade: c.unidade, quantidade: c.quantidade, minimo: 1, created_by: membro, updated_by: membro,
      });
      atualizados++;
    }
  }
  if (comprados.length) await supa.from("compras").delete().in("id", comprados.map((c) => c.id));
  atualizarTudo();
  return { atualizados };
}
