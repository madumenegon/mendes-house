"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";
import { moeda, moedaCurta } from "@/lib/format";
import { COOKIE_OCULTAR } from "@/lib/privacidade";

export const MASCARA = "R$ •••••";

const Ctx = createContext<{ oculto: boolean; alternar: () => void }>({ oculto: false, alternar: () => {} });

/** Guarda (por aparelho, num cookie) se os valores em dinheiro estão escondidos.
 * O servidor lê o mesmo cookie para a página já abrir do jeito certo. */
export function PrivacidadeProvider({ inicial, children }: { inicial: boolean; children: ReactNode }) {
  const [oculto, setOculto] = useState(inicial);
  const alternar = () => {
    const novo = !oculto;
    setOculto(novo);
    document.cookie = `${COOKIE_OCULTAR}=${novo ? "1" : "0"}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  };
  return <Ctx.Provider value={{ oculto, alternar }}>{children}</Ctx.Provider>;
}

export function useOcultar() {
  return useContext(Ctx).oculto;
}

/** Valor em dinheiro que respeita o "olhinho". */
export function Din({ v, curto }: { v: number; curto?: boolean }) {
  const oculto = useOcultar();
  if (oculto) return <span className="select-none tracking-wider" title="Valores ocultos">{MASCARA}</span>;
  return <>{curto ? moedaCurta(v) : moeda(v)}</>;
}

/** Para textos montados fora do JSX (tooltips, frases). */
export function useMoeda() {
  const oculto = useOcultar();
  return (v: number) => (oculto ? MASCARA : moeda(v));
}

export function BotaoOlho({ className }: { className?: string }) {
  const { oculto, alternar } = useContext(Ctx);
  return (
    <button
      type="button"
      onClick={alternar}
      className={clsx("btn-fantasma p-2", className)}
      title={oculto ? "Mostrar valores" : "Esconder valores"}
      aria-label={oculto ? "Mostrar valores" : "Esconder valores"}
    >
      {oculto ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}
