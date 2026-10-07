import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { hojeISO, inicioDoMes, mesDe, mesValido, nomeMes, somarMeses } from "@/lib/datas";
import { Abas } from "@/components/ui";

export function mesDaUrl(v: string | string[] | undefined): string {
  return mesValido(v as string) ? (v as string) : mesDe(hojeISO());
}

export function AbasFinancas({ ativo, mes }: { ativo: string; mes: string }) {
  return (
    <Abas
      ativo={ativo}
      query={`?mes=${mes}`}
      itens={[
        { href: "/financas", label: "📊 Visão geral" },
        { href: "/financas/lancamentos", label: "🧾 Lançamentos" },
        { href: "/financas/contas-fixas", label: "📌 Contas fixas" },
        { href: "/financas/orcamento", label: "🎯 Destinação" },
        { href: "/financas/cartoes", label: "💳 Cartões" },
        { href: "/financas/caixinhas", label: "🐷 Caixinhas" },
        { href: "/financas/importar", label: "📄 Importar extrato" },
      ]}
    />
  );
}

export function SeletorMes({ mes, base }: { mes: string; base: string }) {
  const ant = mesDe(somarMeses(inicioDoMes(mes), -1));
  const prox = mesDe(somarMeses(inicioDoMes(mes), 1));
  const atual = mesDe(hojeISO());
  return (
    <div className="flex items-center gap-1 rounded-2xl bg-white p-1 ring-1 ring-casa-line">
      <Link href={`${base}?mes=${ant}`} className="btn-fantasma p-1.5"><ChevronLeft size={16} /></Link>
      <span className="min-w-36 text-center text-sm font-bold">{nomeMes(mes)}</span>
      <Link href={`${base}?mes=${prox}`} className="btn-fantasma p-1.5"><ChevronRight size={16} /></Link>
      {mes !== atual && <Link href={`${base}?mes=${atual}`} className="btn-fantasma px-2 py-1 text-xs">Hoje</Link>}
    </div>
  );
}
