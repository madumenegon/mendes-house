import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";
import { CORES, NOMES } from "@/lib/format";
import type { Dono, Pessoa, Responsavel } from "@/lib/types";

export function DonoBadge({ dono, pequeno }: { dono: Dono | Pessoa | Responsavel; pequeno?: boolean }) {
  const cor = CORES[dono];
  return (
    <span
      className={clsx("inline-flex shrink-0 items-center gap-1 rounded-full font-bold", pequeno ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs")}
      style={{ background: `${cor}1f`, color: cor }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cor }} />
      {NOMES[dono]}
    </span>
  );
}

export function StatTile({
  rotulo, valor, detalhe, icone, cor = "#e0601a", destaque,
}: { rotulo: string; valor: ReactNode; detalhe?: ReactNode; icone?: ReactNode; cor?: string; destaque?: boolean }) {
  return (
    <div className={clsx("card relative min-w-0 overflow-hidden p-4", destaque && "text-white")} style={destaque ? { background: cor, borderColor: cor } : undefined}>
      <div className="flex items-center justify-between gap-2">
        <p className={clsx("text-xs font-bold uppercase tracking-wide", destaque ? "text-white/80" : "text-casa-muted")}>{rotulo}</p>
        {icone && (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base"
            style={{ background: destaque ? "rgba(255,255,255,.18)" : `${cor}18`, color: destaque ? "#fff" : cor }}
          >
            {icone}
          </span>
        )}
      </div>
      <p className="mt-1.5 font-display text-xl font-semibold tabular-nums sm:text-2xl">{valor}</p>
      {detalhe && <div className={clsx("mt-1 text-xs", destaque ? "text-white/85" : "text-casa-muted")}>{detalhe}</div>}
    </div>
  );
}

export function Secao({ titulo, acao, children, className }: { titulo: ReactNode; acao?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx("card min-w-0 p-4 sm:p-5", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function Barra({ valor, total, cor, alto }: { valor: number; total: number; cor: string; alto?: boolean }) {
  const p = total > 0 ? Math.min(100, (valor / total) * 100) : 0;
  return (
    <div className={clsx("w-full overflow-hidden rounded-full bg-black/[0.06]", alto ? "h-3" : "h-2")}>
      <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, background: cor }} />
    </div>
  );
}

export function Vazio({ icone, children }: { icone: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-casa-line p-6 text-center text-sm text-casa-muted">
      <div className="mb-1 text-3xl">{icone}</div>
      {children}
    </div>
  );
}

export function Abas({ itens, ativo, query = "" }: { itens: { href: string; label: string }[]; ativo: string; query?: string }) {
  return (
    <div className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex w-max gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-casa-line">
        {itens.map((i) => (
          <Link
            key={i.href}
            href={i.href + query}
            className={clsx(
              "whitespace-nowrap rounded-xl px-3.5 py-1.5 text-sm font-semibold transition",
              ativo === i.href ? "bg-casa-principal text-white" : "text-casa-muted hover:text-casa-ink"
            )}
          >
            {i.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Cabecalho({ titulo, subtitulo, acao }: { titulo: ReactNode; subtitulo?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="titulo-pagina">{titulo}</h1>
        {subtitulo && <p className="mt-0.5 text-sm text-casa-muted">{subtitulo}</p>}
      </div>
      {acao}
    </div>
  );
}
