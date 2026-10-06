"use client";

import { useActionState, useState } from "react";
import clsx from "clsx";
import { entrar } from "./actions";
import type { MembroId } from "@/lib/types";

export default function EntrarPage() {
  const [membro, setMembro] = useState<MembroId | null>(null);
  const [estado, acao, enviando] = useActionState(entrar, null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_10%,#fbe6d3,transparent_45%),radial-gradient(circle_at_85%_90%,#f7ead0,transparent_45%)] p-4">
      <div className="card w-full max-w-sm p-7 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="mx-auto h-16 w-16" />
        <h1 className="mt-3 font-display text-3xl font-semibold">Mendes&apos; House</h1>
        <p className="mt-1 text-sm text-casa-muted">Nossa casa, nossa agenda, nossos valores.</p>

        <form action={acao} className="mt-6 space-y-4 text-left">
          <p className="rotulo text-center">Quem está entrando?</p>
          <div className="grid grid-cols-2 gap-3">
            {(["madu", "gabriel"] as const).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setMembro(m)}
                className={clsx(
                  "rounded-2xl border-2 p-4 text-center transition",
                  membro === m
                    ? m === "madu" ? "border-madu bg-maduclaro" : "border-gabriel bg-gabrielclaro"
                    : "border-casa-line hover:bg-casa-bg"
                )}
              >
                <span className={clsx("mx-auto flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-white", m === "madu" ? "bg-madu" : "bg-gabriel")}>{m === "madu" ? "M" : "G"}</span>
                <span className="mt-1 block font-bold">{m === "madu" ? "Madu" : "Gabriel"}</span>
              </button>
            ))}
          </div>
          <input type="hidden" name="membro" value={membro ?? ""} />
          <div>
            <label className="rotulo" htmlFor="senha">Senha</label>
            <input id="senha" name="senha" type="password" className="campo" autoComplete="current-password" required />
          </div>
          {estado?.erro && <p className="rounded-xl bg-perigoclaro px-3 py-2 text-sm text-perigo">{estado.erro}</p>}
          <button className="btn-primario w-full py-2.5" disabled={!membro || enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
