"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { moeda, moedaCurta, pct } from "@/lib/format";

const tooltipEstilo = { borderRadius: 12, border: "1px solid #ece4d9", fontSize: 12 };

export function DonutFixoVariavel({ fixo, variavel }: { fixo: number; variavel: number }) {
  const total = fixo + variavel;
  if (!total) return <p className="py-10 text-center text-sm text-casa-muted">Sem despesas neste mês.</p>;
  const dados = [
    { nome: "Custos fixos", valor: fixo, cor: "#6366f1" },
    { nome: "Custos variáveis", valor: variavel, cor: "#f97316" },
  ];
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={dados} dataKey="valor" nameKey="nome" innerRadius="64%" outerRadius="95%" paddingAngle={2} stroke="#fff" strokeWidth={2} cornerRadius={4} startAngle={90} endAngle={-270}>
              {dados.map((d) => <Cell key={d.nome} fill={d.cor} />)}
            </Pie>
            <Tooltip formatter={(v) => moeda(Number(v))} contentStyle={tooltipEstilo} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-lg font-semibold">{moedaCurta(total)}</span>
          <span className="text-[10px] text-casa-muted">em despesas</span>
        </div>
      </div>
      <ul className="grid w-full grid-cols-2 gap-3">
        {dados.map((d) => (
          <li key={d.nome}>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-casa-muted">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.cor }} />{d.nome} · <b className="text-casa-ink">{pct(d.valor, total)}%</b>
            </span>
            <p className="pl-4 font-display text-lg font-semibold tabular-nums">{moeda(d.valor)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EvolucaoMeses({ dados }: { dados: { mes: string; receitas: number; despesas: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} barGap={2} margin={{ left: -8, right: 4, top: 8 }}>
          <CartesianGrid vertical={false} stroke="#ece4d9" />
          <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#7a7068" }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#7a7068" }} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
          <Tooltip formatter={(v) => moeda(Number(v))} contentStyle={tooltipEstilo} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
          <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="receitas" name="Receitas" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="despesas" name="Despesas" fill="#e0527e" radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
