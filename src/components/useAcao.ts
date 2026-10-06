"use client";

import { useState, useTransition } from "react";

export type Resultado = { erro?: string } | void;

/** Roda uma server action mostrando "salvando…" e o erro (se houver). */
export function useAcao() {
  const [pendente, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const rodar = (fn: () => Promise<Resultado>, aoConcluir?: () => void) =>
    start(async () => {
      setErro(null);
      try {
        const r = await fn();
        if (r && r.erro) setErro(r.erro);
        else aoConcluir?.();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Algo deu errado. Tente de novo.");
      }
    });
  return { pendente, erro, rodar, setErro };
}
