"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { horas } from "@/lib/format";

export function GraficoValores({ dados }: { dados: { nome: string; minutos: number; cor: string }[] }) {
  if (!dados.length) return <p className="text-sm text-casa-muted">Sem horas registradas no período.</p>;
  const total = dados.reduce((s, d) => s + d.minutos, 0);
  return (
    <div>
      <div className="relative h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={dados} dataKey="minutos" nameKey="nome" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="#fff" strokeWidth={2} cornerRadius={4}>
              {dados.map((d) => <Cell key={d.nome} fill={d.cor} />)}
            </Pie>
            <Tooltip formatter={(v) => horas(Number(v))} contentStyle={{ borderRadius: 12, border: "1px solid #eee0cf" }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-semibold">{horas(total)}</span>
          <span className="text-xs text-casa-muted">no período</span>
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {dados.map((d) => (
          <li key={d.nome} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.cor }} />
            {d.nome}
          </li>
        ))}
      </ul>
    </div>
  );
}
