-- Mendes' House — schema completo.
-- Rodar uma única vez no SQL Editor do Supabase (projeto novo).
-- Todo acesso é feito pelo servidor do app com a service role key; o RLS
-- fica ligado sem políticas, então a chave pública (anon) não lê nada.

create extension if not exists pgcrypto;

-- ============================================================ MEMBROS
create table membros (
  id text primary key check (id in ('madu', 'gabriel')),
  nome text not null,
  cor text not null
);
insert into membros (id, nome, cor) values
  ('madu', 'Madu', '#e0527e'),
  ('gabriel', 'Gabriel', '#3b7dd8');

-- ============================================================ VALORES E PRIORIDADES
create table familia_info (
  id int primary key default 1 check (id = 1),
  missao text not null default '',
  lema text not null default '',
  horas_acordadas_dia numeric(4,1) not null default 16,
  dia_salario int not null default 5 check (dia_salario between 1 and 31),
  dia_contas int not null default 10 check (dia_contas between 1 and 31),
  updated_by text references membros(id),
  updated_at timestamptz not null default now()
);
insert into familia_info (id) values (1);

create table valores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text not null default '',
  escopo text not null check (escopo in ('familiar', 'madu', 'gabriel')),
  emoji text not null default '✨',
  cor text not null default '#8b5cf6',
  ordem int not null default 0,
  created_by text references membros(id),
  created_at timestamptz not null default now()
);

create table prioridades (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text not null default '',
  escopo text not null check (escopo in ('familiar', 'madu', 'gabriel')),
  valor_id uuid references valores(id) on delete set null,
  ordem int not null default 0,
  concluida boolean not null default false,
  created_by text references membros(id),
  created_at timestamptz not null default now()
);

-- ============================================================ AGENDA
-- Datas/horas guardadas como "hora de parede" (sem fuso) — evita qualquer
-- confusão de fuso entre o servidor (UTC) e o Brasil.
create table eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text not null default '',
  local text not null default '',
  dono text not null check (dono in ('madu', 'gabriel', 'compartilhado')),
  cor text,
  valor_id uuid not null references valores(id) on delete restrict,
  data date not null,
  dia_inteiro boolean not null default false,
  hora_inicio time,
  hora_fim time,
  recorrencia text not null default 'nenhuma'
    check (recorrencia in ('nenhuma', 'diaria', 'semanal', 'quinzenal', 'mensal')),
  recorrencia_fim date,
  excecoes date[] not null default '{}',
  created_by text references membros(id),
  created_at timestamptz not null default now(),
  updated_by text references membros(id),
  updated_at timestamptz not null default now()
);
create index on eventos (data);

-- ============================================================ CASA: TAREFAS
create table tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  comodo text not null default '',
  responsavel text not null default 'compartilhado'
    check (responsavel in ('madu', 'gabriel', 'compartilhado', 'revezar')),
  frequencia text not null default 'semanal'
    check (frequencia in ('unica', 'diaria', 'semanal', 'quinzenal', 'mensal')),
  dias_semana int[] not null default '{}', -- 0=domingo … 6=sábado
  dia_mes int check (dia_mes between 1 and 31),
  data_inicio date not null default current_date,
  hora time,
  duracao_min int not null default 30,
  valor_id uuid references valores(id) on delete set null,
  ativa boolean not null default true,
  created_by text references membros(id),
  created_at timestamptz not null default now()
);

create table tarefas_feitas (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references tarefas(id) on delete cascade,
  data date not null,
  feita_por text references membros(id),
  feita_em timestamptz not null default now(),
  unique (tarefa_id, data)
);

-- ============================================================ CASA: DESPENSA E COMPRAS
create table estoque (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null default 'Outros',
  local text not null default 'Despensa',
  unidade text not null default 'un',
  quantidade numeric(10,2) not null default 0,
  minimo numeric(10,2) not null default 1,
  created_by text references membros(id),
  updated_by text references membros(id),
  updated_at timestamptz not null default now()
);

create table compras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  quantidade numeric(10,2) not null default 1,
  unidade text not null default 'un',
  categoria text not null default 'Outros',
  estoque_id uuid references estoque(id) on delete set null,
  preco_estimado numeric(10,2),
  comprado boolean not null default false,
  comprado_por text references membros(id),
  created_by text references membros(id),
  created_at timestamptz not null default now()
);

-- ============================================================ FINANÇAS
create table categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null check (tipo in ('receita', 'despesa')),
  natureza text not null default 'variavel' check (natureza in ('fixo', 'variavel')),
  emoji text not null default '💸',
  cor text not null default '#64748b',
  orcamento_mensal numeric(12,2),
  palavras_chave text not null default '', -- usadas na leitura do extrato
  ordem int not null default 0
);

create table contas_fixas (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  tipo text not null default 'despesa' check (tipo in ('receita', 'despesa')),
  valor numeric(12,2) not null check (valor > 0),
  dia int not null check (dia between 1 and 31),
  categoria_id uuid references categorias(id) on delete set null,
  pessoa text not null default 'casal' check (pessoa in ('madu', 'gabriel', 'casal')),
  forma text not null default 'pix',
  ativa boolean not null default true,
  created_by text references membros(id),
  created_at timestamptz not null default now()
);

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

create table lancamentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('receita', 'despesa')),
  descricao text not null,
  valor numeric(12,2) not null check (valor > 0),
  data date not null,                 -- vencimento / data do lançamento (no cartão: vencimento da fatura)
  data_compra date,                   -- quando o gasto aconteceu (cartão)
  cartao_id uuid references cartoes(id) on delete set null,
  competencia char(7) not null,       -- 'YYYY-MM'
  categoria_id uuid references categorias(id) on delete set null,
  natureza text not null default 'variavel' check (natureza in ('fixo', 'variavel')),
  pessoa text not null default 'casal' check (pessoa in ('madu', 'gabriel', 'casal')),
  forma text not null default 'pix',  -- pix, debito, credito, boleto, dinheiro, vale
  pago boolean not null default false,
  pago_em date,
  pago_por text references membros(id),
  conta_fixa_id uuid references contas_fixas(id) on delete set null,
  origem text not null default 'manual' check (origem in ('manual', 'recorrente', 'extrato')),
  observacao text not null default '',
  created_by text references membros(id),
  created_at timestamptz not null default now(),
  updated_by text references membros(id)
);
create index on lancamentos (competencia);
create unique index lancamentos_conta_fixa_mes on lancamentos (conta_fixa_id, competencia)
  where conta_fixa_id is not null;

create table caixinhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text not null default '',
  emoji text not null default '🐷',
  cor text not null default '#10b981',
  meta numeric(12,2),
  prazo date,
  aporte_mensal numeric(12,2),
  arquivada boolean not null default false,
  created_by text references membros(id),
  created_at timestamptz not null default now()
);

create table caixinha_movimentos (
  id uuid primary key default gen_random_uuid(),
  caixinha_id uuid not null references caixinhas(id) on delete cascade,
  tipo text not null check (tipo in ('deposito', 'retirada')),
  valor numeric(12,2) not null check (valor > 0),
  data date not null default current_date,
  descricao text not null default '',
  created_by text references membros(id),
  created_at timestamptz not null default now()
);

-- ============================================================ RLS (sem políticas = só service role)
alter table membros enable row level security;
alter table familia_info enable row level security;
alter table valores enable row level security;
alter table prioridades enable row level security;
alter table eventos enable row level security;
alter table tarefas enable row level security;
alter table tarefas_feitas enable row level security;
alter table estoque enable row level security;
alter table compras enable row level security;
alter table categorias enable row level security;
alter table contas_fixas enable row level security;
alter table lancamentos enable row level security;
alter table caixinhas enable row level security;
alter table caixinha_movimentos enable row level security;
alter table cartoes enable row level security;

-- ============================================================ DADOS INICIAIS
insert into valores (nome, descricao, escopo, emoji, cor, ordem) values
  ('Fé', 'Nossa relação com Deus em primeiro lugar', 'familiar', '🙏', '#8b5cf6', 1),
  ('Casamento', 'Tempo de qualidade a dois', 'familiar', '💞', '#e0527e', 2),
  ('Família', 'Pais, irmãos e quem amamos', 'familiar', '🏡', '#f59e0b', 3),
  ('Saúde', 'Cuidar do corpo e da mente', 'familiar', '🌿', '#10b981', 4),
  ('Trabalho e provisão', 'Trabalhar com excelência', 'familiar', '💼', '#3b7dd8', 5),
  ('Servir', 'Servir à igreja e ao próximo', 'familiar', '🤝', '#14b8a6', 6),
  ('Crescimento', 'Estudar, aprender, evoluir', 'familiar', '📚', '#6366f1', 7),
  ('Descanso e lazer', 'Pausar, se divertir e recarregar', 'familiar', '🌴', '#f97316', 8),
  ('Amizades', 'Cultivar boas amizades', 'familiar', '🥂', '#ec4899', 9),
  ('Organização da casa', 'Um lar em ordem', 'familiar', '🧺', '#64748b', 10);

insert into categorias (nome, tipo, natureza, emoji, cor, palavras_chave, ordem) values
  ('Moradia', 'despesa', 'fixo', '🏠', '#6366f1', 'aluguel,condominio,condomínio,financiamento,iptu', 1),
  ('Contas da casa', 'despesa', 'fixo', '💡', '#f59e0b', 'energia,luz,celesc,copel,cemig,enel,agua,água,casan,sabesp,gas,gás,internet,vivo,claro,tim,oi ', 2),
  ('Dízimo e ofertas', 'despesa', 'fixo', '🙏', '#8b5cf6', 'dizimo,dízimo,oferta,igreja', 3),
  ('Saúde e plano', 'despesa', 'fixo', '🩺', '#10b981', 'unimed,plano de saude,amil,hapvida,academia,smartfit', 4),
  ('Educação', 'despesa', 'fixo', '🎓', '#0ea5e9', 'escola,faculdade,curso,udemy,alura', 5),
  ('Assinaturas', 'despesa', 'fixo', '📺', '#ec4899', 'netflix,spotify,amazon prime,disney,hbo,max,youtube,apple.com,google', 6),
  ('Seguros', 'despesa', 'fixo', '🛡️', '#64748b', 'seguro,porto seguro', 7),
  ('Mercado', 'despesa', 'variavel', '🛒', '#22c55e', 'mercado,supermercado,atacad,assai,assaí,fort,angeloni,giassi,carrefour,bistek,komprao', 10),
  ('Alimentação fora', 'despesa', 'variavel', '🍔', '#f97316', 'ifood,restaurante,lanchonete,padaria,pizza,burger,mcdonald,cafe,café', 11),
  ('Transporte', 'despesa', 'variavel', '⛽', '#ef4444', 'uber,99,posto,combustivel,combustível,shell,ipiranga,estacionamento,pedagio,pedágio', 12),
  ('Farmácia', 'despesa', 'variavel', '💊', '#14b8a6', 'farmacia,farmácia,drogaria,panvel,raia,pague menos', 13),
  ('Lazer', 'despesa', 'variavel', '🎉', '#a855f7', 'cinema,ingresso,show,viagem,hotel,airbnb', 14),
  ('Compras e vestuário', 'despesa', 'variavel', '👕', '#d946ef', 'renner,riachuelo,c&a,shopee,mercado livre,magalu,amazon,shein', 15),
  ('Casa e manutenção', 'despesa', 'variavel', '🔧', '#a16207', 'leroy,cassol,ferragem,material de construcao', 16),
  ('Presentes', 'despesa', 'variavel', '🎁', '#f43f5e', 'presente', 17),
  ('Pets', 'despesa', 'variavel', '🐾', '#84cc16', 'petshop,pet shop,cobasi,petz,veterinario', 18),
  ('Outros gastos', 'despesa', 'variavel', '💸', '#94a3b8', '', 99),
  ('Salário', 'receita', 'fixo', '💼', '#16a34a', 'salario,salário,folha,pagamento de salario', 1),
  ('Vale alimentação', 'receita', 'fixo', '🥗', '#65a30d', 'vale alimentacao,alelo,sodexo,vr ,ticket,pluxee,flash', 2),
  ('Vale refeição', 'receita', 'fixo', '🍽️', '#ca8a04', 'vale refeicao', 3),
  ('Renda extra', 'receita', 'variavel', '💰', '#0891b2', 'pix recebido,transferencia recebida,ted recebida', 4),
  ('Outras receitas', 'receita', 'variavel', '➕', '#64748b', 'estorno,rendimento', 99);

insert into caixinhas (nome, descricao, emoji, cor) values
  ('Reserva de emergência', 'Ideal: 6 meses de custo fixo', '🛟', '#0ea5e9'),
  ('Viagem', 'Nossa próxima viagem', '✈️', '#f97316');
