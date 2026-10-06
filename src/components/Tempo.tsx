import { horas, pct } from "@/lib/format";
import type { ResumoTempo } from "@/lib/tempo";
import type { MembroId } from "@/lib/types";
import { Barra } from "@/components/ui";

const INFO: Record<MembroId, { nome: string; cor: string; claro: string; emoji: string }> = {
  madu: { nome: "Madu", cor: "#e0527e", claro: "#fde7ee", emoji: "🌷" },
  gabriel: { nome: "Gabriel", cor: "#3b7dd8", claro: "#e3eefc", emoji: "🌊" },
};

/** Cards "Compromissos na semana — Madu / Gabriel". */
export function CompromissosPessoas({ resumo, periodo = "na semana" }: { resumo: ResumoTempo; periodo?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(["madu", "gabriel"] as const).map((m) => {
        const p = resumo.pessoas[m];
        const i = INFO[m];
        return (
          <div key={m} className="card overflow-hidden p-4" style={{ background: `linear-gradient(135deg, ${i.claro}, #fff 70%)` }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: i.cor }}>
              {i.emoji} Compromissos {periodo} — {i.nome}
            </p>
            <p className="mt-1 font-display text-4xl font-semibold tabular-nums" style={{ color: i.cor }}>{p.compromissos}</p>
            <p className="text-xs text-casa-muted">
              {p.proprios} próprios · {p.compartilhados} compartilhados · {horas(p.minEventos)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** Tempo livre de cada um: horas acordadas − compromissos − tarefas. */
export function TempoDisponivel({ resumo, compacto }: { resumo: ResumoTempo; compacto?: boolean }) {
  return (
    <div className="space-y-4">
      {(["madu", "gabriel"] as const).map((m) => {
        const p = resumo.pessoas[m];
        const i = INFO[m];
        const usado = p.minEventos + p.minTarefas;
        return (
          <div key={m}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-sm font-bold" style={{ color: i.cor }}>{i.emoji} {i.nome}</span>
              <span className="text-sm">
                <b className="font-display text-lg tabular-nums">{horas(p.disponivel)}</b>
                <span className="text-casa-muted"> livres ({100 - pct(usado, p.capacidade)}%)</span>
              </span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-black/[0.06]">
              <div style={{ width: `${pct(p.minEventos, p.capacidade)}%`, background: i.cor }} title={`Compromissos: ${horas(p.minEventos)}`} />
              <div className="border-l-2 border-white" style={{ width: `${pct(p.minTarefas, p.capacidade)}%`, background: `${i.cor}88` }} title={`Tarefas: ${horas(p.minTarefas)}`} />
            </div>
            {!compacto && (
              <p className="mt-1 text-xs text-casa-muted">
                Compromissos {horas(p.minEventos)} · Tarefas da casa {horas(p.minTarefas)} · de {horas(p.capacidade)} acordados
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Ranking: quais valores mais aparecem e quanto tempo consomem. */
export function TempoPorValor({ resumo, limite }: { resumo: ResumoTempo; limite?: number }) {
  const lista = resumo.valores.slice(0, limite ?? resumo.valores.length);
  const max = Math.max(1, ...lista.map((v) => v.minutos));
  const total = resumo.valores.reduce((s, v) => s + v.minutos, 0);
  if (!lista.length) return <p className="text-sm text-casa-muted">Nenhum compromisso no período ainda.</p>;
  return (
    <ul className="space-y-3">
      {lista.map((v) => (
        <li key={v.id}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 font-semibold">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-base" style={{ background: `${v.cor}20` }}>{v.emoji}</span>
              <span className="truncate">{v.nome}</span>
            </span>
            <span className="shrink-0 text-right tabular-nums">
              <b>{horas(v.minutos)}</b>
              <span className="text-casa-muted"> · {v.ocorrencias}× · {pct(v.minutos, total)}%</span>
            </span>
          </div>
          <Barra valor={v.minutos} total={max} cor={v.cor} />
          {(v.minMadu > 0 || v.minGabriel > 0) && (
            <p className="mt-0.5 text-[11px] text-casa-muted">
              <span className="text-madu">Madu {horas(v.minMadu)}</span> · <span className="text-gabriel">Gabriel {horas(v.minGabriel)}</span>
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
