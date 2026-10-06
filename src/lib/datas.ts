/** Datas sempre como string "YYYY-MM-DD" (hora de parede, sem fuso).
 * Toda a aritmética usa UTC internamente só para não sofrer com horário de
 * verão/fuso do servidor. */

export function hojeISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function agoraHHMM(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

function paraDate(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

function deDate(dt: Date) {
  return dt.toISOString().slice(0, 10);
}

export function somarDias(iso: string, n: number): string {
  const dt = paraDate(iso);
  dt.setUTCDate(dt.getUTCDate() + n);
  return deDate(dt);
}

export function somarMeses(iso: string, n: number): string {
  const dt = paraDate(iso);
  const dia = dt.getUTCDate();
  dt.setUTCDate(1);
  dt.setUTCMonth(dt.getUTCMonth() + n);
  const ultimo = ultimoDiaDoMes(dt.getUTCFullYear(), dt.getUTCMonth() + 1);
  dt.setUTCDate(Math.min(dia, ultimo));
  return deDate(dt);
}

export function ultimoDiaDoMes(ano: number, mes: number) {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** 0 = domingo … 6 = sábado */
export function diaDaSemana(iso: string): number {
  return paraDate(iso).getUTCDay();
}

export function diasEntre(a: string, b: string): number {
  return Math.round((paraDate(b).getTime() - paraDate(a).getTime()) / 86400000);
}

/** Segunda-feira da semana da data. */
export function inicioDaSemana(iso: string): string {
  const dow = diaDaSemana(iso);
  return somarDias(iso, dow === 0 ? -6 : 1 - dow);
}

export function diasDaSemana(inicio: string): string[] {
  return Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
}

export function mesDe(iso: string): string {
  return iso.slice(0, 7);
}

export function inicioDoMes(mes: string): string {
  return `${mes}-01`;
}

export function fimDoMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return `${mes}-${String(ultimoDiaDoMes(a, m)).padStart(2, "0")}`;
}

export function mesValido(mes: string | undefined | null): mes is string {
  return !!mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);
}

export function dataValida(iso: string | undefined | null): iso is string {
  return !!iso && /^\d{4}-\d{2}-\d{2}$/.test(iso);
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const DIAS_LONGOS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function nomeMes(mes: string, curto = false): string {
  const [a, m] = mes.split("-").map(Number);
  return curto ? `${MESES_CURTOS[m - 1]}/${String(a).slice(2)}` : maiuscula(`${MESES[m - 1]} de ${a}`);
}

export function dataCurta(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

export function dataLonga(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return maiuscula(`${DIAS_LONGOS[diaDaSemana(iso)]}, ${d} de ${MESES[m - 1]}`);
}

export function hhmm(hora: string | null | undefined): string {
  return hora ? hora.slice(0, 5) : "";
}

export function minutosDoDia(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Duração em minutos entre duas horas "HH:MM" (0 se inválida). */
export function duracaoMin(inicio: string | null, fim: string | null): number {
  if (!inicio || !fim) return 0;
  return Math.max(0, minutosDoDia(fim) - minutosDoDia(inicio));
}

function maiuscula(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
