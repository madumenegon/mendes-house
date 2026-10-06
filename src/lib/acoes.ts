import "server-only";
import { revalidatePath } from "next/cache";

export type Resultado = { erro?: string };

/** Atualiza todas as telas (os dados de um módulo aparecem em vários). */
export function atualizarTudo() {
  revalidatePath("/", "layout");
}

export function texto(fd: FormData, campo: string): string {
  return String(fd.get(campo) ?? "").trim();
}

export function textoOuNull(fd: FormData, campo: string): string | null {
  const v = texto(fd, campo);
  return v ? v : null;
}

export function numeroOuNull(fd: FormData, campo: string): number | null {
  const v = texto(fd, campo);
  if (!v) return null;
  let s = v.replace(/[R$\s]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function erroDb(error: { message: string; code?: string } | null): Resultado | null {
  if (!error) return null;
  if (error.code === "23503") return { erro: "Este item está em uso em outro lugar do app e não pode ser excluído." };
  return { erro: error.message };
}
