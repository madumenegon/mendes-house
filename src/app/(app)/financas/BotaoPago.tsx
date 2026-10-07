"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import { useAcao } from "@/components/useAcao";
import { alternarPago, pagarFatura } from "./actions";

export function BotaoPago({ id, pago, tipo, compacto }: { id: string; pago: boolean; tipo: "receita" | "despesa"; compacto?: boolean }) {
  const { rodar, pendente } = useAcao();
  const rotulo = tipo === "receita" ? (pago ? "Recebido" : "Receber") : pago ? "Pago" : "Pagar";
  return (
    <button
      disabled={pendente}
      onClick={(e) => { e.stopPropagation(); rodar(() => alternarPago(id, !pago)); }}
      className={clsx(
        "inline-flex shrink-0 items-center gap-1 rounded-full border-2 font-bold transition",
        compacto ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        pago ? "border-ok bg-ok text-white" : "border-casa-line text-casa-muted hover:border-ok hover:text-ok"
      )}
      title={pago ? "Clique para desfazer" : "Marcar como " + (tipo === "receita" ? "recebido" : "pago")}
    >
      <Check size={12} /> {rotulo}
    </button>
  );
}

export function BotaoPagarFatura({ cartaoId, competencia, pago }: { cartaoId: string; competencia: string; pago: boolean }) {
  const { rodar, pendente } = useAcao();
  return (
    <button
      disabled={pendente}
      onClick={(e) => { e.stopPropagation(); rodar(() => pagarFatura(cartaoId, competencia, !pago)); }}
      className={clsx(
        "inline-flex shrink-0 items-center gap-1 rounded-full border-2 px-2.5 py-1 text-xs font-bold transition",
        pago ? "border-ok bg-ok text-white" : "border-casa-line text-casa-muted hover:border-ok hover:text-ok"
      )}
      title={pago ? "Clique para desfazer" : "Marcar a fatura inteira como paga"}
    >
      <Check size={12} /> {pago ? "Fatura paga" : "Pagar fatura"}
    </button>
  );
}
