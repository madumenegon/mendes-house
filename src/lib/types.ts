export type MembroId = "madu" | "gabriel";
export type Dono = MembroId | "compartilhado";
export type Escopo = "familiar" | MembroId;
export type Pessoa = MembroId | "casal";

export interface FamiliaInfo {
  missao: string;
  lema: string;
  horas_acordadas_dia: number;
  updated_by: MembroId | null;
  updated_at: string;
}

export interface Valor {
  id: string;
  nome: string;
  descricao: string;
  escopo: Escopo;
  emoji: string;
  cor: string;
  ordem: number;
  created_by: MembroId | null;
}

export interface Prioridade {
  id: string;
  titulo: string;
  descricao: string;
  escopo: Escopo;
  valor_id: string | null;
  ordem: number;
  concluida: boolean;
  created_by: MembroId | null;
}

export type Recorrencia = "nenhuma" | "diaria" | "semanal" | "quinzenal" | "mensal";

export interface Evento {
  id: string;
  titulo: string;
  descricao: string;
  local: string;
  dono: Dono;
  cor: string | null;
  valor_id: string;
  data: string;
  dia_inteiro: boolean;
  hora_inicio: string | null;
  hora_fim: string | null;
  recorrencia: Recorrencia;
  recorrencia_fim: string | null;
  excecoes: string[];
  created_by: MembroId | null;
  created_at: string;
  updated_by: MembroId | null;
  updated_at: string;
}

/** Uma ocorrência concreta (evento recorrente já "expandido" numa data). */
export interface Ocorrencia {
  evento: Evento;
  data: string;
}

export type Frequencia = "unica" | "diaria" | "semanal" | "quinzenal" | "mensal";
export type Responsavel = Dono | "revezar";

export interface Tarefa {
  id: string;
  titulo: string;
  comodo: string;
  responsavel: Responsavel;
  frequencia: Frequencia;
  dias_semana: number[];
  dia_mes: number | null;
  data_inicio: string;
  hora: string | null;
  duracao_min: number;
  valor_id: string | null;
  ativa: boolean;
  created_by: MembroId | null;
}

export interface TarefaFeita {
  id: string;
  tarefa_id: string;
  data: string;
  feita_por: MembroId | null;
}

export interface OcorrenciaTarefa {
  tarefa: Tarefa;
  data: string;
  /** Quem faz nessa data (resolve o "revezar"). */
  quem: Dono;
  feita: TarefaFeita | null;
}

export interface ItemEstoque {
  id: string;
  nome: string;
  categoria: string;
  local: string;
  unidade: string;
  quantidade: number;
  minimo: number;
  updated_by: MembroId | null;
  updated_at: string;
}

export interface ItemCompra {
  id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  categoria: string;
  estoque_id: string | null;
  preco_estimado: number | null;
  comprado: boolean;
  comprado_por: MembroId | null;
  created_by: MembroId | null;
}

export type TipoLancamento = "receita" | "despesa";
export type Natureza = "fixo" | "variavel";

export interface Categoria {
  id: string;
  nome: string;
  tipo: TipoLancamento;
  natureza: Natureza;
  emoji: string;
  cor: string;
  orcamento_mensal: number | null;
  palavras_chave: string;
  ordem: number;
}

export interface ContaFixa {
  id: string;
  descricao: string;
  tipo: TipoLancamento;
  valor: number;
  dia: number;
  categoria_id: string | null;
  pessoa: Pessoa;
  forma: string;
  ativa: boolean;
  created_by: MembroId | null;
}

export interface Lancamento {
  id: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  data: string;
  competencia: string;
  categoria_id: string | null;
  natureza: Natureza;
  pessoa: Pessoa;
  forma: string;
  pago: boolean;
  pago_em: string | null;
  pago_por: MembroId | null;
  conta_fixa_id: string | null;
  origem: "manual" | "recorrente" | "extrato";
  observacao: string;
  created_by: MembroId | null;
  created_at: string;
}

export interface Caixinha {
  id: string;
  nome: string;
  descricao: string;
  emoji: string;
  cor: string;
  meta: number | null;
  prazo: string | null;
  aporte_mensal: number | null;
  arquivada: boolean;
  created_by: MembroId | null;
}

export interface MovimentoCaixinha {
  id: string;
  caixinha_id: string;
  tipo: "deposito" | "retirada";
  valor: number;
  data: string;
  descricao: string;
  created_by: MembroId | null;
  created_at: string;
}
