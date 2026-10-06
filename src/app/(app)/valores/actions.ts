"use server";

import { exigirMembro } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { atualizarTudo, erroDb, numeroOuNull, texto, textoOuNull, type Resultado } from "@/lib/acoes";

const ESCOPOS = ["familiar", "madu", "gabriel"];

export async function salvarFamilia(fd: FormData): Promise<Resultado> {
  const membro = await exigirMembro();
  const horas = numeroOuNull(fd, "horas_acordadas_dia");
  const { error } = await db()
    .from("familia_info")
    .update({
      missao: texto(fd, "missao"),
      lema: texto(fd, "lema"),
      ...(horas && horas > 0 && horas <= 24 ? { horas_acordadas_dia: horas } : {}),
      updated_by: membro,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

export async function salvarValor(fd: FormData): Promise<Resultado> {
  const membro = await exigirMembro();
  const id = textoOuNull(fd, "id");
  const escopo = texto(fd, "escopo");
  const nome = texto(fd, "nome");
  if (!nome) return { erro: "Dê um nome ao valor." };
  if (!ESCOPOS.includes(escopo)) return { erro: "Escolha de quem é o valor." };
  const dados = {
    nome,
    descricao: texto(fd, "descricao"),
    escopo,
    emoji: texto(fd, "emoji") || "✨",
    cor: texto(fd, "cor") || "#9b6bd6",
  };
  const supa = db();
  const { error } = id
    ? await supa.from("valores").update(dados).eq("id", id)
    : await supa.from("valores").insert({ ...dados, ordem: 100, created_by: membro });
  const e = erroDb(error);
  if (e) return e;
  atualizarTudo();
  return {};
}

export async function excluirValor(id: string): Promise<Resultado> {
  await exigirMembro();
  const { error } = await db().from("valores").delete().eq("id", id);
  if (error?.code === "23503")
    return { erro: "Este valor está ligado a compromissos da agenda. Troque o valor desses compromissos antes de excluir." };
  const e = erroDb(error);
  if (e) return e;
  atualizarTudo();
  return {};
}

export async function salvarPrioridade(fd: FormData): Promise<Resultado> {
  const membro = await exigirMembro();
  const id = textoOuNull(fd, "id");
  const titulo = texto(fd, "titulo");
  const escopo = texto(fd, "escopo");
  if (!titulo) return { erro: "Escreva a prioridade." };
  if (!ESCOPOS.includes(escopo)) return { erro: "Escolha de quem é a prioridade." };
  const dados = { titulo, descricao: texto(fd, "descricao"), escopo, valor_id: textoOuNull(fd, "valor_id") };
  const supa = db();
  let error;
  if (id) {
    ({ error } = await supa.from("prioridades").update(dados).eq("id", id));
  } else {
    const { data: ultima } = await supa.from("prioridades").select("ordem").order("ordem", { ascending: false }).limit(1);
    ({ error } = await supa.from("prioridades").insert({ ...dados, ordem: (ultima?.[0]?.ordem ?? 0) + 1, created_by: membro }));
  }
  const e = erroDb(error ?? null);
  if (e) return e;
  atualizarTudo();
  return {};
}

export async function alternarPrioridade(id: string, concluida: boolean): Promise<Resultado> {
  await exigirMembro();
  const { error } = await db().from("prioridades").update({ concluida }).eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

/** Recebe a nova ordem completa (ids) depois de subir/descer um item. */
export async function reordenarPrioridades(ids: string[]): Promise<Resultado> {
  await exigirMembro();
  const supa = db();
  await Promise.all(ids.map((id, i) => supa.from("prioridades").update({ ordem: i + 1 }).eq("id", id)));
  atualizarTudo();
  return {};
}

export async function excluirPrioridade(id: string): Promise<Resultado> {
  await exigirMembro();
  const { error } = await db().from("prioridades").delete().eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}
