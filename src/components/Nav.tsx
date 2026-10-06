"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { CalendarHeart, Compass, Home, LogOut, ShoppingBasket, Wallet } from "lucide-react";
import { sair } from "@/app/entrar/actions";
import type { MembroId } from "@/lib/types";

const ITENS = [
  { href: "/", label: "Início", icon: Home },
  { href: "/agenda", label: "Agenda", icon: CalendarHeart },
  { href: "/financas", label: "Finanças", icon: Wallet },
  { href: "/casa", label: "Casa", icon: ShoppingBasket },
  { href: "/valores", label: "Valores", icon: Compass },
];

export function Nav({ membro }: { membro: MembroId }) {
  const path = usePathname();
  const ativo = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      {/* desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-casa-line bg-white/70 p-4 backdrop-blur md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2.5 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="h-9 w-9" />
          <span className="font-display text-xl font-semibold leading-tight">Mendes&apos; House</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {ITENS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                ativo(href) ? "bg-casa-principal text-white shadow-sm" : "text-casa-muted hover:bg-casa-bg hover:text-casa-ink"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-casa-bg p-2.5">
          <Avatar membro={membro} />
          <div className="flex-1 text-sm">
            <p className="font-bold">{membro === "madu" ? "Madu" : "Gabriel"}</p>
            <p className="text-xs text-casa-muted">{membro === "madu" ? "conectada" : "conectado"}</p>
          </div>
          <form action={sair}>
            <button className="btn-fantasma p-2" title="Sair"><LogOut size={16} /></button>
          </form>
        </div>
      </aside>

      {/* mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-casa-line bg-white/85 px-4 py-2.5 backdrop-blur md:hidden">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="h-8 w-8" />
          <span className="font-display text-lg font-semibold">Mendes&apos; House</span>
        </Link>
        <div className="flex items-center gap-1">
          <Avatar membro={membro} />
          <form action={sair}><button className="btn-fantasma p-2" title="Sair"><LogOut size={16} /></button></form>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-casa-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {ITENS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx("flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold", ativo(href) ? "text-casa-principal" : "text-casa-muted")}
          >
            <span className={clsx("rounded-full px-3 py-1", ativo(href) && "bg-casa-principalclaro")}><Icon size={19} /></span>
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}

export function Avatar({ membro, tamanho = 32 }: { membro: MembroId; tamanho?: number }) {
  return (
    <span
      className={clsx("inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white", membro === "madu" ? "bg-madu" : "bg-gabriel")}
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.42 }}
    >
      {membro === "madu" ? "M" : "G"}
    </span>
  );
}
