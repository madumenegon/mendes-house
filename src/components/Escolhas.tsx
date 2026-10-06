"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import { PALETA_EVENTOS } from "@/lib/format";

export function SeletorCor({ valor, onChange, nome = "cor" }: { valor: string; onChange: (c: string) => void; nome?: string }) {
  return (
    <div>
      <input type="hidden" name={nome} value={valor} />
      <div className="flex flex-wrap items-center gap-1.5">
        {PALETA_EVENTOS.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => onChange(c)}
            className={clsx("flex h-7 w-7 items-center justify-center rounded-full ring-offset-2 transition", valor === c && "ring-2 ring-casa-ink")}
            style={{ background: c }}
            aria-label={`Cor ${c}`}
          >
            {valor === c && <Check size={14} className="text-white" />}
          </button>
        ))}
        <label className="relative flex h-7 cursor-pointer items-center gap-1 rounded-full border border-casa-line px-2 text-xs text-casa-muted" title="Outra cor">
          <input type="color" value={valor} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
          <span className="h-3.5 w-3.5 rounded-full" style={{ background: valor }} /> outra
        </label>
      </div>
    </div>
  );
}

const EMOJIS = ["✨", "🙏", "💞", "🏡", "🌿", "💼", "🤝", "📚", "🌴", "🥂", "🧺", "🎯", "💪", "🎶", "⛪", "👶", "🐾", "🍳", "🏃", "🧘", "💰", "✈️", "🛟", "🚗", "🎓", "🎁", "💍", "🏖️", "🩺", "📱"];

export function SeletorEmoji({ valor, onChange, nome = "emoji" }: { valor: string; onChange: (e: string) => void; nome?: string }) {
  return (
    <div>
      <input type="hidden" name={nome} value={valor} />
      <div className="flex flex-wrap gap-1">
        {EMOJIS.map((e) => (
          <button
            type="button"
            key={e}
            onClick={() => onChange(e)}
            className={clsx("flex h-8 w-8 items-center justify-center rounded-lg text-lg transition hover:bg-casa-bg", valor === e && "bg-casa-principalclaro ring-2 ring-casa-principal")}
          >
            {e}
          </button>
        ))}
        <input
          value={EMOJIS.includes(valor) ? "" : valor}
          onChange={(ev) => onChange(ev.target.value || "✨")}
          placeholder="outro"
          className="campo h-8 w-16 px-2 py-0 text-center"
          maxLength={4}
        />
      </div>
    </div>
  );
}

/** Botões segmentados (ex.: Madu / Gabriel / Compartilhado). */
export function Segmentos<T extends string>({
  opcoes, valor, onChange, nome,
}: { opcoes: { valor: T; label: string; cor?: string }[]; valor: T; onChange: (v: T) => void; nome?: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {nome && <input type="hidden" name={nome} value={valor} />}
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        const cor = o.cor ?? "#e0601a";
        return (
          <button
            type="button"
            key={o.valor}
            onClick={() => onChange(o.valor)}
            className="rounded-xl border-2 px-3 py-1.5 text-sm font-bold transition"
            style={ativo ? { borderColor: cor, background: `${cor}18`, color: cor } : { borderColor: "#f0e2c4", color: "#8a6e62" }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
