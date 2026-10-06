import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { MembroId } from "@/lib/types";

export const COOKIE_SESSAO = "mendes_sessao";
const MEMBROS: MembroId[] = ["madu", "gabriel"];

function segredo() {
  const s = process.env.APP_SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("Configure APP_SESSION_SECRET.");
  return s || "segredo-so-para-desenvolvimento";
}

function assinar(membro: MembroId) {
  return createHmac("sha256", segredo()).update(membro).digest("hex");
}

export function criarToken(membro: MembroId) {
  return `${membro}.${assinar(membro)}`;
}

/** Senha individual de cada um (APP_SENHA_MADU / APP_SENHA_GABRIEL). */
export function senhaConfere(membro: MembroId, senha: string) {
  const esperada = membro === "madu" ? process.env.APP_SENHA_MADU : process.env.APP_SENHA_GABRIEL;
  if (!esperada) return false;
  const a = Buffer.from(senha);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Quem está logado (cookie assinado), ou null. */
export async function membroAtual(): Promise<MembroId | null> {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  const [membro, assinatura] = token.split(".");
  if (!MEMBROS.includes(membro as MembroId) || !assinatura) return null;
  const esperada = assinar(membro as MembroId);
  if (assinatura.length !== esperada.length) return null;
  return timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperada)) ? (membro as MembroId) : null;
}

/** Para páginas e server actions: garante login ou manda para /entrar. */
export async function exigirMembro(): Promise<MembroId> {
  const membro = await membroAtual();
  if (!membro) redirect("/entrar");
  return membro;
}
