-- Mendes' House — cartões de crédito e ciclo do mês.
-- Só ADICIONA tabela/colunas (nada é apagado ou movido). Rodar uma vez.

create table cartoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  dono text not null default 'casal' check (dono in ('madu', 'gabriel', 'casal')),
  cor text not null default '#e0601a',
  dia_fechamento int not null check (dia_fechamento between 1 and 31),
  dia_vencimento int not null check (dia_vencimento between 1 and 31),
  limite numeric(12,2),
  ativo boolean not null default true,
  created_by text references membros(id),
  created_at timestamptz not null default now()
);
alter table cartoes enable row level security;

-- data_compra: quando o gasto aconteceu (no cartão, "data" passa a ser o
-- vencimento da fatura e "competencia" o mês em que o dinheiro sai).
alter table lancamentos add column data_compra date;
alter table lancamentos add column cartao_id uuid references cartoes(id) on delete set null;

-- ciclo do mês: até que dia caem os salários e até que dia pagamos as contas
alter table familia_info add column dia_salario int not null default 5 check (dia_salario between 1 and 31);
alter table familia_info add column dia_contas int not null default 10 check (dia_contas between 1 and 31);
