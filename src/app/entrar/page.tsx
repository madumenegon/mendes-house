"use client";

import { useActionState } from "react";
import clsx from "clsx";
import { entrar } from "./actions";

export default function EntrarPage() {
  const [estado, acao, enviando] = useActionState(entrar, null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_10%,#fcdde0,transparent_45%),radial-gradient(circle_at_85%_90%,#d9ecfa,transparent_45%)] p-4">
      <div className="card w-full max-w-sm p-7 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="mx-auto h-16 w-16" />
        <h1 className="mt-3 font-display text-3xl font-semibold">Mendes&apos; House</h1>
        <p className="mt-1 text-sm text-casa-muted">Nossa casa, nossa agenda, nossos valores.</p>

        <form action={acao} className="mt-6 space-y-4">
          <p className="rotulo">Quem está entrando?</p>
          <div className="grid grid-cols-2 gap-3">
            {(["madu", "gabriel"] as const).map((m) => (
              <button
                key={m}
                name="membro"
                value={m}
                disabled={enviando}
                className={clsx(
                  "rounded-2xl border-2 p-4 text-center transition disabled:opacity-60",
                  m === "madu" ? "border-madu/30 hover:border-madu hover:bg-maduclaro" : "border-gabriel/30 hover:border-gabriel hover:bg-gabrielclaro"
                )}
              >
                <span className={clsx("mx-auto flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-white", m === "madu" ? "bg-madu" : "bg-gabriel")}>{m === "madu" ? "M" : "G"}</span>
                <span className="mt-1 block font-bold">{m === "madu" ? "Madu" : "Gabriel"}</span>
              </button>
            ))}
          </div>
          {enviando && <p className="text-sm text-casa-muted">Entrando…</p>}
          {estado?.erro && <p className="rounded-xl bg-perigoclaro px-3 py-2 text-sm text-perigo">{estado.erro}</p>}
        </form>
      </div>
    </main>
  );
}
