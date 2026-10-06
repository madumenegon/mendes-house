"use server";

import { exigirMembro } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { atualizarTudo, texto, textoOuNull, type Resultado } from "@/lib/acoes";
import { dataValida } from "@/lib/datas";

const DONOS = ["madu", "gabriel", "compartilhado"];
const RECORRENCIAS = ["nenhuma", "diaria", "semanal", "quinzenal", "mensal"];

export async function salvarEvento(fd: FormData): Promise<Resultado> {
  const membro = await exigirMembro();
  const id = textoOuNull(fd, "id");
  const titulo = texto(fd, "titulo");
  const dono = texto(fd, "dono");
  const valor_id = texto(fd, "valor_id");
  const data = texto(fd, "data");
  const dia_inteiro = fd.get("dia_inteiro") === "on";
  const hora_inicio = dia_inteiro ? null : textoOuNull(fd, "hora_inicio");
  let hora_fim = dia_inteiro ? null : textoOuNull(fd, "hora_fim");
  const recorrencia = texto(fd, "recorrencia") || "nenhuma";
  const recorrencia_fim = recorrencia === "nenhuma" ? null : textoOuNull(fd, "recorrencia_fim");

  if (!titulo) return { erro: "Dê um título ao compromisso." };
  if (!DONOS.includes(dono)) return { erro: "Diga de quem é o compromisso." };
  if (!valor_id) return { erro: "Escolha o valor ligado a este compromisso — é assim que medimos nossas prioridades." };
  if (!dataValida(data)) return { erro: "Informe a data." };
  if (!dia_inteiro && !hora_inicio) return { erro: "Informe o horário de início (ou marque “dia inteiro”)." };
  if (hora_inicio && !hora_fim) {
    const [h, m] = hora_inicio.split(":").map(Number);
    hora_fim = `${String(Math.min(23, h + 1)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  if (hora_inicio && hora_fim && hora_fim <= hora_inicio) return { erro: "O horário de término precisa ser depois do início." };
  if (!RECORRENCIAS.includes(recorrencia)) return { erro: "Repetição inválida." };
  if (recorrencia_fim && recorrencia_fim < data) return { erro: "A repetição precisa terminar depois da primeira data." };

  const dados = {
    titulo,
    descricao: texto(fd, "descricao"),
    local: texto(fd, "local"),
    dono,
    cor: textoOuNull(fd, "cor"),
    valor_id,
    data,
    dia_inteiro,
    hora_inicio,
    hora_fim,
    recorrencia,
    recorrencia_fim,
    updated_by: membro,
    updated_at: new Date().toISOString(),
  };
  const supa = db();
  const { error } = id
    ? await supa.from("eventos").update(dados).eq("id", id)
    : await supa.from("eventos").insert({ ...dados, created_by: membro });
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

/** modo "esta": só a ocorrência da data (vira exceção da série). */
export async function excluirEvento(id: string, modo: "todos" | "esta", data?: string): Promise<Resultado> {
  const membro = await exigirMembro();
  const supa = db();
  if (modo === "esta" && data) {
    const { data: ev, error: e1 } = await supa.from("eventos").select("excecoes").eq("id", id).single();
    if (e1) return { erro: e1.message };
    const excecoes = Array.from(new Set([...(ev.excecoes ?? []), data]));
    const { error } = await supa.from("eventos").update({ excecoes, updated_by: membro }).eq("id", id);
    if (error) return { erro: error.message };
  } else {
    const { error } = await supa.from("eventos").delete().eq("id", id);
    if (error) return { erro: error.message };
  }
  atualizarTudo();
  return {};
}
