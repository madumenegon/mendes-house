"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Mantém a tela atualizada quando o outro mexe no app ao mesmo tempo:
 * recarrega os dados ao voltar para a aba e a cada 45s com a aba visível
 * (pula enquanto algum formulário/modal estiver aberto). */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const atualizar = () => {
      if (document.visibilityState === "visible" && !document.querySelector("dialog[open]")) router.refresh();
    };
    const id = setInterval(atualizar, 45000);
    document.addEventListener("visibilitychange", atualizar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, [router]);
  return null;
}
