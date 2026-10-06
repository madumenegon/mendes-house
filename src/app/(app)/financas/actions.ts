"use server";

import { exigirMembro } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { atualizarTudo, erroDb, numeroOuNull, texto, textoOuNull, type Resultado } from "@/lib/acoes";
import { dataValida, hojeISO, mesDe, mesValido } from "@/lib/datas";
import { gerarContasFixasDoMes } from "@/lib/dados";

const PESSOAS = ["madu", "gabriel", "casal"];

// ------------------------------------------------------------------ lançamentos

export async function salvarLancamento(fd: FormData): Promise<Resultado> {
  const membro = await exigirMembro();
  const id = textoOuNull(fd, "id");
  const tipo = texto(fd, "tipo");
  const descricao = texto(fd, "descricao");
  const valor = numeroOuNull(fd, "valor");
  const data = texto(fd, "data");
  const pessoa = texto(fd, "pessoa") || "casal";
  const pago = fd.get("pago") === "on";
  if (tipo !== "receita" && tipo !== "despesa") return { erro: "Escolha receita ou despesa." };
  if (!descricao) return { erro: "Descreva o lançamento." };
  if (!valor || valor <= 0) return { erro: "Informe um valor maior que zero." };
  if (!dataValida(data)) return { erro: "Informe a data." };
  if (!PESSOAS.includes(pessoa)) return { erro: "Pessoa inválida." };

  const parcelas = id ? 1 : Math.min(48, Math.max(1, numeroOuNull(fd, "parcelas") ?? 1));
  const base = {
    tipo,
    descricao,
    categoria_id: textoOuNull(fd, "categoria_id"),
    natureza: texto(fd, "natureza") === "fixo" ? "fixo" : "variavel",
    pessoa,
    forma: texto(fd, "forma") || "pix",
    observacao: texto(fd, "observacao"),
    updated_by: membro,
  };
  const supa = db();

  if (id) {
    const { error } = await supa
      .from("lancamentos")
      .update({
        ...base, valor, data, competencia: mesDe(data), pago,
        pago_em: pago ? textoOuNull(fd, "pago_em") ?? hojeISO() : null,
        pago_por: pago ? membro : null,
      })
      .eq("id", id);
    if (error) return { erro: error.message };
  } else {
    // compra parcelada: divide o valor e lança um por mês
    const valorParcela = Math.round((valor / parcelas) * 100) / 100;
    const [a, m, d] = data.split("-").map(Number);
    const linhas = Array.from({ length: parcelas }, (_, i) => {
      const dt = new Date(Date.UTC(a, m - 1 + i, 1));
      const ultimo = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
      dt.setUTCDate(Math.min(d, ultimo));
      const iso = dt.toISOString().slice(0, 10);
      const ehPago = pago && i === 0;
      return {
        ...base,
        descricao: parcelas > 1 ? `${descricao} (${i + 1}/${parcelas})` : descricao,
        valor: i === parcelas - 1 ? Math.round((valor - valorParcela * (parcelas - 1)) * 100) / 100 : valorParcela,
        data: iso,
        competencia: mesDe(iso),
        pago: ehPago,
        pago_em: ehPago ? hojeISO() : null,
        pago_por: ehPago ? membro : null,
        created_by: membro,
      };
    });
    const { error } = await supa.from("lancamentos").insert(linhas);
    if (error) return { erro: error.message };
  }
  atualizarTudo();
  return {};
}

export async function alternarPago(id: string, pago: boolean): Promise<Resultado> {
  const membro = await exigirMembro();
  const { error } = await db()
    .from("lancamentos")
    .update({ pago, pago_em: pago ? hojeISO() : null, pago_por: pago ? membro : null, updated_by: membro })
    .eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

export async function excluirLancamento(id: string): Promise<Resultado> {
  await exigirMembro();
  const { error } = await db().from("lancamentos").delete().eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

export interface LinhaImportada {
  data: string;
  descricao: string;
  valor: number;
  tipo: "receita" | "despesa";
  categoria_id: string | null;
  natureza: "fixo" | "variavel";
  pessoa: "madu" | "gabriel" | "casal";
  forma: string;
}

export async function importarLancamentos(linhas: LinhaImportada[]): Promise<Resultado & { inseridos?: number }> {
  const membro = await exigirMembro();
  const validas = linhas.filter((l) => dataValida(l.data) && l.valor > 0 && l.descricao && (l.tipo === "receita" || l.tipo === "despesa"));
  if (!validas.length) return { erro: "Nenhuma linha válida para importar." };
  const { error } = await db()
    .from("lancamentos")
    .insert(
      validas.map((l) => ({
        tipo: l.tipo,
        descricao: l.descricao.slice(0, 200),
        valor: Math.round(l.valor * 100) / 100,
        data: l.data,
        competencia: mesDe(l.data),
        categoria_id: l.categoria_id,
        natureza: l.natureza === "fixo" ? "fixo" : "variavel",
        pessoa: PESSOAS.includes(l.pessoa) ? l.pessoa : "casal",
        forma: l.forma || "debito",
        pago: true, // veio do extrato: já aconteceu
        pago_em: l.data,
        pago_por: membro,
        origem: "extrato",
        created_by: membro,
      }))
    );
  if (error) return { erro: error.message };
  atualizarTudo();
  return { inseridos: validas.length };
}

// ------------------------------------------------------------------ contas fixas

export async function salvarContaFixa(fd: FormData): Promise<Resultado> {
  const membro = await exigirMembro();
  const id = textoOuNull(fd, "id");
  const descricao = texto(fd, "descricao");
  const valor = numeroOuNull(fd, "valor");
  const dia = numeroOuNull(fd, "dia");
  const tipo = texto(fd, "tipo");
  if (!descricao) return { erro: "Descreva a conta." };
  if (!valor || valor <= 0) return { erro: "Informe o valor." };
  if (!dia || dia < 1 || dia > 31) return { erro: "Dia de vencimento entre 1 e 31." };
  if (tipo !== "receita" && tipo !== "despesa") return { erro: "Tipo inválido." };
  const dados = {
    descricao, valor, dia, tipo,
    categoria_id: textoOuNull(fd, "categoria_id"),
    pessoa: PESSOAS.includes(texto(fd, "pessoa")) ? texto(fd, "pessoa") : "casal",
    forma: texto(fd, "forma") || "pix",
    ativa: fd.get("ativa") !== "off",
  };
  const supa = db();
  const { error } = id
    ? await supa.from("contas_fixas").update(dados).eq("id", id)
    : await supa.from("contas_fixas").insert({ ...dados, created_by: membro });
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

export async function excluirContaFixa(id: string): Promise<Resultado> {
  await exigirMembro();
  const { error } = await db().from("contas_fixas").delete().eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

export async function gerarMes(mes: string): Promise<Resultado & { criados?: number }> {
  const membro = await exigirMembro();
  if (!mesValido(mes)) return { erro: "Mês inválido." };
  const criados = await gerarContasFixasDoMes(mes, membro);
  atualizarTudo();
  return { criados };
}

// ------------------------------------------------------------------ categorias / orçamento

export async function salvarCategoria(fd: FormData): Promise<Resultado> {
  await exigirMembro();
  const id = textoOuNull(fd, "id");
  const nome = texto(fd, "nome");
  const tipo = texto(fd, "tipo");
  if (!nome) return { erro: "Dê um nome à categoria." };
  if (tipo !== "receita" && tipo !== "despesa") return { erro: "Tipo inválido." };
  const dados = {
    nome, tipo,
    natureza: texto(fd, "natureza") === "fixo" ? "fixo" : "variavel",
    emoji: texto(fd, "emoji") || "💸",
    cor: texto(fd, "cor") || "#64748b",
    orcamento_mensal: numeroOuNull(fd, "orcamento_mensal"),
    palavras_chave: texto(fd, "palavras_chave").toLowerCase(),
  };
  const supa = db();
  const { error } = id
    ? await supa.from("categorias").update(dados).eq("id", id)
    : await supa.from("categorias").insert({ ...dados, ordem: 50 });
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

export async function salvarOrcamento(id: string, valor: number | null): Promise<Resultado> {
  await exigirMembro();
  const { error } = await db().from("categorias").update({ orcamento_mensal: valor && valor > 0 ? valor : null }).eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

export async function excluirCategoria(id: string): Promise<Resultado> {
  await exigirMembro();
  const { error } = await db().from("categorias").delete().eq("id", id);
  const e = erroDb(error);
  if (e) return e;
  atualizarTudo();
  return {};
}

// ------------------------------------------------------------------ caixinhas

export async function salvarCaixinha(fd: FormData): Promise<Resultado> {
  const membro = await exigirMembro();
  const id = textoOuNull(fd, "id");
  const nome = texto(fd, "nome");
  if (!nome) return { erro: "Dê um nome à caixinha." };
  const dados = {
    nome,
    descricao: texto(fd, "descricao"),
    emoji: texto(fd, "emoji") || "🐷",
    cor: texto(fd, "cor") || "#10b981",
    meta: numeroOuNull(fd, "meta"),
    aporte_mensal: numeroOuNull(fd, "aporte_mensal"),
    prazo: textoOuNull(fd, "prazo"),
    arquivada: fd.get("arquivada") === "on",
  };
  const supa = db();
  const { error } = id
    ? await supa.from("caixinhas").update(dados).eq("id", id)
    : await supa.from("caixinhas").insert({ ...dados, created_by: membro });
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

export async function excluirCaixinha(id: string): Promise<Resultado> {
  await exigirMembro();
  const { error } = await db().from("caixinhas").delete().eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

export async function movimentarCaixinha(fd: FormData): Promise<Resultado> {
  const membro = await exigirMembro();
  const caixinha_id = texto(fd, "caixinha_id");
  const tipo = texto(fd, "tipo");
  const valor = numeroOuNull(fd, "valor");
  const data = texto(fd, "data") || hojeISO();
  if (!caixinha_id) return { erro: "Caixinha inválida." };
  if (tipo !== "deposito" && tipo !== "retirada") return { erro: "Escolha guardar ou resgatar." };
  if (!valor || valor <= 0) return { erro: "Informe o valor." };
  if (!dataValida(data)) return { erro: "Data inválida." };
  const { error } = await db().from("caixinha_movimentos").insert({
    caixinha_id, tipo, valor, data, descricao: texto(fd, "descricao"), created_by: membro,
  });
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

export async function excluirMovimento(id: string): Promise<Resultado> {
  await exigirMembro();
  const { error } = await db().from("caixinha_movimentos").delete().eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}
