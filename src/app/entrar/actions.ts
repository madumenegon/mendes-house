"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESSAO, criarToken } from "@/lib/auth";
import type { MembroId } from "@/lib/types";

export async function entrar(_: { erro: string } | null, fd: FormData) {
  const membro = fd.get("membro") as MembroId;
  if (membro !== "madu" && membro !== "gabriel") return { erro: "Escolha quem está entrando." };
  (await cookies()).set(COOKIE_SESSAO, criarToken(membro), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  redirect("/");
}

export async function sair() {
  (await cookies()).delete(COOKIE_SESSAO);
  redirect("/entrar");
}
