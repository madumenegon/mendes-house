import type { Dono, MembroId, Pessoa, Responsavel } from "@/lib/types";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function moeda(valor: number): string {
  return brl.format(valor || 0);
}

export function moedaCurta(valor: number): string {
  const abs = Math.abs(valor);
  if (abs >= 1000) return `R$ ${(valor / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return moeda(valor);
}

export function horas(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}min`;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export function pct(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

/** Aceita "1.234,56", "1234.56", "1234,5" etc. */
export function parseValor(txt: string | null | undefined): number {
  if (!txt) return 0;
  let s = String(txt).replace(/[R$\s]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export const CORES = {
  madu: "#e0527e",
  gabriel: "#3b7dd8",
  compartilhado: "#9b6bd6",
  casal: "#9b6bd6",
  revezar: "#0d9488",
} as const;

export const NOMES: Record<MembroId | Dono | Pessoa | Responsavel, string> = {
  madu: "Madu",
  gabriel: "Gabriel",
  compartilhado: "Compartilhado",
  casal: "Casal",
  revezar: "Revezando",
};

export const PALETA_EVENTOS = [
  "#e0527e", "#f43f5e", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#10b981", "#14b8a6", "#0ea5e9", "#3b7dd8", "#6366f1", "#9b6bd6",
  "#a855f7", "#d946ef", "#64748b", "#a16207",
];

export const FORMAS: Record<string, string> = {
  pix: "Pix",
  debito: "Débito",
  credito: "Cartão de crédito",
  boleto: "Boleto",
  dinheiro: "Dinheiro",
  vale: "Vale (VA/VR)",
  transferencia: "Transferência",
};

export function iniciais(m: MembroId | null | undefined) {
  return m ? NOMES[m] : "—";
}
