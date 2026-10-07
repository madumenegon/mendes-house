"use server";

import { exigirMembro } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { atualizarTudo, erroDb, numeroOuNull, texto, textoOuNull, type Resultado } from "@/lib/acoes";
import { dataValida, hojeISO, mesDe, mesValido } from "@/lib/datas";
import { gerarContasFixasDoMes } from "@/lib/dados";
import { vencimentoFatura } from "@/lib/cartao";
import type { Cartao } from "@/lib/types";

const PESSOAS = ["madu", "gabriel", "casal"];

// ------------------------------------------------------------------ lançamentos

async function buscarCartao(id: string | null): Promise<Cartao | null> {
  if (!id) return null;
  const { data } = await db().from("cartoes").select("*").eq("id", id).single();
  return (data as Cartao) ?? null;
}

export async function salvarLancamento(fd: FormData): Promise<Resultado> {
  const membro = await exigirMembro();
  const id = textoOuNull(fd, "id");
  const tipo = texto(fd, "tipo");
  const descricao = texto(fd, "descricao");
  const valor = numeroOuNull(fd, "valor");
  const data = texto(fd, "data"); // no cartão: data da compra
  const pessoa = texto(fd, "pessoa") || "casal";
  const pago = fd.get("pago") === "on";
  const forma = texto(fd, "forma") || "pix";
  if (tipo !== "receita" && tipo !== "despesa") return { erro: "Escolha receita ou despesa." };
  if (!descricao) return { erro: "Descreva o lançamento." };
  if (!valor || valor <= 0) return { erro: "Informe um valor maior que zero." };
  if (!dataValida(data)) return { erro: "Informe a data." };
  if (!PESSOAS.includes(pessoa)) return { erro: "Pessoa inválida." };

  const cartao = tipo === "despesa" && forma === "credito" ? await buscarCartao(textoOuNull(fd, "cartao_id")) : null;
  const parcelas = id ? 1 : Math.min(48, Math.max(1, numeroOuNull(fd, "parcelas") ?? 1));
  const base = {
    tipo,
    descricao,
    categoria_id: textoOuNull(fd, "categoria_id"),
    natureza: texto(fd, "natureza") === "fixo" ? "fixo" : "variavel",
    pessoa,
    forma,
    cartao_id: cartao?.id ?? null,
    data_compra: cartao ? data : null,
    observacao: texto(fd, "observacao"),
    updated_by: membro,
  };
  const supa = db();

  if (id) {
    let venc = data;
    const vencInformado = texto(fd, "vencimento_fatura");
    if (cartao && dataValida(vencInformado)) {
      venc = vencInformado; // corrigido à mão (ex.: fatura importada com vencimento errado)
    } else if (cartao) {
      // mantém a fatura de uma parcela se compra e cartão não mudaram
      const { data: atual } = await supa.from("lancamentos").select("data, data_compra, cartao_id").eq("id", id).single();
      venc = atual && atual.cartao_id === cartao.id && atual.data_compra === data ? atual.data : vencimentoFatura(data, cartao);
    }
    const { error } = await supa
      .from("lancamentos")
      .update({
        ...base, valor, data: venc, competencia: mesDe(venc), pago,
        pago_em: pago ? textoOuNull(fd, "pago_em") ?? hojeISO() : null,
        pago_por: pago ? membro : null,
      })
      .eq("id", id);
    if (error) return { erro: error.message };
  } else {
    // compra parcelada: divide o valor e lança um por mês (no cartão, uma por fatura)
    const valorParcela = Math.round((valor / parcelas) * 100) / 100;
    const [a, m, d] = data.split("-").map(Number);
    const linhas = Array.from({ length: parcelas }, (_, i) => {
      let iso: string;
      if (cartao) iso = vencimentoFatura(data, cartao, i);
      else {
        const dt = new Date(Date.UTC(a, m - 1 + i, 1));
        const ultimo = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
        dt.setUTCDate(Math.min(d, ultimo));
        iso = dt.toISOString().slice(0, 10);
      }
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

/** Marca (ou desmarca) como paga a fatura inteira de um cartão num mês. */
export async function pagarFatura(cartaoId: string, competencia: string, pago: boolean): Promise<Resultado> {
  const membro = await exigirMembro();
  if (!mesValido(competencia)) return { erro: "Mês inválido." };
  const { error } = await db()
    .from("lancamentos")
    .update({ pago, pago_em: pago ? hojeISO() : null, pago_por: pago ? membro : null, updated_by: membro })
    .eq("cartao_id", cartaoId)
    .eq("competencia", competencia)
    .eq("tipo", "despesa");
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

/** Move a fatura inteira (todas as compras do cartão naquele mês) para outro vencimento. */
export async function moverFatura(cartaoId: string, competencia: string, novoVencimento: string): Promise<Resultado> {
  const membro = await exigirMembro();
  if (!mesValido(competencia)) return { erro: "Mês inválido." };
  if (!dataValida(novoVencimento)) return { erro: "Informe o vencimento correto." };
  const { error } = await db()
    .from("lancamentos")
    .update({ data: novoVencimento, competencia: mesDe(novoVencimento), updated_by: membro })
    .eq("cartao_id", cartaoId)
    .eq("competencia", competencia)
    .eq("tipo", "despesa");
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

/** Apaga todas as compras de uma fatura (útil para importar de novo). */
export async function excluirFatura(cartaoId: string, competencia: string): Promise<Resultado> {
  await exigirMembro();
  if (!mesValido(competencia)) return { erro: "Mês inválido." };
  const { error } = await db()
    .from("lancamentos")
    .delete()
    .eq("cartao_id", cartaoId)
    .eq("competencia", competencia)
    .eq("tipo", "despesa");
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

/** Sem `fatura`: extrato de conta (tudo já aconteceu → pago na própria data).
 * Com `fatura`: fatura de cartão — as compras guardam a data da compra e vão
 * todas para o vencimento informado. */
export async function importarLancamentos(
  linhas: LinhaImportada[],
  fatura?: { cartao_id: string; vencimento: string; pago: boolean }
): Promise<Resultado & { inseridos?: number }> {
  const membro = await exigirMembro();
  const validas = linhas.filter((l) => dataValida(l.data) && l.valor > 0 && l.descricao && (l.tipo === "receita" || l.tipo === "despesa"));
  if (!validas.length) return { erro: "Nenhuma linha válida para importar." };
  if (fatura && (!fatura.cartao_id || !dataValida(fatura.vencimento))) return { erro: "Escolha o cartão e o vencimento da fatura." };
  const { error } = await db()
    .from("lancamentos")
    .insert(
      validas.map((l) => {
        const comum = {
          tipo: l.tipo,
          descricao: l.descricao.slice(0, 200),
          valor: Math.round(l.valor * 100) / 100,
          categoria_id: l.categoria_id,
          natureza: l.natureza === "fixo" ? "fixo" : "variavel",
          pessoa: PESSOAS.includes(l.pessoa) ? l.pessoa : "casal",
          origem: "extrato",
          created_by: membro,
        };
        if (fatura) {
          return {
            ...comum,
            forma: "credito",
            cartao_id: fatura.cartao_id,
            data_compra: l.data,
            data: fatura.vencimento,
            competencia: mesDe(fatura.vencimento),
            pago: fatura.pago,
            pago_em: fatura.pago ? fatura.vencimento : null,
            pago_por: fatura.pago ? membro : null,
          };
        }
        return {
          ...comum,
          forma: l.forma || "debito",
          data: l.data,
          competencia: mesDe(l.data),
          pago: true, // veio do extrato: já aconteceu
          pago_em: l.data,
          pago_por: membro,
        };
      })
    );
  if (error) return { erro: error.message };
  atualizarTudo();
  return { inseridos: validas.length };
}

// ------------------------------------------------------------------ cartões e ciclo

export async function salvarCartao(fd: FormData): Promise<Resultado> {
  const membro = await exigirMembro();
  const id = textoOuNull(fd, "id");
  const nome = texto(fd, "nome");
  const fech = numeroOuNull(fd, "dia_fechamento");
  const venc = numeroOuNull(fd, "dia_vencimento");
  if (!nome) return { erro: "Dê um nome ao cartão." };
  if (!fech || fech < 1 || fech > 31) return { erro: "Dia de fechamento entre 1 e 31." };
  if (!venc || venc < 1 || venc > 31) return { erro: "Dia de vencimento entre 1 e 31." };
  const dados = {
    nome,
    dono: PESSOAS.includes(texto(fd, "dono")) ? texto(fd, "dono") : "casal",
    cor: texto(fd, "cor") || "#e0601a",
    dia_fechamento: fech,
    dia_vencimento: venc,
    limite: numeroOuNull(fd, "limite"),
    ativo: fd.get("ativo") !== "off",
  };
  const supa = db();
  const { error } = id
    ? await supa.from("cartoes").update(dados).eq("id", id)
    : await supa.from("cartoes").insert({ ...dados, created_by: membro });
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

export async function excluirCartao(id: string): Promise<Resultado> {
  await exigirMembro();
  const { error } = await db().from("cartoes").delete().eq("id", id);
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
}

export async function salvarCiclo(fd: FormData): Promise<Resultado> {
  const membro = await exigirMembro();
  const sal = numeroOuNull(fd, "dia_salario");
  const contas = numeroOuNull(fd, "dia_contas");
  if (!sal || sal < 1 || sal > 31 || !contas || contas < 1 || contas > 31) return { erro: "Use dias entre 1 e 31." };
  const { error } = await db()
    .from("familia_info")
    .update({ dia_salario: sal, dia_contas: contas, updated_by: membro, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return { erro: error.message };
  atualizarTudo();
  return {};
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
